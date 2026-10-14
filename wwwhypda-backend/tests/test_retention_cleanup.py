"""Synthetic users_db only. SQLite covers semantics; PostgreSQL proves locking."""
import os
import unittest
from datetime import datetime, timedelta, timezone
from threading import Event
from unittest.mock import patch
from sqlalchemy import text
from common_defenitions import db
from auth.auth_models import User, ConfirmationCode
from maintenance.retention import add_months, cleanup, expired, utc, validate_interval
from maintenance.retention_cleanup import cleanup_once, run_worker, main
from tests import test_auth_lifecycle as lifecycle
from tests.test_terms_acceptance import TermsAcceptanceTests


class CalendarTests(unittest.TestCase):
    def test_clamping_leap_year_direct_six_months_and_utc(self):
        for year, day in ((2024, 29), (2025, 28)):
            value = datetime(year, 1, 31, 15, 42, 13, 123456)
            self.assertEqual(add_months(value, 1), datetime(year, 2, day, 15, 42, 13, 123456, timezone.utc))
            boundary = add_months(value, 1)
            self.assertFalse(expired(value, 1, boundary-timedelta(microseconds=1)))
            self.assertTrue(expired(value, 1, boundary))
            self.assertTrue(expired(value, 1, boundary+timedelta(microseconds=1)))
        self.assertEqual(add_months(datetime(2025, 8, 31), 6).day, 28)
        self.assertEqual(add_months(datetime(2024, 1, 31), 6).day, 31)
        offset = timezone(timedelta(hours=2))
        self.assertEqual(add_months(datetime(2024, 3, 1, 1, tzinfo=offset), 1),
                         datetime(2024, 3, 29, 23, tzinfo=timezone.utc))
        self.assertFalse(expired(None, 6, datetime.now(timezone.utc)))
        self.assertFalse(expired(datetime(2099, 1, 1), 1, datetime.now(timezone.utc)))

    def test_interval_and_explicit_worker_execute(self):
        for value in (0, -1, 3601, 'bad'):
            with self.assertRaises(ValueError):
                validate_interval(value)
        self.assertEqual(validate_interval('3600'), 3600)
        with self.assertRaises(SystemExit):
            main(['--worker'])
        with patch('maintenance.retention_cleanup.create_app', side_effect=RuntimeError('secret')):
            with self.assertLogs(level='ERROR') as logs:
                self.assertEqual(main(['--once']), 1)
            self.assertNotIn('secret', str(logs.output))


