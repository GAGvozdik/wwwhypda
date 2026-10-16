"""Flask-Mail transport with verified TLS and no secondary SMTP provider."""
import smtplib
import ssl
from email.utils import parseaddr

from flask import current_app
from flask_mail import Connection, Mail


def validate_mail_config(config):
    """Validate selected configuration without exposing credentials in errors."""
    if config["MAIL_USE_TLS"] and config["MAIL_USE_SSL"]:
        raise ValueError("MAIL_USE_TLS and MAIL_USE_SSL cannot both be enabled")
    if config["MAIL_DELIVERY_MODE"] not in {"smtp", "log"}:
        raise ValueError("MAIL_DELIVERY_MODE must be smtp or log")
    if config["MAIL_DELIVERY_MODE"] != "smtp":
        return
    for key in ("MAIL_SERVER", "MAIL_USERNAME", "MAIL_PASSWORD", "MAIL_DEFAULT_SENDER"):
        if not isinstance(config.get(key), str) or not config[key].strip():
            raise ValueError(f"{key} is required in smtp mode")
    if not 1 <= config["MAIL_PORT"] <= 65535:
        raise ValueError("MAIL_PORT must be between 1 and 65535")
    if config["MAIL_SERVER"].lower() == "smtp.mail.ovh.net":
        if config["MAIL_PORT"] != 465 or not config["MAIL_USE_SSL"] or config["MAIL_USE_TLS"]:
            raise ValueError("OVH SMTP requires port 465, MAIL_USE_SSL=True, MAIL_USE_TLS=False")
        sender = parseaddr(config["MAIL_DEFAULT_SENDER"])[1]
        if sender.lower() != config["MAIL_USERNAME"].lower():
            raise ValueError("OVH MAIL_DEFAULT_SENDER must match MAIL_USERNAME")
        if config.get("MAIL_SUPPRESS_SEND"):
            raise ValueError("OVH smtp mode requires MAIL_SUPPRESS_SEND=False; use log mode for local no-send")


class VerifiedConnection(Connection):
    def configure_host(self):
        context = ssl.create_default_context()
        if self.mail.use_ssl:
            host = smtplib.SMTP_SSL(self.mail.server, self.mail.port, context=context, timeout=3)
        else:
            host = smtplib.SMTP(self.mail.server, self.mail.port, timeout=3)
        try:
            # SMTP debug output can disclose authentication data and email bodies.
            host.set_debuglevel(0)
            if self.mail.use_tls:
                host.starttls(context=context)
            if self.mail.username and self.mail.password:
                host.login(self.mail.username, self.mail.password)
            return host
        except Exception:
            host.close()
            raise


class VerifiedMail(Mail):
    def connect(self):
        app = getattr(self, "app", None) or current_app
        try:
            return VerifiedConnection(app.extensions["mail"])
        except KeyError as error:
            raise RuntimeError("The current application was not configured with Flask-Mail") from error
