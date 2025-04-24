import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_swagger_ui import get_swaggerui_blueprint
from dotenv import load_dotenv

from auth.authentication import auth_bp
from auth.admin.admin import admin_bp
from rocks.rocks_bp import rocks_bp

# from rocks.rocks_models import db
# from auth.auth_models import db  # потенциально дублирование, оставь один из них
from common_defenitions import mail, db

# TODO: Add reCAPTCHA
# TODO: Add request limiting (maybe reCAPTCHA will help)

# Load environment variables
load_dotenv(dotenv_path='env.configs')

basedir = os.path.abspath(os.path.dirname(__file__))

app = Flask(__name__)

# === CORS ===
CORS(
    app,
    supports_credentials=True,
    resources={
        r"/*": {
            "origins": os.getenv("FRONTEND_ORIGIN", "*"),
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization", "X-CSRF-TOKEN"]
        }
    }
)

# === Configs ===
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'wwhypda.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')

# JWT configuration with HttpOnly cookie storage
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')
app.config['JWT_TOKEN_LOCATION'] = ['cookies']
app.config['JWT_ACCESS_COOKIE_NAME'] =  os.getenv('JWT_ACCESS_COOKIE_NAME')
app.config['JWT_COOKIE_SECURE'] = False  # Set True in production (with HTTPS)
app.config['JWT_COOKIE_SAMESITE'] = 'Lax'
app.config['JWT_COOKIE_HTTPONLY'] = True
app.config['JWT_COOKIE_CSRF_PROTECT'] = True
app.config["JWT_REFRESH_COOKIE_NAME"] = "refresh_token_cookie"
app.config["JWT_ACCESS_COOKIE_PATH"] = "/"
app.config["JWT_REFRESH_COOKIE_PATH"] = "/refresh"

# Mail config
app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER')
app.config['MAIL_PORT'] = os.getenv('MAIL_PORT')
app.config['MAIL_USE_TLS'] = False
app.config['MAIL_USE_SSL'] = True
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')

# === Initialize extensions ===
mail.init_app(app)
db.init_app(app)
jwt = JWTManager(app)

# === Register Blueprints ===
app.register_blueprint(auth_bp)
app.register_blueprint(admin_bp)
app.register_blueprint(rocks_bp)

swaggerui_blueprint = get_swaggerui_blueprint(
    os.getenv('SWAGGER_URL'),
    os.getenv('API_URL'),
    config={'app_name': "Flask API with Swagger UI"}
)
app.register_blueprint(swaggerui_blueprint, url_prefix=os.getenv('SWAGGER_URL'))

# === Error Handlers ===
@app.errorhandler(403)
def forbidden(e):
    return jsonify(message="Forbidden", error=str(e), data=None), 403

@app.errorhandler(404)
def not_found(e):
    return jsonify(message="Endpoint Not Found", error=str(e), data=None), 404

# === Main Entry ===
if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True)
