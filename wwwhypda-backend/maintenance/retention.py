"""UTC calendar retention, bounded transactions and aggregate-only dry-run."""
from calendar import monthrange
from datetime import datetime, timedelta, timezone
from sqlalchemy import or_
from common_defenitions import db
from auth.auth_models import User, ConfirmationCode
from auth.transaction_lock import lock_users_transaction
from inputData.inputDataModels import InputData
from auth.migrate_retention import migrate

REGISTRATION_MONTHS = 1
SUBMISSION_MONTHS = 6
MAX_INTERVAL_SECONDS = 3600
BATCH_SIZE = 100


def utc(value):
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


def add_months(value, months):
    value = utc(value)
    year, month = divmod(value.year * 12 + value.month - 1 + months, 12)
    month += 1
    return value.replace(year=year, month=month, day=min(value.day, monthrange(year, month)[1]))


def expired(value, months, now):
    return value is not None and utc(value) <= now and add_months(value, months) <= now


def validate_interval(value):
    value = int(value)
    if not 0 < value <= MAX_INTERVAL_SECONDS:
        raise ValueError("DATA_RETENTION_CLEANUP_INTERVAL_SECONDS must be between 1 and 3600")
    return value


def check_schema():
    engine = db.engines["users_db"]
    if engine.dialect.name == "postgresql":
        migrate(engine, check=True)
    else:
        from sqlalchemy import inspect
        inspector = inspect(engine)
        columns = {c["name"] for c in inspector.get_columns("users")}
        if not {"registered_at", "registration_completed"} <= columns:
            from auth.migrate_terms_acceptance import SchemaError
            raise SchemaError("Миграция retention ещё не применена.")


def account_eligible(user, now):
    return (user.active is False and user.registration_completed is False
            and not user.is_superuser and expired(user.registered_at, REGISTRATION_MONTHS, now))


def delete_account_data(user):
    """Caller holds transaction/User locks; caller commits or rolls back all data."""
    submissions = InputData.query.filter_by(user_id=user.id).delete(synchronize_session=False)
    # editing_by copies a reviewer name: never erase ambiguous labels.
    if User.query.filter_by(name=user.name).count() == 1:
        InputData.query.filter_by(editing_by=user.name).update(
            {InputData.editing_by: None}, synchronize_session=False)
    codes = ConfirmationCode.query.filter_by(email=user.email).delete(synchronize_session=False)
    db.session.delete(user)
    return submissions, codes


def cleanup(now=None, execute=False, batch_size=BATCH_SIZE):
    """One now per pass; commits between bounded batches, rollback on any failure.

    Advisory transaction lock precedes row locks everywhere, including JWT guards.
    This also prevents cross-owner editing_by deadlocks during account deletion.
    Keyset scans avoid loading all expired records; exact dates rechecked under lock.
    Dry-run never locks/updates records and returns counts, no identifiers or bodies.
    """
    if not 1 <= batch_size <= BATCH_SIZE:
        raise ValueError("Invalid retention batch size")
    now = utc(now or datetime.now(timezone.utc))
    check_schema()
    result = dict(accounts=0, submissions=0, codes=0, unknown_accounts=0,
                  unknown_submissions=0, protected_superusers=0)
    try:
        result["unknown_accounts"] = User.query.filter(User.active.is_(False), or_(
            User.registration_completed.is_(None), User.registered_at.is_(None))).count()
        result["unknown_submissions"] = InputData.query.filter(InputData.created_at.is_(None)).count()
        result["protected_superusers"] = User.query.filter(User.is_superuser.is_(True),
            User.active.is_(False)).count()
        # Three-day overestimate handles Jan31 -> Feb28 without inverse-month errors.
        for model, field, months in ((User, User.registered_at, REGISTRATION_MONTHS),
                                     (InputData, InputData.created_at, SUBMISSION_MONTHS)):
            ceiling = min(now, add_months(now, -months) + timedelta(days=3))
            if model is InputData:
                ceiling = ceiling.replace(tzinfo=None)
            last_id = 0
            while True:
                if execute:
                    lock_users_transaction()
                query = model.query.filter(model.id > last_id, field <= ceiling).order_by(model.id)
                if model is User:
                    query = query.filter(User.active.is_(False), User.registration_completed.is_(False),
                                         User.is_superuser.is_(False))
                # Only identifiers for candidates; fresh ORM row read after locking.
                ids = [row[0] for row in query.with_entities(model.id).limit(batch_size).all()]
                if not ids:
                    if execute:
                        db.session.commit()
                    break
                for record_id in ids:
                    if model is InputData and execute:
                        owner_id = InputData.query.with_entities(InputData.user_id).filter_by(id=record_id).scalar()
                        User.query.filter_by(id=owner_id).populate_existing().with_for_update().first()
                    fresh = model.query.filter_by(id=record_id).populate_existing()
                    if execute:
                        fresh = fresh.with_for_update()
                    record = fresh.first()
                    if record is None:
                        continue
                    if model is User and account_eligible(record, now):
                        result["accounts"] += 1
                        if execute:
                            owned, codes = delete_account_data(record)
                        else:
                            owned = InputData.query.filter_by(user_id=record.id).count()
                            codes = ConfirmationCode.query.filter_by(email=record.email).count()
                        result["submissions"] += owned
                        result["codes"] += codes
                    elif model is InputData and expired(record.created_at, months, now):
                        # Dry-run account cascades must not count a submission twice.
                        owner = db.session.get(User, record.user_id)
                        if not execute and owner is not None and account_eligible(owner, now):
                            continue
                        result["submissions"] += 1
                        if execute:
                            db.session.delete(record)
                last_id = ids[-1]
                if execute:
                    db.session.commit()
        return result
    except Exception:
        db.session.rollback()
        raise
