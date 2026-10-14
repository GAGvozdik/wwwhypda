"""Проверки принятия договора на изолированных БД, без SMTP и CAPTCHA-сети."""
import os
import unittest
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from threading import Barrier
from unittest.mock import patch

from flask import jsonify
from common_defenitions import db
from auth.auth_models import User, ConfirmationCode
from auth.terms import CURRENT_TERMS_VERSION
try:
    from tests import test_auth_lifecycle as lifecycle
except ImportError:
    import test_auth_lifecycle as lifecycle


class TermsAcceptanceTests(unittest.TestCase):
    setUp = lifecycle.AccountDeletionTests.setUp
    tearDown = lifecycle.AuthLifecycleTests.tearDown
    code = lifecycle.AuthLifecycleTests.code
    client_for = lifecycle.AccountDeletionTests.client_for
    delete = lifecycle.AccountDeletionTests.delete

    def payload(self, **changes):
        body = dict(name="New User", email="new@example.test", password="Password1!",
            recaptcha_token="test-token", adult_confirmed=True, terms_accepted=True,
            terms_version=CURRENT_TERMS_VERSION)
        body.update(changes)
        return body

    def register(self, body=None):
        return self.app.test_client().post("/users/", json=self.payload() if body is None else body)

    def test_new_account_server_time_and_mail_after_commit(self):
        before = datetime.now(timezone.utc)
        def delivery(*args):
            self.assertEqual(User.query.filter_by(email="new@example.test").count(), 1)
            self.assertEqual(ConfirmationCode.query.filter_by(email="new@example.test").count(), 1)
        with patch("auth.authentication.send_auth_email", side_effect=delivery) as mail:
            self.assertEqual(self.register().status_code, 200)
        after = datetime.now(timezone.utc)
        user = User.query.filter_by(email="new@example.test").one()
        self.assertEqual(user.terms_version, CURRENT_TERMS_VERSION)
        instant = user.terms_accepted_at
        if instant.tzinfo is None:  # SQLite не сохраняет tzinfo.
            instant = instant.replace(tzinfo=timezone.utc)
        self.assertLessEqual(before, instant)
        self.assertLessEqual(instant, after)
        mail.assert_called_once()

    def test_missing_consent_age_version_and_client_time_leave_no_records(self):
        cases = []
        for field in ("terms_accepted", "adult_confirmed"):
            for value in (None, False, "true", 1):
                cases.append((self.payload(**{field: value}), 400, None))
            body = self.payload()
            del body[field]
            cases.append((body, 400, None))
        for value in (None, "", 12, [], {}):
            cases.append((self.payload(terms_version=value), 400, "terms_version_required"))
        body = self.payload()
        del body["terms_version"]
        cases.append((body, 400, "terms_version_required"))
        for value in ("2020-01-01.1", "2099-01-01.1", " "+CURRENT_TERMS_VERSION,
                      CURRENT_TERMS_VERSION+" ", "CURRENT", CURRENT_TERMS_VERSION.replace(".", "/")):
            cases.append((self.payload(terms_version=value), 409, "terms_version_mismatch"))
        cases.append((self.payload(terms_accepted_at=None), 400, None))
        cases.append((self.payload(terms_accepted_at="2026-10-14T00:00:00Z"), 400, None))
        baseline = (User.query.count(), ConfirmationCode.query.count())
        with patch("auth.authentication.send_auth_email") as mail:
            for body, status, code in cases:
                for email in ("new@example.test", "owner@example.test"):
                    body["email"] = email
                    with self.subTest(body=body):
                        response = self.register(body)
                        self.assertEqual(response.status_code, status)
                        if code:
                            self.assertEqual(response.json["code"], code)
                        self.assertEqual((User.query.count(), ConfirmationCode.query.count()), baseline)
            mail.assert_not_called()

    def test_invalid_fields_and_captcha_never_record_acceptance(self):
        with patch("auth.authentication.send_auth_email") as mail:
            for changes in ({"name":"!"}, {"email":"invalid"}, {"password":"short"}):
                self.assertEqual(self.register(self.payload(**changes)).status_code, 400)
            with patch("auth.authentication.verify_recaptcha", return_value=(False, (jsonify(message="Verification failed"),400))):
                self.assertEqual(self.register().status_code, 400)
            with patch("auth.authentication.verify_recaptcha", side_effect=RuntimeError("private")):
                self.assertEqual(self.register().status_code, 500)
            self.assertEqual(User.query.count(), 2)
            self.assertIsNone(User.query.filter_by(email="new@example.test").first())
            mail.assert_not_called()

    def test_failure_code_flush_commit_rolls_back_and_mail_failure_keeps_acceptance(self):
        for target in ("code", "flush", "commit"):
            with self.subTest(target=target):
                mock = patch("auth.authentication.ConfirmationCode.create_code", side_effect=RuntimeError("private")) if target == "code" else patch.object(db.session, target, side_effect=RuntimeError("private"))
                before_codes = ConfirmationCode.query.count()
                with mock, patch("auth.authentication.send_auth_email") as mail:
                    self.assertEqual(self.register().status_code, 500)
                    mail.assert_not_called()
                self.assertIsNone(User.query.filter_by(email="new@example.test").first())
                self.assertEqual(ConfirmationCode.query.count(), before_codes)
        with patch("auth.authentication.send_auth_email", side_effect=RuntimeError("private")):
            self.assertEqual(self.register().status_code, 200)
        self.assertEqual(User.query.filter_by(email="new@example.test").one().terms_version, CURRENT_TERMS_VERSION)
        self.assertEqual(ConfirmationCode.query.filter_by(email="new@example.test").count(), 1)

    def test_existing_accounts_keep_null_or_original_acceptance(self):
        for active in (True, False):
            for accepted in (True, False):
                with self.subTest(active=active, accepted=accepted):
                    user = User.query.filter_by(email="owner@example.test").one()
                    user.active = active
                    user.terms_version = "old-edition" if accepted else None
                    user.terms_accepted_at = datetime(2020,1,1,tzinfo=timezone.utc) if accepted else None
                    db.session.commit()
                    original = (user.terms_version, user.terms_accepted_at, user.password)
                    with patch("auth.authentication.send_auth_email") as mail:
                        response = self.register(self.payload(email=user.email))
                        self.assertEqual(response.status_code, 200)
                        mail.assert_not_called()
                    db.session.expire_all()
                    user = User.query.filter_by(email="owner@example.test").one()
                    self.assertEqual((user.terms_version,user.terms_accepted_at,user.password), original)
                    self.assertNotIn(user.email, str(response.json))

    def test_delete_denials_and_commit_failure_preserve_acceptance_then_owner_deletes(self):
        user = db.session.get(User, self.owner_id)
        user.terms_version = CURRENT_TERMS_VERSION
        user.terms_accepted_at = datetime.now(timezone.utc)
        other = db.session.get(User, self.other_id)
        other.terms_version = "other-edition"
        other.terms_accepted_at = datetime.now(timezone.utc)
        db.session.commit()
        before = (user.terms_version, user.terms_accepted_at)
        client, headers, _ = self.client_for()
        self.assertEqual(self.delete(self.app.test_client(), headers).status_code,401)
        self.assertEqual(self.delete(client, {}).status_code,401)
        self.assertEqual(self.delete(client, headers, password="wrong").status_code,403)
        self.assertEqual(self.delete(client, headers, recaptcha_token=None).status_code,400)
        self.assertEqual(self.delete(client, headers, user_id=self.other_id).status_code,400)
        with patch.object(db.session,"commit",side_effect=RuntimeError("private")):
            self.assertEqual(self.delete(client, headers).status_code,500)
        db.session.expire_all()
        self.assertEqual((user.terms_version,user.terms_accepted_at),before)
        self.assertEqual(self.delete(client, headers).status_code,200)
        self.assertIsNone(db.session.get(User,self.owner_id))
        self.assertEqual(db.session.get(User,self.other_id).terms_version,"other-edition")

    def test_auth_actions_keep_acceptance(self):
        client = self.app.test_client()
        with patch("auth.authentication.send_auth_email"):
            self.assertEqual(client.post("/users/",json=self.payload()).status_code,200)
            user = User.query.filter_by(email="new@example.test").one()
            original = (user.terms_version,user.terms_accepted_at)
            body = dict(email=user.email,recaptcha_token="test-token")
            self.assertEqual(client.post("/users/resend-confirmation",json=body).status_code,200)
            code = ConfirmationCode.query.filter_by(email=user.email,type="registration").order_by(ConfirmationCode.id.desc()).first().code
            self.assertEqual(client.post("/users/confirm-registration",json={**body,"code":code}).status_code,200)
            self.assertEqual(client.post("/users/login",json={**body,"password":"Password1!"}).status_code,200)
            self.assertEqual(client.post("/users/request-password-reset",json=body).status_code,200)
            code = ConfirmationCode.query.filter_by(email=user.email,type="password_reset").one().code
            self.assertEqual(client.post("/users/confirm-password-reset",json={**body,"code":code,"new_password":"OtherPass2!"}).status_code,200)
            db.session.expire_all()
            self.assertEqual((user.terms_version,user.terms_accepted_at),original)

    def test_concurrent_registration_preserves_first_acceptance(self):
        if db.engines["users_db"].dialect.name != "postgresql":
            self.skipTest("Нужен PostgreSQL для конкурентной регистрации")
        from sqlalchemy import event
        barrier = Barrier(2)
        engine = db.engines["users_db"]
        def before_insert(conn, cursor, statement, parameters, context, executemany):
            if statement == "SELECT pg_advisory_xact_lock(207002, 1)" and not conn.info.get("retention_test_synchronized"):
                conn.info["retention_test_synchronized"] = True
                barrier.wait(timeout=10)
        event.listen(engine,"before_cursor_execute",before_insert)
        def register(name):
            with self.app.app_context():
                return self.register(self.payload(name=name)).status_code
        try:
            with patch("auth.authentication.send_auth_email") as mail, ThreadPoolExecutor(max_workers=2) as pool:
                results = list(pool.map(register,["First", "Second"]))
                self.assertEqual(results,[200,200])
                mail.assert_called_once()
        finally:
            event.remove(engine,"before_cursor_execute",before_insert)
        db.session.remove()
        users = User.query.filter_by(email="new@example.test").all()
        self.assertEqual(len(users),1)
        self.assertEqual(users[0].terms_version,CURRENT_TERMS_VERSION)
        self.assertIsNotNone(users[0].terms_accepted_at)
        self.assertEqual(ConfirmationCode.query.filter_by(email="new@example.test").count(),2)