class RetentionTests(unittest.TestCase):
    setUp = lifecycle.AuthLifecycleTests.setUp
    tearDown = lifecycle.AuthLifecycleTests.tearDown

    def user(self, email='expired@example.test', **fields):
        body = dict(name='Expired', email=email, active=False, registration_completed=False,
                    registered_at=datetime(2026, 8, 31, 12, tzinfo=timezone.utc))
        body.update(fields)
        user = User(**body)
        user.set_password('Password1!')
        db.session.add(user)
        db.session.commit()
        return user.id

    def submission(self, uid, **fields):
        body = dict(user_id=uid, name='Synthetic', general_info=[], measurements=[], samples=[],
                    site_info=[], source_info=[], created_at=datetime(2026, 4, 12, 12))
        body.update(fields)
        entry = InputData(**body)
        db.session.add(entry)
        db.session.commit()
        return entry.id

    def test_only_proven_unfinished_accounts_and_related_data(self):
        owner = User.query.one().id
        target = self.user()
        for i, fields in enumerate((dict(active=True), dict(registration_completed=True),
                dict(registration_completed=None, registered_at=None), dict(is_superuser=True),
                dict(registered_at=datetime(2099,1,1)), dict(registered_at=None))):
            self.user(email=f'protected{i}@example.test', name=f'Protected {i}', **fields)
        self.submission(target, created_at=datetime(2026,10,12), editing_by='Expired')
        other = self.submission(owner, created_at=datetime(2026,10,12), editing_by='Expired')
        for kind in ('registration', 'password_reset'):
            db.session.add(ConfirmationCode(email='expired@example.test', code='123456', type=kind))
        db.session.commit()
        before = (User.query.count(), InputData.query.count(), ConfirmationCode.query.count())
        counts = cleanup(self.now)
        self.assertEqual(counts['accounts'],1)
        self.assertEqual(counts['submissions'],1)
        self.assertEqual(counts['codes'],2)
        self.assertEqual(counts['unknown_accounts'],2)
        self.assertEqual((User.query.count(), InputData.query.count(), ConfirmationCode.query.count()),before)
        self.assertEqual(cleanup(self.now,execute=True),counts)
        self.assertIsNone(db.session.get(User,target))
        self.assertIsNone(db.session.get(InputData,other).editing_by)
        self.assertEqual(User.query.count(),7)
        self.assertEqual(cleanup(self.now,execute=True)['accounts'],0)

    def test_duplicate_names_preserve_ambiguous_labels(self):
        target = self.user()
        self.user(email='same@example.test',active=True)
        other = self.submission(User.query.filter_by(email='owner@example.test').one().id,
                                created_at=datetime(2026,10,12),editing_by='Expired')
        cleanup(self.now,execute=True)
        self.assertEqual(db.session.get(InputData,other).editing_by,'Expired')
        self.assertIsNone(db.session.get(User,target))

    def test_all_statuses_boundary_null_future_and_owner_remains(self):
        owner = User.query.one().id
        for status in ('New','In editing','Completed'):
            self.submission(owner,status=status)
        kept = self.submission(owner,created_at=datetime(2026,4,12,12,0,0,1))
        future = self.submission(owner,created_at=datetime(2099,1,1))
        unknown = self.submission(owner)
        db.session.get(InputData,unknown).created_at = None
        db.session.commit()
        self.assertEqual(cleanup(self.now)['submissions'],3)
        self.assertEqual(cleanup(self.now,execute=True)['submissions'],3)
        self.assertEqual({e.id for e in InputData.query.all()},{kept,future,unknown})
        self.assertTrue(db.session.get(User,owner).active)

    def test_calendar_inverse_clamping_and_batched_idempotence(self):
        self.now = datetime(2026,2,28,12,tzinfo=timezone.utc)
        for i in range(3):
            self.user(email=f'clamp{i}@example.test',registered_at=datetime(2026,1,31,12))
        self.assertEqual(cleanup(self.now,execute=True,batch_size=1)['accounts'],3)
        self.assertEqual(cleanup(self.now,execute=True,batch_size=1)['accounts'],0)

    def test_atomic_rollback_and_safe_retry_logs_without_mail(self):
        uid = self.user()
        self.submission(uid)
        db.session.add(ConfirmationCode(email='expired@example.test',code='123456',type='registration'))
        db.session.commit()
        with patch.object(db.session,'commit',side_effect=RuntimeError('private email/SQL')):
            with self.assertRaises(RuntimeError):
                cleanup(self.now,execute=True)
        self.assertIsNotNone(db.session.get(User,uid))
        self.assertEqual(InputData.query.count(),1)
        self.assertEqual(ConfirmationCode.query.count(),1)
        with patch('maintenance.retention_cleanup.cleanup', side_effect=RuntimeError('private email/SQL')):
            with self.assertLogs(self.app.logger,level='ERROR') as logs:
                self.assertFalse(cleanup_once(self.app,execute=True))
            self.assertNotIn('private',str(logs.output))
        with patch('common_defenitions.mail.send') as mail:
            cleanup(self.now,execute=True)
            mail.assert_not_called()

    def test_public_catalog_untouched(self):
        with db.engines[None].begin() as c:
            c.execute(text('CREATE TABLE retention_public_probe (value TEXT)'))
            c.execute(text("INSERT INTO retention_public_probe VALUES ('scientific')"))
        self.user()
        cleanup(self.now,execute=True)
        with db.engines[None].connect() as c:
            self.assertEqual(c.execute(text('SELECT value FROM retention_public_probe')).scalar(),'scientific')

    def test_worker_immediate_hourly_stop_and_failure_retry(self):
        self.app.config['DATA_RETENTION_CLEANUP_INTERVAL_SECONDS']=3600
        stop=Event()
        waits=[]
        def wait(interval):
            waits.append(interval)
            if len(waits)==2:
                stop.set()
        with patch('maintenance.retention_cleanup.cleanup_once',return_value=False) as passing:
            with patch.object(stop,'wait',side_effect=wait):
                run_worker(self.app,stop)
        self.assertEqual(passing.call_count,2)
        self.assertEqual(waits,[3600,3600])


