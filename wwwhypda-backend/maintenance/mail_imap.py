"""Bounded readonly snapshots. No CLOSE, sequence-number mutation or implicit expunge."""
import base64
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from email import policy
from email.parser import BytesParser, BytesHeaderParser
from email.utils import getaddresses
import imaplib
import json
import re
import ssl
import socket

from maintenance.mail_common import MailSafetyError, OWNER, UTC

ID = r"<[A-Za-z0-9.!#$%&'*+/=?^_\x60{|}~-]+@[A-Za-z0-9.-]+>"
TEMPLATES = {
    "Activate your account": r"Your activation code: [0-9]{6}",
    "Your new activation code": r"Your new activation code: [0-9]{6}",
    "Password Reset Code": r"Your password reset code: [0-9]{6}",
}


def utf7_decode(raw):
    def decode(match):
        token = match.group(1)
        if not token:
            return "&"
        return base64.b64decode(token.replace(b",", b"/") + b"=" * (-len(token) % 4), validate=True).decode("utf-16-be")
    try:
        return re.sub(rb"&([^-]*)-", lambda m: decode(m).encode("utf-8"), raw).decode("utf-8") if b"&" in raw else raw.decode("ascii")
    except (UnicodeError, ValueError):
        raise MailSafetyError("protocol") from None


def quoted(raw):
    if not isinstance(raw, bytes) or any(c in raw for c in (b"\r", b"\n", b"\x00")):
        raise MailSafetyError("protocol")
    return b'"' + raw.replace(b"\\", b"\\\\").replace(b'"', b'\\"') + b'"'


@dataclass(frozen=True)
class Folder:
    wire: bytes = field(repr=False)
    name: str = field(repr=False)
    attrs: frozenset
    delimiter: bytes | None = field(repr=False)

    @property
    def selectable(self):
        return b"\\NOSELECT" not in self.attrs


def parse_list(data):
    if not isinstance(data, list) or not data:
        raise MailSafetyError("incomplete")
    folders = []
    for entry in data:
        literal = None
        if isinstance(entry, tuple) and len(entry) == 2:
            entry, literal = entry
        if not isinstance(entry, bytes):
            raise MailSafetyError("protocol")
        match = re.fullmatch(rb'\(([^()]*)\) ("(?:[^"\\]|\\.)*"|NIL) (.+)', entry)
        if not match:
            raise MailSafetyError("protocol")
        attributes, delimiter, name = match.groups()
        if literal is not None:
            if not isinstance(literal, bytes) or name != b"{" + str(len(literal)).encode() + b"}":
                raise MailSafetyError("protocol")
            name = literal
        elif name.startswith(b'"'):
            if not re.fullmatch(rb'"(?:[^"\\]|\\.)*"', name):
                raise MailSafetyError("protocol")
            name = re.sub(rb"\\(.)", rb"\1", name[1:-1])
        elif b" " in name or b"{" in name:
            raise MailSafetyError("protocol")
        quoted(name)
        delimiter = None if delimiter == b"NIL" else re.sub(rb"\\(.)", rb"\1", delimiter[1:-1])
        folders.append(Folder(name, utf7_decode(name), frozenset(attributes.upper().split()), delimiter))
    if len({f.wire for f in folders}) != len(folders):
        raise MailSafetyError("incomplete")
    return tuple(sorted(folders, key=lambda f: f.wire))


def internal_date(value):
    match = re.fullmatch(r" *([0-9]{1,2})-([A-Za-z]{3})-([0-9]{4}) ([0-9]{2}):([0-9]{2}):([0-9]{2}) ([+-])([0-9]{2})([0-9]{2})", value)
    try:
        if not match:
            return None
        day, month, year, hour, minute, second, sign, off_h, off_m = match.groups()
        months = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"]
        if int(off_h) > 23 or int(off_m) > 59:
            return None
        offset = timedelta(hours=int(off_h), minutes=int(off_m)) * (1 if sign == "+" else -1)
        return datetime(int(year), months.index(month.lower()) + 1, int(day), int(hour),
                        int(minute), int(second), tzinfo=timezone(offset)).astimezone(UTC)
    except (ValueError, OverflowError):
        return None


