"""HTTP-only synthetic fixture check; never point this at production."""
import json
import time
from urllib.request import Request,build_opener,HTTPCookieProcessor
from urllib.error import HTTPError
from http.cookiejar import CookieJar

BASE='http://127.0.0.1:8083'
jar=CookieJar();client=build_opener(HTTPCookieProcessor(jar))
def call(path,data=None):
    request=Request(BASE+path,data=json.dumps(data).encode() if data is not None else None,headers={'Content-Type':'application/json'})
    try:response=client.open(request,timeout=8)
    except HTTPError as error:response=error
    with response:return response.status,response.read()

for attempt in range(30):
    try:
        status,body=call('/__preview__/fixtures')
        if status==200 and 'pending@example.test' in json.loads(body)['accounts']:break
    except (OSError,ValueError,KeyError):pass
    time.sleep(.2)
else:raise RuntimeError('Synthetic fixture backend not ready')
payload=dict(email='pending@example.test',password='Password1!',recaptcha_token='test-token')
status,body=call('/api/users/login',payload)
assert status==409,(status,body)
assert json.loads(body)['code']=='email_confirmation_required'
assert not list(jar)
assert call('/api/users/resend-confirmation',dict(email=payload['email'],recaptcha_token='test-token'))[0]==200
codes=json.loads(call('/__preview__/fixtures')[1])['codes']
old_code=next(c['code'] for c in codes if c['email']==payload['email'])
assert call('/api/users/resend-confirmation',dict(email=payload['email'],recaptcha_token='test-token'))[0]==200
codes=json.loads(call('/__preview__/fixtures')[1])['codes']
code=next(c['code'] for c in codes if c['email']==payload['email'])
assert code != old_code
assert call('/api/users/confirm-registration',dict(email=payload['email'],code=old_code,recaptcha_token='test-token'))[0]==401
assert call('/__preview__/code')[0]==200
assert call('/__preview__/codes.js')[0]==200
assert call('/api/users/confirm-registration',dict(email=payload['email'],code='000000',recaptcha_token='test-token'))[0]==401
assert call('/api/users/confirm-registration',dict(email=payload['email'],code=code,recaptcha_token='test-token'))[0]==200
assert not list(jar)
assert call('/api/users/login',payload)[0]==200
assert call('/api/users/check')[0]==200
assert call('/api/users/login',dict(payload,email='disabled@example.test'))[0]==404
assert call('/__preview__/reminder')[0]==200
assert call('/loading-fixture/index.html')[0]==200
frame=call('/recaptcha-frame.html')[1]
assert b'/__preview__/captcha.js' in frame and b'gstatic' not in frame and b'recaptcha.net' not in frame
assert call('/__preview__/captcha.js')[0]==200
print('Synthetic HTTP continuation/resend/confirmation/new login/disabled denial, no-send/loading and CSP-compatible mock frame OK')
