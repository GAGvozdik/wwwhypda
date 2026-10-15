from flask import Blueprint, request, jsonify, current_app, session, g
import jwt
import time
import uuid
from auth.auth_models import db, User, ConfirmationCode
from auth.validate import validate_email_and_password, validate_user, validate_password, validate_email, messages
from auth.terms import CURRENT_TERMS_VERSION
from auth.password_reset_delivery import send_reset_email, send_auth_code_email, wait_for_response_window, wait_for_failed_login
from auth.transaction_lock import lock_users_transaction
from sqlalchemy.exc import IntegrityError
from werkzeug.security import generate_password_hash
from flask_mail import Message
from common_defenitions import mail, verify_recaptcha, limiter, send_auth_email, error_message
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
@limiter.limit(lambda: current_app.config["AUTH_LOGIN_RATE_LIMIT"])
def login():
    try:
        data = request.get_json(silent=True)
        if (not isinstance(data, dict) or not isinstance(data.get("email"), str)
                or not 1 <= len(data["email"]) <= 100 or validate_email(data["email"]) is not True
                or not isinstance(data.get("password"), str) or not 1 <= len(data["password"]) <= 1024):
            return jsonify(message="Please provide credentials"), 400

        is_valid, error_response = verify_recaptcha(data.get('recaptcha_token'), "login")
        if not is_valid:
            return error_response

        started = time.monotonic()
        user = User.login(data["email"], data["password"])
        if not user:
            db.session.rollback()
            wait_for_failed_login(started)
            return jsonify(message="Invalid email or password", error="Unauthorized"), 404

        identity = str(user["id"])

        access_expires_seconds = (session.get('ACCESS_EXPIRES_SECONDS', current_app.config['ACCESS_EXPIRES_SECONDS']) if current_app.config['TESTING'] else current_app.config['ACCESS_EXPIRES_SECONDS'])
        refresh_expires_seconds = current_app.config['REFRESH_EXPIRES_SECONDS']

        access_expires = timedelta(seconds=access_expires_seconds)
        refresh_expires = timedelta(seconds=refresh_expires_seconds)

        access_token = create_access_token(
            identity=identity,
            expires_delta=access_expires,
            additional_claims={"is_superuser": user["is_superuser"], "account_version": user["account_version"]}
        )
        refresh_token = create_refresh_token(identity=identity, expires_delta=refresh_expires, additional_claims={"account_version": user["account_version"]})

        response = jsonify(message="Successfully logged in")
        set_access_cookies(response, access_token)
        set_refresh_cookies(response, refresh_token)
        

        return response

    except Exception as e:
        db.session.rollback()
        current_app.logger.error("Login request failed")
        return jsonify(message="Something went wrong", error=error_message(e)), 500

@auth_bp.route('/check', methods=['GET'])
@jwt_required()
def check_auth():
    # reCAPTCHA v3 verification
    # Session reads rely on JWT/current account/version; no third-party signal needed.
    identity = get_jwt_identity()
    claims = get_jwt()
    return jsonify(
        logged_in=True,
        user_id=identity,
        is_superuser=g.auth_user.is_superuser
    ), 200

