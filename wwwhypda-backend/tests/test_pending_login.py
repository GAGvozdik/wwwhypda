"""Credential-verified continuation only; no real mail, network or working DB."""
from datetime import datetime, timezone
import unittest
from unittest.mock import patch
from werkzeug.security import check_password_hash
from common_defenitions import db
from auth.auth_models import User, UserAgreementAcceptance
from auth.terms import CURRENT_TERMS_VERSION
from tests import test_auth_lifecycle as fixtures

class PendingLoginTests(unittest.TestCase):
    tearDown=fixtures.AuthLifecycleTests.tearDown
    code=fixtures.AuthLifecycleTests.code
    def setUp(self):
        fixtures.AccountDeletionTests.setUp(self)
        self.original=datetime(2026,1,1,tzinfo=timezone.utc)
        for name,completed in (('pending',False),('disabled',True),('legacy',None)):
            user=User(name=name,email=name+'@example.test',active=False,
                registration_completed=completed,registered_at=self.original,
                terms_version=CURRENT_TERMS_VERSION,terms_accepted_at=self.original)
            user.set_password('Password1!');db.session.add(user)
        db.session.commit()

    def login(self,name,password='Password1!'):
        return self.app.test_client().post('/users/login',json=dict(
            email=name+'@example.test',password=password,recaptcha_token='test-token'))

    def test_correct_pending_only_returns_machine_status_without_mail_tokens_or_mutation(self):
        with patch('auth.authentication.send_auth_code_email') as sender:
            response=self.login('pending')
        self.assertEqual(response.status_code,409)
        self.assertEqual(response.json['code'],'email_confirmation_required')
        self.assertEqual(set(response.json),{'message','code'})
        self.assertFalse(response.headers.getlist('Set-Cookie'));sender.assert_not_called()
        user=User.query.filter_by(email='pending@example.test').one()
        self.assertFalse(user.active);self.assertIs(user.registration_completed,False)
        self.assertEqual(user.registered_at.replace(tzinfo=timezone.utc),self.original)
        self.assertEqual(UserAgreementAcceptance.query.count(),0)
        self.assertEqual(self.app.test_client().get('/users/check').status_code,401)

    def test_wrong_unknown_disabled_and_legacy_share_neutral_failure_and_one_hash(self):
        outcomes=[]
        for name,password in (('pending','wrong'),('owner','wrong'),('missing','wrong'),
                              ('disabled','Password1!'),('legacy','Password1!')):
            with patch('auth.auth_models.check_password_hash',wraps=check_password_hash) as check:
                response=self.login(name,password)
                self.assertEqual(check.call_count,1)
            self.assertEqual(response.status_code,404)
            outcomes.append(response.json)
            self.assertFalse(response.headers.getlist('Set-Cookie'))
        self.assertTrue(all(value==outcomes[0] for value in outcomes))

    def test_valid_pending_is_also_exactly_one_hash(self):
        with patch('auth.auth_models.check_password_hash',wraps=check_password_hash) as check:
            self.assertEqual(self.login('pending').status_code,409)
            self.assertEqual(check.call_count,1)

    def test_wait_runs_after_transaction_rollback(self):
        def wait(_started):
            self.assertFalse(db.session().in_transaction())
        with patch('auth.authentication.wait_for_failed_login',side_effect=wait):
            self.assertEqual(self.login('pending').status_code,409)
            self.assertEqual(self.login('pending','wrong').status_code,404)

    def test_active_and_terms_gate_preserved(self):
        self.assertEqual(self.login('owner').status_code,200)
        user=User.query.filter_by(email='owner@example.test').one()
        user.terms_version='old';db.session.commit()
        response=self.login('owner')
        self.assertEqual(response.status_code,409)
        self.assertEqual(response.json['code'],'terms_acceptance_required')
        self.assertFalse(response.headers.getlist('Set-Cookie'))

    def test_recheck_rejects_deleted_changed_password_or_disabled_pending_after_hash(self):
        original=User.login
        for action in ('password','disabled','deleted'):
            def changed(email,password,allow_pending=False):
                record=original(email,password,allow_pending=allow_pending)
                user=User.query.filter_by(email=email).one()
                if action=='password':user.set_password('Replacement1!')
                elif action=='disabled':user.registration_completed=True
                else:db.session.delete(user)
                db.session.commit()
                return record
            with patch.object(User,'login',side_effect=changed):
                response=self.login('pending')
            self.assertEqual(response.status_code,404)
            self.assertFalse(response.headers.getlist('Set-Cookie'))
            if action!='deleted':
                user=User.query.filter_by(email='pending@example.test').one()
                user.set_password('Password1!');user.registration_completed=False;db.session.commit()

    def test_malformed_injection_and_oversize_inputs_never_start_hash_or_captcha(self):
        cases=[{},dict(email="x' OR 1=1 --",password='Password1!'),dict(email='<script>@example.test',password='Password1!'),
            dict(email='pending@example.test\r\nX-Test: injected',password='Password1!'),
            dict(email='a'*101+'@example.test',password='Password1!'),
            dict(email='pending@example.test',password='x'*1025),dict(email=['pending@example.test'],password='Password1!')]
        with patch('auth.authentication.verify_recaptcha') as captcha,patch('auth.auth_models.check_password_hash') as hash_work:
            for data in cases:
                self.assertEqual(self.app.test_client().post('/users/login',json=data).status_code,400)
            captcha.assert_not_called();hash_work.assert_not_called()
