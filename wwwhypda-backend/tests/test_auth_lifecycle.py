"""Проверки на изолированных БД без env, SMTP, CAPTCHA-сети и пользовательских данных."""
import unittest
import os
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from flask import Flask
from common_defenitions import db
from auth.auth_models import User, ConfirmationCode
from auth.terms import CURRENT_TERMS_VERSION
from auth.code_cleanup import cleanup_once, run_worker
from inputData.inputDataModels import InputData


class AuthLifecycleTests(unittest.TestCase):
    def setUp(self):
        self.app = Flask(__name__)
        self.app.config.update(
            TESTING=True, SQLALCHEMY_DATABASE_URI="sqlite://",
            SQLALCHEMY_BINDS={"users_db": os.environ.get("TEST_AUTH_DATABASE_URI", "sqlite://")},
            CONFIRMATION_CODE_TTL_SECONDS=120, PASSWORD_RESET_CODE_TTL_SECONDS=120,
            AUTH_CODE_CLEANUP_INTERVAL_SECONDS=60,
        )
        db.init_app(self.app)
        self.context = self.app.app_context()
        self.context.push()
        db.create_all()
        self.now = datetime(2026, 10, 12, 12, 0, tzinfo=timezone.utc)
        user = User(name="Owner", email="owner@example.test", active=True,
            terms_version=CURRENT_TERMS_VERSION, terms_accepted_at=datetime.now(timezone.utc))
        user.set_password("Password1!")
        db.session.add(user)
        db.session.commit()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.context.pop()

    def code(self, age, kind="registration", email="owner@example.test"):
        record = ConfirmationCode(email=email, code="123456", type=kind,
            created_at=(self.now - timedelta(seconds=age)).replace(tzinfo=None))
        db.session.add(record)
        db.session.commit()
        return record

    def test_boundary_and_both_code_types(self):
        for kind in ("registration", "password_reset"):
            user=User.query.filter_by(email='owner@example.test').one()
            user.active=kind!='registration';user.registration_completed=kind!='registration'
            db.session.commit()
            record = self.code(119, kind)
            with patch("auth.auth_models.datetime") as clock:
                clock.now.return_value = self.now
                self.assertTrue(ConfirmationCode.verify_code(record.email, record.code, kind))
                clock.now.return_value = self.now + timedelta(seconds=1)
                self.assertFalse(ConfirmationCode.verify_code(record.email, record.code, kind))
            ConfirmationCode.delete_code(record.email, record.code, kind)
            self.assertEqual(ConfirmationCode.query.count(), 0)

    def test_cleanup_keeps_valid_codes_and_accounts(self):
        self.code(120)
        self.code(121, "password_reset")
        self.code(119, email="valid@example.test")
        self.code(1, "unknown")
        bad = self.code(1, email="empty@example.test")
        bad.created_at = None
        db.session.commit()
        self.assertEqual(ConfirmationCode.cleanup_expired(self.now), 4)
        self.assertEqual(ConfirmationCode.cleanup_expired(self.now), 0)
        self.assertEqual(ConfirmationCode.query.one().email, "valid@example.test")
        self.assertEqual(User.query.count(), 1)

    def test_each_code_type_uses_its_own_setting(self):
        self.app.config["CONFIRMATION_CODE_TTL_SECONDS"] = 60
        self.app.config["PASSWORD_RESET_CODE_TTL_SECONDS"] = 180
        registration = self.code(120)
        reset = self.code(120, "password_reset")
        with patch("auth.auth_models.datetime") as clock:
            clock.now.return_value = self.now
            self.assertFalse(ConfirmationCode.verify_code(registration.email, registration.code, "registration"))
            self.assertTrue(ConfirmationCode.verify_code(reset.email, reset.code, "password_reset"))
        self.assertEqual(ConfirmationCode.cleanup_expired(self.now), 1)
        self.assertEqual(ConfirmationCode.query.one().type, "password_reset")

    def test_cleanup_rollback(self):
        self.code(120)
        with patch.object(db.session, "commit", side_effect=RuntimeError("test failure")):
            with self.assertRaises(RuntimeError):
                ConfirmationCode.cleanup_expired(self.now)
        self.assertEqual(ConfirmationCode.query.count(), 1)

    def test_worker_immediate_pass_interval_and_stop(self):
        from threading import Event
        stop = Event()
        waits = []
        def wait(interval):
            waits.append(interval)
            stop.set()
        with patch("auth.code_cleanup.cleanup_once", return_value=False) as cleanup:
            with patch.object(stop, "wait", side_effect=wait):
                run_worker(self.app, stop)
        cleanup.assert_called_once_with(self.app)
        self.assertEqual(waits, [60])

    def test_worker_failure_does_not_expose_error_or_stop_retries(self):
        with patch("auth.code_cleanup.ConfirmationCode.cleanup_expired", side_effect=RuntimeError("sensitive")):
            with self.assertLogs(self.app.logger, level="ERROR") as logs:
                self.assertFalse(cleanup_once(self.app))
        self.assertNotIn("sensitive", " ".join(logs.output))


