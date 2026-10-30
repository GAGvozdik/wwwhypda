"""New-password acceptance, exact hashing and legacy credentials; isolated SQLite/mock delivery."""
import json
from pathlib import Path
import unittest
from datetime import datetime, timezone
from unittest.mock import patch
from auth.password_policy import POLICY, password_error
from auth.validate import validate_password, messages
from auth.auth_models import User, ConfirmationCode
from common_defenitions import db
from auth.terms import CURRENT_TERMS_VERSION
from tests import test_auth_lifecycle as fixtures


class PasswordPolicyTests(unittest.TestCase):
    def test_length_symbols_unicode_and_malformed_values(self):
        accepted = ['x'*14+'-', 'x'*14+'_', 'x'*127+'!', 'É🪨_ phrase - 日本語 42',
                    'correct horse battery staple', '  a spaced passphrase  ', 'a'*14+'🪨']
        for password in accepted:
            with self.subTest(password=password):
                self.assertIsNone(password_error(password))
                self.assertIs(validate_password(password), True)
        for symbol in r'''!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~''':
            self.assertIsNone(password_error('a'*14+symbol))
        for password in ['short-pass_42', 'a'*13+'🪨', 'x'*128+'!', None, 42, ['secret']]:
            self.assertEqual(password_error(password), 'password_invalid')
        self.assertEqual(password_error(''), 'password_required')
        self.assertEqual(password_error('x'*14+'\ud800'), 'password_unicode_invalid')

    def test_basic_local_blocklist_and_repetition(self):
        for password in POLICY['blockedPasswords']:
            self.assertEqual(password_error(password), 'password_common')
            self.assertEqual(password_error(password.upper()), 'password_common')
        for password in ['a'*15, ' '*20, '🪨'*15]:
            self.assertEqual(password_error(password), 'password_common')

    def test_frontend_policy_and_error_messages_match(self):
        directory = Path('/frontend-common')
        if not directory.exists():
            directory = Path(__file__).resolve().parents[2] / 'wwwhypda-frontendV2/src/common'
        if not directory.exists():
            self.skipTest('Mount frontend src/common at /frontend-common for cross-runtime contract check')
        self.assertEqual(POLICY, json.loads((directory / 'passwordPolicy.json').read_text()))
        frontend = json.loads((directory / 'error_messages.json').read_text())
        for key in ('password_required', 'password_invalid', 'password_common', 'password_unicode_invalid'):
            self.assertEqual(frontend[key], messages[key])


class PasswordFlowTests(unittest.TestCase):
    setUp = fixtures.AccountDeletionTests.setUp
    tearDown = fixtures.AuthLifecycleTests.tearDown
    client_for = fixtures.AccountDeletionTests.client_for
    code = fixtures.AuthLifecycleTests.code

    def test_existing_short_password_still_logs_in(self):
        with patch('auth.authentication.verify_recaptcha', return_value=(True, None)):
            response = self.app.test_client().post('/users/login', json={
                'email': 'owner@example.test', 'password': 'Password1!', 'recaptcha_token': 'test-token'})
        self.assertEqual(response.status_code, 200)

    def test_registration_accepts_manager_password_with_underscore_and_hyphen(self):
        password = 'Firefox-generated_pass-42!'
        with patch('auth.authentication.verify_recaptcha', return_value=(True, None)), \
             patch('auth.authentication.send_auth_code_email', return_value=True):
            response = self.app.test_client().post('/users/', json={
                'email': 'new@example.test', 'name': 'New User', 'password': password,
                'recaptcha_token': 'test-token', 'adult_confirmed': True,
                'terms_accepted': True, 'terms_version': CURRENT_TERMS_VERSION})
        self.assertEqual(response.status_code, 200)
        user = User.query.filter_by(email='new@example.test').one()
        self.assertTrue(user.check_password(password))
        self.assertFalse(user.check_password(password[:-1]))

    def test_reset_rejects_short_new_password_without_consuming_code_then_accepts_exact_unicode_passphrase(self):
        ConfirmationCode.query.delete()
        db.session.add(ConfirmationCode(email='owner@example.test', code='123456', type='password_reset',
            created_at=datetime.now(timezone.utc)))
        db.session.commit()
        client = self.app.test_client()
        payload = dict(email='owner@example.test', code='123456', recaptcha_token='test-token')
        password = '  É🪨_phrase-日本語-42  '
        with patch('auth.authentication.verify_recaptcha', return_value=(True, None)):
            rejected = client.post('/users/confirm-password-reset', json={**payload, 'new_password':'Old-pass1!'})
            self.assertEqual(rejected.status_code, 400)
            self.assertEqual(ConfirmationCode.query.count(), 1)
            response = client.post('/users/confirm-password-reset', json={**payload, 'new_password': password})
            self.assertEqual(response.status_code, 200)
            self.assertEqual(ConfirmationCode.query.count(), 0)
            user = User.query.filter_by(email=payload['email']).one()
            self.assertTrue(user.check_password(password))
            self.assertFalse(user.check_password(password.strip()))
            self.assertEqual(client.post('/users/login', json={**payload, 'password':password}).status_code, 200)

    def test_long_unicode_password_works_for_account_confirmation(self):
        password = '🪨'*127+'-'
        user = db.session.get(User, self.owner_id)
        user.set_password(password)
        db.session.commit()
        client, headers, _ = self.client_for()
        with patch('auth.authentication.verify_recaptcha', return_value=(True, None)):
            response = client.delete('/users/me', json={'password':password,'recaptcha_token':'test-token'}, headers=headers)
        self.assertEqual(response.status_code, 200)