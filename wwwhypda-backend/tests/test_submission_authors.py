"""Проверка временного запрета authors через настоящий HTTP endpoint на тестовой БД."""
import unittest
from unittest.mock import patch

from tests.test_auth_lifecycle import AccountDeletionTests
from inputData.inputDataModels import InputData


class SubmissionAuthorsTests(unittest.TestCase):
    def setUp(self):
        self.fixture = AccountDeletionTests('test_password_csrf_captcha_identity_and_unauthenticated_denials')
        self.fixture.setUp()
        self.client, self.headers, _ = self.fixture.client_for()
        self.initial_count = InputData.query.count()
        self.captcha = patch('inputData.inputData.verify_recaptcha', return_value=(True, None))
        self.verify = self.captcha.start()

    def tearDown(self):
        self.captcha.stop()
        self.fixture.tearDown()

    def submit(self, rows, **kwargs):
        return self.client.post('/input/submit', headers=self.headers,
                                json={'sourceTableData': rows, 'recaptcha_token': 'test-token', **kwargs})

    def test_nonempty_authors_are_rejected_without_storage_or_captcha(self):
        for field in ('authors', ' AUTHORS '):
            for value in ('A. Researcher', ' ', None, 0, False, ['A. Researcher'], {'name': 'A. Researcher'}):
                with self.subTest(field=field, value=value):
                    response = self.submit([{'field': field, 'value': value}])
                    self.assertEqual(response.status_code, 400)
                    self.assertEqual(response.json['message'], 'Author entry is temporarily disabled')
        self.assertEqual(InputData.query.count(), self.initial_count)
        self.verify.assert_not_called()

    def test_duplicate_author_row_cannot_bypass_restriction(self):
        response = self.submit([{'field': 'authors', 'value': ''}, {'field': 'authors', 'value': 'A. Researcher'}])
        self.assertEqual(response.status_code, 400)
        self.assertEqual(InputData.query.count(), self.initial_count)

    def test_empty_authors_and_other_source_fields_are_saved(self):
        rows = [{'field': 'authors', 'value': ''}, {'field': 'title', 'value': 'Scientific source'},
                {'field': 'doi', 'value': '10.example/test'}]
        response = self.submit(rows)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json['data']['sourceTableData'], rows)
        self.assertEqual(InputData.query.count(), self.initial_count + 1)
        self.assertEqual(InputData.query.filter_by(id=response.json['data']['id']).one().source_info, rows)
        self.verify.assert_called_once_with('test-token')

    def test_omitted_authors_remain_compatible(self):
        self.assertEqual(self.submit([]).status_code, 201)

    def test_malformed_source_data_is_rejected(self):
        for rows in (None, {}, 'authors', ['authors'], [{'field': {'authors': 'Name'}}]):
            with self.subTest(rows=rows):
                self.assertEqual(self.submit(rows).status_code, 400)
        self.assertEqual(InputData.query.count(), self.initial_count)
        self.verify.assert_not_called()

    def test_authentication_and_csrf_are_still_required(self):
        data = {'sourceTableData': [{'field': 'authors', 'value': ''}]}
        self.assertEqual(self.fixture.app.test_client().post('/input/submit', json=data).status_code, 401)
        self.assertEqual(self.client.post('/input/submit', json=data).status_code, 401)
        self.assertEqual(InputData.query.count(), self.initial_count)

    def test_captcha_denial_still_prevents_saving(self):
        from flask import jsonify
        self.verify.return_value = (False, (jsonify(message='Captcha rejected'), 400))
        self.assertEqual(self.submit([{'field': 'authors', 'value': ''}]).status_code, 400)
        self.assertEqual(InputData.query.count(), self.initial_count)


if __name__ == '__main__':
    unittest.main()