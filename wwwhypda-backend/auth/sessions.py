"""Caller holds common transaction lock, then User, then session rows."""
from datetime import datetime, timedelta, timezone
import secrets
from auth.auth_models import AuthSession, db


def utc(value):
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


def issue(user, seconds):
    record = AuthSession(sid=secrets.token_hex(32), user_id=user.id,
        expires_at=datetime.now(timezone.utc)+timedelta(seconds=seconds))
    db.session.add(record)
    db.session.flush()
    return record.sid


def revoke_all(user_id):
    AuthSession.query.filter_by(user_id=user_id, revoked_at=None).update(
        {AuthSession.revoked_at: datetime.now(timezone.utc)}, synchronize_session='fetch')


def valid_session(user, payload):
    sid = payload.get('sid')
    if not isinstance(sid, str) or len(sid) != 64:
        return False
    record = AuthSession.query.filter_by(sid=sid, user_id=user.id).populate_existing().with_for_update().first()
    return record is not None and record.revoked_at is None and utc(record.expires_at)>datetime.now(timezone.utc)


def revoke_current(payload):
    # Signature/type/expiry/CSRF have already been verified. Never trust JSON user ids.
    from auth.transaction_lock import lock_users_transaction
    from auth.auth_models import User
    lock_users_transaction()
    identity, sid = payload.get('sub'), payload.get('sid')
    if not isinstance(identity, str) or not identity.isdecimal() or not isinstance(sid,str) or len(sid)!=64:
        return False
    user = User.query.filter_by(id=int(identity)).populate_existing().with_for_update().first()
    if user is not None:
        record = AuthSession.query.filter_by(user_id=user.id,sid=sid).with_for_update().first()
        if record is not None and record.revoked_at is None:
            record.revoked_at = datetime.now(timezone.utc)
    db.session.commit()
    return True


def cleanup_expired():
    # Revoked rows remain until the last token could expire.
    return AuthSession.query.filter(AuthSession.expires_at<=datetime.now(timezone.utc)).delete(synchronize_session=False)
