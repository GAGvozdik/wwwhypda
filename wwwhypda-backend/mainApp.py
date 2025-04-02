import os
from flask_cors import CORS
from rocks.rocks_models import db
from flask import Flask, jsonify, session, request, redirect, url_for
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, get_jwt
from flask_login import LoginManager
from werkzeug.security import generate_password_hash, check_password_hash
from flask_mail import Mail, Message
import random
from flask_swagger_ui import get_swaggerui_blueprint
from flask import send_from_directory
import re
from rocks.rocks_bp import rocks_bp
from dotenv import load_dotenv
from auth.auth_models import db
from auth.authentication import auth_bp
from common_defenitions import mail

#TODO add recaptcha
#TODO separate tables
#TODO add only read users and admistrators
#TODO add limit to requests maybe recaptcha will fix this problem

load_dotenv(dotenv_path='env.configs')

basedir = os.path.abspath(os.path.dirname(__file__))

app = Flask(__name__)
# CORS(app, origins=['http://localhost:3000', 'http://localhost:5000', 'vscode-webview://*'], resources={r"/api/*": {"origins": "*"}})
# CORS(app, supports_credentials=True)  
# CORS(auth_bp)
# CORS(app, origins=['http://localhost:3000', 'http://localhost:5000', 'vscode-webview://*'], supports_credentials=True, resources={r"/*": {"origins": "*"}})
CORS(app, resources={r"/*": {"origins": "*", "methods": ["GET", "POST", "OPTIONS"], "allow_headers": ["Content-Type", "Authorization"]}})


# app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'wwhypda.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Configure application settings
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')

# Configure mail server settings for sending emails
app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER')
app.config['MAIL_PORT'] = os.getenv('MAIL_PORT')
app.config['MAIL_USE_TLS'] = False
app.config['MAIL_USE_SSL'] = True
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')

# Initialize Flask-Mail extension
mail.init_app(app)

db.init_app(app)  

# Register authentication Blueprint
app.register_blueprint(auth_bp)

swaggerui_blueprint = get_swaggerui_blueprint(
    os.getenv('SWAGGER_URL'),
    os.getenv('API_URL'),
    config={
        'app_name': "Flask API with Swagger UI"
    }
)
app.register_blueprint(swaggerui_blueprint, url_prefix=os.getenv('SWAGGER_URL'))

app.register_blueprint(rocks_bp)

# Global error handlers
@app.errorhandler(403)
def forbidden(e):
    """Handle 403 Forbidden error."""
    return jsonify(message="Forbidden", error=str(e), data=None), 403

@app.errorhandler(404)
def not_found(e):
    """Handle 404 Not Found error."""
    return jsonify(message="Endpoint Not Found", error=str(e), data=None), 404

if __name__ == "__main__":
    # Ensure database tables are created before running the application
    with app.app_context():
        db.create_all()
    # Start the Flask application in debug mode
    app.run(debug=True)