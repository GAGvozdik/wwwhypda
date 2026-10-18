"""Standalone mail retention configuration, clocks and safe error categories."""
import calendar
import dataclasses
from datetime import datetime, timezone
import os
from pathlib import Path
import signal
import time
from contextlib import contextmanager
from zoneinfo import ZoneInfo

OWNER = "support@wwhypdatestdeployversion.it"
UTC = timezone.utc


class MailSafetyError(Exception):
    """Only fixed categories may reach the aggregate report."""
    CATEGORIES = frozenset({"configuration", "protocol", "incomplete", "limit", "deadline", "terminated",
        "locked", "state", "tls_or_login", "changed", "uidplus", "permissions", "pending",
        "support_race_unapproved", "outside_window", "probe_not_authorized",
        "network_dns", "network_timeout", "network_connection", "tls_certificate",
        "tls_handshake", "login_rejected", "login_failed", "connection_failed"})

    def __init__(self, category):
        self.category = category if category in self.CATEGORIES else "protocol"
        super().__init__(self.category)


def flag(env, name, default=False):
    value = env.get(name, "true" if default else "false")
    if value.lower() not in ("true", "false"):
        raise MailSafetyError("configuration")
    return value.lower() == "true"


def integer(env, name, default, minimum, maximum):
    value = env.get(name, str(default))
    if not value.isascii() or not value.isdigit() or not minimum <= int(value) <= maximum:
        raise MailSafetyError("configuration")
    return int(value)


@dataclasses.dataclass(frozen=True)
class Config:
    host: str
    port: int
    username: str = dataclasses.field(repr=False)
    password: str = dataclasses.field(repr=False)
    state_dir: Path
    dry_run: bool = True
    support_delete: bool = False
    sent: str = ""
    closed: str = "WWHYPDA-Closed"
    drafts: str = ""
    batch: int = 100
    max_seconds: int = 900
    timeout: int = 15
    max_folders: int = 100
    max_messages: int = 10000
    max_header: int = 65536
    max_body: int = 131072
    uid_window: int = 5000
    max_windows: int = 1000

    @classmethod
    def from_env(cls, env=None, password=None):
        env = os.environ if env is None else env
        host = env.get("MAIL_CLEANUP_IMAP_HOST", "imap.mail.ovh.net")
        if host != "imap.mail.ovh.net" or env.get("MAIL_CLEANUP_IMAP_PORT", "993") != "993":
            raise MailSafetyError("configuration")
        username = env.get("MAIL_CLEANUP_IMAP_USERNAME", "")
        secret = password or env.get("MAIL_CLEANUP_IMAP_PASSWORD", "")
        if not secret and flag(env, "MAIL_CLEANUP_USE_MAIL_PASSWORD"):
            secret = env.get("MAIL_PASSWORD", "")
        state_dir = Path(env.get("MAIL_CLEANUP_STATE_DIR", ""))
        if not username or not secret or not state_dir.is_absolute() or "\x00" in username:
            raise MailSafetyError("configuration")
        return cls(host, 993, username, secret, state_dir,
            flag(env, "MAIL_CLEANUP_DRY_RUN", True), flag(env, "MAIL_CLEANUP_SUPPORT_DELETE_ENABLED"),
            env.get("MAIL_CLEANUP_SENT_FOLDER", ""), env.get("MAIL_CLEANUP_CLOSED_FOLDER", "WWHYPDA-Closed"),
            env.get("MAIL_CLEANUP_DRAFTS_FOLDER", ""),
            integer(env, "MAIL_CLEANUP_BATCH_SIZE", 100, 1, 100),
            integer(env, "MAIL_CLEANUP_MAX_RUN_SECONDS", 900, 1, 3600),
            integer(env, "MAIL_CLEANUP_IMAP_TIMEOUT_SECONDS", 15, 1, 60),
            integer(env, "MAIL_CLEANUP_MAX_FOLDERS", 100, 1, 500),
            integer(env, "MAIL_CLEANUP_MAX_MESSAGES", 10000, 1, 100000),
            integer(env, "MAIL_CLEANUP_MAX_HEADER_BYTES", 65536, 1024, 1048576),
            integer(env, "MAIL_CLEANUP_MAX_BODY_BYTES", 131072, 1024, 1048576))


SERVICE_RETENTION_MONTHS = 1
SUPPORT_RETENTION_MONTHS = 6


def month_after(value, months=SERVICE_RETENTION_MONTHS):
    if value.tzinfo is None:
        raise MailSafetyError("state")
    value = value.astimezone(UTC)
    if type(months) is not int or months < 1:
        raise MailSafetyError("state")
    year, month_index = divmod(value.year * 12 + value.month - 1 + months, 12)
    month = month_index + 1
    return value.replace(year=year, month=month, day=min(value.day, calendar.monthrange(year, month)[1]))


def old_enough(value, now, months=SERVICE_RETENTION_MONTHS):
    return value is not None and value.tzinfo is not None and value <= now and month_after(value, months) < now


def scheduled_window(now):
    return now.astimezone(ZoneInfo("Europe/Rome")).hour == 1


def execution_seconds(now, maximum):
    local = now.astimezone(ZoneInfo("Europe/Rome"))
    if local.hour != 1:
        raise MailSafetyError("outside_window")
    cutoff = local.replace(hour=2, minute=0, second=0, microsecond=0).astimezone(UTC)
    return min(maximum, (cutoff-now.astimezone(UTC)).total_seconds())


class Budget:
    def __init__(self, seconds, clock=time.monotonic):
        self.clock = clock
        self.end = clock() + seconds

    def remaining(self):
        remaining = self.end - self.clock()
        if remaining <= 0:
            raise MailSafetyError("deadline")
        return remaining


@contextmanager
def process_deadline(seconds):
    # The supported runtime is Linux, including tests. Signals bound slow-trickle reads too.
    if not hasattr(signal, "SIGALRM"):
        raise MailSafetyError("configuration")
    def expired(_signum, _frame):
        raise MailSafetyError("deadline")
    def terminated(_signum, _frame):
        raise MailSafetyError("terminated")
    previous_alarm = signal.signal(signal.SIGALRM, expired)
    previous_term = signal.signal(signal.SIGTERM, terminated)
    signal.setitimer(signal.ITIMER_REAL, seconds)
    try:
        yield
    finally:
        signal.setitimer(signal.ITIMER_REAL, 0)
        signal.signal(signal.SIGALRM, previous_alarm)
        signal.signal(signal.SIGTERM, previous_term)
