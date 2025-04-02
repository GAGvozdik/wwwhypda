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
from auth.auth_middleware import token_required
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

@auth_bp.route("/", methods=["POST"])
def add_user():
    """Register a new user and send an activation email."""
    try:
        user_data = request.json
        if not user_data:
            return jsonify(message="Please provide user details", data=None, error="Bad request"), 400

        # Validate user data
        is_validated = validate_user(**user_data)
        if is_validated is not True:
            return jsonify(message="Invalid data", data=None, error=is_validated), 400

        # Check if the user already exists
        existing_user = User.query.filter_by(email=user_data["email"]).first()
        if existing_user:
            return jsonify(message="User already exists", error="Conflict", data=None), 409

        # Generate and send confirmation code
        confirmation_code = ConfirmationCode.create_code(user_data["email"], "registration")
        print('confirmation_code = ', confirmation_code.to_dict())
            
        try:
            with current_app.app_context():  # Ensure you're within an application context
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
            return jsonify(message="Please provide email, code and new password", error="Bad request"), 400

        email = data["email"]
        code = data["code"]
        new_password = data["new_password"]

        if not validate_password(new_password):
            return jsonify(message="Password is invalid", error="Bad request"), 400

        if not ConfirmationCode.verify_code(email, code, "password_reset"):
            return jsonify(message="Invalid or expired reset code", error="Unauthorized"), 401

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
            expiration_time = datetime.now(timezone.utc) + timedelta(minutes=60)

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

@auth_bp.route("/", methods=["PUT"])
@token_required
def update_user(current_user):
    """Update the authenticated user's profile (only name)."""
    try:
        user_data = request.json
        if "name" in user_data:
            updated_user = User.update(current_user["id"], user_data["name"])
            return jsonify(message="Successfully updated account", data=updated_user), 200
        return jsonify(message="Invalid data, you can only update your account name!", error="Bad Request"), 400
    except Exception as e:
        return jsonify(message="Failed to update account", error=str(e)), 400