from inputData.inputDataModels import InputData


class RegistrationRetentionTests(TermsAcceptanceTests):
    def test_client_cannot_set_server_metadata(self):
        with patch('auth.authentication.send_auth_email') as mail:
            for field in ('registered_at','registration_completed'):
                self.assertEqual(self.register(self.payload(**{field:None})).status_code,400)
            mail.assert_not_called()
        self.assertIsNone(User.query.filter_by(email='new@example.test').first())

    def test_duplicate_resend_reset_preserve_original_age_and_all_activation_paths(self):
        with patch('auth.authentication.send_auth_email'):
            self.assertEqual(self.register().status_code,200)
            user=User.query.filter_by(email='new@example.test').one()
            original=utc(user.registered_at)
            self.assertFalse(user.registration_completed)
            self.assertEqual(self.register().status_code,200)
            client=self.app.test_client()
            body=dict(email=user.email,recaptcha_token='test-token')
            self.assertEqual(client.post('/users/resend-confirmation',json=body).status_code,200)
            code=ConfirmationCode.query.filter_by(email=user.email).first().code
            self.assertEqual(client.post('/users/confirm-registration',json={**body,'code':code}).status_code,200)
            db.session.refresh(user)
            self.assertTrue(user.registration_completed)
            self.assertTrue(User.deactivate_user(user.id))
            db.session.refresh(user)
            self.assertTrue(user.registration_completed)
            self.assertTrue(User.activate_user(user.email))
            self.assertTrue(User.deactivate_user(user.id))
            self.assertTrue(User.activate_user_by_id(user.id))
            self.assertEqual(client.post('/users/request-password-reset',json=body).status_code,200)
            db.session.refresh(user)
            self.assertEqual(utc(user.registered_at),original)
            self.assertTrue(user.registration_completed)


