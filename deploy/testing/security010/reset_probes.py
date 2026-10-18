import json,logging,threading,time
from unittest.mock import Mock,patch
from werkzeug.serving import make_server,WSGIRequestHandler
import requests
from tests.test_auth_lifecycle import AccountDeletionTests
from auth.auth_models import ConfirmationCode,User,db
class Quiet(WSGIRequestHandler):
    def log(self,*a,**k):pass
fixture=AccountDeletionTests();fixture.setUp();app=fixture.app
app.config.update(TESTING=False,APP_ENV='production',RECAPTCHA_ALLOWED_HOSTNAMES=frozenset({'localhost'}),RECAPTCHA_RETRIES=1,RECAPTCHA_TIMEOUT_SECONDS=1,RECAPTCHA_RETRY_DELAY_SECONDS=0,RECAPTCHA_VERIFY_URL='https://www.google.com/recaptcha/api/siteverify',RECAPTCHA_MIN_SCORE=.5)
app.logger.setLevel(logging.CRITICAL)
def verifier(*a,**k):
    token=k['data'].get('response');r=Mock();r.json.return_value={'success':True,'score':.9,'hostname':'localhost','action':token};return r
server=make_server('127.0.0.1',0,app,request_handler=Quiet);thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
client=requests.Session();client.trust_env=False;base='http://127.0.0.1:'+str(server.server_port)
results=[]
try:
    with patch('common_defenitions.requests.post',side_effect=verifier),patch('auth.authentication.send_reset_email',return_value=True):
        observed=[];issued=[]
        for email in ['other@example.test','absent@example.test','other@example.test','absent@example.test']:
            start=time.monotonic();r=client.post(base+'/users/request-password-reset',json={'email':email,'recaptcha_token':'request_password_reset'},timeout=12)
            observed.append({'state':'active' if email.startswith('other') else 'unknown','status':r.status_code,'body':r.json(),'seconds':round(time.monotonic()-start,3)})
            if email=='other@example.test':
                db.session.rollback();issued.append(ConfirmationCode.query.filter_by(email=email,type='password_reset').one().code);db.session.rollback()
        db.session.rollback();codes=ConfirmationCode.query.filter_by(email='other@example.test',type='password_reset').order_by(ConfirmationCode.id).all();saved=[c.code for c in codes];db.session.rollback()
        results.append({'probe':'two issued reset challenges','valid_code_count':len(saved),'expected':1})
        for index,code in enumerate(reversed(issued)):
            r=client.post(base+'/users/confirm-password-reset',json={'email':'other@example.test','code':code,'new_password':'ChangedPass'+str(index)+'!','recaptcha_token':'confirm_password_reset'},timeout=12)
            results.append({'probe':'newest code succeeds' if index==0 else 'older code MUST be invalidated after reset','status':r.status_code,'expected':200 if index==0 else 401})
        assert len(saved)==1, 'Only the current challenge must remain'
        assert all(row.get('status')==row.get('expected') for row in results if 'status' in row), 'Reset replay regression'
        # Independent IPs remain individually below the configured route limit.
        from common_defenitions import limiter
        app.config.update(RATELIMIT_ENABLED=True,AUTH_PASSWORD_RESET_RATE_LIMIT='2 per minute')
        # A fresh Flask app is needed to reinitialise request hooks safely.
    print(json.dumps({'timing_samples':observed,'results':results},indent=2))
finally:
    server.shutdown();thread.join(5);fixture.tearDown()
