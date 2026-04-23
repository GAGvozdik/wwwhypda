"""Module for initializing global Flask extensions.

This module defines global instances of Flask extensions (Flask-Mail and SQLAlchemy)
to be initialized separately from the main application. 

By defining these instances here and initializing them in the main application, 
we avoid circular imports when splitting the application into multiple modules.
"""

from flask_mail import Mail
from flask_sqlalchemy import SQLAlchemy
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import os
import requests
import time
from flask import current_app, jsonify

# Create instances of Flask extensions without binding them to the app.
# This allows importing these objects across different modules without 
# causing circular dependency issues.

mail = Mail()  # Mail instance for handling email-related functionality.
db = SQLAlchemy()  # SQLAlchemy instance for database interactions.
limiter = Limiter(key_func=get_remote_address, default_limits=["40000 per day", "6800 per hour"], storage_uri="memory://")


def verify_recaptcha(recaptcha_token, retries=3, delay=1):
    if current_app.config.get('TESTING') and recaptcha_token == 'test-token':
        return True, None

    if not recaptcha_token:
        return False, (jsonify(message="Verification failed"), 400)

    secret_key = os.getenv('RECAPTCHA_SECRET_KEY')
    if not secret_key:
        logger.error("RECAPTCHA_SECRET_KEY is missing")
        return False, (jsonify(message="Verification failed"), 400)

    verification_url = "https://www.google.com/recaptcha/api/siteverify"
    payload = {
        'secret': secret_key,
        'response': recaptcha_token
    }

    for attempt in range(retries):
        try:
            response = requests.post(verification_url, data=payload, timeout=5)
            response.raise_for_status()
            result = response.json()

            if result.get('success') and result.get('score', 0.0) >= 0.5:
                return True, None
            else:
                logger.warning(f"Recaptcha failed: {result}")
                return False, (jsonify(message="Verification failed"), 400)

        except requests.exceptions.RequestException as e:
            logger.exception("Recaptcha request failed")

            if attempt < retries - 1:
                time.sleep(delay)
            else:
                return False, (jsonify(message="Verification failed"), 400)