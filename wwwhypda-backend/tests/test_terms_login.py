"""Isolated SQLite/PostgreSQL terms reacceptance, gates and real lock regressions."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from threading import Barrier, Event
import unittest
from unittest.mock import patch

from flask_jwt_extended import create_access_token
from common_defenitions import db
from auth.auth_models import User, UserAgreementAcceptance
from auth import terms
from auth.transaction_lock import lock_users_transaction
from maintenance.retention import delete_account_data, cleanup
from tests import test_auth_lifecycle as fixtures

CURRENT = terms.CURRENT_TERMS_VERSION


class TermsLoginTests(unittest.TestCase):
    tearDown = fixtures.AuthLifecycleTests.tearDown
    code = fixtures.AuthLifecycleTests.code
    client_for = fixtures.AccountDeletionTests.client_for
    delete = fixtures.AccountDeletionTests.delete

    def setUp(self):
        fixtures.AccountDeletionTests.setUp(self)
        self.original_time = datetime(2020,1,1,tzinfo=timezone.utc)
        user = db.session.get(User,self.owner_id)
        user.terms_version = "legacy-original"
        user.terms_accepted_at = self.original_time
        db.session.commit()

    def body(self, **changes):
        body = dict(email="owner@example.test", password="Password1!", recaptcha_token="test-token")
        body.update(changes)
        return body

    def login(self, **changes):
        return self.app.test_client().post("/users/login",json=self.body(**changes))

    def accept(self, **changes):
        return self.login(terms_accepted=True, terms_version=CURRENT, **changes)

    def test_old_and_null_require_review_without_tokens_or_invented_acceptance(self):
        for version,instant in (("old",self.original_time),(None,None),(CURRENT,None)):
            user = db.session.get(User,self.owner_id)
            user.terms_version, user.terms_accepted_at = version,instant
            db.session.commit()
            response = self.login()
            self.assertEqual(response.status_code,409)
            self.assertEqual(response.json["code"],"terms_acceptance_required")
            self.assertEqual(response.json["terms_version"],CURRENT)
            self.assertEqual(len(response.json["documents"]),3)
            self.assertTrue(all(item["url"].startswith("/") and not item["url"].startswith("//")
                and item["pdf"].endswith("-"+CURRENT+".pdf") for item in response.json["documents"]))
            self.assertFalse(response.headers.getlist("Set-Cookie"))
            self.assertEqual(UserAgreementAcceptance.query.count(),0)

    def test_accept_records_server_time_preserves_old_facts_and_is_idempotent(self):
        before = datetime.now(timezone.utc)
        response = self.accept()
        self.assertEqual(response.status_code,200)
        self.assertTrue(response.headers.getlist("Set-Cookie"))
        row = UserAgreementAcceptance.query.one()
        instant = row.accepted_at.replace(tzinfo=timezone.utc) if row.accepted_at.tzinfo is None else row.accepted_at
        self.assertLessEqual(before,instant)
        self.assertLessEqual(instant,datetime.now(timezone.utc))
        user = db.session.get(User,self.owner_id)
        self.assertEqual(user.terms_version,"legacy-original")
        self.assertEqual(user.terms_accepted_at.replace(tzinfo=timezone.utc),self.original_time)
        original = row.accepted_at
        self.assertEqual(self.accept().status_code,200)
        self.assertEqual(self.login().status_code,200)
        self.assertEqual(UserAgreementAcceptance.query.count(),1)
        self.assertEqual(UserAgreementAcceptance.query.one().accepted_at,original)

    def test_previous_published_edition_is_preserved_and_next_release_needs_explicit_acceptance(self):
        user=db.session.get(User,self.owner_id)
        user.terms_version='2026-10-16.1'
        user.terms_accepted_at=self.original_time
        db.session.commit()
        self.assertNotEqual(CURRENT,'2026-10-16.1')
        response=self.login()
        self.assertEqual(response.status_code,409)
        self.assertEqual(response.json['terms_version'],CURRENT)
        self.assertEqual(self.accept().status_code,200)
        self.assertEqual(db.session.get(User,self.owner_id).terms_version,'2026-10-16.1')
        self.assertEqual(UserAgreementAcceptance.query.one().version,CURRENT)
        self.assertEqual(self.login().status_code,200)

    def test_current_original_fact_needs_no_new_checkbox(self):
        user=db.session.get(User,self.owner_id)
        user.terms_version=CURRENT
        user.terms_accepted_at=datetime.now(timezone.utc)
        db.session.commit()
        self.assertEqual(self.login().status_code,200)
        self.assertEqual(UserAgreementAcceptance.query.count(),0)

    def test_wrong_password_missing_and_inactive_never_reveal_terms(self):
        for changes in (dict(password="wrong"),dict(email="missing@example.test"),
                        dict(email="owner@example.test")):
            if changes==dict(email="owner@example.test"):
                user=db.session.get(User,self.owner_id);user.active=False;db.session.commit()
            response=self.login(**changes)
            self.assertEqual(response.status_code,404)
            self.assertEqual(response.json["message"],"Invalid email or password")
            self.assertNotIn("terms_version",response.json)
            self.assertFalse(response.headers.getlist("Set-Cookie"))
        self.assertEqual(UserAgreementAcceptance.query.count(),0)

    def test_false_nonbool_wrong_version_and_client_time_are_rejected(self):
        for value in (False,"true",1,None):
            response=self.login(terms_accepted=value,terms_version=CURRENT)
            self.assertEqual(response.status_code,400)
            self.assertFalse(response.headers.getlist("Set-Cookie"))
        for version in ("old","2099-01-01.1",None):
            response=self.login(terms_accepted=True,terms_version=version)
            self.assertEqual(response.status_code,409)
            self.assertEqual(response.json["code"],"terms_version_mismatch")
        self.assertEqual(self.accept(terms_accepted_at="2020-01-01").status_code,400)
        self.assertEqual(UserAgreementAcceptance.query.count(),0)

    def test_commit_failure_does_not_grant_tokens_or_store_acceptance(self):
        with patch.object(db.session,"commit",side_effect=RuntimeError("private")):
            response=self.accept()
        self.assertEqual(response.status_code,500)
        self.assertFalse(response.headers.getlist("Set-Cookie"))
        self.assertEqual(UserAgreementAcceptance.query.count(),0)

    def test_release_change_during_acceptance_rolls_back_and_requires_new_choice(self):
        with patch("auth.terms.current_version",side_effect=[CURRENT,"future-edition","future-edition"]):
            response=self.accept()
        self.assertEqual(response.status_code,409)
        self.assertEqual(response.json["code"],"terms_version_mismatch")
        self.assertEqual(response.json["terms_version"],"future-edition")
        self.assertFalse(response.headers.getlist("Set-Cookie"))
        self.assertEqual(UserAgreementAcceptance.query.count(),0)

    def test_access_refresh_and_direct_endpoints_cannot_bypass_current_terms(self):
        client,headers,refresh_headers=self.client_for()
        for url in ("/users/check","/users/","/users/super_check","/input/my_submissions","/admin/get_all_users"):
            response=client.get(url)
            self.assertEqual(response.status_code,409,url)
            self.assertEqual(response.json["code"],"terms_acceptance_required")
        self.assertEqual(client.post("/users/refresh",headers=refresh_headers).status_code,409)
        self.assertEqual(client.post("/input/submit",headers=headers,json={}).status_code,409)
        self.assertEqual(client.post("/users/refresh").status_code,401)
        self.assertEqual(self.accept().status_code,200)
        self.assertEqual(client.get("/users/check").status_code,200)
        self.assertEqual(client.get("/admin/get_all_users").status_code,403)

    def test_new_release_blocks_existing_access_refresh_and_preserves_history(self):
        self.assertEqual(self.accept().status_code,200)
        client,_,refresh_headers=self.client_for()
        with patch("auth.terms.CURRENT_TERMS_VERSION","next-release"):
            self.assertEqual(client.get("/users/check").status_code,409)
            self.assertEqual(client.post("/users/refresh",headers=refresh_headers).status_code,409)
            self.assertEqual(client.get("/input/my_submissions").status_code,409)
        self.assertEqual(UserAgreementAcceptance.query.one().version,CURRENT)

    def test_invalid_inactive_and_expired_sessions_take_priority(self):
        client,_,_=self.client_for(claims={"account_version":"invalid"})
        self.assertEqual(client.get("/users/check").status_code,401)
        client,_,_=self.client_for()
        user=db.session.get(User,self.owner_id)
        token=create_access_token(identity=str(user.id),additional_claims={"account_version":user.session_version()},
            expires_delta=timedelta(seconds=-1))
        expired=self.app.test_client();expired.set_cookie("access_token_cookie",token)
        self.assertEqual(expired.get("/users/check").status_code,401)
        user.active=False;db.session.commit()
        response=client.get("/users/check")
        self.assertEqual(response.status_code,401)
        self.assertEqual(response.json["code"],"account_inactive")

    def test_old_session_can_logout_and_self_delete_and_history_is_erased(self):
        db.session.add(UserAgreementAcceptance(user_id=self.owner_id,version="older-record",
            accepted_at=self.original_time));db.session.commit()
        client,headers,_=self.client_for()
        self.assertEqual(self.app.test_client().post("/users/logout").status_code,401)
        self.assertEqual(self.delete(client,{}).status_code,401)
        self.assertEqual(self.delete(client,headers,password="wrong").status_code,403)
        self.assertEqual(self.delete(client,headers).status_code,200)
        self.assertEqual(UserAgreementAcceptance.query.count(),0)
        self.assertIsNone(db.session.get(User,self.owner_id))

    def test_retention_deletes_history_with_unfinished_account(self):
        user=db.session.get(User,self.owner_id)
        user.active=False;user.registration_completed=False
        user.registered_at=datetime(2020,1,1,tzinfo=timezone.utc)
        db.session.add(UserAgreementAcceptance(user_id=user.id,version="old",accepted_at=self.original_time))
        db.session.commit()
        result=cleanup(now=datetime.now(timezone.utc),execute=True)
        self.assertEqual(result["accounts"],1)
        self.assertEqual(UserAgreementAcceptance.query.count(),0)

    def test_postgresql_parallel_acceptance_is_unique_with_real_locks(self):
        if db.engines["users_db"].dialect.name!="postgresql":
            self.skipTest("Requires isolated PostgreSQL row locks")
        barrier=Barrier(2)
        def synchronized_lock():
            barrier.wait(timeout=10)
            lock_users_transaction()
        def post():
            with self.app.app_context():
                response=self.accept()
                return response.status_code
        db.session.remove()
        with patch("auth.authentication.lock_users_transaction",side_effect=synchronized_lock):
            with ThreadPoolExecutor(max_workers=2) as pool:
                responses=list(pool.map(lambda _:post(),range(2)))
        self.assertEqual(responses,[200,200])
        self.assertEqual(UserAgreementAcceptance.query.count(),1)

    def test_postgresql_delete_and_disable_win_over_waiting_acceptance(self):
        if db.engines["users_db"].dialect.name!="postgresql":
            self.skipTest("Requires isolated PostgreSQL row locks")
        for action in ("disable","delete"):
            if action=="delete":
                user=db.session.get(User,self.owner_id);user.active=True;db.session.commit()
            ready=Event()
            lock_users_transaction()
            user=User.query.filter_by(id=self.owner_id).with_for_update().one()
            def waiting_lock():
                ready.set();lock_users_transaction()
            def post():
                with self.app.app_context():
                    return self.accept().status_code
            with patch("auth.authentication.lock_users_transaction",side_effect=waiting_lock):
                with ThreadPoolExecutor(max_workers=1) as pool:
                    future=pool.submit(post)
                    self.assertTrue(ready.wait(10))
                    if action=="disable":user.active=False
                    else:delete_account_data(user)
                    db.session.commit()
                    self.assertEqual(future.result(timeout=15),404)
            self.assertEqual(UserAgreementAcceptance.query.count(),0)
