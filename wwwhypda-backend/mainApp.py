import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_swagger_ui import get_swaggerui_blueprint
from dotenv import load_dotenv
from flask_talisman import Talisman
import logging
from flask import request
from flask_jwt_extended import (
    JWTManager, create_access_token, create_refresh_token,
    set_access_cookies, set_refresh_cookies, get_csrf_token,
    jwt_required, get_jwt_identity, get_jwt
)
from flask_jwt_extended import get_jwt, get_jwt_identity, create_access_token, set_access_cookies, get_csrf_token
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from datetime import timedelta
import secrets

from inputData.inputData import input_bp
from auth.authentication import auth_bp
from auth.admin.admin import admin_bp
from rocks.rocks_bp import rocks_bp
from inputData.inputDataModels import InputData

# from rocks.rocks_models import db
# from auth.auth_models import db  # потенциально дублирование, оставь один из них
from common_defenitions import mail, db, limiter
from sqlalchemy import text, inspect
from flask import current_app

def add_column_if_not_exists(column_name='editing_by'):
    
    try:
        inspector = inspect(db.engine)
        columns = [c['name'] for c in inspector.get_columns('input_data')]

        if column_name not in columns:
            db.session.execute(
                text(f"ALTER TABLE input_data ADD COLUMN {column_name} VARCHAR(50)")
            )
            db.session.commit()
            current_app.logger.info(f"✅ Column {column_name} added to input_data.")
        else:
            current_app.logger.info(f"ℹ️ Column {column_name} already exists.")
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"❌ Failed to add {column_name} column: {e}")



# TODO: Add reCAPTCHA
# TODO: Add request limiting (maybe reCAPTCHA will help)
# TODO: Check expiration of reset password code
# TODO: Check csrf token verification

# Load environment variables for development if 'env.dev' exists.
# In production (Docker), environment variables are set by docker-compose.
basedir = os.path.abspath(os.path.dirname(__file__))
dev_config_path = os.path.join(basedir, 'env.dev')
if os.path.exists(dev_config_path):
    load_dotenv(dotenv_path=dev_config_path)

app = Flask(__name__, instance_relative_config=True)

# === Rate Limiting ===
limiter.init_app(app)

# === Security Configuration ===
csp = {
    'default-src': "'self'",
    'script-src': [
        "'self'",
        "https://www.google.com/recaptcha/",
        "https://www.gstatic.com/recaptcha/"
    ],
    'frame-src': [
        "'self'",
        "https://www.google.com/recaptcha/",
        "https://www.gstatic.com/recaptcha/"
    ],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:'],
    'connect-src': ["'self'", "https://www.google.com", "http://localhost:3000", "http://localhost:5173"],
    'font-src': ["'self'"],
    'object-src': ["'none'"],
    'worker-src': ["'self'"],
    'form-action': ["'self'"]
}
force_https = os.getenv('FORCE_HTTPS', 'False').lower() == 'true'
Talisman(app, content_security_policy=csp, force_https=force_https)

# CORS configuration
CORS(
    app, 
    supports_credentials=True, 
    origins=["http://localhost:8080", "http://localhost:3000", "http://localhost:5173"], 
    allow_headers=["Content-Type", "Authorization", "X-CSRF-TOKEN", "Cookie", "X-Recaptcha-Token"]
)

# talisman = Talisman(app)
logging.basicConfig(level=logging.INFO)

# === Configs ===
DB_USER = os.getenv('DB_USER', 'postgres')
DB_PASSWORD = os.getenv('DB_PASSWORD', 'postgres')
DB_HOST = os.getenv('DB_HOST', 'db')
DB_PORT = os.getenv('DB_PORT', '5432')
MAIN_DB_NAME = os.getenv('MAIN_DB_NAME', 'wwhypda')
USERS_DB_NAME = os.getenv('USERS_DB_NAME', 'users_db')

app.config['SQLALCHEMY_DATABASE_URI'] = f'postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{MAIN_DB_NAME}'
app.config['SQLALCHEMY_BINDS'] = {
    'users_db': f'postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{USERS_DB_NAME}'
}
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')

# JWT configuration with HttpOnly cookie storage
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')
app.config['ACCESS_EXPIRES_SECONDS'] = int(os.getenv('ACCESS_EXPIRES_SECONDS', 21600))
app.config['REFRESH_EXPIRES_SECONDS'] = int(os.getenv('REFRESH_EXPIRES_SECONDS', 86400))

app.config['JWT_TOKEN_LOCATION'] = ['cookies']
app.config['JWT_ACCESS_COOKIE_NAME'] =  'jwt'
app.config['JWT_COOKIE_SECURE'] = os.getenv('JWT_COOKIE_SECURE', 'False').lower() == 'true'
app.config['JWT_COOKIE_SAMESITE'] = 'Lax'
app.config['JWT_COOKIE_HTTPONLY'] = True
app.config['JWT_COOKIE_CSRF_PROTECT'] = True
app.config["JWT_REFRESH_COOKIE_NAME"] = "refresh_token_cookie"
app.config["JWT_ACCESS_COOKIE_PATH"] = "/"
app.config["JWT_REFRESH_COOKIE_PATH"] = "/users/refresh"

# Mail config
app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER')
app.config['MAIL_PORT'] = os.getenv('MAIL_PORT')
app.config['MAIL_USE_TLS'] = False
app.config['MAIL_USE_SSL'] = True
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')

app.config['TESTING'] = os.getenv('TESTING', 'False').lower() in ('true', '1', 't')

# === Initialize extensions ===
mail.init_app(app)
db.init_app(app)
jwt = JWTManager(app)

@app.after_request
def rotate_csrf_token(response):
    if request.method in ["POST", "PUT", "DELETE"] and response.status_code == 200:
        try:
            access_token = request.cookies.get("jwt")
            if access_token:
                csrf_token = get_csrf_token(access_token)
                response.set_cookie(
                    "csrf_token",
                    csrf_token,
                    httponly=False,
                    secure=True,  # если у тебя HTTPS
                    samesite="Strict"
                )
        except Exception as e:
            app.logger.error(f"Error rotating CSRF token: {e}")
    return response

# === Register Blueprints ===
app.register_blueprint(auth_bp)
app.register_blueprint(admin_bp)
app.register_blueprint(rocks_bp)
app.register_blueprint(input_bp)

# Условно регистрируем Blueprint с тестовыми эндпоинтами
# Он будет доступен только если приложение запущено в режиме тестирования
if app.config.get("TESTING"):
    from auth.testing_endpoints import testing_bp
    app.register_blueprint(testing_bp)

swaggerui_blueprint = get_swaggerui_blueprint(
    os.getenv('SWAGGER_URL'),
    os.getenv('API_URL'),
    config={'app_name': "Flask API with Swagger UI"}
)
app.register_blueprint(swaggerui_blueprint, url_prefix=os.getenv('SWAGGER_URL'))

# === Error Handlers ===
@app.errorhandler(429)
def ratelimit_handler(e):
    return jsonify(message="Too many requests", error=str(e.description)), 429

@app.errorhandler(403)
def forbidden(e):
    return jsonify(message="Forbidden", error=str(e), data=None), 403

@app.errorhandler(404)
def not_found(e):
    return jsonify(message="Endpoint Not Found", error=str(e), data=None), 404

# === Main Entry ===
if __name__ == "__main__":
    # Tables are created by migration script to preserve schema exactly
    # with app.app_context():
    #     db.create_all()
    #     db.create_all(bind_key='users_db')
    #     add_column_if_not_exists()
    debug_mode = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    app.run(host="0.0.0.0", port=5000, debug=debug_mode)