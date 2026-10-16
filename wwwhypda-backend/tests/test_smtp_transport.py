"""Synthetic SMTP only: no env files, real mail, working DB or network."""
import ssl
import unittest
from unittest.mock import patch

from flask import Flask
from flask_mail import Message
from smtp_transport import VerifiedMail, validate_mail_config


class SmtpTransportTests(unittest.TestCase):
    def settings(self, **overrides):
        return dict(MAIL_SERVER="smtp.mail.ovh.net", MAIL_PORT=465,
            MAIL_USE_SSL=True, MAIL_USE_TLS=False, MAIL_USERNAME="support@example.test",
            MAIL_PASSWORD="synthetic-only", MAIL_DEFAULT_SENDER="support@example.test",
            MAIL_DELIVERY_MODE="smtp", MAIL_SUPPRESS_SEND=False, **overrides)

    def test_ovh_configuration_and_local_log_mode(self):
        validate_mail_config(self.settings())
        validate_mail_config(dict(self.settings(), MAIL_DELIVERY_MODE="log", MAIL_PASSWORD=""))
        for changes in ({"MAIL_USE_TLS": True}, {"MAIL_PORT": 587},
                {"MAIL_USE_SSL": False}, {"MAIL_PASSWORD": ""},
                {"MAIL_DEFAULT_SENDER": "old@example.test"}, {"MAIL_SUPPRESS_SEND": True}):
            with self.subTest(changes=changes), self.assertRaises(ValueError) as failure:
                validate_mail_config(dict(self.settings(), **changes))
            self.assertNotIn("synthetic-only", str(failure.exception))

    def test_ssl_verifies_certificate_and_sends_with_existing_library(self):
        app = Flask(__name__)
        app.config.update(self.settings(), TESTING=False, MAIL_DEBUG=True)
        mail = VerifiedMail(app)
        with app.app_context(), patch("smtp_transport.smtplib.SMTP_SSL") as smtp, patch("smtp_transport.smtplib.SMTP") as plain:
            mail.send(Message("Synthetic", recipients=["recipient@example.test"], body="synthetic body"))
            args, kwargs = smtp.call_args
            self.assertEqual(args, ("smtp.mail.ovh.net", 465))
            self.assertEqual(kwargs["context"].verify_mode, ssl.CERT_REQUIRED)
            self.assertTrue(kwargs["context"].check_hostname)
            smtp.return_value.login.assert_called_once_with("support@example.test", "synthetic-only")
            smtp.return_value.set_debuglevel.assert_called_once_with(0)
            smtp.return_value.sendmail.assert_called_once()
            plain.assert_not_called()

    def test_smtp_failure_does_not_try_gmail_or_plaintext(self):
        app = Flask(__name__)
        app.config.update(self.settings())
        mail = VerifiedMail(app)
        for error in (ssl.SSLCertVerificationError("synthetic"), OSError("synthetic")):
            with app.app_context(), patch("smtp_transport.smtplib.SMTP_SSL", side_effect=error) as smtp, patch("smtp_transport.smtplib.SMTP") as plain:
                with self.assertRaises(type(error)):
                    mail.send(Message("Synthetic", recipients=["recipient@example.test"], body="test"))
                smtp.assert_called_once()
                plain.assert_not_called()

    def test_login_failure_closes_connection_without_fallback(self):
        app = Flask(__name__)
        app.config.update(self.settings())
        mail = VerifiedMail(app)
        with app.app_context(), patch("smtp_transport.smtplib.SMTP_SSL") as smtp:
            smtp.return_value.login.side_effect = OSError("synthetic")
            with self.assertRaises(OSError):
                mail.send(Message("Synthetic", recipients=["recipient@example.test"], body="test"))
            smtp.assert_called_once()
            smtp.return_value.close.assert_called_once()

    def test_starttls_also_uses_verified_context(self):
        app = Flask(__name__)
        app.config.update(dict(self.settings(), MAIL_SERVER="smtp.example.test", MAIL_PORT=587, MAIL_USE_SSL=False, MAIL_USE_TLS=True))
        mail = VerifiedMail(app)
        with app.app_context(), patch("smtp_transport.smtplib.SMTP") as smtp:
            mail.send(Message("Synthetic", recipients=["recipient@example.test"], body="test"))
            context = smtp.return_value.starttls.call_args.kwargs["context"]
            self.assertEqual(context.verify_mode, ssl.CERT_REQUIRED)
            self.assertTrue(context.check_hostname)


if __name__ == "__main__":
    unittest.main()
