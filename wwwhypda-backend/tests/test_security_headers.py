"""Synthetic HTTPS/CORS/proxy configuration; no claims about deployment env."""
import unittest
from tests import test_auth_lifecycle as fixtures
from flask_cors import CORS
from werkzeug.middleware.proxy_fix import ProxyFix


class SyntheticConfigurationTests(unittest.TestCase):
    def setUp(self):
        self.fixture=fixtures.AccountDeletionTests();self.fixture.setUp();self.app=self.fixture.app
        self.app.config.update(JWT_COOKIE_SECURE=True,JWT_COOKIE_SAMESITE='Lax')
        CORS(self.app,origins=['https://allowed.example.test'],supports_credentials=True,allow_headers=['Content-Type','X-CSRF-TOKEN'])
        self.app.wsgi_app=ProxyFix(self.app.wsgi_app,x_for=1,x_proto=1,x_host=0)
    def tearDown(self):self.fixture.tearDown()

    def test_secure_cookies_cors_and_logout_csrf(self):
        client=self.app.test_client()
        response=client.post('/users/login',base_url='https://localhost',json={'email':'owner@example.test','password':'Password1!','recaptcha_token':'test-token'},headers={'Origin':'https://allowed.example.test'})
        self.assertEqual(response.status_code,200)
        self.assertEqual(response.headers.get('Access-Control-Allow-Origin'),'https://allowed.example.test')
        for cookie in response.headers.getlist('Set-Cookie'):
            self.assertIn('Secure',cookie);self.assertIn('SameSite=Lax',cookie)
            if cookie.startswith(('access_token_cookie=','refresh_token_cookie=')):self.assertIn('HttpOnly',cookie)
        blocked=client.options('/users/refresh/logout',base_url='https://localhost',headers={'Origin':'https://evil.example.test','Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'X-CSRF-TOKEN'})
        self.assertNotIn('Access-Control-Allow-Origin',blocked.headers)
        denied=client.post('/users/refresh/logout',base_url='https://localhost',headers={'Origin':'https://evil.example.test'})
        self.assertEqual(denied.status_code,401)
        self.assertNotIn('Access-Control-Allow-Origin',denied.headers)
        self.assertEqual(client.get('/users/check',base_url='https://localhost').status_code,200)
