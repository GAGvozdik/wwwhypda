import os
from flask_cors import CORS
from db_models import db, User, Country, Review, Environment, Fracturation
from db_models import Source, RockType, Parameter, Sample, Measure, Scale
from db_models import ExperimentType, Quality, InterpretationMethod
from flask import Flask, jsonify, session, request, redirect, url_for
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, get_jwt
from flask_login import LoginManager
from werkzeug.security import generate_password_hash, check_password_hash
from flask_mail import Mail, Message
import random
from flask_swagger_ui import get_swaggerui_blueprint

#TODO add recaptcha
#TODO separate tables
#TODO add only read users and admistrators
#TODO add compulsory long password
#TODO add limit to requests maybe recaptcha will fix this problem

pending_users = {}

import re

def is_password_strong(password):
    if len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if not any(char.isupper() for char in password):
        return False, "Password must contain at least one uppercase letter."
    if not any(char.islower() for char in password):
        return False, "Password must contain at least one lowercase letter."
    if not any(char.isdigit() for char in password):
        return False, "Password must contain at least one number."
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        return False, "Password must contain at least one special character."
    return True, ""

def generate_confirmation_code():
    return str(random.randint(100000, 999999))

def read_key(way):
    file = open(way, 'r')
    for line in file:
        return line
    
basedir = os.path.abspath(os.path.dirname(__file__))

app = Flask(__name__)
CORS(app, origins=['http://localhost:3000'])
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'wwhypda.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

app.config['SECRET_KEY'] = read_key('SECRET_KEYS/SECRET_KEY.txt')
app.config["JWT_SECRET_KEY"] = read_key('SECRET_KEYS/JWT_KEY.txt')
app.config['JWT_TOKEN_LOCATION'] = ['headers']

app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 465
app.config['MAIL_USE_TLS'] = False
app.config['MAIL_USE_SSL'] = True
app.config["MAIL_USERNAME"] = read_key('SECRET_KEYS/MAIL.txt')
app.config['MAIL_PASSWORD'] = read_key('SECRET_KEYS/MAIL_PASSWORD.txt')

mail = Mail(app)
jwt = JWTManager(app)
login_manager = LoginManager()

db.init_app(app)  

login_manager.init_app(app)

login_manager.login_view = 'login'  # Здесь укажите ваше представление для логина (если есть)

SWAGGER_URL = '/swagger'  # URL для доступа к документации
API_URL = '/static/swagger.yaml'  # Путь к вашему Swagger-файлу

swaggerui_blueprint = get_swaggerui_blueprint(
    SWAGGER_URL,
    API_URL,
    config={
        'app_name': "Flask API with Swagger UI"
    }
)

app.register_blueprint(swaggerui_blueprint, url_prefix=SWAGGER_URL)



@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@app.route('/api/anonce', methods=['GET']) 
def api_anonce():
    results = Source.getDataAnonce()
    return jsonify(results)

@app.route('/api/rock_type', methods=['GET']) 
def api_rock_type():
    results = RockType.getRockTypes()
    return jsonify(results)

@app.route('/api/parameters', methods=['GET'])
def get_parameters():
    parameters = Parameter.getParameters()
    return jsonify(parameters)

@app.route('/api/samples/<int:rt_id>/<int:id_Parameter>')
def get_samples(rt_id, id_Parameter):
    samples = Sample.getSamplesByRockType(rt_id)
    sample_ids = [sample['id_Sample'] for sample in samples]
    measures = Measure.getMeasuresBySampleIdAndParam(sample_ids, id_Parameter)
    
    return jsonify(measures)

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()

    if not data or not data.get('username') or not data.get('password') or not data.get('email'):
        return jsonify({"error": "Missing required fields"}), 400

    username = data['username']
    email = data['email']
    password = data['password']

    # Проверка сложности пароля
    is_strong, message = is_password_strong(password)
    if not is_strong:
        return jsonify({"error": message}), 400

    if User.find_by_username(username):
        return jsonify({"error": "Username already exists"}), 409
    if User.find_by_email(email):
        return jsonify({"error": "Email already registered"}), 409

    confirmation_code = generate_confirmation_code()

    pending_users[email] = {
        "username": username,
        "password": password,
        "confirmation_code": confirmation_code
    }

    try:
        # msg = Message(subject='Email Confirmation', sender=app.config['MAIL_USERNAME'], recipients=[email])
        # msg.body = f'Your confirmation code is: {confirmation_code}'
        # mail.send(msg)
        print(f"Confirmation code for {email}: {confirmation_code}")
    except Exception as e:
        return jsonify({"error": "Failed to send email", "details": str(e)}), 500
    return jsonify({"message": "Registration successful! Please check your email for the confirmation code."}), 201


