"""Private HMAC state, durable intent journal and conservative closure observations."""
from collections import defaultdict
from contextlib import contextmanager
from datetime import datetime, timedelta
import hashlib
import hmac
import json
import os
from pathlib import Path
import secrets
import sqlite3
import stat

from maintenance.mail_common import MailSafetyError, UTC, old_enough, SUPPORT_RETENTION_MONTHS


def private_file(path, create=False):
    flags = os.O_RDWR | getattr(os, "O_NOFOLLOW", 0)
    if create:
        flags |= os.O_CREAT
    fd = os.open(path, flags, 0o600)
    info = os.fstat(fd)
    if not stat.S_ISREG(info.st_mode) or info.st_uid != os.getuid() or stat.S_IMODE(info.st_mode) != 0o600 or info.st_nlink != 1:
        os.close(fd)
        raise MailSafetyError("state")
    return fd


class State:
    def __init__(self, directory):
        self.directory = Path(directory)
        self.db = None
        self.lock = None
        self.fresh = False

    def __enter__(self):
        import fcntl
        previous = os.umask(0o077)
        try:
            self.directory.mkdir(mode=0o700, parents=True, exist_ok=True)
            info = self.directory.stat()
            if self.directory.resolve() != self.directory.absolute() or info.st_uid != os.getuid() or stat.S_IMODE(info.st_mode) != 0o700:
                raise MailSafetyError("state")
            self.lock = private_file(self.directory / "mail.lock", create=True)
            try:
                fcntl.flock(self.lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError:
                raise MailSafetyError("locked") from None
            self.open()
            return self
        except Exception:
            self.__exit__(None, None, None)
            raise
        finally:
            os.umask(previous)

    def digest(self, label, value):
        raw = value if isinstance(value, bytes) else str(value).encode("utf-8")
        return hmac.new(self.key, label.encode("ascii") + b"\0" + raw, hashlib.sha256).hexdigest()

    def _read(self, path):
        fd = private_file(path)
        with os.fdopen(fd, "rb") as stream:
            return stream.read()

    def _atomic(self, name, raw):
        temporary = self.directory / (name + ".tmp-" + secrets.token_hex(8))
        fd = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        try:
            with os.fdopen(fd, "wb") as stream:
                stream.write(raw); stream.flush(); os.fsync(stream.fileno())
            os.replace(temporary, self.directory / name)
            descriptor = os.open(self.directory, os.O_RDONLY)
            try:
                os.fsync(descriptor)
            finally:
                os.close(descriptor)
        finally:
            temporary.unlink(missing_ok=True)

    def _checkpoint(self):
        digest = hashlib.sha256((self.directory / "state.sqlite3").read_bytes()).hexdigest()
        self._atomic("state.witness", json.dumps({"digest": digest, "mac": self.digest("witness", digest)}).encode())

    def open(self):
        key_path, db_path, witness_path = (self.directory / name for name in ("state.key", "state.sqlite3", "state.witness"))
        valid = False
        try:
            self.key = self._read(key_path)
            if len(self.key) != 32:
                raise ValueError()
            witness = json.loads(self._read(witness_path))
            db_digest = hashlib.sha256(self._read(db_path)).hexdigest()
            valid = hmac.compare_digest(witness["digest"], db_digest) and hmac.compare_digest(witness["mac"], self.digest("witness", db_digest))
        except (FileNotFoundError, ValueError, KeyError, TypeError, sqlite3.Error):
            pass
        if not valid:
            self.fresh = True
            suffix = ".untrusted-" + secrets.token_hex(8)
            for path in (key_path, db_path, witness_path):
                if path.exists():
                    # Permission/symlink failures are never hidden by a reset.
                    fd = private_file(path); os.close(fd)
                    destination = path.with_name(path.name + suffix)
                    path.rename(destination)
                    os.utime(destination, None)
            self.key = secrets.token_bytes(32)
            self._atomic("state.key", self.key)
            fd = private_file(db_path, create=True); os.close(fd)
        self.db = sqlite3.connect(db_path, isolation_level=None)
        try:
            if self.db.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
                raise MailSafetyError("state")
            self.db.execute("PRAGMA journal_mode=DELETE")
            self.db.execute("PRAGMA synchronous=FULL")
            self.db.executescript("""
                CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS threads (
                    token TEXT PRIMARY KEY, status TEXT NOT NULL, closed_at TEXT,
                    composition TEXT NOT NULL, outside_seen INTEGER NOT NULL, observed_at TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS members (mid TEXT PRIMARY KEY, token TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS copies (
                    token TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, first_seen TEXT NOT NULL, observed_at TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS operations (
                    id INTEGER PRIMARY KEY, created_at TEXT NOT NULL, phase TEXT NOT NULL,
                    folder TEXT NOT NULL, validity INTEGER NOT NULL, uid INTEGER NOT NULL,
                    fingerprint TEXT NOT NULL, outcome TEXT NOT NULL);
            """)
            self._checkpoint()
        except sqlite3.Error:
            raise MailSafetyError("state") from None

    @contextmanager
    def transaction(self):
        self.db.execute("BEGIN IMMEDIATE")
        try:
            yield
            self.db.execute("COMMIT")
            self._checkpoint()
        except BaseException:
            if self.db.in_transaction:
                self.db.execute("ROLLBACK")
            raise

    def baseline(self):
        with self.transaction():
            self.db.execute("DELETE FROM threads")
            self.db.execute("DELETE FROM members")
            self.db.execute("DELETE FROM copies")
            self.db.execute("UPDATE operations SET outcome='abandoned' WHERE outcome='pending'")
        self.fresh = True

    def namespace(self, identity):
        previous = self.db.execute("SELECT value FROM meta WHERE key='namespace'").fetchone()
        if previous is None or previous[0] != identity:
            self.baseline()
            with self.transaction():
                self.db.execute("INSERT OR REPLACE INTO meta VALUES ('namespace',?)", (identity,))

    def observe_copies(self, snapshot, now):
        ages = {}
        with self.transaction():
            for message in snapshot.messages.values():
                if not message.service:
                    continue
                token = self.digest("copy", message.identity)
                fingerprint = self.digest("copy_content", message.content + str(message.date))
                row = self.db.execute("SELECT fingerprint,first_seen FROM copies WHERE token=?", (token,)).fetchone()
                first = row[1] if row and row[0] == fingerprint else now.isoformat()
                self.db.execute("INSERT OR REPLACE INTO copies VALUES (?,?,?,?)", (token,fingerprint,first,now.isoformat()))
                ages[message.identity] = datetime.fromisoformat(first)
        return ages

    def intent(self, message, now):
        with self.transaction():
            cursor = self.db.execute("INSERT INTO operations (created_at,phase,folder,validity,uid,fingerprint,outcome) VALUES (?,?,?,?,?,?,?)",
                (now.isoformat(), "intent", message.folder, message.validity, message.uid, message.content, "pending"))
            return cursor.lastrowid

    def outcome(self, op, phase, outcome="pending"):
        with self.transaction():
            self.db.execute("UPDATE operations SET phase=?,outcome=? WHERE id=?", (phase, outcome, op))

    def reconcile(self, snapshot):
        unresolved = 0
        for op, folder, validity, uid, fingerprint in self.db.execute(
                "SELECT id,folder,validity,uid,fingerprint FROM operations WHERE outcome='pending'").fetchall():
            current_meta = snapshot.metadata.get(folder)
            identity = f"{folder}:{validity}:{uid}"
            message = snapshot.messages.get(identity)
            if not current_meta or current_meta[0] != validity:
                unresolved += 1
            elif message is None:
                self.outcome(op, "reconciled_absent", "absent")
            elif message.content == fingerprint and b"\\DELETED" not in message.flags:
                self.outcome(op, "reconciled_retained", "retained")
            else:
                unresolved += 1
        return unresolved

    def prune(self, now):
        with self.transaction():
            self.db.execute("DELETE FROM copies WHERE observed_at < ?", ((now-timedelta(days=90)).isoformat(),))
            self.db.execute("DELETE FROM operations WHERE outcome != 'pending' AND created_at < ?", ((now-timedelta(days=30)).isoformat(),))
            old = self.db.execute("SELECT token FROM threads WHERE observed_at < ?", ((now-timedelta(days=90)).isoformat(),)).fetchall()
            for (token,) in old:
                self.db.execute("DELETE FROM members WHERE token=?", (token,))
                self.db.execute("DELETE FROM threads WHERE token=?", (token,))
        for path in self.directory.glob("*.untrusted-*"):
            if now.timestamp() - path.stat().st_mtime > 30*86400:
                fd = private_file(path); os.close(fd); path.unlink()

    def __exit__(self, *_args):
        if self.db is not None:
            self.db.close(); self.db = None
        if self.lock is not None:
            os.close(self.lock); self.lock = None


def graph(snapshot):
    """Connections are technical references, never positive grouping by subject/people."""
    messages = snapshot.messages
    by_mid = defaultdict(list)
    for message in messages.values():
        if message.mid:
            by_mid[message.mid].append(message.identity)
    edges = defaultdict(set)
    unsafe = set()
    draft_unknown = False
    for message in messages.values():
        if not message.valid or not message.mid or len(by_mid[message.mid]) != 1:
            unsafe.add(message.identity)
        if (message.folder == snapshot.roles["drafts"] or b"\\DRAFT" in message.flags) and not message.refs:
            draft_unknown = True
        for reference in message.refs:
            matches = by_mid.get(reference, [])
            if len(matches) != 1:
                unsafe.add(message.identity)
            for identity in matches:
                edges[message.identity].add(identity)
                edges[identity].add(message.identity)
        if message.mid in message.refs:
            unsafe.add(message.identity)
    # Detect directed cycles even when every referenced message exists.
    active, visited = set(), set()
    def visit(identity):
        if identity in active:
            unsafe.update(active)
            return
        if identity in visited:
            return
        active.add(identity)
        for reference in messages[identity].refs:
            for linked in by_mid.get(reference, []):
                visit(linked)
        active.remove(identity); visited.add(identity)
    for identity in messages:
        visit(identity)
    components, seen = [], set()
    for identity in messages:
        if identity in seen:
            continue
        stack, component = [identity], []
        while stack:
            current = stack.pop()
            if current in seen:
                continue
            seen.add(current); component.append(messages[current])
            stack.extend(edges[current]-seen)
        components.append(component)
    # Suspected reference-less replies only veto; never merge unrelated subjects.
    for i, first in enumerate(components):
        for second in components[i+1:]:
            if any(not (a.service and b.service) and a.subject and a.subject == b.subject and a.participants & b.participants for a in first for b in second):
                unsafe.update(m.identity for m in first + second)
    if draft_unknown:
        unsafe.update(messages)
    return components, unsafe, draft_unknown


def observe(state, snapshot, now, reclose=None):
    components, unsafe, draft_unknown = graph(snapshot)
    counts = dict(open=0, closed=0, reopened=0, expired=0, unsafe=0)
    states, observed = {}, set()
    support_blocked = draft_unknown or not snapshot.roles["closed"] or not snapshot.roles["drafts"] or any(not m.valid for m in snapshot.messages.values())
    closed_messages = [m for m in snapshot.messages.values() if m.folder == snapshot.roles["closed"]]
    counts.update(
        invalid_headers=sum(not m.valid for m in snapshot.messages.values()),
        ambiguous_drafts=int(draft_unknown),
        closed_unread_bodies=sum(not m.body_ok for m in closed_messages),
        closed_invalid_dates=sum(not m.date or m.date > now for m in closed_messages),
        closed_unsafe_links=sum(m.identity in unsafe for m in closed_messages),
        closed_marked=sum(bool(m.flags & {b"\\DELETED", b"\\DRAFT"}) for m in closed_messages),
        support_observation_blocked=bool(support_blocked))

    with state.transaction():
        for component in components:
            mids = sorted({m.mid for m in component if m.mid})
            previous_keys = {row[0] for mid in mids for row in state.db.execute("SELECT token FROM members WHERE mid=?", (mid,))}
            key = min(previous_keys) if previous_keys else state.digest("thread", json.dumps(mids or [m.identity for m in component]))
            previous = state.db.execute("SELECT status,closed_at,composition,outside_seen FROM threads WHERE token=?", (key,)).fetchone()
            composition = state.digest("composition", json.dumps([[m.identity,m.content,m.date.isoformat() if m.date else None,m.size]
                for m in sorted(component,key=lambda item:item.identity)]))
            all_closed = all(m.folder == snapshot.roles["closed"] for m in component)
            all_outside = all(m.folder != snapshot.roles["closed"] for m in component)
            safe = not support_blocked and all(m.valid and m.body_ok and m.date and m.date <= now and
                m.identity not in unsafe and b"\\DELETED" not in m.flags and b"\\DRAFT" not in m.flags for m in component)
            old_status, closed_at, old_composition, outside_seen = previous or ("open", None, "", False)
            if not safe and all_closed:
                status, closed_at = "unsafe", None
            elif all_closed:
                changed = previous and (composition != old_composition or len(previous_keys) > 1)
                if reclose == key and safe:
                    status, closed_at, outside_seen = "recently_closed", now.isoformat(), False
                elif old_status in ("reopened", "unsafe") or (old_status in ("recently_closed", "expired") and changed):
                    if outside_seen:
                        status, closed_at, outside_seen = "recently_closed", now.isoformat(), False
                    else:
                        status, closed_at = "reopened", None
                elif old_status == "open":
                    status, closed_at, outside_seen = "recently_closed", now.isoformat(), False
                else:
                    status = "expired" if closed_at and old_enough(datetime.fromisoformat(closed_at), now, SUPPORT_RETENTION_MONTHS) else "recently_closed"
            else:
                status = "reopened" if old_status != "open" else "open"
                closed_at = None
                outside_seen = bool(outside_seen or all_outside)
            state.db.execute("INSERT OR REPLACE INTO threads VALUES (?,?,?,?,?,?)",
                (key,status,closed_at,composition,int(outside_seen),now.isoformat()))
            for mid in mids:
                state.db.execute("INSERT OR REPLACE INTO members VALUES (?,?)",(mid,key))
            for merged in previous_keys-{key}:
                state.db.execute("UPDATE members SET token=? WHERE token=?", (key,merged))
                state.db.execute("DELETE FROM threads WHERE token=?", (merged,))
            observed.add(key); states[key]=status
            counts["closed" if status=="recently_closed" else status] += 1
        for key, in state.db.execute("SELECT token FROM threads").fetchall():
            if key not in observed:
                state.db.execute("UPDATE threads SET status='reopened',closed_at=NULL,outside_seen=1 WHERE token=?", (key,))
    if reclose and states.get(reclose) != "recently_closed":
        raise MailSafetyError("state")
    return counts, components, unsafe
