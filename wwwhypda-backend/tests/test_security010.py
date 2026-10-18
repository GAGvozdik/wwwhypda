"""Security expectations: persisted revocation, reset replacement/budgets, no real providers."""
from datetime import datetime, timedelta, timezone
from unittest.mock import patch
import unittest
from flask_jwt_extended import create_access_token, create_refresh_token, decode_token, get_csrf_token
from common_defenitions import db
from auth.auth_models import User, AuthSession, ResetLimit, ConfirmationCode
from tests import test_auth_lifecycle as fixtures


class SecuritySessionTests(unittest.TestCase):
    setUp=fixtures.AccountDeletionTests.setUp
    tearDown=fixtures.AuthLifecycleTests.tearDown
    code=fixtures.AuthLifecycleTests.code
    client_for=fixtures.AccountDeletionTests.client_for

    def replay(self, client):
        copy=self.app.test_client()
        for name,path in [('access_token_cookie','/'),('refresh_token_cookie','/users/refresh')]:
            cookie=client.get_cookie(name,path=path)
            if cookie:copy.set_cookie(name,cookie.value,path=path)
        return copy

    def test_logout_rejects_both_tokens_preserves_independent_session_and_is_idempotent(self):
        a,access,refresh=self.client_for();other,_,_=self.client_for()
        old=self.replay(a);again=self.replay(a)
        self.assertEqual(a.post('/users/logout',headers=access).status_code,200)
        self.assertEqual(old.get('/users/check').status_code,401)
        self.assertEqual(old.post('/users/refresh',headers=refresh).status_code,401)
        self.assertEqual(other.get('/users/check').status_code,200)
        self.assertEqual(again.post('/users/logout',headers=access).status_code,200)

    def test_expired_access_logout_via_refresh_and_csrf(self):
        a,_,refresh=self.client_for();old=self.replay(a)
        payload=decode_token(a.get_cookie('access_token_cookie').value)
        expired=create_access_token(identity=str(self.owner_id),additional_claims={k:payload[k] for k in ('sid','account_version')},expires_delta=timedelta(seconds=-1))
        a.set_cookie('access_token_cookie',expired)
        self.assertEqual(a.get('/users/check').status_code,401)
        self.assertEqual(a.post('/users/refresh/logout').status_code,401)
        self.assertEqual(a.post('/users/refresh/logout',headers={'X-CSRF-TOKEN':'wrong'}).status_code,401)
        self.assertEqual(a.post('/users/refresh/logout',headers=refresh).status_code,200)
        self.assertEqual(old.get('/users/check').status_code,401)
        self.assertEqual(old.post('/users/refresh',headers=refresh).status_code,401)

    def test_deactivation_never_resurrects_existing_sessions(self):
        a,_,refresh=self.client_for();User.deactivate_user(self.owner_id)
        self.assertEqual(a.get('/users/check').status_code,401)
        User.activate_user_by_id(self.owner_id)
        self.assertEqual(a.get('/users/check').status_code,401)
        self.assertEqual(a.post('/users/refresh',headers=refresh).status_code,401)
        new,_,_=self.client_for();self.assertEqual(new.get('/users/check').status_code,200)

    def test_refresh_keeps_sid_and_legacy_without_sid_is_rejected(self):
        a,_,refresh=self.client_for();before=decode_token(a.get_cookie('access_token_cookie').value)['sid']
        self.assertEqual(a.post('/users/refresh',headers=refresh).status_code,200)
        self.assertEqual(decode_token(a.get_cookie('access_token_cookie').value)['sid'],before)
        user=db.session.get(User,self.owner_id)
        legacy=create_access_token(identity=str(user.id),additional_claims={'account_version':user.session_version()})
        a.set_cookie('access_token_cookie',legacy)
        self.assertEqual(a.get('/users/check').status_code,401)

    def test_commit_failure_does_not_clear_cookies_or_partially_revoke(self):
        a,headers,_=self.client_for()
        with patch.object(db.session,'commit',side_effect=RuntimeError('synthetic')):
            response=a.post('/users/logout',headers=headers)
        self.assertEqual(response.status_code,500);self.assertFalse(response.headers.getlist('Set-Cookie'))
        self.assertEqual(a.get('/users/check').status_code,200)

    def test_revocation_persists_across_session_removal_and_cleanup(self):
        a,headers,_=self.client_for();old=self.replay(a)
        self.assertEqual(a.post('/users/logout',headers=headers).status_code,200)
        db.session.remove()
        self.assertEqual(old.get('/users/check').status_code,401)
        from auth.sessions import cleanup_expired
        self.assertEqual(cleanup_expired(),0)
        AuthSession.query.update({AuthSession.expires_at:datetime.now(timezone.utc)-timedelta(seconds=1)})
        db.session.commit();self.assertEqual(cleanup_expired(),1);db.session.commit()


