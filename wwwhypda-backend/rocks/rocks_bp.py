from flask import Blueprint, request, jsonify, current_app
import jwt
from rocks.rocks_models import Country, Review, Environment, Fracturation
from rocks.rocks_models import Source, RockType, Parameter, Sample, Measure, Scale
from rocks.rocks_models import ExperimentType, Quality, InterpretationMethod
from flask_jwt_extended import jwt_required, get_jwt_identity
import time 
import requests
import os
from common_defenitions import verify_recaptcha

rocks_bp = Blueprint("rocks", __name__, url_prefix="/rocks")


@rocks_bp.route('/countries', methods=['GET'])
@jwt_required()
def get_countries():
    current_user = get_jwt_identity()
    return Country.get_all_countries()

@rocks_bp.route('/reviews', methods=['GET'])
@jwt_required()
def get_reviews():
    current_user = get_jwt_identity()
    return Review.get_all_reviews()

@rocks_bp.route('/environments', methods=['GET'])
@jwt_required()
def get_environments():
    current_user = get_jwt_identity()
    return Environment.get_all_environments()

@rocks_bp.route('/fracturations', methods=['GET'])
@jwt_required()
def get_fracturations():
    current_user = get_jwt_identity()
    return Fracturation.get_all_fracturations()

@rocks_bp.route('/scales', methods=['GET'])
@jwt_required()
def get_scales():
    current_user = get_jwt_identity()
    return Scale.get_all_scales()

@rocks_bp.route('/samples', methods=['GET']) 
@jwt_required()
def api_samples():
    current_user = get_jwt_identity()
    results = Sample.get_all_samples()
    return jsonify(results)

@rocks_bp.route('/qualities', methods=['GET'])
@jwt_required()
def get_qualities():
    current_user = get_jwt_identity()
    return Quality.get_all_qualities()

@rocks_bp.route('/experiment_types', methods=['GET'])
@jwt_required()
def get_experiment_types():
    current_user = get_jwt_identity()
    return ExperimentType.get_all_experiment_types()

@rocks_bp.route('/interpretation_methods', methods=['GET'])
@jwt_required()
def get_interpretation_methods():
    current_user = get_jwt_identity()
    return InterpretationMethod.get_all_interpretation_methods()

@rocks_bp.route('/anonce', methods=['GET']) 
def api_anonce():
    results = Source.getDataAnonce()
    return jsonify(results)

@rocks_bp.route('/rock_type', methods=['GET']) 
def api_rock_type():
    results = RockType.getRockTypes()
    return jsonify(results)

@rocks_bp.route('/parameters', methods=['GET'])
def get_parameters():
    parameters = Parameter.getParameters()
    return jsonify(parameters)

@rocks_bp.route('/samples/<int:rt_id>/<int:id_Parameter>')
def get_samples(rt_id, id_Parameter):
    recaptcha_token = request.headers.get('X-Recaptcha-Token')
    success, error_response = verify_recaptcha(recaptcha_token, "search")
    if not success:
        return error_response
    samples = Sample.getSamplesByRockType(rt_id)
    sample_ids = [sample['id_Sample'] for sample in samples]
    measures = Measure.getMeasuresBySampleIdAndParam(sample_ids, id_Parameter)
    
    return jsonify(measures)

@rocks_bp.route('/search', methods=['GET'])
def search_public_catalog():
    from rocks.catalog_search import parse_id, search_catalog
    from sqlalchemy.exc import SQLAlchemyError
    from common_defenitions import db

    success, error_response = verify_recaptcha(request.headers.get('X-Recaptcha-Token'), "search")
    if not success:
        return error_response
    try:
        if set(request.args) != {"rock_type_id", "parameter_id"} or any(
                len(request.args.getlist(key)) != 1 for key in request.args):
            raise ValueError("Invalid catalog filter")
        rock_id = parse_id(request.args["rock_type_id"])
        parameter = request.args["parameter_id"]
        parameter_id = "all" if parameter == "all" else parse_id(parameter)
        return jsonify(search_catalog(rock_id, parameter_id))
    except ValueError:
        return jsonify(message="Invalid catalog filters"), 400
    except LookupError:
        return jsonify(message="Catalog filter not found"), 404
    except (SQLAlchemyError, RuntimeError):
        db.session.rollback()
        current_app.logger.error("Catalog search failed")
        return jsonify(message="Catalog search unavailable"), 500