def message_headers(raw, digest):
    """Return pseudonymous graph data; untrusted header strings never enter state/logs."""
    result = dict(mid=None, refs=(), participants=frozenset(), subject=None, valid=False, service_header=False)
    try:
        if not raw.endswith((b"\r\n\r\n", b"\n\n")):
            return result
        msg = BytesHeaderParser(policy=policy.default).parsebytes(raw)
        if msg.defects or any(getattr(value, "defects", ()) for _, value in msg.items()):
            return result
        if any(len(msg.get_all(key, [])) > 1 for key in ("From", "To", "Cc", "Subject", "Message-ID", "References", "In-Reply-To", "Content-Type", "Content-Transfer-Encoding")):
            return result
        identifier = str(msg.get("Message-ID", "")).strip()
        if not re.fullmatch(ID, identifier):
            return result
        references = []
        for name in ("References", "In-Reply-To"):
            value = str(msg.get(name, "")).strip()
            if value:
                if not re.fullmatch(ID + r"(?:\s+" + ID + r")*", value):
                    return result
                references.extend(re.findall(ID, value))
        if len(msg.get_all("From", [])) != 1 or len(msg.get_all("Subject", [])) != 1:
            return result
        from_addresses = getaddresses([str(msg["From"])])
        addresses = getaddresses([str(msg[key]) for key in ("From", "To", "Cc") if msg.get(key) is not None])
        if not addresses or any(not re.fullmatch(r"[^@\s<>]+@[^@\s<>]+", address) for _, address in addresses):
            return result
        participants = frozenset(digest("person", address.lower()) for _, address in addresses if address.lower() != OWNER)
        subject = str(msg["Subject"]).strip()
        normalized = re.sub(r"^(?:(?:re|fw|fwd)\s*:\s*)+", "", subject, flags=re.I)
        result.update(mid=digest("id", identifier), refs=tuple(dict.fromkeys(digest("id", token) for token in references)),
            participants=participants, subject=digest("subject", " ".join(normalized.lower().split())), valid=True,
            service_header=len(from_addresses) == 1 and from_addresses[0][1] == OWNER and subject in TEMPLATES and not references)
        return result
    except (ValueError, UnicodeError, IndexError, TypeError):
        return result


def service_message(raw):
    """Exact single text/plain message, no multipart/HTML/attachments or parser defects."""
    try:
        msg = BytesParser(policy=policy.default).parsebytes(raw)
        if msg.is_multipart() or msg.defects or msg.get_content_type() != "text/plain":
            return False
        if msg.get_content_disposition() is not None or msg.get_filename() is not None:
            return False
        if any(getattr(value, "defects", ()) for _, value in msg.items()):
            return False
        if any(len(msg.get_all(key, [])) != 1 for key in ("From", "Subject", "Message-ID")):
            return False
        if any(len(msg.get_all(key, [])) > 1 for key in ("Content-Type", "Content-Transfer-Encoding", "To", "Cc")):
            return False
        if msg.get("References") is not None or msg.get("In-Reply-To") is not None:
            return False
        if getaddresses([str(msg["From"])]) != [("", OWNER)]:
            # A display name is allowed, but still exactly one authenticated mailbox address.
            addresses = getaddresses([str(msg["From"])])
            if len(addresses) != 1 or addresses[0][1] != OWNER:
                return False
        pattern = TEMPLATES.get(str(msg["Subject"]).strip())
        charset = msg.get_content_charset() or "ascii"
        payload = msg.get_payload(decode=True)
        if payload is None:
            return False
        body = payload.decode(charset, errors="strict").strip()
        return bool(pattern and re.fullmatch(pattern, body) and not msg.defects)
    except (LookupError, UnicodeError, ValueError, TypeError):
        return False


@dataclass
class Message:
    folder: str
    validity: int
    uid: int
    flags: frozenset
    date: datetime | None
    size: int
    content: str
    mid: str | None
    refs: tuple
    participants: frozenset
    subject: str | None
    valid: bool
    service: bool = False
    body_ok: bool = False

    @property
    def identity(self):
        return f"{self.folder}:{self.validity}:{self.uid}"

    def signature(self):
        return [self.identity, sorted(flag.decode("ascii") for flag in self.flags), self.date.isoformat() if self.date else None,
                self.size, self.content]


@dataclass
class Snapshot:
    folders: tuple
    roles: dict
    metadata: dict
    messages: dict
    capabilities: frozenset

    def fingerprint(self, digest):
        return digest("snapshot", json.dumps([sorted(self.capabilities), sorted(self.metadata.items()),
            {key: self.roles[key] for key in sorted(self.roles)},
            [self.messages[key].signature() for key in sorted(self.messages)]], sort_keys=True))

    def remove(self, identities):
        for identity in identities:
            self.messages.pop(identity, None)


