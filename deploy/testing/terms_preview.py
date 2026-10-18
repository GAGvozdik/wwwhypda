"""Disposable localhost browser fixture. No env loader, SMTP or persistent database.
Run only through terms-preview.compose.yml; never include in production startup.
"""
from datetime import datetime, timedelta, timezone
from pathlib import Path
import socket
import os
import time

from flask import Flask, abort, jsonify, redirect, request, send_from_directory
from flask_jwt_extended import JWTManager, create_access_token, create_refresh_token, set_access_cookies, set_refresh_cookies
from common_defenitions import db, limiter
from auth.auth_models import User
from auth.authentication import auth_bp
from auth.admin.admin import admin_bp
from auth.session_security import configure_session_security
from auth.terms import CURRENT_TERMS_VERSION
from inputData.inputData import input_bp

import auth.auth_models as models
import auth.registration_limits as registration_limits
_code_counter = 0
def fixture_code(upper):
    global _code_counter
    _code_counter += 1
    return 123456 if _code_counter % 2 else 654321
registration_limits.secrets.randbelow = fixture_code

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
    for label in ('current', 'old', 'unknown', 'session', 'delete', 'pending', 'disabled'):
        user=User(name='Preview '+label, email=label+'@example.test', active=label not in ('pending','disabled'),
            registration_completed=label != 'pending', registered_at=datetime.now(timezone.utc))
        user.set_password('Password1!')
        if label != 'unknown':
            user.terms_version=CURRENT_TERMS_VERSION if label in ('current','pending') else 'preview-previous'
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
    if request.host not in ('localhost:8082', '127.0.0.1:8082', 'localhost:8083', '127.0.0.1:8083', 'localhost', '127.0.0.1'):
        abort(403)

@app.before_request
def visible_auth_wait():
    # Preview ONLY: real application forms stay in their actual loading state.
    # No production delays, changed validation, offline queues or stopped dev DB.
    configured = os.environ.get('STAGE009_AUTH_DELAY_SECONDS', '0')
    if configured not in ('0','3'):
        abort(503)
    path = request.path.rstrip('/')
    auth_post = request.method == 'POST' and path in {
        '/api/users', '/api/users/login', '/api/users/confirm-registration',
        '/api/users/resend-confirmation', '/api/users/request-password-reset',
        '/api/users/confirm-password-reset'}
    guard_read = request.method == 'GET' and path in {'/api/users/check','/api/users/super_check'}
    if auth_post or guard_read:
        time.sleep(int(configured))

@app.after_request
def private_preview(response):
    response.headers['Cache-Control']='no-store'
    response.headers['X-Robots-Tag']='noindex, nofollow'
    response.headers['X-Content-Type-Options']='nosniff'
    return response

@app.get('/recaptcha-frame.html')
def synthetic_captcha():
    # Matches the existing frame message protocol; only the fixture server serves this.
    return '<!doctype html><html><title>Disposable CAPTCHA fixture</title><script src="/__preview__/captcha.js"></script></html>'

@app.get('/__preview__/captcha.js')
def synthetic_captcha_script():
    return """
    addEventListener('message',e=>{
      const d=e.data;
      if(e.origin!==location.origin||e.source!==parent||!d||
        d.channel!=='wwhypda-recaptcha-v1'||d.type!=='execute')return;
      parent.postMessage({channel:d.channel,type:'token',id:d.id,token:'test-token'},location.origin);
    });""",200,{'Content-Type':'application/javascript'}

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

@app.get('/__preview__/reminder')
def reminder_preview():
    from maintenance.mail_reminder import message
    from html import escape
    mail=message(['2026-10-30T12:00:00+00:00']*3,'<synthetic-preview@example.test>')
    return '<!doctype html><html><title>No-send reminder preview</title><body><h1>Synthetic reminder — NO SEND</h1><pre>'+escape(str(mail['Subject'])+'\n\n'+mail.get_content())+'</pre></body></html>'

@app.get('/__preview__/code')
def code_inspector():
    return '<!doctype html><html lang="ru"><meta charset="utf-8"><title>Тестовый код</title><h1>Только локальный стенд</h1><p>Сначала нажмите Resend Code в форме подтверждения. Затем здесь нажмите «Показать актуальный код». Это не отправляет письма и не создаёт новый код.</p><button id="read-code" type="button">Показать актуальный код</button><div id="codes" role="status"></div><p><a href="/login">Вернуться к входу</a> · <a href="/loading-fixture/index.html">Проверить skeleton</a></p><script src="/__preview__/codes.js"></script></html>'

@app.get('/__preview__/codes.js')
def code_inspector_script():
    return """document.getElementById('read-code').addEventListener('click',async()=>{
      const out=document.getElementById('codes');out.textContent='';
      try {
        const response=await fetch('/__preview__/fixtures');if(!response.ok)throw new Error();
        const data=await response.json();
        if(!data.codes.length){out.textContent='Код ещё не запрошен. Нажмите Resend Code в форме.';return;}
        for(const c of data.codes){
          const remaining=Math.max(0,Math.floor((Date.parse(c.expires_at)-Date.now())/1000));
          const p=document.createElement('p');
          p.textContent=(c.purpose==='password_reset'?'Сброс пароля':'Подтверждение почты')+' — '+c.email.split('@')[0].slice(0,3)+'***: '+(remaining>0?c.code+' — осталось '+remaining+' с':'Код истёк. Запросите новый через Resend Code.');
          out.append(p);
        }
      }catch{out.textContent='Стенд недоступен. Повторите после загрузки.';}
    });""",200,{'Content-Type':'application/javascript'}

@app.get('/__preview__/fixtures')
def fixture_status():
    from auth.auth_models import ConfirmationCode
    return jsonify(accounts=['pending@example.test','current@example.test','disabled@example.test','old@example.test'],
        password='Password1!', codes=[dict(email=c.email,code=c.code,purpose=c.type,expires_at=(c.created_at.replace(tzinfo=timezone.utc)+timedelta(seconds=120)).isoformat()) for c in ConfirmationCode.query.all()])

@app.get('/maintenance-status')
def no_manual_flag_on_direct_fixture():
    return jsonify(maintenance=False)

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
    if path == 'loading-fixture' or path == 'loading-fixture/':
        return redirect('/loading-fixture/index.html')
    if path.startswith(('assets/','legal/','fonts/','logos/')) or '.' in path.rsplit('/',1)[-1]:
        return send_from_directory(STATIC,path)
    return send_from_directory(STATIC,'index.html')

if __name__ == '__main__':
    if not (STATIC/'index.html').is_file():
        raise SystemExit('Build the isolated preview frontend first')
    app.run(host='0.0.0.0',port=8082,debug=False,use_reloader=False,threaded=False)
