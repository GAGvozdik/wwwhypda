"""Shared DB registration budgets; synthetic accounts and no SMTP/Google."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
import unittest
from unittest.mock import patch
from sqlalchemy.exc import IntegrityError
from common_defenitions import db
from auth.auth_models import User, ConfirmationCode, RegistrationLimit
from auth.registration_limits import issue_code, verify_code, WINDOW
from auth.transaction_lock import lock_users_transaction
from auth import migrate_registration_limits as migration
from tests.test_pending_login import PendingLoginTests
from tests import test_auth_lifecycle as fixtures

class RegistrationLimitTests(unittest.TestCase):
    setUp=PendingLoginTests.setUp
    tearDown=fixtures.AuthLifecycleTests.tearDown
    code=fixtures.AuthLifecycleTests.code

    def user(self):return User.query.filter_by(email='pending@example.test').one()
    def issue(self):return ConfirmationCode.create_code('pending@example.test','registration')
    def confirm(self,code,ip='192.0.2.1'):
        return self.app.test_client().post('/users/confirm-registration',json=dict(
            email='pending@example.test',code=code,recaptcha_token='test-token'),environ_overrides={'REMOTE_ADDR':ip})
    def resend(self,email='pending@example.test'):
        return self.app.test_client().post('/users/resend-confirmation',json=dict(
            email=email,recaptcha_token='test-token'))

    def test_five_wrong_attempts_persist_across_clients_and_correct_code_then_needs_new_challenge(self):
        right=self.issue().code
        wrong='000000' if right!='000000' else '999999'
        for i in range(5):self.assertEqual(self.confirm(wrong,'192.0.2.'+str(i+1)).status_code,401)
        self.assertEqual(self.confirm(right).status_code,401)
        self.assertEqual(RegistrationLimit.query.one().failed_attempts,5)
        newer=self.issue().code
        self.assertNotEqual(newer,right)
        self.assertEqual(self.confirm(newer).status_code,200)
        user=self.user();self.assertTrue(user.active);self.assertTrue(user.registration_completed)
        self.assertEqual(RegistrationLimit.query.count(),0)
        self.assertEqual(self.confirm(newer).status_code,401)

    def test_all_code_issue_paths_share_budget_and_resend_stays_neutral(self):
        for _ in range(3):self.assertIsNotNone(self.issue())
        original=ConfirmationCode.query.filter_by(email='pending@example.test',type='registration').one().code
        self.assertIsNone(self.issue())
        with patch('auth.authentication.send_auth_code_email') as sender:
            responses=[self.resend(email) for email in ('pending@example.test','missing@example.test','disabled@example.test')]
        sender.assert_not_called()
        self.assertTrue(all(r.status_code==200 and r.json==responses[0].json for r in responses))
        self.assertEqual(ConfirmationCode.query.filter_by(email='pending@example.test',type='registration').one().code,original)

    def test_resend_replaces_only_registration_and_preserves_account_metadata(self):
        user=self.user();registered=user.registered_at;version=user.terms_version;password=user.password
        old=self.issue().code
        db.session.add(ConfirmationCode(email=user.email,code='777777',type='password_reset'));db.session.commit()
        new=self.issue().code
        self.assertNotEqual(old,new)
        self.assertEqual(ConfirmationCode.query.filter_by(email=user.email,type='registration').count(),1)
        self.assertEqual(ConfirmationCode.query.filter_by(email=user.email,type='password_reset').count(),1)
        self.assertEqual(self.confirm(old).status_code,401)
        self.assertEqual(self.confirm(new).status_code,200)
        self.assertEqual(self.user().registered_at,registered);self.assertEqual(self.user().terms_version,version)
        self.assertEqual(self.user().password,password)

    def test_window_and_ttl_are_independent_and_invalid_challenge_never_extends_registration(self):
        now=datetime.now(timezone.utc)
        user=self.user()
        for _ in range(3):
            lock_users_transaction();issue_code(user,now);db.session.commit()
        current=ConfirmationCode.query.filter_by(email=user.email,type='registration').one()
        self.assertFalse(verify_code(user,current.code,now+timedelta(seconds=120)))
        self.assertIsNone(issue_code(user,now+WINDOW-timedelta(microseconds=1)))
        self.assertIsNotNone(issue_code(user,now+WINDOW))
        db.session.commit();self.assertEqual(RegistrationLimit.query.one().sent_count,1)

    def test_wrong_attempt_commit_failure_rolls_back_without_activation(self):
        self.issue()
        with patch.object(db.session,'commit',side_effect=RuntimeError('private')):
            self.assertEqual(self.confirm('000000').status_code,500)
        self.assertFalse(self.user().active)
        self.assertEqual(RegistrationLimit.query.one().failed_attempts,0)

    def test_legacy_latest_code_adopted_and_older_code_cannot_bypass_attempts(self):
        for value in ('111111','222222'):
            db.session.add(ConfirmationCode(email='pending@example.test',code=value,type='registration'))
        db.session.commit()
        self.assertEqual(self.confirm('111111').status_code,401)
        self.assertEqual(RegistrationLimit.query.one().failed_attempts,1)
        self.assertEqual(self.confirm('222222').status_code,200)

    def test_postgresql_concurrent_issuers_share_one_budget(self):
        if db.engines['users_db'].dialect.name!='postgresql':self.skipTest('Requires PostgreSQL locks')
        db.session.remove()
        def issuing(_):
            with self.app.app_context():return ConfirmationCode.create_code('pending@example.test','registration') is not None
        with ThreadPoolExecutor(max_workers=4) as pool:results=list(pool.map(issuing,range(4)))
        self.assertEqual(sum(results),3)
        self.assertEqual(RegistrationLimit.query.one().sent_count,3)
        self.assertEqual(ConfirmationCode.query.filter_by(email='pending@example.test',type='registration').count(),1)

    def test_postgresql_migration_is_additive_idempotent_and_checked(self):
        engine=db.engines['users_db']
        if engine.dialect.name!='postgresql':self.skipTest('Requires PostgreSQL migration')
        from sqlalchemy import text
        before=User.query.count();codes=ConfirmationCode.query.count();db.session.remove()
        with engine.begin() as connection:connection.execute(text('DROP TABLE registration_limits'))
        with self.assertRaises(migration.SchemaError):migration.migrate(engine,check=True)
        migration.migrate(engine);migration.migrate(engine);migration.migrate(engine,check=True)
        self.assertEqual(User.query.count(),before);self.assertEqual(ConfirmationCode.query.count(),codes)
        self.assertEqual(RegistrationLimit.query.count(),0)
        user=self.user()
        db.session.add(RegistrationLimit(user_id=user.id,failed_attempts=-1,sent_count=0))
        with self.assertRaises(IntegrityError):db.session.commit()
        db.session.rollback()

    def test_postgresql_concurrent_wrong_attempts_and_one_time_activation(self):
        if db.engines['users_db'].dialect.name!='postgresql':self.skipTest('Requires PostgreSQL locks')
        right=self.issue().code;wrong='000000' if right!='000000' else '999999'
        db.session.remove()
        def confirmation(value):
            with self.app.app_context():return self.confirm(value).status_code
        with ThreadPoolExecutor(max_workers=3) as pool:
            self.assertEqual(list(pool.map(confirmation,[wrong]*6)),[401]*6)
        self.assertEqual(RegistrationLimit.query.one().failed_attempts,5)
        db.session.remove()
        right=self.issue().code;db.session.remove()
        with ThreadPoolExecutor(max_workers=2) as pool:
            self.assertEqual(sorted(pool.map(confirmation,[right,right])),[200,401])
        self.assertTrue(self.user().active)
        self.assertEqual(RegistrationLimit.query.count(),0)
        self.assertEqual(ConfirmationCode.query.filter_by(email='pending@example.test',type='registration').count(),0)
