import logging
import json
import os
from pathlib import Path

from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_talisman import Talisman
from werkzeug.middleware.proxy_fix import ProxyFix

from dotenv import load_dotenv
from sqlalchemy.engine import URL

basedir = Path(__file__).resolve().parent
app = Flask(__name__, instance_relative_config=True)
profile = os.getenv("APP_ENV", "development")
if profile not in {"development", "production"}:
    raise ValueError("APP_ENV must be development or production")
# Docker injects the selected file; native startup reads the same file here.
load_dotenv(basedir / ("env.prod" if profile == "production" else "env.dev"), override=False)
app.config["APP_ENV"] = profile

# Values belong to env.dev / env.prod. This code only converts their types.
def env_value(name):
    if name not in os.environ:
        raise ValueError(f"Missing configuration variable: {name}")
    return os.environ[name]


def env_bool(name):
    value = env_value(name).strip().lower()
    if value not in {"true", "false", "1", "0"}:
        raise ValueError(f"{name} must be True or False")
    return value in {"true", "1"}


string_settings = (
    "SECRET_KEY", "JWT_SECRET_KEY", "JWT_ACCESS_COOKIE_NAME", "JWT_REFRESH_COOKIE_NAME",
    "JWT_ACCESS_COOKIE_PATH", "JWT_REFRESH_COOKIE_PATH", "JWT_ACCESS_CSRF_COOKIE_NAME",
    "JWT_REFRESH_CSRF_COOKIE_NAME", "JWT_COOKIE_SAMESITE", "SESSION_COOKIE_SAMESITE",
    "FRAME_OPTIONS", "REFERRER_POLICY", "MAIL_SERVER", "MAIL_USERNAME", "MAIL_PASSWORD",
    "MAIL_DEFAULT_SENDER", "MAIL_DELIVERY_MODE", "RECAPTCHA_SECRET_KEY", "RECAPTCHA_VERIFY_URL",
    "RATELIMIT_DEFAULT", "RATELIMIT_STORAGE_URI", "AUTH_LOGIN_RATE_LIMIT",
    "AUTH_REGISTRATION_RATE_LIMIT", "AUTH_CONFIRMATION_RATE_LIMIT", "AUTH_PASSWORD_RESET_RATE_LIMIT",
    "AUTH_RESEND_RATE_LIMIT", "LOG_LEVEL", "SWAGGER_URL", "API_URL", "APP_HOST",
)
boolean_settings = (
    "TESTING", "DEBUG", "FLASK_DEBUG", "ENABLE_TEST_ENDPOINTS", "JWT_COOKIE_SECURE",
    "JWT_COOKIE_CSRF_PROTECT", "SESSION_COOKIE_SECURE", "FORCE_HTTPS", "HSTS_ENABLED",
    "HSTS_INCLUDE_SUBDOMAINS", "CORS_SUPPORTS_CREDENTIALS", "MAIL_USE_TLS", "MAIL_USE_SSL",
    "MAIL_SUPPRESS_SEND", "RECAPTCHA_ENABLED", "RATELIMIT_ENABLED", "EXPOSE_ERROR_DETAILS",
    "SWAGGER_ENABLED", "SQLALCHEMY_TRACK_MODIFICATIONS",
)
integer_settings = (
    "ACCESS_EXPIRES_SECONDS", "REFRESH_EXPIRES_SECONDS", "HSTS_MAX_AGE", "PROXY_X_FOR",
    "PROXY_X_PROTO", "PROXY_X_HOST", "MAIL_PORT", "CONFIRMATION_CODE_TTL_SECONDS",
    "PASSWORD_RESET_CODE_TTL_SECONDS", "AUTH_CODE_CLEANUP_INTERVAL_SECONDS", "RECAPTCHA_RETRIES", "APP_PORT",
)
for name in string_settings:
    app.config[name] = env_value(name)
for name in boolean_settings:
    app.config[name] = env_bool(name)
for name in integer_settings:
    app.config[name] = int(env_value(name))
for name in ("RECAPTCHA_MIN_SCORE", "RECAPTCHA_TIMEOUT_SECONDS", "RECAPTCHA_RETRY_DELAY_SECONDS"):
    app.config[name] = float(env_value(name))
for name, expected_type in (("CSP_POLICY", dict), ("CORS_ORIGINS", list),
                            ("CORS_ALLOW_HEADERS", list), ("JWT_TOKEN_LOCATION", list)):
    app.config[name] = json.loads(env_value(name))
    if not isinstance(app.config[name], expected_type):
        raise ValueError(f"Invalid JSON configuration type: {name}")
if profile == "production" and any(app.config[name] for name in ("TESTING", "DEBUG", "FLASK_DEBUG", "ENABLE_TEST_ENDPOINTS")):
    raise ValueError("Development/test modes cannot be enabled in production")
if app.config["MAIL_USE_TLS"] and app.config["MAIL_USE_SSL"]:
    raise ValueError("MAIL_USE_TLS and MAIL_USE_SSL cannot both be enabled")
