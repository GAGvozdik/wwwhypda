"""Exact hostname policy and production startup guards; no secrets in diagnostics."""
import json
import math
import re


def configure_recaptcha_policy(config, profile, hostnames=None):
    default = '["localhost", "127.0.0.1"]' if profile == "development" else '[]'
    hosts = json.loads(hostnames if hostnames is not None else default)
    if not isinstance(hosts, list) or not hosts or any(
            not isinstance(host, str) or not re.fullmatch(r"[a-z0-9]+(?:[.-][a-z0-9]+)*", host)
            for host in hosts):
        raise ValueError("RECAPTCHA_ALLOWED_HOSTNAMES must be a nonempty exact hostname JSON list")
    if profile == "production":
        if not config.get("RECAPTCHA_ENABLED") or not config.get("RECAPTCHA_SECRET_KEY"):
            raise ValueError("Production CAPTCHA protection must be enabled and configured")
        if any(host == "localhost" or host.endswith((".localhost", ".test", ".invalid", ".example", ".local")) or re.fullmatch(r"[0-9.]+",host)
               for host in hosts):
            raise ValueError("Local/test hostnames cannot be used in production CAPTCHA policy")
    minimum = config.get("RECAPTCHA_MIN_SCORE")
    if isinstance(minimum, bool) or not isinstance(minimum, (int, float)) or not math.isfinite(minimum) or not 0 <= minimum <= 1:
        raise ValueError("RECAPTCHA_MIN_SCORE must be a finite number between 0 and 1")
    if config.get("RECAPTCHA_VERIFY_URL") not in {
            "https://www.google.com/recaptcha/api/siteverify",
            "https://www.recaptcha.net/recaptcha/api/siteverify"}:
        raise ValueError("CAPTCHA verification must use an official HTTPS SiteVerify endpoint")
    config["RECAPTCHA_ALLOWED_HOSTNAMES"] = frozenset(hosts)
