from flask import Blueprint, request, jsonify, current_app
import jwt
import time
import uuid
from auth.auth_models import db, User, ConfirmationCode
from auth.validate import validate_email_and_password, validate_user, validate_password
from flask_mail import Message
from common_defenitions import mail
from datetime import datetime, timedelta, timezone
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_jwt_extended import create_access_token, set_access_cookies
from datetime import timedelta
from flask import make_response
from flask_jwt_extended import unset_jwt_cookies
from flask_jwt_extended import create_access_token, create_refresh_token, set_access_cookies, set_refresh_cookies
import traceback  # В начало файла
from flask_jwt_extended import get_csrf_token, create_access_token, set_access_cookies

# Code reference: https://www.loginradius.com/blog/engineering/guest-post/securing-flask-api-with-jwt/

# Create a Blueprint for authentication-related routes
auth_bp = Blueprint("users", __name__, url_prefix="/users")

@auth_bp.route('/check', methods=['GET'])
@jwt_required()
def check_auth():
    identity = get_jwt_identity()
    return jsonify(logged_in=True, user=identity), 200


@auth_bp.route("/", methods=["GET"])
@jwt_required()
def get_current_user():
    user_id = get_jwt_identity()
    user_data = User.get_by_id(user_id)
    
    if not user_data:
        return jsonify(message="User not found or inactive"), 404

    return jsonify(message="Successfully retrieved user profile", data=user_data), 200


@auth_bp.route("/logout", methods=["POST"])
def logout():
    response = jsonify(message="Logged out")
    unset_jwt_cookies(response)
    return response

@auth_bp.route("/login", methods=["POST"])
def login():
    try:
        data = request.json
        if not data:
            return jsonify(message="Please provide credentials"), 400

        user = User.login(data["email"], data["password"])
        if not user:
            return jsonify(message="Invalid email or password", error="Unauthorized"), 404

        # !! Обязательно строка:
        identity = str(user["id"])

        access_expires = timedelta(minutes=15)
        refresh_expires = timedelta(days=30)

        access_token = create_access_token(identity=identity, expires_delta=access_expires)
        refresh_token = create_refresh_token(identity=identity, expires_delta=refresh_expires)

        print(f"Access Token: {access_token}")
        print(f"Refresh Token: {refresh_token}")

        response = jsonify(message="Successfully logged in", data={"email": user["email"], "is_superuser": user["is_superuser"]})
        set_access_cookies(response, access_token)
        set_refresh_cookies(response, refresh_token)
        response.set_cookie("csrf_token", get_csrf_token(access_token))
        return response
 
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify(message="Something went wrong", error=str(e)), 500

@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    identity = get_jwt_identity()
    access_token = create_access_token(identity=identity)
    response = jsonify(message="Access token refreshed")
    set_access_cookies(response, access_token)
    return response












@auth_bp.route("/", methods=["OPTIONS"])
def options_user():
    return jsonify({"message": "OK"}), 200

@auth_bp.route("/confirm-registration", methods=["OPTIONS"])
def options_confirm_registration():
    return jsonify({"message": "OK"}), 200

@auth_bp.route("/confirm-registration", methods=["POST"])
def confirm_registration():
    """Confirm user registration by verifying the activation code."""
    try:
        data = request.json
        if not data or "email" not in data or "code" not in data:
            return jsonify(message="Please provide email and code", error="Bad request"), 400
        
        email = data["email"]
        code = data["code"]

        if not ConfirmationCode.verify_code(email, code, "registration"):
            return jsonify(message="Invalid or expired confirmation code", error="Unauthorized"), 401

        if User.activate_user(email):
            ConfirmationCode.delete_code(email, code, "registration")
            return jsonify(message="Account successfully activated"), 200
        
        return jsonify(message="User not found or already activated", error="Not Found"), 404
    except Exception as e:
        return jsonify(message="Something went wrong", error=str(e)), 500
    
