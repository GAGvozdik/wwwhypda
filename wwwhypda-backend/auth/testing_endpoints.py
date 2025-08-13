from flask import Blueprint, request, jsonify, current_app, session
from auth.auth_models import ConfirmationCode

# Создаем новый Blueprint специально для тестовых эндпоинтов
testing_bp = Blueprint("testing", __name__, url_prefix="/testing")

@testing_bp.route("/get-confirmation-code", methods=["GET"])
def get_confirmation_code_for_testing():
    """
    An endpoint available only in testing mode to retrieve a user's confirmation code.
    """
    # Этот эндпоинт должен быть доступен только в режиме тестирования
    if not current_app.config.get('TESTING'):
        return jsonify(message="This endpoint is only available in testing mode."), 404

    email = request.args.get('email')
    if not email:
        return jsonify(message="Email parameter is required."), 400

    # Находим последний код для указанного email
    confirmation_code = ConfirmationCode.query.filter_by(
        email=email,
        type='registration'
    ).order_by(ConfirmationCode.created_at.desc()).first()

    if not confirmation_code:
        return jsonify(message="No confirmation code found for this email."), 404

    return jsonify(confirmation_code=confirmation_code.code), 200

@testing_bp.route('/config', methods=['POST'])
def configure_test_session():
    if not current_app.config.get('TESTING'):
        return jsonify(message="This endpoint is only available in testing mode."), 404

    data = request.json
    if 'ACCESS_EXPIRES_SECONDS' in data:
        session['ACCESS_EXPIRES_SECONDS'] = data['ACCESS_EXPIRES_SECONDS']
    
    return jsonify(message="Test configuration updated."), 200