class Mailbox:
    def __init__(self, config, budget, digest, factory=imaplib.IMAP4_SSL):
        self.config, self.budget, self.digest = config, budget, digest
        self.client = None
        self.factory = factory

    def connect(self):
        stage = "connection_failed"
        try:
            self.client = self.factory(self.config.host, self.config.port,
                ssl_context=ssl.create_default_context(), timeout=min(self.config.timeout, self.budget.remaining()))
            self.client.debug = 0
            stage = "login_failed"
            try:
                self.call(self.client.login, self.config.username, self.config.password)
            except imaplib.IMAP4.abort:
                raise MailSafetyError("network_connection") from None
            except imaplib.IMAP4.error:
                raise MailSafetyError("login_rejected") from None
            except MailSafetyError as error:
                if error.category == "protocol":
                    raise MailSafetyError("login_rejected") from None
                raise
            return self
        except MailSafetyError:
            self.finish()
            raise
        except Exception as error:
            if isinstance(error, ssl.SSLCertVerificationError):
                category = "tls_certificate"
            elif isinstance(error, ssl.SSLError):
                category = "tls_handshake"
            elif isinstance(error, socket.gaierror):
                category = "network_dns"
            elif isinstance(error, TimeoutError):
                category = "network_timeout"
            elif isinstance(error, (ConnectionError, OSError)):
                category = "network_connection"
            else:
                category = stage
            self.finish()
            # Never render exception text, including IMAP login responses.
            raise MailSafetyError(category) from None

    def call(self, method, *args, **kwargs):
        remaining = self.budget.remaining()
        if getattr(self.client, "sock", None) is not None:
            self.client.sock.settimeout(min(self.config.timeout, remaining))
        result = method(*args, **kwargs)
        self.budget.remaining()
        if not isinstance(result, tuple) or result[0] != "OK":
            raise MailSafetyError("protocol")
        return result[1]

    def capabilities(self):
        data = self.call(self.client.capability)
        if not data or any(not isinstance(item, bytes) for item in data):
            raise MailSafetyError("protocol")
        return frozenset(token.decode("ascii").upper() for item in data for token in item.split())

    def folders(self):
        folders = parse_list(self.call(self.client.list, '""', '"*"'))
        if len(folders) > self.config.max_folders:
            raise MailSafetyError("limit")
        return folders

    def resolve(self, folders):
        def role(explicit, attribute):
            matches = [f for f in folders if f.selectable and (f.name == explicit if explicit else attribute in f.attrs)]
            return self.digest("folder", matches[0].wire) if len(matches) == 1 else None
        roles = {"sent": role(self.config.sent, b"\\SENT"), "drafts": role(self.config.drafts, b"\\DRAFTS"),
                 "closed": role(self.config.closed, b"\\NOT-A-SPECIAL-USE")}
        selected = [value for value in roles.values() if value is not None]
        if len(set(selected)) != len(selected):
            raise MailSafetyError("configuration")
        return roles

    def response(self, name):
        value = self.client.response(name)[1]
        return value if isinstance(value, list) else [None]

    def select(self, folder, readonly=True):
        self.call(self.client.select, quoted(folder.wire), readonly=readonly)
        if any(value is not None for value in self.response("UIDNOTSTICKY")):
            raise MailSafetyError("uidplus")
        values = []
        for name in ("UIDVALIDITY", "UIDNEXT"):
            data = self.response(name)
            if len(data) != 1 or not isinstance(data[0], bytes) or not re.fullmatch(rb"[1-9][0-9]{0,9}", data[0]):
                raise MailSafetyError("protocol")
            number = int(data[0])
            if number > 4294967295:
                raise MailSafetyError("protocol")
            values.append(number)
        if not readonly:
            flags = b" ".join(value for value in self.response("PERMANENTFLAGS") if isinstance(value, bytes)).upper()
            if b"\\DELETED" not in flags and b"\\*" not in flags:
                raise MailSafetyError("permissions")
            if any(value is not None for value in self.response("READ-ONLY")):
                raise MailSafetyError("permissions")
        return tuple(values)

    def search(self, low, high):
        if high < low:
            return []
        data = self.call(self.client.uid, "SEARCH", None, "UID", f"{low}:{high}")
        if len(data) != 1 or not isinstance(data[0], bytes) or not re.fullmatch(rb"(?:[0-9]+(?: [0-9]+)*)?", data[0]):
            raise MailSafetyError("protocol")
        values = [int(value) for value in data[0].split()]
        if len(set(values)) != len(values) or any(not low <= value <= high for value in values):
            raise MailSafetyError("incomplete")
        return sorted(values)

    def fetch(self, uids, full=False):
        if not uids:
            return {}
        limit = self.config.max_body if full else self.config.max_header
        section = "" if full else "HEADER"
        data = self.call(self.client.uid, "FETCH", ",".join(map(str, uids)),
            f"(UID FLAGS INTERNALDATE RFC822.SIZE BODY.PEEK[{section}]<0.{limit + 1}>)")
        # imaplib splits FETCH at literals. UID/FLAGS/date/size may follow the
        # literal in a separate bytes tail, not necessarily precede the body.
        records = []
        for entry in data:
            if isinstance(entry, tuple) and len(entry) == 2:
                descriptor, raw = entry
                if not isinstance(descriptor, bytes) or not isinstance(raw, bytes):
                    raise MailSafetyError("protocol")
                records.append([descriptor,raw])
            elif isinstance(entry,bytes) and records:
                records[-1][0] += entry
            else:
                raise MailSafetyError("incomplete")
        found = {}
        for descriptor,raw in records:
            if (not re.match(rb"[1-9][0-9]* \(",descriptor)
                    or not descriptor.endswith(b")")
                    or descriptor.count(b"(") != descriptor.count(b")")):
                raise MailSafetyError("protocol")
            expected_body = rb"BODY\[\](?:<0>)?" if full else rb"BODY\[HEADER\](?:<0>)?"
            literal = re.search(expected_body + rb" \{([0-9]+)\}", descriptor)
            if not literal or int(literal[1]) != len(raw):
                raise MailSafetyError("protocol")
            uid = re.findall(rb"\bUID ([0-9]+)\b", descriptor)
            flags = re.search(rb"\bFLAGS \(([^()]*)\)", descriptor)
            date = re.search(rb'\bINTERNALDATE "([^"]*)"', descriptor)
            size = re.search(rb"\bRFC822.SIZE ([0-9]+)\b", descriptor)
            if len(uid) != 1 or not all((flags, date, size)):
                raise MailSafetyError("protocol")
            number = int(uid[0])
            if number not in uids or number in found:
                raise MailSafetyError("incomplete")
            if len(raw) > limit:
                raise MailSafetyError("limit")
            found[number] = (raw, frozenset(flag for flag in flags[1].upper().split() if flag != br"\RECENT"),
                internal_date(date[1].decode("ascii")), int(size[1]))
        if set(found) != set(uids):
            raise MailSafetyError("incomplete")
        return found

    def snapshot(self):
        capabilities, folders = self.capabilities(), self.folders()
        roles, metadata, messages = self.resolve(folders), {}, {}
        for folder in folders:
            if not folder.selectable:
                continue
            token = self.digest("folder", folder.wire)
            validity, upper = self.select(folder)
            metadata[token] = [validity, upper, sorted(a.decode("ascii") for a in folder.attrs),
                               self.digest("delimiter", folder.delimiter or b"")]
            if (upper - 1 + self.config.uid_window - 1) // self.config.uid_window > self.config.max_windows:
                raise MailSafetyError("limit")
            for low in range(1, upper, self.config.uid_window):
                uids = self.search(low, min(upper - 1, low + self.config.uid_window - 1))
                if len(messages) + len(uids) > self.config.max_messages:
                    raise MailSafetyError("limit")
                for start in range(0, len(uids), self.config.batch):
                    for uid, (raw, flags, date, size) in self.fetch(uids[start:start+self.config.batch]).items():
                        headers = message_headers(raw, self.digest)
                        content, service, body_ok = self.digest("content", raw), False, False
                        candidate = token == roles["closed"] or (token == roles["sent"] and headers["service_header"])
                        if candidate and size <= self.config.max_body:
                            full, full_flags, full_date, full_size = self.fetch([uid], full=True)[uid]
                            if flags != full_flags or date != full_date or size != full_size or len(full) != size:
                                raise MailSafetyError("changed")
                            full_headers = full.split(b"\r\n\r\n", 1)[0] + b"\r\n\r\n"
                            if full_headers != raw:
                                raise MailSafetyError("changed")
                            content, body_ok = self.digest("content", full), True
                            service = token == roles["sent"] and headers["valid"] and service_message(full)
                        message = Message(token, validity, uid, flags, date, size, content, headers["mid"],
                            headers["refs"], headers["participants"], headers["subject"], headers["valid"], service, body_ok)
                        messages[message.identity] = message
            if (validity, upper) != self.select(folder):
                raise MailSafetyError("changed")
        return Snapshot(folders, roles, metadata, messages, capabilities)

    def finish(self):
        if self.client is None:
            return
        # Never use IMAP.close(), __exit__ or plain EXPUNGE, including error cleanup.
        try:
            remaining = self.budget.remaining()
            if getattr(self.client, "sock", None) is not None:
                self.client.sock.settimeout(min(.2, remaining))
            self.client.logout()
        except Exception:
            try:
                self.client.shutdown()
            except Exception:
                pass
        finally:
            self.client = None