@app.route('/api/confirm', methods=['POST'])
def confirm_user():
    try:
        data = request.get_json()

        if not data or not data.get('email') or not data.get('code'):
            return jsonify({"error": "Email and code are required!"}), 400

        email = data['email']
        code = data['code']
        
        if email not in pending_users or pending_users[email]["confirmation_code"] != code:
            return jsonify({"error": "Invalid confirmation code!"}), 400

        user_data = pending_users.pop(email)
        try:
            new_user = User.create_user(user_data["username"], email, user_data["password"])
            new_user.is_active = True
            db.session.commit()
            return jsonify({"message": "User confirmed successfully!"}), 200
        except Exception as e:
            print(f"Database error: {e}")
            return jsonify({"error": "Database error", "details": str(e)}), 500

    except Exception as e:
        print(f"Unexpected error: {e}")
        return jsonify({"error": "Unexpected error", "details": str(e)}), 500


@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data['username']
    password = data['password']

    user = User.query.filter_by(username=username).first()
    if not user or not check_password_hash(user.password, password):
        return jsonify({"message": "Invalid username or password!"}), 401

    access_token = create_access_token(identity=user.id)

    return jsonify(access_token=access_token), 200

@app.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()

    if not data or not data.get('email'):
        return jsonify({"error": "Email is required!"}), 400

    email = data['email']
    user = User.query.filter_by(email=email).first()

    if not user:
        return jsonify({"error": "Email not found!"}), 404

    # Генерация кода восстановления
    reset_code = generate_confirmation_code()
    pending_users[email] = {"reset_code": reset_code}

    try:
        # Отправка email с кодом восстановления
        # msg = Message(subject='Password Reset', sender=app.config['MAIL_USERNAME'], recipients=[email])
        # msg.body = f'Your password reset code is: {reset_code}'
        # mail.send(msg)
        print(f"Confirmation code for {email}: {reset_code}")
        return jsonify({"message": "Password reset code sent to your email!"}), 200

    except Exception as e:
        return jsonify({"error": "Failed to send email", "details": str(e)}), 500


@app.route('/api/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json()

    if not data or not data.get('email') or not data.get('code') or not data.get('new_password'):
        return jsonify({"error": "Email, code, and new password are required!"}), 400

    email = data['email']
    code = data['code']
    new_password = data['new_password']

    # Проверка сложности пароля
    is_strong, message = is_password_strong(new_password)
    if not is_strong:
        return jsonify({"error": message}), 400

    # Проверка кода
    if email not in pending_users or pending_users[email].get("reset_code") != code:
        return jsonify({"error": "Invalid code!"}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "User not found!"}), 404

    try:
        # Обновление пароля
        user.password = generate_password_hash(new_password)
        db.session.commit()
        pending_users.pop(email)  # Удаление временных данных
        return jsonify({"message": "Password reset successful!"}), 200

    except Exception as e:
        return jsonify({"error": "Failed to reset password", "details": str(e)}), 500

@app.route('/api/countries', methods=['GET'])
def get_countries():
    return Country.get_all_countries()

@app.route('/api/reviews', methods=['GET'])
def get_reviews():
    return Review.get_all_reviews()

@app.route('/api/environments', methods=['GET'])
def get_environments():
    return Environment.get_all_environments()

@app.route('/api/fracturations', methods=['GET'])
def get_fracturations():
    return Fracturation.get_all_fracturations()

@app.route('/api/scales', methods=['GET'])
def get_scales():
    return Scale.get_all_scales()

@app.route('/api/samples', methods=['GET']) 
def api_samples():
    results = Sample.get_all_samples()
    return jsonify(results)

@app.route('/api/qualities', methods=['GET'])
def get_qualities():
    return Quality.get_all_qualities()

@app.route('/api/experiment_types', methods=['GET'])
def get_experiment_types():
    return ExperimentType.get_all_experiment_types()

@app.route('/api/interpretation_methods', methods=['GET'])
def get_interpretation_methods():
    return InterpretationMethod.get_all_interpretation_methods()

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True)