@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True, locations=["cookies"])
def refresh():
    try:
        identity = get_jwt_identity()
        if not identity:
            raise ValueError("Missing JWT identity")

        user = g.auth_user
        if not user or not user.active:
            return jsonify(message="Session is no longer valid"), 401

        is_superuser = user.is_superuser

        access_expires_seconds = current_app.config['ACCESS_EXPIRES_SECONDS']
        new_access_token = create_access_token(
            identity=identity,
            additional_claims={"is_superuser": is_superuser, "account_version": user.session_version()},
            expires_delta=timedelta(seconds=access_expires_seconds)
        )

        response = jsonify(message="Access token refreshed")
        set_access_cookies(response, new_access_token)
        
        
        return response

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error refreshing access token: {e}")
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
@limiter.limit(lambda: current_app.config["AUTH_CONFIRMATION_RATE_LIMIT"])
def confirm_registration():
    """Confirm user registration by verifying the activation code."""
    try:
        data = request.get_json(silent=True)
        if (not isinstance(data, dict) or not isinstance(data.get("email"), str)
                or not 1 <= len(data["email"]) <= 100 or validate_email(data["email"]) is not True
                or not isinstance(data.get("code"), str) or len(data["code"]) != 6
                or not data["code"].isascii() or not data["code"].isdigit() ):
            return jsonify(message="Please provide email and code", error="Bad request"), 400

        is_valid, error_response = verify_recaptcha(data.get('recaptcha_token'), "confirm_registration")
        if not is_valid:
            return error_response

        email = data["email"]
        code = data["code"]

        if not ConfirmationCode.verify_code(email, code, "registration"):
            return jsonify(message="Invalid or expired confirmation code", error="Unauthorized"), 401

        user = User.query.filter_by(email=email, active=False, registration_completed=False).first()
        if user:
            user.active = True
            user.registration_completed = True
            ConfirmationCode.query.filter_by(email=email, code=code, type="registration").delete()
            db.session.commit()
            return jsonify(message="Account successfully activated"), 200
        
        return jsonify(message="User not found or already activated", error="Not Found"), 404
    except Exception as e:
        db.session.rollback()
        return jsonify(message="Something went wrong", error=error_message(e)), 500
    

# в политику добавить про то что я использую почту gmail и капчу
@auth_bp.route("/", methods=["POST"])
@limiter.limit(lambda: current_app.config["AUTH_REGISTRATION_RATE_LIMIT"])
def add_user():
    """Register a new user and send an activation email (enumeration-safe)."""
    try:
        user_data = request.get_json(silent=True)
        if not isinstance(user_data, dict) or not user_data:
            return jsonify(
                message="Please provide user details",
                error="Bad request",
                data=None
            ), 400

        if user_data.pop('adult_confirmed', None) is not True:
            return jsonify(message="Registration is available only to people aged 18 or over."), 400
        if user_data.pop('terms_accepted', None) is not True:
            return jsonify(message="Please accept the User Agreement and acknowledge the Privacy and Cookie Policies."), 400

        if {'registered_at', 'registration_completed'} & user_data.keys():
            return jsonify(message=messages["registration_metadata_forbidden"]), 400
        if 'terms_accepted_at' in user_data:
            return jsonify(message=messages['terms_client_time_forbidden']), 400
        terms_version = user_data.pop('terms_version', None)
        if not isinstance(terms_version, str) or not terms_version:
            return jsonify(message=messages['terms_version_error'], code='terms_version_required'), 400
        if terms_version != CURRENT_TERMS_VERSION:
            return jsonify(message=messages['terms_version_error'], code='terms_version_mismatch'), 409

        is_valid, error_response = verify_recaptcha(user_data.get('recaptcha_token'), "register")
        if not is_valid:
            return error_response

        user_data.pop('recaptcha_token', None)

        if (any(not isinstance(user_data.get(key), str) for key in ("email", "password", "name"))
                or len(user_data["email"]) > 100 or len(user_data["password"]) > 1024
                or len(user_data["name"]) > 100):
            return jsonify(message=messages["registration_failed"]), 400
        validation_result = validate_user(**user_data)
        if validation_result is not True:
            return jsonify(validation_result), 400

        email = user_data["email"]

        started = time.monotonic()
        try:
            # One hash for every valid registration, before database locks.
            password_hash = generate_password_hash(user_data["password"])
            lock_users_transaction()
            existing_user = User.query.filter_by(email=email).populate_existing().with_for_update().first()

            # 👉 ВСЕГДА создаём/обновляем код
            # Historical comment above; current eligibility is explicit below.
            new_account = existing_user is None
            if new_account:
                existing_user = User(name=user_data["name"], email=email, active=False,
                    registered_at=datetime.now(timezone.utc), registration_completed=False,
                    terms_accepted_at=datetime.now(timezone.utc), terms_version=CURRENT_TERMS_VERSION)
                existing_user.password = password_hash
                db.session.add(existing_user)
                try:
                    db.session.flush()
                except IntegrityError as exc:
                    # Конкурентное создание того же email: принятие победителя не изменяется.
                    db.session.rollback()
                    sqlstate = getattr(exc.orig, 'pgcode', None)
                    constraint = getattr(getattr(exc.orig, 'diag', None), 'constraint_name', None)
                    sqlite_unique = getattr(exc.orig, 'sqlite_errorname', None) == 'SQLITE_CONSTRAINT_UNIQUE'
                    if not (sqlite_unique or (sqlstate == '23505' and constraint == 'users_email_key')):
                        raise
                    lock_users_transaction()
                    existing_user = User.query.filter_by(email=email).populate_existing().with_for_update().first()
                    if existing_user is None:
                        raise
                    new_account = False
            confirmation_code = None
            # Only new or explicitly unconfirmed registrations are eligible for codes.
            if not existing_user.active and existing_user.registration_completed is False:
                confirmation_code = ConfirmationCode.create_code(email, "registration", commit=False)
            email_code = confirmation_code.code if confirmation_code is not None else None
            db.session.commit()
            db.session.rollback()

            if new_account and email_code is not None:
                try:
                    if not send_auth_code_email("Activate your account", email,
                            f"Your activation code: {email_code}", started):
                        current_app.logger.error("Activation email delivery failed")
                except Exception:
                    current_app.logger.error("Activation email delivery failed")
                # Аккаунт и код уже сохранены одной транзакцией выше.

            # 👉 ВСЕГДА одинаковый ответ
            return jsonify(
                message=messages["registration_requested"]
            ), 200

        except Exception:
            db.session.rollback()
            current_app.logger.error("Registration request could not be processed")
            return jsonify(message=messages["registration_requested"]), 200
        finally:
            db.session.rollback()
            wait_for_response_window(started)

    except Exception as e:
        db.session.rollback()
        return jsonify(
            message="Something went wrong",
            error=error_message(e),
            data=None
        ), 500