class PostgreSQLRetentionConcurrencyTests(RetentionTests):
    def setUp(self):
        if not os.environ.get('TEST_AUTH_DATABASE_URI','').startswith('postgresql'):
            self.skipTest('Real PostgreSQL required')
        super().setUp()

    def race(self, first, second):
        """First owns the common lock; prove second actually waits in PostgreSQL."""
        from concurrent.futures import ThreadPoolExecutor
        from auth.transaction_lock import lock_users_transaction
        locked=Event()
        started=Event()
        release=Event()
        engine=db.engines['users_db']
        db.session.remove()
        def leader():
            with self.app.app_context():
                lock_users_transaction()
                locked.set()
                self.assertTrue(release.wait(5))
                try:
                    return first()
                finally:
                    db.session.remove()
        def follower():
            with self.app.app_context():
                started.set()
                try:
                    return second()
                finally:
                    db.session.remove()
        with ThreadPoolExecutor(max_workers=2) as pool:
            left=pool.submit(leader)
            self.assertTrue(locked.wait(5))
            right=pool.submit(follower)
            self.assertTrue(started.wait(5))
            import time
            deadline=time.monotonic()+4
            waiting=False
            while time.monotonic()<deadline:
                with engine.connect() as c:
                    waiting=c.execute(text("SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event='advisory')")).scalar()
                if waiting:
                    break
                time.sleep(.02)
            release.set()
            self.assertTrue(waiting,'second transaction must contend for PostgreSQL lock')
            a,b=left.result(timeout=10),right.result(timeout=10)
        db.session.remove()
        return a,b

    def test_activation_wins_then_cleanup_excludes_or_cleanup_wins_then_activation_fails(self):
        uid=self.user()
        _,result=self.race(lambda:User.activate_user_by_id(uid),lambda:cleanup(self.now,execute=True))
        self.assertEqual(result['accounts'],0)
        self.assertTrue(db.session.get(User,uid).registration_completed)
        uid=self.user(email='loser@example.test')
        result,activated=self.race(lambda:cleanup(self.now,execute=True),lambda:User.activate_user_by_id(uid))
        self.assertEqual(result['accounts'],1)
        self.assertFalse(activated)
        self.assertIsNone(ConfirmationCode.create_code('loser@example.test','registration'))
        db.session.rollback()

    def test_two_cleanup_workers_do_not_double_delete(self):
        self.user()
        a,b=self.race(lambda:cleanup(self.now,execute=True),lambda:cleanup(self.now,execute=True))
        self.assertEqual(a['accounts']+b['accounts'],1)

    def test_submission_and_completion_cannot_restore_deleted_rows(self):
        owner=User.query.one().id
        entry=self.submission(owner)
        result,status=self.race(lambda:cleanup(self.now,execute=True),
                               lambda:InputData.set_status(entry,'Completed','Owner'))
        self.assertEqual(result['submissions'],1)
        self.assertTrue(status is None or status['status']=='Completed')
        self.assertIsNone(db.session.get(InputData,entry))
        # Reverse ordering: completing first never resets age; retention deletes it.
        entry=self.submission(owner)
        status,result=self.race(lambda:InputData.set_status(entry,'Completed','Owner'),
                               lambda:cleanup(self.now,execute=True))
        self.assertIsNotNone(status)
        self.assertEqual(result['submissions'],1)
        self.assertIsNone(db.session.get(InputData,entry))
        # Fresh submission remains, whereas old expired submissions are removed.
        saved,result=self.race(lambda:InputData.save_submission(owner,{}),lambda:cleanup(self.now,execute=True))
        self.assertIsNotNone(saved)
        self.assertEqual(result['submissions'],0)

    def test_self_delete_and_cleanup_share_order(self):
        from maintenance.retention import delete_account_data
        from auth.transaction_lock import lock_users_transaction
        uid=User.query.one().id
        self.submission(uid)
        def delete():
            lock_users_transaction()
            user=User.query.filter_by(id=uid).populate_existing().with_for_update().first()
            delete_account_data(user)
            db.session.commit()
        _,counts=self.race(delete,lambda:cleanup(self.now,execute=True))
        self.assertEqual(counts['submissions'],0)
        self.assertIsNone(db.session.get(User,uid))

    def test_duplicate_registration_then_cleanup_and_new_registration_after_cleanup(self):
        # HTTP fixture, real register flow, no mail; existing registration keeps its age.
        from auth.authentication import auth_bp
        from common_defenitions import limiter
        from auth.terms import CURRENT_TERMS_VERSION
        self.app.config.update(RATELIMIT_ENABLED=False,AUTH_REGISTRATION_RATE_LIMIT='100 per minute',
            RECAPTCHA_ENABLED=True,RECAPTCHA_SECRET_KEY='test')
        limiter.init_app(self.app)
        self.app.register_blueprint(auth_bp)
        self.user(email='racer@example.test')
        payload=dict(name='Racer',email='racer@example.test',password='Password1!',
            recaptcha_token='test-token',adult_confirmed=True,terms_accepted=True,terms_version=CURRENT_TERMS_VERSION)
        def register():
            return self.app.test_client().post('/users/',json=payload).status_code
        with patch('auth.authentication.send_auth_email'):
            status,result=self.race(register,lambda:cleanup(self.now,execute=True))
            self.assertEqual(status,200)
            self.assertEqual(result['accounts'],1)
            self.user(email='racer@example.test')
            result,status=self.race(lambda:cleanup(self.now,execute=True),register)
            self.assertEqual(result['accounts'],1)
            self.assertEqual(status,200)
        self.assertFalse(User.query.filter_by(email='racer@example.test').one().registration_completed)


