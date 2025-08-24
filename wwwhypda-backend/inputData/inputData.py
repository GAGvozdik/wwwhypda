from flask import Blueprint, request, jsonify, current_app
import jwt
from inputData.inputDataModels import InputData, db
from flask_jwt_extended import jwt_required, get_jwt_identity
import time 
from flask_cors import CORS
from common_defenitions import verify_recaptcha
from auth.auth_models import User

input_bp = Blueprint("input", __name__, url_prefix="/input")


@input_bp.route("/get_input_suggestions", methods=["GET"])
@jwt_required()
def get_input_suggestions():
    current_user = get_jwt_identity()
    print(f"User calling get_input_suggestions: {current_user}")
    try:
        data = InputData.get_input_suggestions()
        return jsonify({"data": data}), 200
    except Exception as e:
        current_app.logger.error(f"Error in get_input_suggestions: {e}")
        return jsonify({"error": str(e)}), 500

@input_bp.route("/get_input_by_id/<int:id>", methods=["GET"])
@jwt_required()
def get_input_by_id(id):
    try:
        input_data = InputData.query.filter_by(id=id).first()
        if not input_data:
            return jsonify({"error": "Not found"}), 404
        return jsonify(input_data.to_dict()), 200
    except Exception as e:
        current_app.logger.error(f"Error in get_input_by_id: {e}")
        return jsonify({"error": str(e)}), 500


@input_bp.route("/in_editing/<int:id>", methods=["POST"])
@jwt_required()
def in_editing(id):
    current_user_id = get_jwt_identity()
    user = User.get_by_id(current_user_id)
    if not user or not user.get('is_superuser'):
        return jsonify(message="Unauthorized"), 403

    updated_entry = InputData.set_status(id, 'In editing', user.get('name'))
    if updated_entry:
        return jsonify(message="Status updated to In editing", data=updated_entry), 200
    return jsonify(message="Failed to update status"), 500


@input_bp.route("/complete/<int:id>", methods=["POST"])
@jwt_required()
def complete_submission(id):
    current_user_id = get_jwt_identity()
    user = User.get_by_id(current_user_id)
    if not user or not user.get('is_superuser'):
        return jsonify(message="Unauthorized"), 403

    updated_entry = InputData.set_status(id, 'Completed', None)
    if updated_entry:
        return jsonify(message="Status updated to completed", data=updated_entry), 200
    return jsonify(message="Failed to update status"), 500


@input_bp.route("/delete_submission/<int:id>", methods=["DELETE"])
@jwt_required()
def delete_submission(id):
    current_user_id = get_jwt_identity()
    success = InputData.delete_by_id_if_owned(id, current_user_id)
    
    if success:
        return jsonify({"message": "Submission was deleted sucessfully"}), 200
    else:
        return jsonify({"message": "Deletion failed. The record was not found or does not belong to you."}), 403


@input_bp.route("/submit", methods=["POST"])
@jwt_required()
def submit_data():
    data = request.json
    if not data:
        return jsonify(message="Invalid request data"), 400
    recaptcha_token = data.get('recaptcha_token')
    is_valid, error_response = verify_recaptcha(recaptcha_token)
    if not is_valid:
        return error_response

    current_user_id = get_jwt_identity()
    payload = data

    saved_entry = InputData.save_submission(current_user_id, payload)
    if saved_entry:
        return jsonify(message="Data saved successfully", data=saved_entry), 201
    return jsonify(message="Failed to save data"), 500


@input_bp.route("/my_submissions", methods=["GET"])
@jwt_required()
def get_my_data():
    current_user_id = get_jwt_identity()
    data = InputData.get_user_submissions(current_user_id)
    return jsonify(data), 200