if app.config["MAIL_DELIVERY_MODE"] not in {"smtp", "log"}:
    raise ValueError("MAIL_DELIVERY_MODE must be smtp or log")
if not 0 <= app.config["RECAPTCHA_MIN_SCORE"] <= 1:
    raise ValueError("RECAPTCHA_MIN_SCORE must be between 0 and 1")
if app.config["RECAPTCHA_RETRIES"] < 1 or app.config["RECAPTCHA_TIMEOUT_SECONDS"] <= 0:
    raise ValueError("Invalid CAPTCHA retry or timeout configuration")
if not app.config["SECRET_KEY"] or not app.config["JWT_SECRET_KEY"]:
    raise ValueError("SECRET_KEY and JWT_SECRET_KEY must not be empty")
# Empty SMTP credentials allow local email logging without an SMTP account.
app.config["MAIL_USERNAME"] = app.config["MAIL_USERNAME"] or None
app.config["MAIL_PASSWORD"] = app.config["MAIL_PASSWORD"] or None
if env_value("DB_ENGINE") == "postgres":
    def database_url(name):
        return URL.create("postgresql+psycopg2", username=env_value("DB_USER"),
            password=env_value("DB_PASSWORD"), host=env_value("DB_HOST"),
            port=int(env_value("DB_PORT")), database=name).render_as_string(hide_password=False)
    app.config["SQLALCHEMY_DATABASE_URI"] = database_url(env_value("MAIN_DB_NAME"))
    app.config["SQLALCHEMY_BINDS"] = {"users_db": database_url(env_value("USERS_DB_NAME"))}
elif env_value("DB_ENGINE") == "sqlite":
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///" + str(basedir / "instance" / env_value("MAIN_DATABASE_FILENAME"))
    app.config["SQLALCHEMY_BINDS"] = {"users_db": "sqlite:///" + str(basedir / "instance" / env_value("USERS_DATABASE_FILENAME"))}
else:
    raise ValueError("DB_ENGINE must be postgres or sqlite")
if any(app.config[name] <= 0 for name in (
        "CONFIRMATION_CODE_TTL_SECONDS", "PASSWORD_RESET_CODE_TTL_SECONDS",
        "AUTH_CODE_CLEANUP_INTERVAL_SECONDS")):
    raise ValueError("Auth code TTL and cleanup interval must be positive")
logging.basicConfig(level=app.config["LOG_LEVEL"])
app.wsgi_app = ProxyFix(app.wsgi_app,
    x_for=app.config["PROXY_X_FOR"], x_proto=app.config["PROXY_X_PROTO"],
    x_host=app.config["PROXY_X_HOST"], x_port=0, x_prefix=0)

# Load extensions and blueprints after the selected environment configuration.
from common_defenitions import mail, db, limiter
from auth.authentication import auth_bp
from auth.admin.admin import admin_bp
from rocks.rocks_bp import rocks_bp
from inputData.inputData import input_bp

mail.init_app(app)
db.init_app(app)
limiter.init_app(app)
jwt = JWTManager(app)
Talisman(app, content_security_policy=app.config["CSP_POLICY"],
    force_https=app.config["FORCE_HTTPS"],
    strict_transport_security=app.config["HSTS_ENABLED"],
    strict_transport_security_max_age=app.config["HSTS_MAX_AGE"],
    strict_transport_security_include_subdomains=app.config["HSTS_INCLUDE_SUBDOMAINS"],
    session_cookie_secure=app.config["SESSION_COOKIE_SECURE"],
    session_cookie_samesite=app.config["SESSION_COOKIE_SAMESITE"],
    frame_options=app.config["FRAME_OPTIONS"], referrer_policy=app.config["REFERRER_POLICY"])
CORS(app, origins=app.config["CORS_ORIGINS"],
    supports_credentials=app.config["CORS_SUPPORTS_CREDENTIALS"],
    allow_headers=app.config["CORS_ALLOW_HEADERS"])

app.register_blueprint(auth_bp)
app.register_blueprint(admin_bp)
app.register_blueprint(rocks_bp)
app.register_blueprint(input_bp)
if app.config["ENABLE_TEST_ENDPOINTS"] and app.config["TESTING"]:
    from auth.testing_endpoints import testing_bp
    app.register_blueprint(testing_bp)
if app.config["SWAGGER_ENABLED"]:
    from flask_swagger_ui import get_swaggerui_blueprint
    app.register_blueprint(get_swaggerui_blueprint(
        app.config["SWAGGER_URL"], app.config["API_URL"], config={"app_name": "Flask API"}),
        url_prefix=app.config["SWAGGER_URL"])

@app.errorhandler(429)
def ratelimit_handler(error):
    return jsonify(message="Too many requests"), 429

@app.errorhandler(403)
def forbidden(error):
    return jsonify(message="Forbidden", data=None), 403

@app.errorhandler(404)
def not_found(error):
    return jsonify(message="Endpoint Not Found", data=None), 404

if __name__ == "__main__":
    app.run(host=app.config["APP_HOST"], port=app.config["APP_PORT"], debug=app.config["FLASK_DEBUG"])