@auth_bp.route("/request-password-reset", methods=["POST"])
@limiter.limit(lambda: current_app.config["AUTH_PASSWORD_RESET_RATE_LIMIT"])
def request_password_reset():
    """Send a password reset code to the user's email."""
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify(message=messages["email_required"]), 400
    email = data.get("email")
    if (not isinstance(email, str) or not 1 <= len(email) <= 100
            or "\r" in email or "\n" in email or validate_email(email) is not True):
        return jsonify(message=messages["email_invalid"]), 400

    is_valid, error_response = verify_recaptcha(data.get('recaptcha_token'), ("request_password_reset", "resend_password_reset"))
    if not is_valid:
        return error_response

    started = time.monotonic()
    try:
        user = User.get_by_email(email)
        if user:
            confirmation_code = ConfirmationCode.create_code(email, "password_reset")
            if confirmation_code is not None:
                code = confirmation_code.code
                db.session.rollback()
                if not send_reset_email(email, code, started):
                    db.session.rollback()
                    current_app.logger.warning("Password reset delivery did not complete")
            else:
                db.session.rollback()
    except Exception:
        try:
            db.session.rollback()
        except Exception:
            current_app.logger.error("Password reset rollback failed")
        current_app.logger.error("Password reset request could not be processed")
    finally:
        # Release read transactions/connections before the uniform response wait.
        try:
            db.session.rollback()
        except Exception:
            current_app.logger.error("Password reset rollback failed")
        wait_for_response_window(started)
    return jsonify(message=messages["password_reset_requested"]), 200

@auth_bp.route("/confirm-password-reset", methods=["POST"])
@limiter.limit(lambda: current_app.config["AUTH_PASSWORD_RESET_RATE_LIMIT"])
def confirm_password_reset():
    """Verify the reset code and update the user's password."""
    try:
        data = request.get_json(silent=True)
        if (not isinstance(data, dict) or not isinstance(data.get("email"), str)
                or not 1 <= len(data["email"]) <= 100 or validate_email(data["email"]) is not True
                or not isinstance(data.get("code"), str) or len(data["code"]) != 6
                or not data["code"].isascii() or not data["code"].isdigit()
                or not isinstance(data.get("new_password"), str) or len(data["new_password"]) > 1024 ):
            return jsonify(message="Please provide code and new password", error="Bad request"), 400

        is_valid, error_response = verify_recaptcha(data.get('recaptcha_token'), "confirm_password_reset")
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

        user = User.query.filter_by(email=email, active=True).first()
        if user:
            user.set_password(new_password)
            ConfirmationCode.query.filter_by(email=email, code=code, type="password_reset").delete()
            db.session.commit()
            return jsonify(message="Password successfully updated"), 200
        
        return jsonify(message="User not found or inactive", error="Not Found"), 404
    except Exception as e:
        db.session.rollback()
        return jsonify(message="Something went wrong", error=error_message(e)), 500

