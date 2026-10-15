"""Isolated SQLite/mock CAPTCHA/SMTP; no env or working accounts."""
import multiprocessing
import time
import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from common_defenitions import db, limiter
from auth.auth_models import User, ConfirmationCode
from auth.validate import messages
from tests import test_auth_lifecycle as fixtures
from auth import password_reset_delivery as delivery


def _delayed_delivery(settings, recipient, body, result, deadline, parent_pid):
    # Test child uses delay only, never SMTP or the supplied account/code payload.
    time.sleep(float(body))
    result.send(True)
    result.close()


class PasswordResetPrivacyTests(unittest.TestCase):
    # Reuse fixture helpers, not unrelated inherited deletion tests.
    tearDown = fixtures.AccountDeletionTests.tearDown
    code = fixtures.AccountDeletionTests.code
    client_for = fixtures.AccountDeletionTests.client_for

    def setUp(self):
        fixtures.AccountDeletionTests.setUp(self)
        self.app.config.update(TEST_PASSWORD_RESET_RESPONSE_SECONDS=.01,
            RECAPTCHA_ALLOWED_HOSTNAMES=frozenset({'localhost'}), RECAPTCHA_MIN_SCORE=.5,
            RECAPTCHA_VERIFY_URL='https://www.google.com/recaptcha/api/siteverify',
            RECAPTCHA_RETRIES=1, RECAPTCHA_TIMEOUT_SECONDS=1, RECAPTCHA_RETRY_DELAY_SECONDS=0)
        unconfirmed=User(name='Unconfirmed',email='unconfirmed@example.test',active=False,registration_completed=False)
        disabled=User(name='Disabled',email='disabled@example.test',active=False,registration_completed=True)
        for user in (unconfirmed,disabled):
            user.set_password('Password1!')
            db.session.add(user)
        ConfirmationCode.query.delete()
        db.session.commit()

    def reset(self,email='owner@example.test',token='test-token',client=None):
        return (client or self.app.test_client()).post('/users/request-password-reset',
            json={'email':email,'recaptcha_token':token})

    def test_preview_reissued_fixed_code_replaces_expired_copy(self):
        from tests.auth_privacy_preview import create_preview_code
        original = ConfirmationCode.create_code
        old = ConfirmationCode(email='owner@example.test', code='123456', type='password_reset',
            created_at=datetime.now(timezone.utc) - timedelta(minutes=3))
        db.session.add(old)
        db.session.commit()
        self.assertFalse(ConfirmationCode.verify_code('owner@example.test', '123456', 'password_reset'))
        with patch('auth.auth_models.secrets.randbelow', return_value=23456):
            for _ in range(2):
                create_preview_code(original, 'owner@example.test', 'password_reset')
                self.assertEqual(ConfirmationCode.query.filter_by(email='owner@example.test', type='password_reset').count(), 1)
                self.assertTrue(ConfirmationCode.verify_code('owner@example.test', '123456', 'password_reset'))

    def test_initial_and_resend_equal_all_account_states(self):
        passwords={u.id:(u.password,u.active,u.registered_at) for u in User.query.all()}
        expected={'message':messages['password_reset_requested']}
        with patch('auth.authentication.send_reset_email',return_value=True) as sender:
            for action in ('request_password_reset','resend_password_reset'):
                for email in ('owner@example.test','unconfirmed@example.test','disabled@example.test','missing@example.test'):
                    with self.subTest(action=action,email=email):
                        with patch('auth.authentication.verify_recaptcha',return_value=(True,None)) as captcha:
                            response=self.reset(email)
                        self.assertEqual((response.status_code,response.json),(200,expected))
                        captcha.assert_called_once_with('test-token',('request_password_reset','resend_password_reset'))
            self.assertEqual(sender.call_count,2)
        self.assertEqual(ConfirmationCode.query.count(),2)
        self.assertTrue(all(c.email=='owner@example.test' and c.type=='password_reset' for c in ConfirmationCode.query.all()))
        self.assertEqual(passwords,{u.id:(u.password,u.active,u.registered_at) for u in User.query.all()})

    def test_inactive_unknown_no_code_creation_or_delivery(self):
        count=User.query.count()
        with patch.object(ConfirmationCode,'create_code') as create, patch('auth.authentication.send_reset_email') as sender:
            for email in ('unconfirmed@example.test','disabled@example.test','missing@example.test'):
                self.assertEqual(self.reset(email).status_code,200)
            create.assert_not_called()
            sender.assert_not_called()
        self.assertEqual(User.query.count(),count)
        self.assertEqual(ConfirmationCode.query.count(),0)

    def test_generation_refusal_and_exception_are_neutral_and_rollback(self):
        for outcome in (None,RuntimeError('secret@example.test secret-code')):
            with self.subTest(outcome=type(outcome).__name__):
                kwargs={'side_effect':outcome} if isinstance(outcome,Exception) else {'return_value':outcome}
                with patch.object(ConfirmationCode,'create_code',**kwargs), patch('auth.authentication.send_reset_email') as sender:
                    response=self.reset()
                self.assertEqual((response.status_code,response.json),(200,{'message':messages['password_reset_requested']}))
                sender.assert_not_called()
        self.assertEqual(ConfirmationCode.query.count(),0)

    def test_smtp_failure_has_generic_response_and_safe_log(self):
        with patch('auth.authentication.send_reset_email',side_effect=RuntimeError('secret@example.test secret-code')):
            with self.assertLogs(self.app.logger,level='ERROR') as logs:
                response=self.reset()
        self.assertEqual(response.status_code,200)
        self.assertEqual(response.json,{'message':messages['password_reset_requested']})
        self.assertNotIn('secret@example',str(logs.output))
        self.assertNotIn('secret-code',str(logs.output))
        self.assertTrue(User.query.filter_by(email='owner@example.test').one().check_password('Password1!'))

    def test_invalid_payload_is_account_independent(self):
        bad=(None,[],{}, {'email':None},{'email':False},{'email':1},{'email':[]},
            {'email':'bad'}, {'email':'x'*101}, {'email':'owner@example.test\n'})
        with patch('auth.authentication.verify_recaptcha') as captcha, patch('auth.authentication.send_reset_email') as sender:
            for value in bad:
                self.assertEqual(self.app.test_client().post('/users/request-password-reset',json=value).status_code,400)
            self.assertEqual(self.app.test_client().post('/users/request-password-reset',data='{',content_type='application/json').status_code,400)
            captcha.assert_not_called()
            sender.assert_not_called()
        self.assertEqual(ConfirmationCode.query.count(),0)

    def test_captcha_failures_do_not_become_generic_success(self):
        responses=[{'success':False}, {'success':True,'score':.9,'action':'login','hostname':'localhost'},
            {'success':True,'score':.9,'action':'request_password_reset','hostname':'other.example.test'}]
        with patch('auth.authentication.send_reset_email') as sender:
            for result in responses:
                with patch('common_defenitions.requests.post') as google:
                    google.return_value.json.return_value=result
                    self.assertEqual(self.reset(token='synthetic-token').status_code,400)
            sender.assert_not_called()
        self.assertEqual(ConfirmationCode.query.count(),0)

    def test_both_valid_captcha_actions_allow_only_active_delivery(self):
        with patch('auth.authentication.send_reset_email',return_value=True) as sender:
            for action in ('request_password_reset','resend_password_reset'):
                with patch('common_defenitions.requests.post') as google:
                    google.return_value.json.return_value={'success':True,'score':.9,'action':action,'hostname':'localhost'}
                    self.assertEqual(self.reset(token='synthetic-token').status_code,200)
            self.assertEqual(sender.call_count,2)

    def test_rate_limit_is_not_neutral_success(self):
        self.app.config.update(RATELIMIT_ENABLED=True,AUTH_PASSWORD_RESET_RATE_LIMIT='2 per minute')
        limiter.init_app(self.app)
        limiter.reset()
        try:
            client=self.app.test_client()
            self.assertEqual(self.reset('missing@example.test',client=client).status_code,200)
            self.assertEqual(self.reset('missing@example.test',client=client).status_code,200)
            self.assertEqual(self.reset('missing@example.test',client=client).status_code,429)
        finally:
            limiter.enabled=False
            limiter.reset()

    def test_confirmation_consumption_expiry_and_session_revocation(self):
        old_session, _, refresh_headers=self.client_for()
        with patch('auth.authentication.send_reset_email',return_value=True):
            self.reset()
        code=ConfirmationCode.query.one()
        payload={'email':code.email,'code':code.code,'new_password':'DifferentPass2!','recaptcha_token':'test-token'}
        bad={**payload,'code':'000000'}
        self.assertEqual(self.app.test_client().post('/users/confirm-password-reset',json=bad).status_code,401)
        code.created_at-=timedelta(seconds=121)
        db.session.commit()
        self.assertEqual(self.app.test_client().post('/users/confirm-password-reset',json=payload).status_code,401)
        self.assertTrue(User.query.filter_by(email=payload['email']).one().check_password('Password1!'))
        code.created_at=datetime.now(timezone.utc)
        db.session.commit()
        self.assertEqual(self.app.test_client().post('/users/confirm-password-reset',json=payload).status_code,200)
        self.assertTrue(User.query.filter_by(email=payload['email']).one().check_password('DifferentPass2!'))
        self.assertEqual(ConfirmationCode.query.count(),0)
        self.assertEqual(self.app.test_client().post('/users/confirm-password-reset',json=payload).status_code,401)
        self.assertEqual(old_session.get('/users/check').status_code,401)
        self.assertEqual(old_session.post('/users/refresh',headers=refresh_headers).status_code,401)

    def test_managed_delay_has_same_response_window(self):
        self.app.config['TEST_PASSWORD_RESET_RESPONSE_SECONDS']=.15
        elapsed=[]
        for email in ('missing@example.test','owner@example.test'):
            with patch('auth.authentication.send_reset_email',side_effect=lambda *args:(time.sleep(.08) or True)):
                start=time.monotonic()
                self.assertEqual(self.reset(email).status_code,200)
                elapsed.append(time.monotonic()-start)
        self.assertTrue(all(.14<=value<.3 for value in elapsed),elapsed)
        self.assertLess(abs(elapsed[0]-elapsed[1]),.05,elapsed)

    def test_actual_spawn_sender_log_mode_and_timeout_reaped(self):
        self.app.config.update(TEST_PASSWORD_RESET_RESPONSE_SECONDS=1.0,MAIL_DELIVERY_MODE='log')
        before={p.pid for p in multiprocessing.active_children()}
        self.assertTrue(delivery.send_reset_email('isolated@example.test','123456',time.monotonic()))
        real_context=multiprocessing.get_context('spawn')
        class ControlledContext:
            Pipe=staticmethod(real_context.Pipe)
            @staticmethod
            def Process(*args,**kwargs):
                settings,recipient,body,result,deadline,parent_pid=kwargs['args']
                kwargs.update(target=_delayed_delivery,args=(settings,recipient,'2',result,deadline,parent_pid))
                return real_context.Process(*args,**kwargs)
        start=time.monotonic()
        with patch.object(delivery.multiprocessing,'get_context',return_value=ControlledContext):
            self.assertFalse(delivery.send_reset_email('isolated@example.test','123456',start))
        self.assertLess(time.monotonic()-start,1.4)
        self.assertEqual({p.pid for p in multiprocessing.active_children()},before)

