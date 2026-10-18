"""Synthetic app, no env files, providers or user data. Loaded per Gunicorn worker."""
from tests.test_auth_lifecycle import AccountDeletionTests
from unittest.mock import Mock,patch
import os


def create_app():
    fixture=AccountDeletionTests();fixture.setUp()
    app=fixture.app
    app.config.update(TESTING=False,APP_ENV='production',RECAPTCHA_ALLOWED_HOSTNAMES=frozenset({'localhost'}),
        RECAPTCHA_RETRIES=1, RECAPTCHA_TIMEOUT_SECONDS=1,RECAPTCHA_RETRY_DELAY_SECONDS=0,
        RECAPTCHA_VERIFY_URL='https://www.google.com/recaptcha/api/siteverify',RECAPTCHA_MIN_SCORE=.5)
    response=Mock();response.json.return_value=dict(success=True,score=.9,action='request_password_reset',hostname='localhost')
    app.provider_mock=patch('common_defenitions.requests.post',return_value=response);app.provider_mock.start()
    app.mail_mock=patch('auth.authentication.send_reset_email',return_value=False);app.mail_mock.start()
    # The fixture builds schema/data in an app context; do not retain a scoped DB
    # session in the main worker thread while gthread serves concurrent requests.
    from common_defenitions import db
    db.session.remove();fixture.context.pop()
    app.audit_fixture=fixture
    @app.after_request
    def worker(response):
        response.headers['X-Test-Worker']=str(os.getpid());return response
    return app
