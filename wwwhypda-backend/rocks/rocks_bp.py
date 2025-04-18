from flask import Blueprint, request, jsonify, current_app
import jwt
# from rocks_models import db, User
from rocks.rocks_models import Country, Review, Environment, Fracturation
from rocks.rocks_models import Source, RockType, Parameter, Sample, Measure, Scale
from rocks.rocks_models import ExperimentType, Quality, InterpretationMethod
from auth.auth_middleware import token_required

rocks_bp = Blueprint("api", __name__, url_prefix="/api")

# @rocks_bp.route("/", methods=["POST"])

@rocks_bp.route('/countries', methods=['GET'])
@token_required
def get_countries(current_user):
    return Country.get_all_countries()

@rocks_bp.route('/reviews', methods=['GET'])
@token_required
def get_reviews(current_user):
    return Review.get_all_reviews()

@rocks_bp.route('/environments', methods=['GET'])
@token_required
def get_environments(current_user):
    return Environment.get_all_environments()

@rocks_bp.route('/fracturations', methods=['GET'])
@token_required
def get_fracturations(current_user):
    return Fracturation.get_all_fracturations()

@rocks_bp.route('/scales', methods=['GET'])
@token_required
def get_scales(current_user):
    return Scale.get_all_scales()

@rocks_bp.route('/samples', methods=['GET']) 
@token_required
def api_samples(current_user):
    results = Sample.get_all_samples()
    return jsonify(results)

@rocks_bp.route('/qualities', methods=['GET'])
@token_required
def get_qualities(current_user):
    return Quality.get_all_qualities()

@rocks_bp.route('/experiment_types', methods=['GET'])
@token_required
def get_experiment_types(current_user):
    return ExperimentType.get_all_experiment_types()

@rocks_bp.route('/interpretation_methods', methods=['GET'])
@token_required
def get_interpretation_methods(current_user):
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
    samples = Sample.getSamplesByRockType(rt_id)
    sample_ids = [sample['id_Sample'] for sample in samples]
    measures = Measure.getMeasuresBySampleIdAndParam(sample_ids, id_Parameter)
    
    return jsonify(measures)

