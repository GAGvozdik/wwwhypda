"""Текущая редакция договора; синхронизировать с frontend при выпуске."""
from datetime import datetime, timezone
from flask import jsonify

CURRENT_TERMS_VERSION = "2026-10-18.2"


def current_version():
    return CURRENT_TERMS_VERSION


def _known_time(value):
    if not isinstance(value, datetime):
        return False
    if value.tzinfo is None:  # SQLite preserves the original UTC instant without tzinfo.
        value = value.replace(tzinfo=timezone.utc)
    return value <= datetime.now(timezone.utc)


def has_current_acceptance(user, version=None):
    from auth.auth_models import UserAgreementAcceptance
    version = current_version() if version is None else version
    if user.terms_version == version and _known_time(user.terms_accepted_at):
        return True
    record = UserAgreementAcceptance.query.filter_by(user_id=user.id, version=version).first()
    return record is not None and _known_time(record.accepted_at)


def record_acceptance(user, version, accepted_at=None):
    """Caller holds common/User locks. Never overwrite original facts or an existing row."""
    from common_defenitions import db
    from auth.auth_models import UserAgreementAcceptance
    record = UserAgreementAcceptance.query.filter_by(user_id=user.id, version=version).first()
    if record is None:
        record = UserAgreementAcceptance(user_id=user.id, version=version,
            accepted_at=accepted_at or datetime.now(timezone.utc))
        db.session.add(record)
    return record


def document_package():
    version = current_version()
    return dict(terms_version=version, documents=[
        dict(slug=slug, title=title, url="/"+slug, pdf="/legal/"+slug+"-"+version+".pdf")
        for slug,title in (("user-agreement","User Agreement"),
            ("privacy-policy","Privacy Policy"),("cookie-policy","Cookie Policy"))])


def acceptance_response(code="terms_acceptance_required"):
    from auth.validate import messages
    return jsonify(message=messages[code], code=code, **document_package()), 409
