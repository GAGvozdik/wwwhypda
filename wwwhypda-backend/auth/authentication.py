"""Authentication and User Management Routes

This module defines Flask routes for handling user authentication,
registration, password reset, and profile management.

It uses JWT for authentication, Flask-Mail for email-based verification,
and SQLAlchemy for database interactions.
"""

from flask import Blueprint, request, jsonify, current_app
import jwt
import time
import uuid
from auth.auth_models import db, User, ConfirmationCode
from auth.auth_middleware import token_required, superuser_required
from auth.validate import validate_email_and_password, validate_user, validate_password
from flask_mail import Message
from common_defenitions import mail
from datetime import datetime, timedelta, timezone

# Code reference: https://www.loginradius.com/blog/engineering/guest-post/securing-flask-api-with-jwt/

# Create a Blueprint for authentication-related routes
auth_bp = Blueprint("users", __name__, url_prefix="/users")

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


@auth_bp.route("/login", methods=["POST"])
def login():
    """
    Authenticate user and return a JWT token with an expiration time.

    This endpoint validates user credentials, and if correct, generates a JWT token.
    The token contains an expiration timestamp to enforce session limits.
    
    Returns:
        - 200: JSON containing the JWT token and user data.
        - 400: If request data is missing or invalid.
        - 404: If authentication fails due to incorrect credentials.
        - 500: If an unexpected error occurs.
    """
    try:
        data = request.json
        if not data:
            return jsonify(message="Please provide user details", error="Bad request"), 400

        # Validate email and password before processing the request
        is_validated = validate_email_and_password(data.get('email'), data.get('password'))
        if is_validated is not True:
            return jsonify(message="Invalid data", error=is_validated), 400

        # Authenticate user
        user = User.login(data["email"], data["password"])
        if user:
            # Set token expiration time (1 minute from now)
            expiration_time = datetime.now(timezone.utc) + timedelta(minutes=2)

            # Create JWT payload with essential claims
            token_payload = {
                "user_id": user["id"],
                "exp": expiration_time,  # Expiration timestamp (token validity period)
                "iat": datetime.now(timezone.utc),  # Issued-at timestamp (when the token was generated)
                "jti": str(uuid.uuid4())  # Unique token identifier (optional but useful for revocation)
            }

            # Generate JWT token
            user["token"] = jwt.encode(
                token_payload,
                current_app.config["SECRET_KEY"],
                algorithm="HS256"
            )

            return jsonify(message="Successfully authenticated", data=user)

        # If authentication fails (incorrect email/password)
        return jsonify(message="Invalid email or password", error="Unauthorized"), 404

    except Exception as e:
        # Handle unexpected server errors
        return jsonify(message="Something went wrong", error=str(e)), 500


@auth_bp.route("/", methods=["GET"])
@token_required
def get_current_user(current_user):
    """Retrieve the authenticated user's profile."""
    return jsonify(message="Successfully retrieved user profile", data=current_user)

@auth_bp.route("/get_all_users", methods=["GET"])
@token_required
def get_all_users(current_user):
    """
    Retrieve a list of all users in the system.
    Only accessible to superusers.
    """
    users = User.get_all_users()
    return jsonify(message="Successfully retrieved all users", data=users), 200



@auth_bp.route("/activate/<int:user_id>", methods=["POST"])
@token_required
def activate_user(current_user, user_id):
    print('()')
    success = User.activate_user_by_id(user_id)
    print(user_id)
    if success:
        print(')(')
        return jsonify(message=f"User {user_id} has been activated"), 200
    return jsonify(message="User not found", error="Not Found"), 404

@auth_bp.route("/<int:user_id>", methods=["POST"])
@token_required
def promote_to_superuser(current_user, user_id):
    """
    Promote a user to superuser status. Only superusers can access this endpoint.
    """
    print(user_id)
    success = User.make_superuser(user_id)
    if success:
        return jsonify(message=f"User {user_id} is now a superuser"), 200
    else:
        return jsonify(message="User not found", error="Not Found"), 404

@auth_bp.route("/deactivate/<int:user_id>", methods=["POST"])
@token_required
def deactivate_user(current_user, user_id):
    """
    Deactivates a user account.
    Only accessible by superusers.
    """
    success = User.deactivate_user(user_id)
    if success:
        return jsonify(message=f"User {user_id} has been deactivated"), 200
    return jsonify(message="User not found", error="Not Found"), 404



@auth_bp.route("/remove-super/<int:user_id>", methods=["POST"])
@token_required
def remove_superuser_status(current_user, user_id):
    """
    Removes superuser status from a user.
    Only accessible by other superusers.
    """
    success = User.remove_superuser(user_id)
    if success:
        return jsonify(message=f"User {user_id} is no longer a superuser"), 200
    return jsonify(message="User not found or not a superuser", error="Bad Request"), 400

    
@auth_bp.route("/refresh", methods=["POST"])
@token_required
def refresh_token(current_user):
    """
    Refresh JWT token if the current one is still valid.

    This endpoint verifies the user's current token and returns a new one
    with a fresh expiration time.

    Returns:
        - 200: New JWT token and expiration details.
        - 401: If token is invalid or expired.
    """
    try:
        # Устанавливаем новое время жизни токена (например, 30 минут)
        expiration_time = datetime.now(timezone.utc) + timedelta(minutes=2)

        token_payload = {
            "user_id": current_user["id"],
            "exp": expiration_time,
            "iat": datetime.now(timezone.utc),
            "jti": str(uuid.uuid4())
        }

        new_token = jwt.encode(
            token_payload,
            current_app.config["SECRET_KEY"],
            algorithm="HS256"
        )

        return jsonify({
            "message": "Token refreshed successfully",
            "data": {
                "token": new_token,
                "expires_at": expiration_time.isoformat()
            }
        }), 200

    except Exception as e:
        return jsonify({
            "message": "Failed to refresh token",
            "error": str(e)
        }), 500


@auth_bp.route("/", methods=["PUT"])
@token_required
def update_user(current_user):
    """Update the authenticated users profile (only name)."""
    try:
        user_data = request.json
        if "name" in user_data:
            updated_user = User.update(current_user["id"], user_data["name"])
            return jsonify(message="Successfully updated account", data=updated_user), 200
        return jsonify(message="Invalid data, you can only update your account name!", error="Bad Request"), 400
    except Exception as e:
        return jsonify(message="Failed to update account", error=str(e)), 400
    