class AccountDeletionTests(unittest.TestCase):
    tearDown = AuthLifecycleTests.tearDown
    code = AuthLifecycleTests.code
    def setUp(self):
        AuthLifecycleTests.setUp(self)
        from flask_jwt_extended import JWTManager
        from auth.session_security import configure_session_security
        from auth.authentication import auth_bp
        from auth.admin.admin import admin_bp
        from inputData.inputData import input_bp
        from common_defenitions import limiter
        self.app.config.update(
            JWT_SECRET_KEY="isolated-test-signing-key-at-least-32-bytes",
            JWT_TOKEN_LOCATION=["cookies"], JWT_COOKIE_CSRF_PROTECT=True,
            JWT_COOKIE_SECURE=False, JWT_REFRESH_COOKIE_PATH="/users/refresh",
            RECAPTCHA_ENABLED=True, RECAPTCHA_SECRET_KEY="test-secret",
            RATELIMIT_ENABLED=False, AUTH_PASSWORD_RESET_RATE_LIMIT="100 per minute",
            AUTH_LOGIN_RATE_LIMIT="100 per minute", AUTH_CONFIRMATION_RATE_LIMIT="100 per minute",
            AUTH_REGISTRATION_RATE_LIMIT="100 per minute", AUTH_RESEND_RATE_LIMIT="100 per minute",
            ACCESS_EXPIRES_SECONDS=120, REFRESH_EXPIRES_SECONDS=300,
        )
        configure_session_security(JWTManager(self.app))
        limiter.init_app(self.app)
        self.app.register_blueprint(auth_bp)
        self.app.register_blueprint(admin_bp)
        self.app.register_blueprint(input_bp)
        self.owner_id = User.query.one().id
        other = User(name="Other", email="other@example.test", active=True,
            terms_version=CURRENT_TERMS_VERSION, terms_accepted_at=datetime.now(timezone.utc))
        other.set_password("Password1!")
        db.session.add(other)
        db.session.flush()
        self.other_id = other.id
        for uid in (self.owner_id, self.other_id):
            for status in ("New", "In editing", "Completed"):
                db.session.add(InputData(user_id=uid, name="Owner" if uid == self.owner_id else "Other",
                    status=status, editing_by="Owner", general_info=[], measurements=[],
                    samples=[], site_info=[], source_info=[]))
        db.session.commit()
        self.code(1)
        self.code(1, "password_reset")
        self.code(1, email="other@example.test")

    def client_for(self, uid=None, claims=None):
        from flask_jwt_extended import create_access_token, create_refresh_token, get_csrf_token
        uid = self.owner_id if uid is None else uid
        version = db.session.get(User, uid).session_version()
        from auth.sessions import issue
        sid = issue(db.session.get(User, uid), 300)
        db.session.commit()
        access = create_access_token(identity=str(uid), additional_claims={"account_version": version, "sid": sid, **(claims or {})})
        refresh = create_refresh_token(identity=str(uid), additional_claims={"account_version": version, "sid": sid})
        client = self.app.test_client()
        client.set_cookie("access_token_cookie", access)
        client.set_cookie("refresh_token_cookie", refresh, path="/users/refresh")
        return client, {"X-CSRF-TOKEN": get_csrf_token(access)}, {"X-CSRF-TOKEN": get_csrf_token(refresh)}

    def delete(self, client, headers, **changes):
        data = {"password": "Password1!", "recaptcha_token": "test-token"}
        data.update(changes)
        return client.delete("/users/me", headers=headers, json=data)

    def test_password_csrf_captcha_identity_and_unauthenticated_denials(self):
        client, headers, _ = self.client_for()
        self.assertEqual(self.delete(self.app.test_client(), headers).status_code, 401)
        self.assertEqual(self.delete(client, {}).status_code, 401)
        self.assertEqual(self.delete(client, headers, password="wrong").status_code, 403)
        self.assertEqual(self.delete(client, headers, user_id=self.other_id).status_code, 400)
        self.assertEqual(User.query.count(), 2)
        self.assertEqual(InputData.query.count(), 6)
        self.assertEqual(ConfirmationCode.query.count(), 3)

    def test_delete_all_owned_data_and_revoke_both_browser_tokens(self):
        client, headers, _ = self.client_for()
        old_client, old_headers, refresh_headers = self.client_for()
        response = self.delete(client, headers)
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(client.get_cookie("access_token_cookie"))
        self.assertEqual(User.query.count(), 1)
        self.assertEqual(InputData.query.filter_by(user_id=self.owner_id).count(), 0)
        self.assertEqual(InputData.query.filter_by(user_id=self.other_id).count(), 3)
        self.assertEqual(InputData.query.filter(InputData.editing_by.isnot(None)).count(), 0)
        self.assertEqual(ConfirmationCode.query.count(), 1)
        for endpoint in ("/users/check", "/users/", "/users/super_check", "/input/my_submissions", "/admin/get_all_users"):
            self.assertEqual(old_client.get(endpoint).status_code, 401)
        self.assertEqual(old_client.post("/users/refresh", headers=refresh_headers).status_code, 401)
        self.assertEqual(self.delete(old_client, old_headers).status_code, 401)
        self.assertIsNone(InputData.save_submission(self.owner_id, {}))
        self.assertIsNone(ConfirmationCode.create_code("owner@example.test", "password_reset"))

    def test_superuser_deletes_only_self_and_roles_come_from_database(self):
        owner = db.session.get(User, self.owner_id)
        owner.is_superuser = True
        db.session.commit()
        client, headers, _ = self.client_for(claims={"is_superuser": False})
        self.assertTrue(client.get("/users/check", headers={"X-Recaptcha-Token": "test-token"}).json["is_superuser"])
        self.assertEqual(self.delete(client, headers).status_code, 200)
        ordinary, _, _ = self.client_for(self.other_id, {"is_superuser": True})
        self.assertEqual(ordinary.get("/admin/get_all_users").status_code, 403)
        self.assertEqual(ordinary.get("/input/get_input_suggestions").status_code, 403)

    def test_duplicate_names_do_not_erase_another_reviewers_label(self):
        other = db.session.get(User, self.other_id)
        other.name = "Owner"
        db.session.commit()
        client, headers, _ = self.client_for()
        self.assertEqual(self.delete(client, headers).status_code, 200)
        self.assertEqual(InputData.query.filter_by(user_id=self.other_id, editing_by="Owner").count(), 3)

    def test_reused_id_does_not_revive_old_tokens(self):
        client, headers, _ = self.client_for()
        old, _, refresh_headers = self.client_for()
        self.assertEqual(self.delete(client, headers).status_code, 200)
        replacement = User(id=self.owner_id, name="Replacement", email="replacement@example.test", active=True)
        replacement.set_password("Password1!")
        db.session.add(replacement)
        db.session.commit()
        self.assertEqual(old.get("/users/check").status_code, 401)
        self.assertEqual(old.post("/users/refresh", headers=refresh_headers).status_code, 401)

    def test_transaction_failure_rolls_back_everything(self):
        client, headers, _ = self.client_for()
        with patch.object(db.session, "commit", side_effect=RuntimeError("sensitive")):
            self.assertEqual(self.delete(client, headers).status_code, 500)
        self.assertEqual(User.query.count(), 2)
        self.assertEqual(InputData.query.count(), 6)
        self.assertEqual(ConfirmationCode.query.count(), 3)


