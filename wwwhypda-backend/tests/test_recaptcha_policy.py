"""No env, real SMTP/Google or working DB: mocked verifier and synthetic HTTP fixtures."""
import math
import unittest
from unittest.mock import Mock, patch
import requests
from flask import Flask
from common_defenitions import verify_recaptcha, db
from recaptcha_policy import configure_recaptcha_policy
from tests import test_auth_lifecycle as lifecycle
from auth.auth_models import User
from auth.terms import CURRENT_TERMS_VERSION


class VerifierTests(unittest.TestCase):
    def setUp(self):
        self.app=Flask(__name__)
        self.app.config.update(TESTING=False,APP_ENV='development',RECAPTCHA_ENABLED=True,
            RECAPTCHA_SECRET_KEY='synthetic-secret',RECAPTCHA_MIN_SCORE=.5,
            RECAPTCHA_ALLOWED_HOSTNAMES=frozenset({'localhost'}),RECAPTCHA_RETRIES=2,
            RECAPTCHA_VERIFY_URL='https://www.google.com/recaptcha/api/siteverify',
            RECAPTCHA_TIMEOUT_SECONDS=1,RECAPTCHA_RETRY_DELAY_SECONDS=0)
        self.ctx=self.app.app_context();self.ctx.push()
        self.post=patch('common_defenitions.requests.post');self.mock=self.post.start()
        self.mock.return_value.json.return_value=dict(success=True,score=.7,action='login',hostname='localhost')

    def tearDown(self):
        self.post.stop();self.ctx.pop()

    def test_valid_action_and_exact_host_request_has_no_remoteip(self):
        self.assertEqual(verify_recaptcha('synthetic-token','login'),(True,None))
        self.mock.assert_called_once_with(self.app.config['RECAPTCHA_VERIFY_URL'],
            data={'secret':'synthetic-secret','response':'synthetic-token'},timeout=1)

    def test_cross_action_host_invalid_score_success_and_format(self):
        valid=dict(success=True,score=.7,action='login',hostname='localhost')
        for changes in ({'action':'register'},{'action':None},{'hostname':'localhost.attacker.test'},
                {'hostname':'LOCALHOST'},{'hostname':None},{'hostname':['localhost']},
                {'score':None},{'score':'.9'},{'score':True},{'score':math.nan},{'score':math.inf},
                {'score':-.1},{'score':1.1},{'score':.49},{'error-codes':['Over free quota.']},
                {'error':'quota exceeded'},{'success':'true'},{'success':1},{'success':False}):
            with self.subTest(changes=changes):
                self.mock.return_value.json.return_value={**valid,**changes}
                self.assertFalse(verify_recaptcha('synthetic-token','login')[0])
        for invalid in (None,[],True,'raw'):
            self.mock.return_value.json.return_value=invalid
            self.assertFalse(verify_recaptcha('synthetic-token','login')[0])

    def test_empty_tokens_missing_policy_and_client_test_token_not_bypass(self):
        for token in (None,'',' ',[],{},False):
            self.assertFalse(verify_recaptcha(token,'login')[0])
        self.mock.assert_not_called()
        self.mock.return_value.json.return_value=dict(success=False,**{'error-codes':['invalid-input-response']})
        self.assertFalse(verify_recaptcha('test-token','login')[0])
        self.app.config['TESTING']=True
        self.assertTrue(verify_recaptcha('test-token','login')[0])
        self.app.config['TESTING']=False
        self.app.config['RECAPTCHA_ALLOWED_HOSTNAMES']='prefix-localhost-suffix'
        self.assertFalse(verify_recaptcha('synthetic-token','login')[0])
        self.app.config['RECAPTCHA_ALLOWED_HOSTNAMES']=()
        self.assertFalse(verify_recaptcha('synthetic-token','login')[0])

    def test_expired_reused_network_failures_retries_and_private_logs(self):
        for code in ('timeout-or-duplicate','invalid-input-response','invalid-input-secret'):
            self.mock.return_value.json.return_value={'success':False,'error-codes':[code]}
            self.assertFalse(verify_recaptcha('synthetic-token','login')[0])
        self.mock.side_effect=requests.Timeout('private token/secret/hostname')
        with self.assertLogs(self.app.logger,level='WARNING') as logs:
            self.assertFalse(verify_recaptcha('synthetic-token','login')[0])
        self.assertNotIn('private',str(logs.output))
        self.mock.side_effect=None
        self.mock.return_value.json.side_effect=ValueError('private body')
        self.assertFalse(verify_recaptcha('synthetic-token','login')[0])

    def test_production_cannot_be_disabled_and_startup_exact_allowlist(self):
        self.app.config.update(APP_ENV='production',RECAPTCHA_ENABLED=False)
        self.assertFalse(verify_recaptcha('synthetic-token','login')[0])
        self.app.config['TESTING']=True
        self.assertFalse(verify_recaptcha('test-token','login')[0])
        self.app.config['TESTING']=False
        config=dict(self.app.config)
        with self.assertRaises(ValueError): configure_recaptcha_policy(config,'production','["site.example.org"]')
        config['RECAPTCHA_ENABLED']=True
        for value in ('[]','null','"site.example.org"','["*.example.org"]','["localhost"]',
                      '["127.0.0.1"]','["captcha.test"]','["https://example.org"]'):
            with self.subTest(value=value):
                with self.assertRaises(ValueError): configure_recaptcha_policy(config,'production',value)
        configure_recaptcha_policy(config,'production','["site.example.org"]')
        self.assertEqual(config['RECAPTCHA_ALLOWED_HOSTNAMES'],frozenset({'site.example.org'}))
        for score in (True,math.nan,math.inf,-.1,1.1):
            with self.assertRaises(ValueError):
                configure_recaptcha_policy({**config,'RECAPTCHA_MIN_SCORE':score},'production','["site.example.org"]')
        configure_recaptcha_policy(config,'development')
        self.assertEqual(config['RECAPTCHA_ALLOWED_HOSTNAMES'],frozenset({'localhost','127.0.0.1'}))


