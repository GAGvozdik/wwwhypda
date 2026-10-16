"""Flask extensions and operations controlled by application settings."""
import time
import math

import requests
from flask import current_app, jsonify
from flask_mail import Message
from smtp_transport import VerifiedMail
from flask_sqlalchemy import SQLAlchemy
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

mail = VerifiedMail()
db = SQLAlchemy()
limiter = Limiter(key_func=get_remote_address)


def error_message(error):
    current_app.logger.error("Request failed (%s)", type(error).__name__)
    return "Request could not be completed"


def send_auth_email(subject, recipient, body):
    if current_app.config["MAIL_DELIVERY_MODE"] == "log":
        current_app.logger.info("Authentication email delivery skipped in local log mode")
        return
    mail.send(Message(subject, sender=current_app.config["MAIL_DEFAULT_SENDER"], recipients=[recipient], body=body))


def verify_recaptcha(recaptcha_token, expected_actions):
    """Endpoint chooses action; Google enforces expiry/one-use, exact domain checked here."""
    config = current_app.config
    failure = lambda: (False, (jsonify(message="Verification failed"), 400))
    actions = (expected_actions,) if isinstance(expected_actions, str) else tuple(expected_actions)
    if not actions or any(not isinstance(action, str) or not action for action in actions):
        return failure()
    if config.get("APP_ENV") == "production" and config.get("TESTING"):
        return failure()
    if config.get("TESTING") is True and recaptcha_token == "test-token":
        return True, None
    if not config.get("RECAPTCHA_ENABLED"):
        return failure() if config.get("APP_ENV") == "production" else (True, None)
    if not isinstance(recaptcha_token, str) or not recaptcha_token.strip() or not config.get("RECAPTCHA_SECRET_KEY"):
        return failure()
    allowed_hosts = config.get("RECAPTCHA_ALLOWED_HOSTNAMES", ())
    if not isinstance(allowed_hosts, (set, frozenset)) or not allowed_hosts:
        current_app.logger.error("CAPTCHA hostname policy is not configured")
        return failure()
    for attempt in range(config["RECAPTCHA_RETRIES"]):
        try:
            response = requests.post(config["RECAPTCHA_VERIFY_URL"],
                data={"secret": config["RECAPTCHA_SECRET_KEY"], "response": recaptcha_token},
                timeout=config["RECAPTCHA_TIMEOUT_SECONDS"])
            response.raise_for_status()
            result = response.json()
            score = result.get("score") if isinstance(result, dict) else None
            if (isinstance(result, dict) and result.get("success") is True
                    and not result.get("error-codes") and not result.get("error")
                    and isinstance(score, (int, float)) and not isinstance(score, bool)
                    and math.isfinite(score) and config["RECAPTCHA_MIN_SCORE"] <= score <= 1
                    and result.get("action") in actions
                    and isinstance(result.get("hostname"), str)
                    and result["hostname"] in allowed_hosts):
                return True, None
            # Do not log response bodies, arbitrary provider fields, identifiers or token/secret.
            current_app.logger.warning("CAPTCHA verification rejected")
            return failure()
        except (requests.exceptions.RequestException, ValueError):
            current_app.logger.warning("CAPTCHA verification request failed")
            if attempt + 1 < config["RECAPTCHA_RETRIES"]:
                time.sleep(config["RECAPTCHA_RETRY_DELAY_SECONDS"])
    return failure()
