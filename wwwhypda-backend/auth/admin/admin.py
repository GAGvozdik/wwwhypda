

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

admin_bp = Blueprint("admin", __name__, url_prefix="/admin")


@admin_bp.route("/get_all_users", methods=["GET"])
@token_required
def get_all_users(current_user):
    """
    Retrieve a list of all users in the system.
    Only accessible to superusers.
    """
    users = User.get_all_users()
    return jsonify(message="Successfully retrieved all users", data=users), 200



@admin_bp.route("/activate/<int:user_id>", methods=["POST"])
@token_required
def activate_user(current_user, user_id):
    print('()')
    success = User.activate_user_by_id(user_id)
    print(user_id)
    if success:
        print(')(')
        return jsonify(message=f"User {user_id} has been activated"), 200
    return jsonify(message="User not found", error="Not Found"), 404

@admin_bp.route("/<int:user_id>", methods=["POST"])
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

@admin_bp.route("/deactivate/<int:user_id>", methods=["POST"])
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



@admin_bp.route("/remove-super/<int:user_id>", methods=["POST"])
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