class AuthenticationFlowTests(unittest.TestCase):
    setUp = AccountDeletionTests.setUp
    tearDown = AuthLifecycleTests.tearDown
    code = AuthLifecycleTests.code
    def test_login_check_refresh_logout(self):
        client = self.app.test_client()
        login = client.post("/users/login", json={"email": "owner@example.test", "password": "Password1!", "recaptcha_token": "test-token"})
        self.assertEqual(login.status_code, 200)
        self.assertEqual(client.get("/users/check", headers={"X-Recaptcha-Token": "test-token"}).status_code, 200)
        csrf = client.get_cookie("csrf_refresh_token").value
        self.assertEqual(client.post("/users/refresh", headers={"X-CSRF-TOKEN": csrf}).status_code, 200)
        self.assertEqual(client.post("/users/refresh/logout", headers={"X-CSRF-TOKEN": csrf}).status_code, 200)
        self.assertEqual(client.get("/users/check").status_code, 401)

    def test_registration_and_reset_use_and_expiry(self):
        client = self.app.test_client()
        with patch("auth.authentication.send_auth_email"):
            response = client.post("/users/", json={"email": "new@example.test", "name": "New User", "password": "New-registry_pass-42", "recaptcha_token": "test-token", "adult_confirmed": True, "terms_accepted": True, "terms_version": CURRENT_TERMS_VERSION})
        self.assertEqual(response.status_code, 200)
        code = ConfirmationCode.query.filter_by(email="new@example.test", type="registration").one().code
        self.assertEqual(client.post("/users/confirm-registration", json={"email": "new@example.test", "code": code, "recaptcha_token": "test-token"}).status_code, 200)
        self.assertEqual(ConfirmationCode.query.filter_by(email="new@example.test").count(), 0)
        with patch("auth.authentication.send_auth_email"):
            self.assertEqual(client.post("/users/request-password-reset", json={"email": "new@example.test", "recaptcha_token": "test-token"}).status_code, 200)
        record = ConfirmationCode.query.filter_by(email="new@example.test").one()
        code = record.code
        record.created_at = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(seconds=120)
        db.session.commit()
        body = {"email": "new@example.test", "code": code, "new_password": "Other-new_pass-42", "recaptcha_token": "test-token"}
        self.assertEqual(client.post("/users/confirm-password-reset", json=body).status_code, 401)
        record = ConfirmationCode.query.filter_by(email="new@example.test").one()
        record.created_at = datetime.now(timezone.utc).replace(tzinfo=None)
        db.session.commit()
        self.assertEqual(client.post("/users/confirm-password-reset", json=body).status_code, 200)
        self.assertEqual(ConfirmationCode.query.filter_by(email="new@example.test").count(), 0)
        self.assertTrue(User.query.filter_by(email="new@example.test").one().check_password("Other-new_pass-42"))


