"""Отзыв старых JWT и проверка актуального аккаунта для всех защищённых маршрутов."""
import hmac
from flask import g, jsonify
from auth.auth_models import User


def configure_session_security(jwt):
    @jwt.token_in_blocklist_loader
    def deleted_or_inactive_account(_header, payload):
        identity = payload.get("sub")
        if not isinstance(identity, str) or not identity.isdecimal():
            return True
        # Блокировка сериализует защищённые операции с удалением аккаунта в users_db.
        user = User.query.filter_by(id=int(identity)).populate_existing().with_for_update().first()
        g.auth_user = user
        if user is None or not user.active:
            return True
        version = payload.get("account_version")
        return not isinstance(version, str) or not hmac.compare_digest(version, user.session_version())

    @jwt.revoked_token_loader
    def revoked_account(_header, _payload):
        user = getattr(g, "auth_user", None)
        code = "account_unavailable" if user is None else (
            "account_inactive" if not user.active else "session_version_invalid")
        return jsonify(message="Session is no longer valid", code=code), 401
