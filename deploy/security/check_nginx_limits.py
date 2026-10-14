"""Integration check against disposable nginx and a stub; never calls the app API.
Run from the repo: python deploy/security/check_nginx_limits.py
Requires Docker and existing nginx:stable-alpine / wwwhypda-dev-backend images.
"""
import concurrent.futures
import json
import pathlib
import re
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
import uuid

ROOT = pathlib.Path(__file__).resolve().parents[2]
PREFIX = "wwwhypda-limit-test-" + uuid.uuid4().hex[:8]
NETWORK, BACKEND, NGINX = (PREFIX + suffix for suffix in ("-net", "-backend", "-nginx"))
STUB = r'''
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json, threading
lock = threading.Lock()
calls = 0
class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        global calls
        with lock:
            if self.path != '/__stats': calls += 1
            result = {'calls': calls, 'path': self.path}
        body = json.dumps(result).encode()
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)
    do_POST = do_GET
    def log_message(self, *args): pass
ThreadingHTTPServer(('0.0.0.0', 5000), Handler).serve_forever()
'''


def docker(*args, check=True):
    result = subprocess.run(['docker', *args], text=True, capture_output=True)
    if check and result.returncode:
        raise RuntimeError(result.stderr or result.stdout)
    return result.stdout.strip()


with tempfile.TemporaryDirectory(prefix=PREFIX) as temporary:
    directory = pathlib.Path(temporary)
    config = (ROOT / 'nginx.dev.conf').read_text(encoding='utf-8')
    production = (ROOT / 'nginx.conf').read_text(encoding='utf-8')
    for marker, end in [('    # Classify normalized', '    # Security Headers'),
                        ('            # Allow normal', '            set $backend_upstream')]:
        assert config[config.index(marker):config.index(end, config.index(marker))] == production[production.index(marker):production.index(end, production.index(marker))]
    (directory / 'nginx.conf').write_text(config, encoding='utf-8')
    (directory / 'stub.py').write_text(STUB, encoding='utf-8')
    # Validate production structure without requiring the VPS private TLS files.
    tls_free = re.sub(r'^\s*ssl_certificate(?:_key)?\s+[^;]+;\s*$', '', production, flags=re.M)
    tls_free = re.sub(r'(listen\s+443)\s+ssl;', r'\1;', tls_free)
    (directory / 'production-no-tls.conf').write_text(tls_free, encoding='utf-8')
    try:
        docker('network', 'create', NETWORK)
        docker('run', '-d', '--pull=never', '--name', BACKEND, '--network', NETWORK,
               '--network-alias', 'backend', '--mount', f'type=bind,source={directory},target=/tests,readonly',
               '--entrypoint', 'python', 'wwwhypda-dev-backend', '/tests/stub.py')
        print(docker('run', '--rm', '--pull=never', '--network', NETWORK, '--mount',
                     f'type=bind,source={directory / "production-no-tls.conf"},target=/etc/nginx/nginx.conf,readonly',
                     'nginx:stable-alpine', 'nginx', '-t'))
        docker('run', '-d', '--pull=never', '--name', NGINX, '--network', NETWORK,
               '-p', '127.0.0.1::80', '--mount',
               f'type=bind,source={directory / "nginx.conf"},target=/etc/nginx/nginx.conf,readonly',
               'nginx:stable-alpine')
        port = docker('port', NGINX, '80/tcp').rsplit(':', 1)[1]
        base = 'http://127.0.0.1:' + port
        client = urllib.request.build_opener(urllib.request.ProxyHandler({}))

        def request(path, method='GET', forwarded=''):
            headers = {'Content-Type': 'application/json', 'X-Forwarded-For': forwarded}
            req = urllib.request.Request(base + path, data=b'{}' if method == 'POST' else None,
                                         method=method, headers=headers)
            try:
                with client.open(req, timeout=10) as response:
                    return response.status, response.read()
            except urllib.error.HTTPError as error:
                return error.code, error.read()

        for attempt in range(50):
            try:
                if request('/')[0] == 200: break
            except (OSError, urllib.error.URLError): pass
            time.sleep(0.1)
        else: raise AssertionError('Test nginx did not become ready')
        docker('exec', NGINX, 'nginx', '-t')

        # Normal UI burst must remain functional; GETs do not consume the auth bucket.
        for path in ['/api/rocks/tree', '/api/users/check', '/api/users/login']:
            assert request(path)[0] == 200, path
        before = json.loads(request('/api/__stats')[1])['calls']
        paths = ['/api/users/login', '/api/users/request-password-reset', '/api/users/',
                 '/api/users/confirm-registration', '/api/users/confirm-password-reset',
                 '/api/users/resend-confirmation']
        results = [request(paths[i % len(paths)], 'POST') for i in range(24)]
        statuses = [status for status, _ in results]
        assert 200 in statuses and 429 in statuses, statuses
        assert all(status in (200, 429) for status in statuses), statuses
        after = json.loads(request('/api/__stats')[1])['calls']
        assert after - before == statuses.count(200), 'Rejected auth request reached backend'
        assert all(json.loads(body)['message'].startswith('Too many requests')
                   for status, body in results if status == 429)
        # These equivalent normalized paths and spoofed IPs must not bypass the bucket.
        for path in ['/api/users/%6cogin', '/api/users/login/?probe=1', '/api/users']:
            assert request(path, 'POST', '203.0.113.75')[0] == 429, path
        assert request('/api/users/check')[0] == 200, 'Auth limit leaked into GET checks'
        assert request('/')[0] == 200, 'Auth limit blocked the frontend'
        print('PASS: ordinary requests; shared auth bucket; JSON 429; encoded paths; no forwarding on rejection; forged X-Forwarded-For ignored.')

        # Reset shared memory, then exceed the ordinary API burst without hitting real data.
        docker('restart', NGINX)
        port = docker('port', NGINX, '80/tcp').rsplit(':', 1)[1]
        base = 'http://127.0.0.1:' + port
        for attempt in range(50):
            try:
                if request('/')[0] == 200: break
            except (OSError, urllib.error.URLError): pass
            time.sleep(0.1)
        else: raise AssertionError('Test nginx did not restart')
        with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
            statuses = list(pool.map(lambda i: request('/api/rocks/tree?probe=' + str(i),
                                                       forwarded='203.0.113.' + str(i % 200 + 1))[0], range(100)))
        assert 200 in statuses and 429 in statuses, statuses
        assert all(status in (200, 429) for status in statuses), statuses
        assert request('/')[0] == 200
        print('PASS: API flood rejected; frontend remains available. Global distributed limits and connection caps are configured, not capacity-benchmarked here.')
        print('PASS: development syntax and production structure with TLS directives omitted; real VPS certificates require server-side nginx -t.')
    finally:
        docker('rm', '-f', NGINX, BACKEND, check=False)
        docker('network', 'rm', NETWORK, check=False)