class PostgreSQLConcurrencyTests(unittest.TestCase):
    tearDown = AuthLifecycleTests.tearDown
    code = AuthLifecycleTests.code
    client_for = AccountDeletionTests.client_for
    delete = AccountDeletionTests.delete
    def setUp(self):
        if not os.environ.get("TEST_AUTH_DATABASE_URI", "").startswith("postgresql"):
            self.skipTest("PostgreSQL required for real row locks")
        AccountDeletionTests.setUp(self)

    def test_submission_commits_before_deletion_and_is_then_removed(self):
        from concurrent.futures import ThreadPoolExecutor
        from threading import Event
        locked = Event()
        release = Event()
        client, headers, _ = self.client_for()
        def submit():
            with self.app.app_context():
                User.query.filter_by(id=self.owner_id).with_for_update().one()
                locked.set()
                self.assertTrue(release.wait(5))
                return InputData.save_submission(self.owner_id, {})
        def delete():
            return self.delete(client, headers).status_code
        with ThreadPoolExecutor(max_workers=2) as pool:
            submission = pool.submit(submit)
            self.assertTrue(locked.wait(5))
            deletion = pool.submit(delete)
            release.set()
            self.assertIsNotNone(submission.result(timeout=10))
            self.assertEqual(deletion.result(timeout=10), 200)
        db.session.remove()
        self.assertEqual(InputData.query.filter_by(user_id=self.owner_id).count(), 0)

    def test_deleted_account_cannot_create_data_after_waiting_on_lock(self):
        from concurrent.futures import ThreadPoolExecutor
        from threading import Event
        locked = Event()
        release = Event()
        def delete():
            with self.app.app_context():
                user = User.query.filter_by(id=self.owner_id).with_for_update().one()
                locked.set()
                self.assertTrue(release.wait(5))
                InputData.query.filter_by(user_id=user.id).delete()
                ConfirmationCode.query.filter_by(email=user.email).delete()
                db.session.delete(user)
                db.session.commit()
        def submit():
            with self.app.app_context():
                return InputData.save_submission(self.owner_id, {})
        with ThreadPoolExecutor(max_workers=2) as pool:
            deletion = pool.submit(delete)
            self.assertTrue(locked.wait(5))
            submission = pool.submit(submit)
            release.set()
            deletion.result(timeout=10)
            self.assertIsNone(submission.result(timeout=10))
        db.session.remove()
        self.assertEqual(InputData.query.filter_by(user_id=self.owner_id).count(), 0)