@auth_bp.route("/", methods=["PUT"])
@jwt_required()
def update_user():
    current_user = get_jwt_identity()
    """Update the authenticated users profile (only name)."""
    try:
        user_data = request.json
        if "name" in user_data:
            updated_user = User.update(current_user, user_data["name"])
            return jsonify(message="Successfully updated account", data=updated_user), 200
        return jsonify(message="Invalid data, you can only update your account name!", error="Bad Request"), 400
    except Exception as e:
        db.session.rollback()
        return jsonify(message="Failed to update account", error=error_message(e)), 400
    
@auth_bp.route("/resend-confirmation", methods=["POST"])
@limiter.limit(lambda: current_app.config["AUTH_RESEND_RATE_LIMIT"])
def resend_confirmation():
    data = request.get_json(silent=True)
    if not isinstance(data, dict) or not isinstance(data.get("email"), str):
        return jsonify(message=messages["email_invalid"]), 400
    email = data["email"]
    if not 1 <= len(email) <= 100 or "\r" in email or "\n" in email or validate_email(email) is not True:
        return jsonify(message=messages["email_invalid"]), 400
    is_valid, error_response = verify_recaptcha(data.get('recaptcha_token'), "resend_code")
    if not is_valid:
        return error_response
    started = time.monotonic()
    try:
        lock_users_transaction()
        user = User.query.filter_by(email=email).populate_existing().with_for_update().first()

        # ⚠️ Никаких ранних return'ов
        code = None
        if user and not user.active and user.registration_completed is False:
            confirmation_code = ConfirmationCode.create_code(email, "registration", commit=False)
            code = confirmation_code.code if confirmation_code is not None else None
        db.session.commit()
        db.session.rollback()
        if code is not None:
            try:
                if not send_auth_code_email("Your new activation code", email,
                        f"Your new activation code: {code}", started):
                    current_app.logger.warning("Activation resend delivery did not complete")
            except Exception:
                pass  # ❗ не палим ошибку наружу
    except Exception:
        db.session.rollback()
        current_app.logger.error("Activation resend could not be processed")
    finally:
        db.session.rollback()
        wait_for_response_window(started)

    # ✅ Всегда одинаковый ответ
    return jsonify(message=messages["registration_requested"]), 200

@auth_bp.route("/me", methods=["DELETE"])
@jwt_required()
@limiter.limit(lambda: current_app.config["AUTH_PASSWORD_RESET_RATE_LIMIT"])
def delete_own_account():
    """Удаляет только владельца JWT и его данные одной транзакцией users_db."""
    from inputData.inputDataModels import InputData
    from auth.validate import messages
    data = request.get_json(silent=True)
    if not isinstance(data, dict) or set(data) - {"password", "recaptcha_token"}:
        return jsonify(message=messages["account_delete_invalid_request"]), 400
    password = data.get("password")
    if not isinstance(password, str) or not password or len(password) > 200:
        return jsonify(message=messages["password_required"]), 400
    user = g.auth_user
    if not user.check_password(password):
        return jsonify(message=messages["account_delete_password_invalid"]), 403
    try:
        # editing_by хранит копию имени администратора, а не FK.
        # При одинаковых именах нельзя приписывать чужую метку удаляемому пользователю.
        from maintenance.retention import delete_account_data
        delete_account_data(user)
        db.session.commit()
    except Exception:
        db.session.rollback()
        current_app.logger.error("Account deletion transaction failed")
        return jsonify(message=messages["account_delete_failed"]), 500
    response = jsonify(message=messages["account_deleted"])
    unset_jwt_cookies(response)
    return response, 200
