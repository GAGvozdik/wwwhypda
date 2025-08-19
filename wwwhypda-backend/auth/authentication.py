from flask import Blueprint, request, jsonify, current_app, session
import jwt
import time
import uuid
from auth.auth_models import db, User, ConfirmationCode
from auth.validate import validate_email_and_password, validate_user, validate_password
from flask_mail import Message
from common_defenitions import mail, verify_recaptcha
from datetime import datetime, timedelta, timezone
from flask import make_response
from flask_jwt_extended import unset_jwt_cookies
import traceback
from flask_jwt_extended import (
    create_access_token, create_refresh_token,
    get_jwt_identity, get_jwt, jwt_required,
    set_access_cookies, set_refresh_cookies, get_csrf_token, unset_jwt_cookies
)
import logging
import requests
import os

auth_bp = Blueprint("users", __name__, url_prefix="/users")



@auth_bp.route("/login", methods=["POST"])
def login():
    try:
        data = request.json
        if not data:
            return jsonify(message="Please provide credentials"), 400

        is_valid, error_response = verify_recaptcha(data.get('recaptcha_token'))
        if not is_valid:
            return error_response

        user = User.login(data["email"], data["password"])
        if not user:
            return jsonify(message="Invalid email or password", error="Unauthorized"), 404

        identity = str(user["id"])

        access_expires_seconds = session.get('ACCESS_EXPIRES_SECONDS', current_app.config.get('ACCESS_EXPIRES_SECONDS', 21600))
        refresh_expires_seconds = current_app.config.get('REFRESH_EXPIRES_SECONDS', 86400)

        access_expires = timedelta(seconds=access_expires_seconds)
        refresh_expires = timedelta(seconds=refresh_expires_seconds)

        access_token = create_access_token(
            identity=identity,
            expires_delta=access_expires,
            additional_claims={"is_superuser": user["is_superuser"]}
        )
        refresh_token = create_refresh_token(identity=identity, expires_delta=refresh_expires)

        response = jsonify(message="Successfully logged in")
        set_access_cookies(response, access_token)
        set_refresh_cookies(response, refresh_token)
        
        response.set_cookie("csrf_token", get_csrf_token(access_token), httponly=False)

        return response

    except Exception as e:
        traceback.print_exc()
        return jsonify(message="Something went wrong", error=str(e)), 500

@auth_bp.route('/check', methods=['GET'])
@jwt_required()
def check_auth():
    identity = get_jwt_identity()
    claims = get_jwt()
    return jsonify(
        logged_in=True,
        user_id=identity,
        is_superuser=claims.get("is_superuser", False)
    ), 200

@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True, locations=["cookies"])
def refresh():
    try:
        identity = get_jwt_identity()
        if not identity:
            raise ValueError("Missing JWT identity")

        user = User.query.get(identity)
        if not user:
            raise ValueError("User not found")

        is_superuser = user.is_superuser

        access_expires_seconds = current_app.config.get('ACCESS_EXPIRES_SECONDS', 21600)
        new_access_token = create_access_token(
            identity=identity,
            additional_claims={"is_superuser": is_superuser},
            expires_delta=timedelta(seconds=access_expires_seconds)
        )

        response = jsonify(message="Access token refreshed")
        set_access_cookies(response, new_access_token)
        
        response.set_cookie(
            "csrf_token",
            get_csrf_token(new_access_token),
            httponly=False,
            secure=True,
            samesite="Strict"
        )
        
        return response

    except Exception as e:
        auth_bp.logger.error(f"Error refreshing access token: {e}")
        return jsonify(message="Failed to refresh access token"), 500

@auth_bp.route('/super_check', methods=['GET'])
@jwt_required()
def check_super_user():
    identity = get_jwt_identity()
    user = User.query.get(identity)
    if not user:
        return jsonify(message="User not found"), 404
    return jsonify(logged_in=True, user=identity, is_superuser=user.is_super()), 200

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
        
        is_valid, error_response = verify_recaptcha(data.get('recaptcha_token'))
        if not is_valid:
            return error_response

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

        is_valid, error_response = verify_recaptcha(user_data.get('recaptcha_token'))
        if not is_valid:
            return error_response

        # Remove recaptcha_token before validation
        user_data.pop('recaptcha_token', None)

        validation_result = validate_user(**user_data)
        if validation_result is not True:
            return jsonify(validation_result), 400

        existing_user = User.query.filter_by(email=user_data["email"]).first()
        if existing_user:
            return jsonify(message="User already exists", error="Conflict", data=None), 409

        confirmation_code = ConfirmationCode.create_code(user_data["email"], "registration")

        try:
            with current_app.app_context():
                msg = Message("Activate your account", sender=current_app.config["MAIL_USERNAME"], recipients=[user_data["email"]])
                msg.body = f"Your activation code: {confirmation_code.code}"
                if current_app.config["DEBUG"] == True:
                    print(msg.body)
                mail.send(msg)
        except Exception as e:
            return jsonify(message="Mail server is broken", error=str(e)), 202

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

        is_valid, error_response = verify_recaptcha(data.get('recaptcha_token'))
        if not is_valid:
            return error_response

        email = data["email"]
        user = User.get_by_email(email)
        if not user:
            return jsonify(message="User not found or inactive", error="Not Found"), 404

        confirmation_code = ConfirmationCode.create_code(email, "password_reset")
        
        try:
            with current_app.app_context():
                msg = Message("Password Reset Code", sender=current_app.config["MAIL_USERNAME"], recipients=[email])
                msg.body = f"Your password reset code: {confirmation_code.code}"
                if current_app.config["DEBUG"] == True:
                    print(msg.body)
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

        is_valid, error_response = verify_recaptcha(data.get('recaptcha_token'))
        if not is_valid:
            return error_response

        email = data["email"]
        code = data["code"]
        new_password = data["new_password"]

        password_validation = validate_password(new_password)
        if password_validation is not True:
            return jsonify(message=password_validation, error="Bad password"), 400

        if not ConfirmationCode.verify_code(email, code, "password_reset"):
            return jsonify(message="Invalid or expired reset code", error="Unauthorized"), 401

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
    
@auth_bp.route("/resend-confirmation", methods=["POST"])
def resend_confirmation():
    """Resend a confirmation code to an existing inactive user."""
    try:
        data = request.json
        if not data or "email" not in data:
            return jsonify(message="Please provide an email", error="Bad request", data=None), 400

        is_valid, error_response = verify_recaptcha(data.get('recaptcha_token'))
        if not is_valid:
            return error_response

        email = data["email"]

        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify(message="User not found", error="Not Found", data=None), 404

        if user.active:
            return jsonify(message="Account is already activated", error="Conflict", data=None), 409

        confirmation_code = ConfirmationCode.create_code(email, "registration")

        try:
            with current_app.app_context():
                msg = Message(
                    "Your new activation code",
                    sender=current_app.config["MAIL_USERNAME"],
                    recipients=[email]
                )
                msg.body = f"Your new activation code: {confirmation_code.code}"
                if current_app.config["DEBUG"] == True:
                    print(msg.body)
                mail.send(msg)
        except Exception as e:
            return jsonify(message="Mail server is broken", error=str(e), data=None), 202

        return jsonify(message="A new confirmation code has been sent to your email.", data=None), 200

    except Exception as e:
        return jsonify(message="Something went wrong", error=str(e), data=None), 500