@auth_bp.route("/", methods=["POST"])
def add_user():
    """Register a new user and send an activation email."""
    try:
        user_data = request.json
        if not user_data:
            return jsonify(message="Please provide user details", data=None, error="Bad request"), 400

        # Validate user data
        validation_result = validate_user(**user_data)
        if validation_result is not True:
            # Преобразуем ошибки в одну строку
            error_message = " | ".join(f"{field}: {msg}" for field, msg in validation_result.items())
            return jsonify(message=error_message, data=None, error="Validation error"), 400

        # Check if the user already exists
        existing_user = User.query.filter_by(email=user_data["email"]).first()
        if existing_user:
            return jsonify(message="User already exists", error="Conflict", data=None), 409

        # Generate and send confirmation code
        confirmation_code = ConfirmationCode.create_code(user_data["email"], "registration")
        print("confirmation_code =", confirmation_code.to_dict())

        try:
            with current_app.app_context():
                msg = Message("Activate your account", sender=current_app.config["MAIL_USERNAME"], recipients=[user_data["email"]])
                msg.body = f"Your activation code: {confirmation_code.code}"
                mail.send(msg)
        except Exception as e:
            return jsonify(message="Mail server is broken", error=str(e)), 202

        # Create an inactive user
        user = User.create(**user_data)

        return jsonify(message="Successfully created new user. Please check your email for activation.", data=None), 201
    except Exception as e:
        return jsonify(message="Something went wrong", error=str(e), data=None), 500


@auth_bp.route("/request-password-reset", methods=["POST"])
def request_password_reset():
    """Send a password reset code to the user's email."""
    try:
        data = request.json
        if not data or "email" not in data:
            return jsonify(message="Please provide email", error="Bad request"), 400

        email = data["email"]
        user = User.get_by_email(email)
        if not user:
            return jsonify(message="User not found or inactive", error="Not Found"), 404

        confirmation_code = ConfirmationCode.create_code(email, "password_reset")
        print('confirmation_code = ', confirmation_code.to_dict())
        
        try:
            with current_app.app_context():  # Ensure you're within an application context
                msg = Message("Password Reset Code", sender=current_app.config["MAIL_USERNAME"], recipients=[email])
                msg.body = f"Your password reset code: {confirmation_code.code}"
                mail.send(msg)

        except Exception as e:
            return jsonify(message="Mail server is broken", error=str(e)), 202

        return jsonify(message="Password reset code sent"), 200
    except Exception as e:
        return jsonify(message="Something went wrong", error=str(e)), 500
    
@auth_bp.route("/confirm-password-reset", methods=["POST"])
def confirm_password_reset():
    """Verify the reset code and update the user's password."""
    try:
        data = request.json
        if not data or "email" not in data or "code" not in data or "new_password" not in data:
            return jsonify(message="Please provide code and new password", error="Bad request"), 400

        email = data["email"]
        code = data["code"]
        new_password = data["new_password"]

        # Проверка пароля с использованием вашей валидации
        password_validation = validate_password(new_password)
        if password_validation is not True:
            return jsonify(message=password_validation, error="Bad password"), 400  # Передаем ошибку от validate_password

        # Проверка кода подтверждения
        if not ConfirmationCode.verify_code(email, code, "password_reset"):
            return jsonify(message="Invalid or expired reset code", error="Unauthorized"), 401

        # Обновление пароля пользователя
        if User.change_password(email, new_password):
            ConfirmationCode.delete_code(email, code, "password_reset")
            return jsonify(message="Password successfully updated"), 200
        
        return jsonify(message="User not found or inactive", error="Not Found"), 404
    except Exception as e:
        return jsonify(message="Something went wrong", error=str(e)), 500




@auth_bp.route("/", methods=["PUT"])
@jwt_required()
def update_user():
    current_user = get_jwt_identity()
    """Update the authenticated users profile (only name)."""
    try:
        user_data = request.json
        if "name" in user_data:
            updated_user = User.update(current_user["id"], user_data["name"])
            return jsonify(message="Successfully updated account", data=updated_user), 200
        return jsonify(message="Invalid data, you can only update your account name!", error="Bad Request"), 400
    except Exception as e:
        return jsonify(message="Failed to update account", error=str(e)), 400
    