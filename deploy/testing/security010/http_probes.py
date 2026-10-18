"""Disposable HTTP probes: synthetic SQLite, loopback, no SMTP or Internet."""
import json, logging, threading, time
from unittest.mock import Mock, patch
import requests
from werkzeug.serving import make_server, WSGIRequestHandler
from tests.test_auth_lifecycle import AccountDeletionTests
from auth.auth_models import User, db
from inputData.inputDataModels import InputData
from auth.terms import CURRENT_TERMS_VERSION
from datetime import datetime, timezone
from flask_jwt_extended import create_access_token

class QuietHandler(WSGIRequestHandler):
    def log(self, *args, **kwargs): pass

results=[]
def record(name, response, expected):
    actual=response.status_code
    results.append(dict(probe=name,status=actual,expected=expected,passed=actual==expected))
    return response

def session():
    s=requests.Session(); s.trust_env=False; return s

def csrf(s, refresh=False):
    key='csrf_refresh_token' if refresh else 'csrf_access_token'
    return {'X-CSRF-TOKEN':s.cookies.get(key,'')}

fixture=AccountDeletionTests();fixture.setUp()
app=fixture.app
app.config.update(TESTING=False,APP_ENV='production',RECAPTCHA_ALLOWED_HOSTNAMES=frozenset({'localhost'}),
    RECAPTCHA_RETRIES=1, RECAPTCHA_TIMEOUT_SECONDS=1,RECAPTCHA_RETRY_DELAY_SECONDS=0,
    RECAPTCHA_VERIFY_URL='https://www.google.com/recaptcha/api/siteverify',RECAPTCHA_MIN_SCORE=.5)
app.logger.setLevel(logging.CRITICAL)
owner_id,other_id=fixture.owner_id,fixture.other_id
other_submission=InputData.query.filter_by(user_id=other_id).first().id
own_submission=InputData.query.filter_by(user_id=owner_id).first().id
initial_count=InputData.query.count()
admin=User(name='TestAdmin',email='admin@example.test',active=True,is_superuser=True,
    terms_version=CURRENT_TERMS_VERSION,terms_accepted_at=datetime.now(timezone.utc))
admin.set_password('Password1!'); db.session.add(admin);db.session.commit()
server=make_server('127.0.0.1',0,app,request_handler=QuietHandler)
thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
base='http://127.0.0.1:'+str(server.server_port)

def verifier(*args,**kwargs):
    token=kwargs.get('data',{}).get('response','')
    r=Mock();r.raise_for_status.return_value=None
    action={'captcha-login':'login','captcha-reset':'request_password_reset','captcha-register':'register'}.get(token)
    r.json.return_value=dict(success=bool(action),score=.9,action=action,hostname='localhost')
    return r

def get(s,path,**kw):return s.get(base+path,timeout=15,**kw)
def post(s,path,**kw):return s.post(base+path,timeout=15,**kw)
def login(s,email):return post(s,'/users/login',json=dict(email=email,password='Password1!',recaptcha_token='captcha-login'))

try:
    with patch('common_defenitions.requests.post',side_effect=verifier):
        anon=session();a=session();b=session();adm=session()
        for path in ['/users/','/input/my_submissions','/input/get_input_by_id/'+str(own_submission),'/admin/get_all_users']:
            record('anonymous '+path,get(anon,path),401)
        record('login without captcha',post(anon,'/users/login',json={'email':'owner@example.test','password':'Password1!'}),400)
        record('cross-action captcha',post(anon,'/users/login',json={'email':'owner@example.test','password':'Password1!','recaptcha_token':'captcha-reset'}),400)
        record('SQL injection login',post(anon,'/users/login',json={'email':"x@example.test' OR '1'='1",'password':'Password1!','recaptcha_token':'captcha-login'}),400)
        record('user A login',login(a,'owner@example.test'),200)
        record('user B login',login(b,'other@example.test'),200)
        record('admin login',login(adm,'admin@example.test'),200)
        record('own submission read',get(a,'/input/get_input_by_id/'+str(own_submission)),200)
        record('other submission read denied',get(a,'/input/get_input_by_id/'+str(other_submission)),403)
        record('other submission delete denied',a.delete(base+'/input/delete_submission/'+str(other_submission),headers=csrf(a),timeout=15),403)
        record('admin list denied to A',get(a,'/admin/get_all_users'),403)
        record('role promotion denied',post(a,'/admin/'+str(owner_id),headers=csrf(a)),403)
        record('review status denied',post(a,'/input/complete/'+str(other_submission),headers=csrf(a)),403)
        record('missing CSRF denied',post(a,'/input/submit',json={'generalInfoData':[]}),401)
        record('incorrect CSRF denied',post(a,'/input/submit',json={'generalInfoData':[]},headers={'X-CSRF-TOKEN':'invalid'}),401)
        record('mass assignment request',a.put(base+'/users/',json={'name':'TestName','is_superuser':True,'active':True,'user_id':other_id},headers=csrf(a),timeout=15),200)
        record('mass assignment did not grant admin',get(a,'/admin/get_all_users'),403)
        record('authors restriction enforced',post(a,'/input/submit',headers=csrf(a),json={'sourceTableData':[{'field':'authors','value':'Private Person'}]}),400)
        saved=record('submission ignores injected owner',post(a,'/input/submit',headers=csrf(a),json={'generalInfoData':[],'user_id':other_id,'status':'Completed','is_superuser':True}),201)
        ownership=saved.json().get('data',{})
        results.append(dict(probe='saved ownership/status from server',passed=ownership.get('user_id')==owner_id and ownership.get('status')=='New'))
        record('admin permitted list',get(adm,'/admin/get_all_users'),200)
        record('admin permitted review',get(adm,'/input/get_input_by_id/'+str(other_submission)),200)
        forged=session();forged.cookies.set('access_token_cookie',a.cookies.get('access_token_cookie')[:-3]+'xxx')
        record('tampered JWT rejected',get(forged,'/users/check'),422)
        stale=session()
        for c in a.cookies: stale.cookies.set_cookie(c)
        record('logout',post(a,'/users/logout',headers=csrf(a)),200)
        record('old access replay after logout MUST reject',get(stale,'/users/check'),401)
        record('old refresh replay after logout MUST reject',post(stale,'/users/refresh',headers=csrf(stale,True)),401)
        # This independent fresh session proves deactivate/activate revocation,
        # rather than reusing the session already revoked by logout above.
        disabling=session()
        record('fresh login before disable',login(disabling,'owner@example.test'),200)
        record('fresh access before disable',get(disabling,'/users/check'),200)
        # Current server-side account/role changes are tested through actual admin HTTP.
        record('admin disable A',post(adm,'/admin/deactivate/'+str(owner_id),headers=csrf(adm)),200)
        record('disabled A token denied',get(disabling,'/users/check'),401)
        record('admin re-enable A',post(adm,'/admin/activate/'+str(owner_id),headers=csrf(adm)),200)
        record('pre-disable token MUST stay revoked after re-enable',get(disabling,'/users/check'),401)
        record('demote admin',post(adm,'/admin/remove-super/'+str(admin.id),headers=csrf(adm)),200)
        record('old admin role cannot bypass demotion',get(adm,'/admin/get_all_users'),403)
finally:
    server.shutdown();thread.join(timeout=5)
    fixture.tearDown()
print(json.dumps({'transport':'real HTTP over isolated loopback','baseline_snapshot':'2c443fa; current working sources mounted','captcha':'mocked provider, real application verifier','results':results},indent=2))

raise SystemExit(0 if all(row.get("passed",False) for row in results) else 1)
