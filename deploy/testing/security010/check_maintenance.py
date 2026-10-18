"""Only stage010 localhost fixture: no secrets, real backend or production operations."""
import importlib.util
import json
from pathlib import Path
import subprocess
import time
import unittest
from urllib.request import Request,urlopen
from urllib.error import HTTPError

ROOT=Path(__file__).resolve().parents[3]
SPEC=importlib.util.spec_from_file_location('control',ROOT/'deploy/maintenance/control.py')
control=importlib.util.module_from_spec(SPEC);SPEC.loader.exec_module(control)
STATE=ROOT/'tmp/stage010-maintenance-state'
COMPOSE=['docker','compose','-p','wwwhypda-stage010-nginx','-f',str(ROOT/'deploy/testing/security010/nginx.compose.yml')]


def http(path,method='GET'):
    import base64
    from email.message import Message
    payload=dict(method=method,path=path,headers={'Host':'localhost','Content-Type':'application/json'},body=base64.b64encode(b'{}' if method=='POST' else b'').decode())
    result=subprocess.run(COMPOSE+['exec','-T','transport','python','-B','/testing/nginx_request.py'],input=json.dumps(payload).encode(),stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=20,check=True)
    response=json.loads(result.stdout);headers=Message()
    for key,value in response['headers']:headers[key]=value
    return response['status'],headers,base64.b64decode(response['body'])


class MaintenanceTests(unittest.TestCase):
    def setUp(self):
        control.control(STATE,'off')
        subprocess.run(COMPOSE+['up','-d','web'],check=True,stdout=subprocess.DEVNULL)
        for _ in range(30):
            try:
                if http('/api/users/check')[0]==401:break
            except (OSError,subprocess.SubprocessError):pass
            time.sleep(.1)
        else:raise RuntimeError('Synthetic upstream did not become ready')

    @classmethod
    def tearDownClass(cls):
        control.control(STATE,'off')
        subprocess.run(COMPOSE+['up','-d','web'],check=True,stdout=subprocess.DEVNULL)

    def test_full_manual_lifecycle_and_independence(self):
        subprocess.run(COMPOSE+['exec','-T','nginx','nginx','-t'],check=True)
        control.control(STATE,'off');control.control(STATE,'off')
        self.assertFalse(json.loads(http('/maintenance-status')[2])['maintenance'])
        self.assertEqual(http('/login')[0],200)
        self.assertEqual(http('/.env')[0],403)
        control.control(STATE,'on');control.control(STATE,'on')
        self.assertTrue(control.control(STATE,'status'))
        for path,method in (('/', 'GET'),('/login','HEAD'),('/users/foo','POST'),('/api','GET'),('/api/users/login','POST'),('/api//users/check','GET'),('/api/%2e%2e/api/users/check','GET')):
            status,headers,body=http(path,method)
            self.assertEqual(status,503,(path,method,body))
            self.assertEqual(headers['Retry-After'],'300')
            self.assertIn('no-store',headers['Cache-Control'])
            self.assertEqual(headers['X-Content-Type-Options'],'nosniff')
            self.assertIn("default-src 'self'",headers['Content-Security-Policy'])
            if path.startswith('/api'):self.assertEqual(json.loads(body)['code'],'site_maintenance')
            elif method!='HEAD':
                self.assertIn('text/html',headers['Content-Type'])
                self.assertIn(b'Temporary maintenance',body)
        for slug in ('privacy-policy','cookie-policy','user-agreement'):
            status,headers,body=http('/'+slug)
            self.assertEqual(status,200)
            self.assertIn('text/html',headers['Content-Type'])
            self.assertIn(b'2026-10-18.2',body)
            status,headers,body=http('/legal/'+slug+'-2026-10-18.2.pdf')
            self.assertEqual(status,200);self.assertTrue(body.startswith(b'%PDF-'))
            self.assertIn('application/pdf',headers['Content-Type'])
        self.assertEqual(http('/.env')[0],403)
        self.assertEqual(http('/.well-known/acme-challenge/synthetic-token')[2],b'synthetic-acme')
        self.assertEqual(http('/maintenance-page')[0],404) # internal only
        self.assertEqual(http('/maintenance/assets/theme.js')[0],200)
        self.assertEqual(http('/maintenance/assets/.env')[0],403)
        self.assertEqual(http('/maintenance-status','POST')[0],405)
        # Stop only the fixture backend. Keep dev DB/containers untouched.
        subprocess.run(COMPOSE+['stop','web'],check=True,stdout=subprocess.DEVNULL)
        index=ROOT/'tmp/stage010-frontend/index.html';backup=index.with_suffix('.stage010-backup')
        index.replace(backup)
        try:
            self.assertEqual(http('/')[0],503)
            self.assertEqual(http('/privacy-policy')[0],200)
            self.assertEqual(http('/api/users/login','POST')[0],503)
            subprocess.run(COMPOSE+['up','-d','--no-deps','--force-recreate','nginx'],check=True,stdout=subprocess.DEVNULL)
            for attempt in range(30):
                try:
                    response=http('/')
                    break
                except OSError:time.sleep(.1)
            else:raise RuntimeError('Nginx fixture did not become ready after recreate')
            self.assertEqual(response[0],503)
            self.assertTrue(json.loads(http('/maintenance-status')[2])['maintenance'])
        finally:backup.replace(index)
        control.control(STATE,'off')
        self.assertFalse(json.loads(http('/maintenance-status')[2])['maintenance'])
        self.assertEqual(http('/')[0],200)
        status,_,body=http('/api/users/check')
        self.assertIn(status,(502,504));self.assertNotIn(b'site_maintenance',body)
        # A distinct dev state has never been enabled.
        self.assertFalse((ROOT/'deploy/maintenance/state/dev/enabled').exists())

    def test_nginx_auth_rate_and_traversal(self):
        control.control(STATE,'off')
        self.assertEqual(http('/.git/config')[0],403)
        self.assertIn(http('/%2e%2e/.env')[0],(400,403,404))
        statuses=[http('/api/users/login','POST')[0] for _ in range(18)]
        self.assertIn(429,statuses)
        self.assertTrue(set(statuses)<={400,429},statuses)
        self.assertEqual(http('/')[0],200)

    def test_flag_rejects_unowned_file_and_nonregular_target(self):
        import tempfile
        with tempfile.TemporaryDirectory() as temporary:
            root=Path(temporary).resolve()
            flag=root/'enabled';flag.write_text('unrelated')
            with self.assertRaises(ValueError):control.control(root,'off')
            self.assertTrue(flag.exists());flag.unlink();flag.mkdir()
            with self.assertRaises(ValueError):control.control(root,'on')
            with self.assertRaises(ValueError):control.directory(root.anchor)


if __name__=='__main__':unittest.main(verbosity=2)
