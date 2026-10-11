"""Flask extensions and operations controlled by application settings."""
import time

import requests
from flask import current_app, jsonify
from flask_mail import Mail, Message
from flask_sqlalchemy import SQLAlchemy
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

mail = Mail()
db = SQLAlchemy()
limiter = Limiter(key_func=get_remote_address)


def error_message(error):
    current_app.logger.error("Request failed: %s", error)
    return str(error) if current_app.config["EXPOSE_ERROR_DETAILS"] else "Request could not be completed"


def send_auth_email(subject, recipient, body):
    if current_app.config["MAIL_DELIVERY_MODE"] == "log":
        current_app.logger.info("Local email %s: %s", subject, body)
        return
    mail.send(Message(subject, sender=current_app.config["MAIL_DEFAULT_SENDER"], recipients=[recipient], body=body))


def verify_recaptcha(recaptcha_token):
    config = current_app.config
    if config["TESTING"] and recaptcha_token == "test-token":
        return True, None
    if not config["RECAPTCHA_ENABLED"]:
        return True, None
    failure = lambda: (False, (jsonify(message="Verification failed"), 400))
    if not recaptcha_token or not config["RECAPTCHA_SECRET_KEY"]:
        if not config["RECAPTCHA_SECRET_KEY"]:
            current_app.logger.error("RECAPTCHA_SECRET_KEY is missing")
        return failure()
    for attempt in range(config["RECAPTCHA_RETRIES"]):
        try:
            response = requests.post(config["RECAPTCHA_VERIFY_URL"],
                data={"secret": config["RECAPTCHA_SECRET_KEY"], "response": recaptcha_token},
                timeout=config["RECAPTCHA_TIMEOUT_SECONDS"])
            response.raise_for_status()
            result = response.json()
            if result.get("success") and result.get("score", 0) >= config["RECAPTCHA_MIN_SCORE"]:
                return True, None
            current_app.logger.warning("CAPTCHA verification rejected")
            return failure()
        except (requests.exceptions.RequestException, ValueError):
            current_app.logger.warning("CAPTCHA verification request failed")
            if attempt + 1 < config["RECAPTCHA_RETRIES"]:
                time.sleep(config["RECAPTCHA_RETRY_DELAY_SECONDS"])
    return failure()