class ResetSecurityTests(SecuritySessionTests):
    def issue(self):return ConfirmationCode.create_code('owner@example.test','password_reset')
    def confirm(self,code,ip='192.0.2.1'):
        return self.app.test_client().post('/users/confirm-password-reset',json=dict(email='owner@example.test',code=code,new_password='ChangedPassword1!',recaptcha_token='test-token'),environ_overrides={'REMOTE_ADDR':ip})

    def test_replacement_and_success_remove_all_reset_codes_and_revoke_sessions(self):
        a,_,refresh=self.client_for();first=self.issue().code;second=self.issue().code
        self.assertNotEqual(first,second)
        self.assertEqual(self.confirm(first).status_code,401)
        self.assertEqual(self.confirm(second).status_code,200)
        self.assertEqual(self.confirm(first).status_code,401)
        self.assertEqual(self.confirm(second).status_code,401)
        self.assertEqual(ConfirmationCode.query.filter_by(type='password_reset').count(),0)
        self.assertGreater(ConfirmationCode.query.filter_by(type='registration').count(),0)
        self.assertEqual(a.get('/users/check').status_code,401)
        self.assertEqual(a.post('/users/refresh',headers=refresh).status_code,401)

    def test_attempt_budget_across_clients_and_shared_issue_quota(self):
        right=self.issue().code
        for i in range(5):self.assertEqual(self.confirm('000000',f'192.0.2.{i+1}').status_code,401)
        db.session.remove();self.assertEqual(self.confirm(right).status_code,401)
        self.assertEqual(ResetLimit.query.one().failed_attempts,5)
        self.assertIsNotNone(self.issue());self.assertIsNotNone(self.issue());self.assertIsNone(self.issue())
        self.assertEqual(ResetLimit.query.one().sent_count,3)

    def test_reset_rollback_preserves_password_code_and_sessions(self):
        a,_,_=self.client_for();right=self.issue().code
        with patch.object(db.session,'commit',side_effect=RuntimeError('synthetic')):
            self.assertEqual(self.confirm(right).status_code,500)
        self.assertTrue(db.session.get(User,self.owner_id).check_password('Password1!'))
        self.assertEqual(a.get('/users/check').status_code,200)
        self.assertEqual(self.confirm(right).status_code,200)

    def test_unknown_and_disabled_have_no_reset_budget(self):
        self.assertIsNone(ConfirmationCode.create_code('missing@example.test','password_reset'))
        User.deactivate_user(self.owner_id)
        self.assertIsNone(self.issue());self.assertEqual(ResetLimit.query.count(),0)


