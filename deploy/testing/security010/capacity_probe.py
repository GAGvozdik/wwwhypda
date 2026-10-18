"""Small bounded Nginx -> Gunicorn availability sample, never a VPS load test."""
import requests,time,json
from concurrent.futures import ThreadPoolExecutor

BASE='http://nginx'
def client():
    c=requests.Session();c.trust_env=False;return c

for _ in range(100):
    try:
        if client().get(BASE+'/users/check',timeout=.25).status_code==401:break
    except requests.RequestException:pass
    time.sleep(.1)
else:raise SystemExit('Fixture unavailable')

results=[]
for address in ['missing@example.test','owner@example.test','missing@example.test']:
    def reset(index):
        start=time.monotonic()
        r=client().post(BASE+'/users/request-password-reset',json={'email':address,'recaptcha_token':'synthetic'},timeout=8)
        if index<4 and r.status_code==429:
            for _ in range(12):
                time.sleep(.04)
                r=client().post(BASE+'/users/request-password-reset',json={'email':address,'recaptcha_token':'synthetic'},timeout=8)
                if r.status_code!=429:break
        return {'status':r.status_code,'seconds':round(time.monotonic()-start,3),'worker':r.headers.get('X-Test-Worker')}
    with ThreadPoolExecutor(max_workers=4) as pool:
        pending=[pool.submit(reset,i) for i in range(4)]
        time.sleep(.6)
        start=time.monotonic();r=client().get(BASE+'/users/check',timeout=2);read=time.monotonic()-start
        assert r.status_code==401 and read<1, 'Ordinary read blocked by auth saturation'
        extra=reset(4)
        assert extra['status']==429 and extra['seconds']<1, 'Overflow did not reject promptly'
        heavy=[p.result() for p in pending]
    assert all(r['status']==200 and 3.9<r['seconds']<6 for r in heavy), 'Response floor changed or slot failure'
    results.append({'state':'unknown' if address.startswith('missing') else 'active','read_seconds':round(read,3),'overflow':extra,'accepted':heavy})
print(json.dumps({'configuration':'2 workers x4 gthread; cap4; Nginx proxy; internal network','samples':results}))
