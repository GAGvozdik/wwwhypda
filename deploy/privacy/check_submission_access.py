"""Проверка доступа к заявкам на SQLite в контейнере без сети и рабочих volumes."""
import pathlib
import subprocess
import hashlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
FILES = ['inputData/inputData.py', 'inputData/inputDataModels.py', 'auth/validate.py', 'auth/session_security.py']
EXPECTED = {p: hashlib.sha256((ROOT / 'wwwhypda-backend' / p).read_bytes().replace(b'\r\n', b'\n')).hexdigest() for p in FILES}
CODE = r'''
import hashlib, pathlib
from tests.test_auth_lifecycle import AccountDeletionTests
from inputData.inputDataModels import InputData
from auth.auth_models import User
from common_defenitions import db
expected = EXPECTED_HASHES
for path, digest in expected.items():
    actual = hashlib.sha256(pathlib.Path(path).read_bytes().replace(b'\r\n', b'\n')).hexdigest()
    assert actual == digest, 'Image source differs from workspace: ' + path
fixture = AccountDeletionTests('test_password_csrf_captcha_identity_and_unauthenticated_denials')
fixture.setUp()
try:
    own_ids = [r.id for r in InputData.query.filter_by(user_id=fixture.owner_id).order_by(InputData.id).all()]
    foreign_ids = [r.id for r in InputData.query.filter_by(user_id=fixture.other_id).order_by(InputData.id).all()]
    anonymous = fixture.app.test_client()
    assert anonymous.get('/input/get_input_by_id/' + str(own_ids[0])).status_code == 401
    assert anonymous.get('/input/my_submissions').status_code == 401
    assert anonymous.get('/input/get_input_suggestions').status_code == 401
    owner, headers, _ = fixture.client_for()
    response = owner.get('/input/get_input_by_id/' + str(own_ids[0]))
    assert response.status_code == 200 and response.json['id'] == own_ids[0]
    assert owner.get('/input/get_input_by_id/' + str(foreign_ids[0])).status_code == 403
    listing = owner.get('/input/my_submissions')
    assert listing.status_code == 200 and {r['id'] for r in listing.json} == set(own_ids)
    assert owner.get('/input/get_input_suggestions').status_code == 403
    forged, _, _ = fixture.client_for(claims={'is_superuser': True, 'is_admin': True})
    assert forged.get('/input/get_input_suggestions').status_code == 403
    assert forged.get('/input/get_input_by_id/' + str(foreign_ids[0])).status_code == 403
    admin_user = db.session.get(User, fixture.other_id)
    admin_user.is_superuser = True
    db.session.commit()
    admin, _, _ = fixture.client_for(fixture.other_id)
    assert admin.get('/input/get_input_by_id/' + str(own_ids[0])).status_code == 200
    assert admin.get('/input/get_input_suggestions').status_code == 200
    assert owner.delete('/input/delete_submission/' + str(own_ids[0])).status_code == 401
    assert owner.delete('/input/delete_submission/' + str(foreign_ids[0]), headers=headers).status_code == 403
    assert InputData.query.filter_by(user_id=fixture.other_id).count() == 3
    for identifier in own_ids:
        assert owner.delete('/input/delete_submission/' + str(identifier), headers=headers).status_code == 200
        assert owner.get('/input/get_input_by_id/' + str(identifier)).status_code == 404
    assert InputData.query.filter_by(user_id=fixture.owner_id).count() == 0
    assert InputData.query.filter_by(user_id=fixture.other_id).count() == 3
    db.session.get(User, fixture.owner_id).active = False
    db.session.commit()
    assert owner.get('/input/my_submissions').status_code == 401
    print('PASS: anonymous denial, ownership, filtered lists, real admin role, forged-role denial, CSRF, own deletion in all statuses, foreign data preserved, inactive account denied.')
finally:
    fixture.tearDown()
'''.replace('EXPECTED_HASHES', repr(EXPECTED))
result = subprocess.run(['docker', 'run', '--rm', '--pull=never', '--network', 'none',
                         '-e', 'TEST_AUTH_DATABASE_URI=sqlite://', '--entrypoint', 'python',
                         '-i', 'wwwhypda-dev-backend', '-'], input=CODE, text=True)
raise SystemExit(result.returncode)
