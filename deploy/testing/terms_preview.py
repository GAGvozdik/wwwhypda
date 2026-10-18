"""Disposable localhost browser fixture. No env loader, SMTP or persistent database.
Run only through terms-preview.compose.yml; never include in production startup.
"""
from datetime import datetime, timedelta, timezone
from pathlib import Path
import socket

from flask import Flask, abort, jsonify, redirect, request, send_from_directory
from flask_jwt_extended import JWTManager, create_access_token, create_refresh_token, set_access_cookies, set_refresh_cookies
from common_defenitions import db, limiter
from auth.auth_models import User
from auth.authentication import auth_bp
from auth.admin.admin import admin_bp
from auth.session_security import configure_session_security
from auth.terms import CURRENT_TERMS_VERSION
from inputData.inputData import input_bp

STATIC = Path('/preview')
app = Flask(__name__, static_folder=None)
app.config.update(
    TESTING=True, APP_ENV='development', SECRET_KEY='disposable-preview-session-key',
    SQLALCHEMY_DATABASE_URI='sqlite://', SQLALCHEMY_BINDS={'users_db': 'sqlite://'},
    JWT_SECRET_KEY='disposable-preview-jwt-key-at-least-32-bytes',
    JWT_TOKEN_LOCATION=['cookies'], JWT_COOKIE_CSRF_PROTECT=True,
    JWT_COOKIE_SECURE=False, JWT_REFRESH_COOKIE_PATH='/api/users/refresh',
    RECAPTCHA_ENABLED=True, RECAPTCHA_SECRET_KEY='not-a-real-key',
    RATELIMIT_ENABLED=False, AUTH_LOGIN_RATE_LIMIT='100 per minute',
    AUTH_REGISTRATION_RATE_LIMIT='100 per minute', AUTH_CONFIRMATION_RATE_LIMIT='100 per minute',
    AUTH_RESEND_RATE_LIMIT='100 per minute', AUTH_PASSWORD_RESET_RATE_LIMIT='100 per minute',
    ACCESS_EXPIRES_SECONDS=900, REFRESH_EXPIRES_SECONDS=1800,
    MAIL_DELIVERY_MODE='log', MAIL_DEFAULT_SENDER='fixture@example.test',
    CONFIRMATION_CODE_TTL_SECONDS=120, PASSWORD_RESET_CODE_TTL_SECONDS=120,
)
db.init_app(app)
limiter.init_app(app)
configure_session_security(JWTManager(app))
app.register_blueprint(auth_bp, url_prefix='/api/users')
app.register_blueprint(admin_bp, url_prefix='/api/admin')
app.register_blueprint(input_bp, url_prefix='/api/input')

with app.app_context():
    db.create_all()
    for label in ('current', 'old', 'unknown', 'session', 'delete'):
        user=User(name='Preview '+label, email=label+'@example.test', active=True,
            registration_completed=True, registered_at=datetime.now(timezone.utc))
        user.set_password('Password1!')
        if label != 'unknown':
            user.terms_version=CURRENT_TERMS_VERSION if label == 'current' else 'preview-previous'
            user.terms_accepted_at=datetime(2026,1,1,tzinfo=timezone.utc)
        db.session.add(user)
    db.session.commit()

# Defense in depth: this fixture process cannot initiate an outbound connection.
def no_outbound(self, address):
    raise OSError('Outbound connections disabled in disposable preview')
socket.socket.connect = no_outbound
socket.create_connection = no_outbound

@app.before_request
def local_only():
    if request.host not in ('localhost:8082', '127.0.0.1:8082'):
        abort(403)

@app.after_request
def private_preview(response):
    response.headers['Cache-Control']='no-store'
    response.headers['X-Robots-Tag']='noindex, nofollow'
    response.headers['X-Content-Type-Options']='nosniff'
    return response

@app.get('/recaptcha-frame.html')
def synthetic_captcha():
    # Matches the existing frame message protocol; only the fixture server serves this.
    return """<!doctype html><html><title>Disposable CAPTCHA fixture</title><script>
    addEventListener('message',e=>{
      const d=e.data;
      if(e.origin!==location.origin||e.source!==parent||!d||
        d.channel!=='wwhypda-recaptcha-v1'||d.type!=='execute')return;
      parent.postMessage({channel:d.channel,type:'token',id:d.id,token:'test-token'},location.origin);
    });</script></html>"""

@app.get('/__preview__/old-session')
def old_session():
    user=User.query.filter_by(email='session@example.test').one()
    # A valid existing session whose account has not accepted the new edition.
    claims={'account_version':user.session_version(), 'is_superuser':False}
    response=redirect('/account')
    set_access_cookies(response,create_access_token(identity=str(user.id),additional_claims=claims,
        expires_delta=timedelta(minutes=15)))
    set_refresh_cookies(response,create_refresh_token(identity=str(user.id),additional_claims=claims,
        expires_delta=timedelta(minutes=30)))
    return response

@app.get('/api/rocks/<path:unused>')
def empty_catalogue(unused):
    # This preview tests legal/auth only; catalogue lookups must still be arrays.
    return jsonify([])

@app.get('/api/<path:unused>')
def missing_api(unused):
    return jsonify(message='Not available in the legal/auth preview'),404

@app.get('/', defaults={'path':''})
@app.get('/<path:path>')
def frontend(path):
    if path.startswith(('assets/','legal/','fonts/','logos/')) or '.' in path.rsplit('/',1)[-1]:
        return send_from_directory(STATIC,path)
    return send_from_directory(STATIC,'index.html')

if __name__ == '__main__':
    if not (STATIC/'index.html').is_file():
        raise SystemExit('Build the isolated preview frontend first')
    app.run(host='0.0.0.0',port=8082,debug=False,use_reloader=False,threaded=False)
