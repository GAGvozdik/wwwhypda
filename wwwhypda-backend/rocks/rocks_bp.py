from flask import Blueprint, request, jsonify, current_app
import jwt
# from rocks_models import db, User
from rocks.rocks_models import Country, Review, Environment, Fracturation
from rocks.rocks_models import Source, RockType, Parameter, Sample, Measure, Scale
from rocks.rocks_models import ExperimentType, Quality, InterpretationMethod
from flask_jwt_extended import jwt_required, get_jwt_identity
import time 
rocks_bp = Blueprint("api", __name__, url_prefix="/api")


@rocks_bp.route('/msg', methods=['POST'])
def get_msg():
    data = request.json  
    time.sleep(4)  
    return str(data['query'])  


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
    samples = Sample.getSamplesByRockType(rt_id)
    sample_ids = [sample['id_Sample'] for sample in samples]
    measures = Measure.getMeasuresBySampleIdAndParam(sample_ids, id_Parameter)
    
    return jsonify(measures)

