"""Module for initializing global Flask extensions.

This module defines global instances of Flask extensions (Flask-Mail and SQLAlchemy)
to be initialized separately from the main application. 

By defining these instances here and initializing them in the main application, 
we avoid circular imports when splitting the application into multiple modules.
"""

from flask_mail import Mail
from flask_sqlalchemy import SQLAlchemy
import os
import requests
import time
from flask import current_app, jsonify

# Create instances of Flask extensions without binding them to the app.
# This allows importing these objects across different modules without 
# causing circular dependency issues.

mail = Mail()  # Mail instance for handling email-related functionality.
db = SQLAlchemy()  # SQLAlchemy instance for database interactions.


def verify_recaptcha(recaptcha_token, retries=3, delay=1):
    """Verifies a reCAPTCHA token with Google's API with retry logic."""
    
    # Bypass verification in testing mode if a specific test token is provided.
    if current_app.config.get('TESTING') and recaptcha_token == 'test-token':
        return True, None

    if not recaptcha_token:
        return False, (jsonify(message="reCAPTCHA token is missing"), 400)

    secret_key = os.getenv('RECAPTCHA_SECRET_KEY')
    if not secret_key:
        return False, (jsonify(message="Server configuration error"), 500)

    verification_url = f"https://www.google.com/recaptcha/api/siteverify"
    payload = {
        'secret': secret_key,
        'response': recaptcha_token
    }

    for attempt in range(retries):
        try:
            response = requests.post(verification_url, data=payload, timeout=5)
            response.raise_for_status()  # Raise an exception for bad status codes (4xx or 5xx)
            result = response.json()

            if result.get('success') and result.get('score', 0.0) >= 0.5:
                return True, None
            else:
                return False, (jsonify(message="reCAPTCHA verification failed"), 401)
                
        except requests.exceptions.RequestException:
            if attempt < retries - 1:
                time.sleep(delay)
            else:
                return False, (jsonify(message="Error verifying reCAPTCHA"), 500)