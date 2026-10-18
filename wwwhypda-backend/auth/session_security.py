"""Отзыв старых JWT и проверка актуального аккаунта для всех защищённых маршрутов."""
import hmac
from flask import g, jsonify, request
from auth import terms
from auth.auth_models import User


def configure_session_security(jwt):
    @jwt.token_in_blocklist_loader
    def deleted_or_inactive_account(_header, payload):
        g.auth_user = None
        g.auth_terms_required = False
        identity = payload.get("sub")
        if not isinstance(identity, str) or not identity.isdecimal():
            return True
        # Блокировка сериализует защищённые операции с удалением аккаунта в users_db.
        from auth.transaction_lock import lock_users_transaction
        lock_users_transaction()
        user = User.query.filter_by(id=int(identity)).populate_existing().with_for_update().first()
        g.auth_user = user
        if user is None or not user.active:
            return True
        version = payload.get("account_version")
        if not isinstance(version, str) or not hmac.compare_digest(version, user.session_version()):
            return True
        from auth.sessions import valid_session
        if not valid_session(user, payload):
            return True
        # JWT/active/version (and cookie CSRF) remain prior to the terms gate.
        if request.endpoint not in {"users.logout", "users.delete_own_account"} and not terms.has_current_acceptance(user):
            g.auth_terms_required = True
            return True
        return False

    @jwt.revoked_token_loader
    def revoked_account(_header, _payload):
        if getattr(g, "auth_terms_required", False):
            return terms.acceptance_response()
        user = getattr(g, "auth_user", None)
        code = "account_unavailable" if user is None else (
            "account_inactive" if not user.active else "session_version_invalid")
        return jsonify(message="Session is no longer valid", code=code), 401