class PostgreSQLWorkerProcessTests(unittest.TestCase):
    code = AuthLifecycleTests.code
    tearDown = AuthLifecycleTests.tearDown

    def setUp(self):
        if not os.environ.get("TEST_AUTH_DATABASE_URI", "").startswith("postgresql"):
            self.skipTest("PostgreSQL required for process test")
        AuthLifecycleTests.setUp(self)

    def test_periodic_deletion_without_http_and_clean_sigterm(self):
        import multiprocessing
        import signal
        import time
        from auth.code_cleanup import run_until_stopped
        self.now = datetime.now(timezone.utc)
        self.code(120)
        self.code(119, "password_reset")
        self.app.config["AUTH_CODE_CLEANUP_INTERVAL_SECONDS"] = 2
        def worker():
            with self.app.app_context():
                for engine in db.engines.values():
                    engine.dispose(close=False)
            run_until_stopped(self.app)
        process = multiprocessing.get_context("fork").Process(target=worker)
        process.start()
        try:
            deadline = time.monotonic() + 5
            observed_first_pass = False
            while time.monotonic() < deadline:
                db.session.remove()
                count = ConfirmationCode.query.count()
                if count == 1:
                    observed_first_pass = True
                if observed_first_pass and count == 0:
                    break
                time.sleep(0.1)
            self.assertTrue(observed_first_pass)
            self.assertEqual(count, 0)
            os.kill(process.pid, signal.SIGTERM)
            process.join(timeout=5)
            self.assertEqual(process.exitcode, 0)
        finally:
            if process.is_alive():
                process.kill()
                process.join(timeout=5)


if __name__ == "__main__":
    unittest.main()