class PostgreSQLSecurityTests(ResetSecurityTests):
    def setUp(self):
        import os
        if not os.environ.get('TEST_AUTH_DATABASE_URI','').startswith('postgresql'):
            self.skipTest('Disposable PostgreSQL required')
        super().setUp()

    def test_concurrent_wrong_budget_and_one_successful_confirmation(self):
        from concurrent.futures import ThreadPoolExecutor
        right=self.issue().code;db.session.remove()
        def confirm(value):
            with self.app.app_context():return self.confirm(value).status_code
        with ThreadPoolExecutor(max_workers=3) as pool:
            self.assertEqual(list(pool.map(confirm,['000000']*6)),[401]*6)
        self.assertEqual(ResetLimit.query.one().failed_attempts,5)
        db.session.remove();right=self.issue().code;db.session.remove()
        with ThreadPoolExecutor(max_workers=2) as pool:
            self.assertEqual(sorted(pool.map(confirm,[right,right])),[200,401])

    def test_concurrent_issuers_share_quota(self):
        from concurrent.futures import ThreadPoolExecutor
        db.session.remove()
        def issue(_):
            with self.app.app_context():return self.issue() is not None
        with ThreadPoolExecutor(max_workers=4) as pool:self.assertEqual(sum(pool.map(issue,range(4))),3)
        self.assertEqual(ResetLimit.query.one().sent_count,3)
        self.assertEqual(ConfirmationCode.query.filter_by(email='owner@example.test',type='password_reset').count(),1)

    def test_additive_migration_check_repeat_and_ddl_rollback(self):
        from sqlalchemy import inspect
        from auth import migrate_security_state as migration
        engine=db.engines['users_db'];before=(User.query.count(),ConfirmationCode.query.count())
        db.session.remove()
        ResetLimit.__table__.drop(engine);AuthSession.__table__.drop(engine)
        with self.assertRaises(migration.SchemaError):migration.migrate(engine,check=True)
        with patch.object(migration,'validate',side_effect=migration.SchemaError('synthetic failure')):
            with self.assertRaises(migration.SchemaError):migration.migrate(engine)
        self.assertFalse(inspect(engine).has_table('auth_sessions'))
        self.assertFalse(inspect(engine).has_table('reset_limits'))
        migration.migrate(engine);migration.migrate(engine);migration.migrate(engine,check=True)
        self.assertEqual((User.query.count(),ConfirmationCode.query.count()),before)
        self.assertEqual(AuthSession.query.count(),0);self.assertEqual(ResetLimit.query.count(),0)


    def test_refresh_races_logout_reset_and_delete_without_surviving_token(self):
        from concurrent.futures import ThreadPoolExecutor
        for operation in ('logout','reset','deactivate','delete'):
            # Each iteration gets a separate disposable account to keep prior revocation final.
            user=User(name='Race',email='race-'+operation+'@example.test',active=True,
                terms_version=__import__('auth.terms',fromlist=['CURRENT_TERMS_VERSION']).CURRENT_TERMS_VERSION,
                terms_accepted_at=datetime.now(timezone.utc))
            user.set_password('Password1!');db.session.add(user);db.session.commit();uid=user.id;email=user.email
            client,access_headers,refresh_headers=self.client_for(uid)
            access=client.get_cookie('access_token_cookie').value
            refresh=client.get_cookie('refresh_token_cookie',path='/users/refresh').value
            code=ConfirmationCode.create_code(email,'password_reset').code if operation=='reset' else None
            db.session.remove()
            def action(which):
                with self.app.app_context():
                    c=self.app.test_client();c.set_cookie('access_token_cookie',access);c.set_cookie('refresh_token_cookie',refresh,path='/users/refresh')
                    if which=='refresh':
                        r=c.post('/users/refresh',headers=refresh_headers)
                        return r.status_code,c.get_cookie('access_token_cookie').value
                    if operation=='logout':r=c.post('/users/logout',headers=access_headers)
                    elif operation=='reset':r=c.post('/users/confirm-password-reset',json=dict(email=email,code=code,new_password='ChangedPassword1!',recaptcha_token='test-token'))
                    elif operation=='delete':r=c.delete('/users/me',headers=access_headers,json={'password':'Password1!'})
                    else:
                        User.deactivate_user(uid);User.activate_user_by_id(uid);return 200,None
                    return r.status_code,None
            with ThreadPoolExecutor(max_workers=2) as pool:
                refreshing=pool.submit(action,'refresh');revoking=pool.submit(action,'revoke')
                refreshed=refreshing.result();revoked=revoking.result()
            self.assertIn(refreshed[0],(200,401));self.assertEqual(revoked[0],200)
            check=self.app.test_client();check.set_cookie('access_token_cookie',refreshed[1])
            self.assertEqual(check.get('/users/check').status_code,401)
            db.session.remove()

    def test_signed_token_cannot_borrow_another_users_session(self):
        client,_,_=self.client_for()
        sid=decode_token(client.get_cookie('access_token_cookie').value)['sid']
        other=db.session.get(User,self.other_id)
        forged=create_access_token(identity=str(other.id),additional_claims={'account_version':other.session_version(),'sid':sid})
        client.set_cookie('access_token_cookie',forged)
        self.assertEqual(client.get('/users/check').status_code,401)


    def test_revocation_visible_in_new_process(self):
        import subprocess,sys,os
        client,headers,_=self.client_for()
        self.assertEqual(client.post('/users/logout',headers=headers).status_code,200)
        db.session.remove()
        script="import os;from sqlalchemy import create_engine,text;e=create_engine(os.environ['TEST_AUTH_DATABASE_URI']);c=e.connect();assert c.execute(text('SELECT count(*) FROM auth_sessions WHERE revoked_at IS NOT NULL')).scalar_one()>0;c.close();e.dispose();print('persistent-revocation-ok')"
        result=subprocess.run([sys.executable,'-B','-c',script],capture_output=True,text=True,timeout=15)
        self.assertEqual(result.returncode,0);self.assertEqual(result.stdout.strip(),'persistent-revocation-ok')