class PostgreSQLRetentionProcessTests(RetentionTests):
    def setUp(self):
        if not os.environ.get('TEST_AUTH_DATABASE_URI','').startswith('postgresql'):
            self.skipTest('Real PostgreSQL required')
        super().setUp()

    def test_cli_default_dryrun_execute_repeat_and_missing_schema(self):
        import subprocess
        import sys
        engine=db.engines['users_db']
        url=engine.url
        env={**os.environ, 'DB_ENGINE':'postgres','DB_USER':url.username,
             'DB_PASSWORD':url.password,'DB_HOST':url.host,'DB_PORT':str(url.port or 5432),
             'USERS_DB_NAME':url.database}
        uid=self.user(registered_at=datetime(2020,1,1))
        db.session.remove()
        def cli(*args):
            return subprocess.run([sys.executable,'-m','maintenance.retention_cleanup',*args],
                env=env,capture_output=True,text=True,timeout=40)
        dry=cli('--once')
        self.assertEqual(dry.returncode,0,dry.stderr)
        self.assertIn('dry-run: accounts=1',dry.stderr)
        self.assertIsNotNone(db.session.get(User,uid))
        db.session.remove()
        with engine.begin() as c:
            c.execute(text('ALTER TABLE users RENAME COLUMN registered_at TO temporarily_missing'))
        try:
            missing=cli('--once','--execute')
            self.assertEqual(missing.returncode,1)
            self.assertIn('apply migration',missing.stderr)
        finally:
            with engine.begin() as c:
                c.execute(text('ALTER TABLE users RENAME COLUMN temporarily_missing TO registered_at'))
        self.assertIsNotNone(db.session.get(User,uid))
        db.session.remove()
        executed=cli('--once','--execute')
        self.assertEqual(executed.returncode,0,executed.stderr)
        self.assertIn('execute: accounts=1',executed.stderr)
        self.assertIsNone(db.session.get(User,uid))
        db.session.remove()
        repeated=cli('--once','--execute')
        self.assertEqual(repeated.returncode,0,repeated.stderr)
        self.assertIn('execute: accounts=0',repeated.stderr)
        for result in (dry,missing,executed,repeated):
            for private in ('expired@example.test','Expired','Password1!',url.password):
                self.assertNotIn(private,result.stdout+result.stderr)

    def test_separate_process_immediate_periodic_sigterm_and_sigint(self):
        import multiprocessing
        import signal
        import time
        from maintenance.retention_cleanup import run_until_stopped
        for stop_signal in (signal.SIGTERM,signal.SIGINT):
            self.now=datetime.now(timezone.utc)
            old=User.query.filter_by(email='process@example.test').first()
            if old:
                db.session.delete(old)
                db.session.commit()
            self.user(email='process@example.test',registered_at=add_months(self.now,-1)-timedelta(days=3))
            self.app.config['DATA_RETENTION_CLEANUP_INTERVAL_SECONDS']=1
            db.session.remove()
            def worker():
                with self.app.app_context():
                    for engine in db.engines.values():
                        engine.dispose(close=False)
                run_until_stopped(self.app)
            process=multiprocessing.get_context('fork').Process(target=worker)
            process.start()
            def wait_deleted():
                deadline=time.monotonic()+5
                while time.monotonic()<deadline:
                    db.session.remove()
                    if User.query.filter_by(email='process@example.test').count()==0:
                        return
                    time.sleep(.05)
                self.fail('worker did not delete synthetic expired registration')
            try:
                wait_deleted()
                self.user(email='process@example.test',registered_at=add_months(self.now,-1)-timedelta(days=3))
                wait_deleted()
                os.kill(process.pid,stop_signal)
                process.join(timeout=5)
                self.assertEqual(process.exitcode,0)
            finally:
                if process.is_alive():
                    process.kill()
                    process.join(timeout=5)
