from flask import Blueprint, request, jsonify, current_app
import jwt
from inputData.inputDataModels import InputData
from flask_jwt_extended import jwt_required, get_jwt_identity
import time 


input_bp = Blueprint("input", __name__, url_prefix="/input")

@input_bp.route("/submit", methods=["POST"])
@jwt_required()
def submit_data():
    current_user_id = get_jwt_identity()
    payload = request.get_json()

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

@input_bp.route("/get_input_suggestions", methods=["GET"])
@jwt_required()
def get_input_suggestions():
    data = InputData.get_input_suggestions()
    return jsonify({"data": data}), 200
