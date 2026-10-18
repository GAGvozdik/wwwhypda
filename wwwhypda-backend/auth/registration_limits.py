"""DB-backed registration challenge budget. Caller holds common lock then User lock.

Three issue operations per 15 minutes cover registration, duplicate registration and
resend alike. Five wrong attempts per current challenge. No reset-flow side effects.
"""
from datetime import datetime, timedelta, timezone
import hmac
import secrets
from common_defenitions import db
from auth.auth_models import ConfirmationCode, RegistrationLimit

MAX_ATTEMPTS = 5
MAX_ISSUES = 3
WINDOW = timedelta(minutes=15)


def instant(value):
    return value.replace(tzinfo=timezone.utc) if value is not None and value.tzinfo is None else value


def eligible(user):
    return user is not None and user.active is False and user.registration_completed is False


def budget(user):
    row=RegistrationLimit.query.filter_by(user_id=user.id).with_for_update().first()
    if row is None:
        row=RegistrationLimit(user_id=user.id,failed_attempts=0,sent_count=0)
        db.session.add(row);db.session.flush()
    return row


def issue_code(user, now=None):
    if not eligible(user):
        return None
    now=now or datetime.now(timezone.utc)
    row=budget(user)
    start=instant(row.window_started)
    if start is None or now >= start + WINDOW:
        row.window_started=now;row.sent_count=0
    elif start > now:
        return None  # Clock rollback cannot open another delivery window.
    if row.sent_count >= MAX_ISSUES:
        return None
    old_codes={r.code for r in ConfirmationCode.query.filter_by(email=user.email,type='registration')}
    code=None
    for _ in range(10):
        candidate=str(secrets.randbelow(900000)+100000)
        if candidate not in old_codes:
            code=candidate;break
    if code is None:
        return None
    ConfirmationCode.query.filter_by(email=user.email,type='registration').delete(synchronize_session='fetch')
    challenge=ConfirmationCode(email=user.email,code=code,type='registration',created_at=now)
    db.session.add(challenge);db.session.flush()
    row.challenge_id=challenge.id;row.failed_attempts=0;row.sent_count+=1
    return challenge


def verify_code(user, supplied, now=None):
    if not eligible(user):
        return False
    now=now or datetime.now(timezone.utc)
    row=budget(user)
    if row.challenge_id is None:
        # Existing pre-migration challenges are adopted lazily, without invented send history.
        latest=ConfirmationCode.query.filter_by(email=user.email,type='registration').order_by(ConfirmationCode.id.desc()).first()
        if latest is None:
            return False
        row.challenge_id=latest.id;row.failed_attempts=0
    challenge=ConfirmationCode.query.filter_by(id=row.challenge_id,email=user.email,type='registration').with_for_update().first()
    created=instant(challenge.created_at) if challenge else None
    ttl=ConfirmationCode.ttl_seconds('registration')
    if (created is None or ttl is None or not created <= now < created+timedelta(seconds=ttl)
            or row.failed_attempts >= MAX_ATTEMPTS):
        return False
    if not isinstance(supplied,str) or not hmac.compare_digest(challenge.code,supplied):
        row.failed_attempts+=1
        return False
    return True