class EndpointPolicyTests(unittest.TestCase):
    setUp=lifecycle.AccountDeletionTests.setUp
    tearDown=lifecycle.AuthLifecycleTests.tearDown
    client_for=lifecycle.AccountDeletionTests.client_for
    delete=lifecycle.AccountDeletionTests.delete
    code=lifecycle.AuthLifecycleTests.code

    def test_endpoint_defined_expected_actions_and_rejection_before_mail(self):
        from flask import jsonify
        client=self.app.test_client()
        cases=[('/users/login',{'email':'owner@example.test','password':'Password1!'},'login'),
            ('/users/',{'name':'New User','email':'new@example.test','password':'Password1!',
                'adult_confirmed':True,'terms_accepted':True,'terms_version':CURRENT_TERMS_VERSION},'register'),
            ('/users/confirm-registration',{'email':'owner@example.test','code':'123456'},'confirm_registration'),
            ('/users/request-password-reset',{'email':'owner@example.test'},('request_password_reset','resend_password_reset')),
            ('/users/resend-confirmation',{'email':'owner@example.test'},'resend_code'),
            ('/users/confirm-password-reset',{'email':'owner@example.test','code':'123456','new_password':'OtherPass2!'},'confirm_password_reset')]
        before=User.query.count()
        with patch('auth.authentication.verify_recaptcha',return_value=(False,(jsonify(message='Verification failed'),400))) as verify:
            with patch('auth.authentication.send_auth_email') as mail:
                for path,payload,expected in cases:
                    response=client.post(path,json={**payload,'recaptcha_token':'synthetic-token','expected_action':'attacker'})
                    # registration rejects extra fields before verify; use a separate request without spoofed field.
                    if path=='/users/':
                        response=client.post(path,json={**payload,'recaptcha_token':'synthetic-token'})
                    self.assertEqual(response.status_code,400,path)
                    verify.assert_called_with('synthetic-token',expected)
                mail.assert_not_called()
        self.assertEqual(User.query.count(),before)

    def test_real_http_verifier_denies_cross_action_domain_and_reused_token(self):
        self.app.config.update(TESTING=False,APP_ENV='development',RECAPTCHA_MIN_SCORE=.5,
            RECAPTCHA_RETRIES=1,RECAPTCHA_VERIFY_URL='https://www.google.com/recaptcha/api/siteverify',
            RECAPTCHA_ALLOWED_HOSTNAMES={'localhost'},RECAPTCHA_TIMEOUT_SECONDS=1,RECAPTCHA_RETRY_DELAY_SECONDS=0)
        client=self.app.test_client()
        body=dict(email='owner@example.test',password='Password1!',recaptcha_token='synthetic-token')
        with patch('common_defenitions.requests.post') as post:
            for reply in (dict(success=True,score=.9,action='register',hostname='localhost'),
                          dict(success=True,score=.9,action='login',hostname='foreign.example'),
                          {'success':False,'error-codes':['timeout-or-duplicate']}):
                post.return_value.json.return_value=reply
                self.assertEqual(client.post('/users/login',json=body).status_code,400)
            post.return_value.json.return_value=dict(success=True,score=.9,action='login',hostname='localhost')
            self.assertEqual(client.post('/users/login',json=body).status_code,200)

    def test_session_read_without_captcha_keeps_jwt_current_version(self):
        client,_,_=self.client_for()
        with patch('auth.authentication.verify_recaptcha') as verify:
            self.assertEqual(client.get('/users/check').status_code,200)
            self.assertEqual(self.app.test_client().get('/users/check').status_code,401)
            verify.assert_not_called()

    def test_public_scientific_read_and_private_ownership_do_not_call_google(self):
        from rocks.rocks_bp import rocks_bp
        from inputData.inputDataModels import InputData
        self.app.register_blueprint(rocks_bp)
        client,_,_=self.client_for()
        mine=InputData.query.filter_by(user_id=self.owner_id).first().id
        foreign=InputData.query.filter_by(user_id=self.other_id).first().id
        with patch('common_defenitions.requests.post') as google:
            with patch('rocks.rocks_bp.RockType.getRockTypes',return_value=[]), patch('rocks.rocks_bp.Parameter.getParameters',return_value=[]):
                self.assertEqual(self.app.test_client().get('/rocks/rock_type').status_code,200)
                self.assertEqual(self.app.test_client().get('/rocks/parameters').status_code,200)
            self.assertEqual(client.get(f'/input/get_input_by_id/{mine}').status_code,200)
            self.assertEqual(client.get(f'/input/get_input_by_id/{foreign}').status_code,403)
            self.assertEqual(self.app.test_client().get(f'/input/get_input_by_id/{mine}').status_code,401)
            google.assert_not_called()

    def test_search_operation_keeps_endpoint_bound_captcha(self):
        from rocks.rocks_bp import rocks_bp
        self.app.register_blueprint(rocks_bp)
        client=self.app.test_client()
        with patch('rocks.rocks_bp.Sample.getSamplesByRockType',return_value=[]), patch('rocks.rocks_bp.Measure.getMeasuresBySampleIdAndParam',return_value=[]) as measures:
            self.assertEqual(client.get('/rocks/samples/1/1').status_code,400)
            measures.assert_not_called()
            self.assertEqual(client.get('/rocks/samples/1/1',headers={'X-Recaptcha-Token':'test-token'}).status_code,200)
            measures.assert_called_once()
        self.app.config.update(TESTING=False,APP_ENV='development',RECAPTCHA_MIN_SCORE=.5,
            RECAPTCHA_RETRIES=1,RECAPTCHA_VERIFY_URL='https://www.google.com/recaptcha/api/siteverify',
            RECAPTCHA_ALLOWED_HOSTNAMES={'localhost'},RECAPTCHA_TIMEOUT_SECONDS=1,RECAPTCHA_RETRY_DELAY_SECONDS=0)
        with patch('common_defenitions.requests.post') as post:
            post.return_value.json.return_value=dict(success=True,score=.9,action='login',hostname='localhost')
            self.assertEqual(client.get('/rocks/samples/1/1',headers={'X-Recaptcha-Token':'synthetic-token'}).status_code,400)

    def test_delete_without_captcha_keeps_password_csrf_and_revokes_session(self):
        client,headers,_=self.client_for()
        with patch('auth.authentication.verify_recaptcha') as verify:
            self.assertEqual(self.delete(client,{},recaptcha_token=None).status_code,401)
            self.assertEqual(self.delete(client,headers,password='wrong',recaptcha_token=None).status_code,403)
            self.assertEqual(self.delete(client,headers,recaptcha_token=None).status_code,200)
            self.assertEqual(client.get('/users/check').status_code,401)
            verify.assert_not_called()
