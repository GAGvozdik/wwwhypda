"""Opt-in localhost UI fixture. In-memory data, fixed synthetic codes, no SMTP/Google."""
import os
from unittest.mock import patch
from flask import jsonify, send_from_directory
from auth.auth_models import ConfirmationCode
from tests.test_password_reset_privacy import PasswordResetPrivacyTests


def create_preview_code(original, email, code_type, commit=True):
    # Only the preview reuses a fixed code: remove its previous copies before issuing it.
    # Real application code generation and expiry remain unchanged.
    ConfirmationCode.query.filter_by(email=email, type=code_type).delete(synchronize_session="fetch")
    return original(email, code_type, commit=commit)


def main():
    if (os.environ.get("AUTH_PRIVACY_PREVIEW") != "synthetic-local-only"
            or os.environ.get("TEST_AUTH_DATABASE_URI") != "sqlite://"):
        raise RuntimeError("Preview requires explicit isolated SQLite mode")
    fixture = PasswordResetPrivacyTests()
    fixture.setUp()
    app = fixture.app
    app.config.update(APP_ENV="development", TEST_AUTH_MAIL_RESPONSE_SECONDS=1.0,
        TEST_FAILED_LOGIN_RESPONSE_SECONDS=.3, MAIL_DELIVERY_MODE="log", RECAPTCHA_ENABLED=False, JWT_REFRESH_COOKIE_PATH="/api/users/refresh")
    original = app.wsgi_app
    def api_prefix(environ, start_response):
        if environ.get("PATH_INFO", "").startswith("/api/"):
            environ["PATH_INFO"] = environ["PATH_INFO"][4:]
        return original(environ, start_response)
    app.wsgi_app = api_prefix
    @app.get("/")
    @app.get("/<path:path>")
    def frontend(path=""):
        if path.startswith("assets/"):
            return send_from_directory("/preview", path)
        # This fixture has no scientific catalogue. Never return HTML as API data.
        if path.startswith("rocks/"):
            return jsonify([])
        if path not in ("", "login", "register", "forgot-password", "account", "search",
                        "privacy-policy", "cookie-policy", "user-agreement", "about"):
            return jsonify(message="Synthetic preview endpoint unavailable"), 404
        return send_from_directory("/preview", "index.html")
    original_create_code = ConfirmationCode.create_code
    def fresh_preview_code(email, code_type, commit=True):
        return create_preview_code(original_create_code, email, code_type, commit)
    try:
        with patch.object(ConfirmationCode, "create_code", side_effect=fresh_preview_code), patch("auth.authentication.send_auth_code_email", return_value=True), patch("auth.authentication.send_reset_email", return_value=True), patch("auth.auth_models.secrets.randbelow", return_value=23456):
            app.run(host="0.0.0.0", port=5000, debug=False, use_reloader=False)
    finally:
        fixture.tearDown()


if __name__ == "__main__":
    main()
