"""Auth enumeration matrix and controlled timing/resource regressions."""
import random
import statistics
import time
import resource
import socket
import subprocess
import sys
import unittest
from contextlib import contextmanager
from unittest.mock import patch

from werkzeug.security import check_password_hash, generate_password_hash
from sqlalchemy.orm import Query
from common_defenitions import db
from auth.auth_models import User, ConfirmationCode
from auth.terms import CURRENT_TERMS_VERSION
from auth.validate import messages
from auth import password_reset_delivery as delivery
from tests import test_password_reset_privacy as fixtures


class AuthEnumerationTests(unittest.TestCase):
    tearDown=fixtures.PasswordResetPrivacyTests.tearDown
    code=fixtures.PasswordResetPrivacyTests.code
    client_for=fixtures.PasswordResetPrivacyTests.client_for
    def setUp(self):
        fixtures.PasswordResetPrivacyTests.setUp(self)

    def register(self,email,**changes):
        data=dict(name='Researcher',email=email,password='Password1!',adult_confirmed=True,
            terms_accepted=True,terms_version=CURRENT_TERMS_VERSION,recaptcha_token='test-token')
        data.update(changes)
        return self.app.test_client().post('/users/',json=data)

    def login(self,email,password='WrongPassword1!'):
        return self.app.test_client().post('/users/login',json=dict(email=email,password=password,recaptcha_token='test-token'))

    def resend(self,email):
        return self.app.test_client().post('/users/resend-confirmation',json=dict(email=email,recaptcha_token='test-token'))

    def snapshot(self):
        return {u.email:(u.id,u.name,u.password,u.active,u.is_superuser,u.registered_at,
            u.registration_completed,u.terms_accepted_at,u.terms_version) for u in User.query.all()}

    def test_failed_login_exactly_one_check_no_request_hash_generation(self):
        result=[]
        with patch('auth.auth_models.check_password_hash',wraps=check_password_hash) as check, patch('auth.auth_models.generate_password_hash') as generate:
            for email in ('owner@example.test','unconfirmed@example.test','disabled@example.test','missing@example.test'):
                check.reset_mock()
                response=self.login(email)
                check.assert_called_once()
                self.assertNotIn('Set-Cookie',response.headers)
                result.append((response.status_code,response.json))
            generate.assert_not_called()
        self.assertTrue(all(value==result[0] for value in result))
        self.assertEqual(result[0],(404,{'message':'Invalid email or password','error':'Unauthorized'}))

    def test_successful_current_and_legacy_login_preserves_session(self):
        user=User.query.filter_by(email='owner@example.test').one()
        for method in ('scrypt:32768:8:1','pbkdf2:sha256:260000'):
            user.password=generate_password_hash('Password1!',method=method)
            db.session.commit()
            original=user.password
            client=self.app.test_client()
            response=client.post('/users/login',json=dict(email=user.email,password='Password1!',recaptcha_token='test-token'))
            self.assertEqual(response.status_code,200)
            self.assertIn('Set-Cookie',response.headers)
            self.assertEqual(client.get('/users/check').status_code,200)
            db.session.refresh(user)
            self.assertEqual(user.password,original)

    def test_registration_one_hash_before_lock_and_no_duplicate_mutation(self):
        original=self.snapshot()
        trace=[]
        real_hash=generate_password_hash
        def hashing(value):
            trace.append('hash')
            return real_hash(value)
        with patch('auth.authentication.generate_password_hash',side_effect=hashing) as hashing_mock, patch('auth.authentication.lock_users_transaction',side_effect=lambda:trace.append('lock')), patch('auth.authentication.send_auth_code_email',return_value=True) as sender:
            for email in ('new@example.test','owner@example.test','unconfirmed@example.test','disabled@example.test'):
                trace.clear()
                hashing_mock.reset_mock()
                response=self.register(email)
                self.assertEqual((response.status_code,response.json),(200,{'message':messages['registration_requested']}))
                hashing_mock.assert_called_once_with('Password1!')
                self.assertEqual(trace[:2],['hash','lock'])
            self.assertEqual(sender.call_count,1)
        after=self.snapshot()
        for email,value in original.items():
            self.assertEqual(after[email],value)
        created=User.query.filter_by(email='new@example.test').one()
        self.assertFalse(created.active)
        self.assertFalse(created.registration_completed)
        self.assertIsNotNone(created.registered_at)
        self.assertEqual(created.terms_version,CURRENT_TERMS_VERSION)
        self.assertIsNotNone(created.terms_accepted_at)
        self.assertEqual({c.email for c in ConfirmationCode.query.all()},{'new@example.test','unconfirmed@example.test'})

    def test_resend_eligibility_and_disabled_cannot_reactivate(self):
        original=self.snapshot()
        with patch('auth.authentication.send_auth_code_email',return_value=True) as sender:
            outcomes=[self.resend(email) for email in ('owner@example.test','unconfirmed@example.test','disabled@example.test','missing@example.test')]
            self.assertEqual(sender.call_count,1)
        self.assertTrue(all((r.status_code,r.json)==(200,{'message':messages['registration_requested']}) for r in outcomes))
        self.assertEqual(ConfirmationCode.query.count(),1)
        self.assertEqual(ConfirmationCode.query.one().email,'unconfirmed@example.test')
        self.assertEqual(self.snapshot(),original)
        stale=ConfirmationCode(email='disabled@example.test',code='123456',type='registration')
        db.session.add(stale)
        db.session.commit()
        response=self.app.test_client().post('/users/confirm-registration',json=dict(email=stale.email,code=stale.code,recaptcha_token='test-token'))
        self.assertNotEqual(response.status_code,200)
        self.assertFalse(User.query.filter_by(email=stale.email).one().active)

    def test_activation_and_unknown_invalid_codes_keep_guards(self):
        with patch('auth.authentication.send_auth_code_email',return_value=True):
            self.register('new@example.test')
        code=ConfirmationCode.query.one()
        body=dict(email=code.email,code=code.code,recaptcha_token='test-token')
        self.assertEqual(self.app.test_client().post('/users/confirm-registration',json=body).status_code,200)
        self.assertTrue(User.query.filter_by(email=body['email']).one().registration_completed)
        outcomes=[]
        for email in ('owner@example.test','unconfirmed@example.test','disabled@example.test','missing@example.test'):
            response=self.app.test_client().post('/users/confirm-registration',json=dict(email=email,code='000000',recaptcha_token='test-token'))
            outcomes.append((response.status_code,response.json))
        self.assertTrue(all(value==outcomes[0] for value in outcomes))
        self.assertEqual(outcomes[0][0],401)

    def test_concurrent_duplicate_integrity_recovery_does_not_overwrite(self):
        original=self.snapshot()
        real_first=Query.first
        calls=0
        def first(query):
            nonlocal calls
            calls+=1
            return None if calls==1 else real_first(query)
        with patch.object(Query,'first',first),patch('auth.authentication.send_auth_code_email') as sender:
            response=self.register('owner@example.test')
            sender.assert_not_called()
        self.assertEqual(response.status_code,200)
        self.assertEqual(response.json,{'message':messages['registration_requested']})
        self.assertEqual(self.snapshot(),original)

    def test_mail_errors_and_capacity_failure_do_not_reveal_account(self):
        for outcome in (False,RuntimeError('sensitive-recipient-and-code')):
            kw={'side_effect':outcome} if isinstance(outcome,Exception) else {'return_value':outcome}
            with patch('auth.authentication.send_auth_code_email',**kw):
                self.assertEqual(self.register(f'new{int(isinstance(outcome,Exception))}@example.test').json,{'message':messages['registration_requested']})
                self.assertEqual(self.resend('unconfirmed@example.test').json,{'message':messages['registration_requested']})
        @contextmanager
        def unavailable():
            yield False
        with patch.object(delivery,'_sender_slot',unavailable),patch.object(delivery,'_send_with_slot') as spawn:
            self.assertFalse(delivery.send_auth_code_email('Synthetic','isolated@example.test','synthetic',time.monotonic()))
            spawn.assert_not_called()

    def test_wait_does_not_hold_database_transaction(self):
        def waiting(_started):
            self.assertFalse(db.session().in_transaction())
        def sending(*args):
            self.assertFalse(db.session().in_transaction())
            return True
        with patch('auth.authentication.wait_for_response_window',side_effect=waiting),patch('auth.authentication.send_auth_code_email',side_effect=sending),patch('auth.authentication.send_reset_email',side_effect=sending):
            self.register('new@example.test')
            self.register('owner@example.test')
            self.resend('unconfirmed@example.test')
            self.app.test_client().post('/users/request-password-reset',json=dict(email='owner@example.test',recaptcha_token='test-token'))
        with patch('auth.authentication.wait_for_failed_login',side_effect=waiting):
            self.login('missing@example.test')

    def test_payload_captcha_terms_adult_errors_do_not_start_account_work(self):
        with patch('auth.authentication.generate_password_hash') as hash_work,patch('auth.authentication.send_auth_code_email') as sender:
            for email in ('owner@example.test','missing@example.test'):
                self.assertEqual(self.register(email,terms_accepted=False).status_code,400)
                self.assertEqual(self.register(email,adult_confirmed=False).status_code,400)
                self.assertEqual(self.register(email,terms_version='stale').status_code,409)
                self.assertEqual(self.register(email,registered_at='forged').status_code,400)
                self.assertEqual(self.register(email,password=[]).status_code,400)
                with patch('auth.authentication.verify_recaptcha',return_value=(False,('denied',400))):
                    self.assertEqual(self.register(email).status_code,400)
                    self.assertEqual(self.resend(email).status_code,400)
                    self.assertEqual(self.login(email).status_code,400)
            hash_work.assert_not_called()
            sender.assert_not_called()
        self.assertEqual(self.app.test_client().post('/users/login',json=[]).status_code,400)
        self.assertEqual(self.app.test_client().post('/users/resend-confirmation',json=[]).status_code,400)

    def test_repeated_shuffled_controlled_timing_distributions(self):
        self.app.config.update(TEST_AUTH_MAIL_RESPONSE_SECONDS=.12,TEST_FAILED_LOGIN_RESPONSE_SECONDS=.04)
        kinds=('unknown','active','unconfirmed','disabled')
        order=list(kinds)*8
        random.Random(4).shuffle(order)
        fixed_hash=generate_password_hash('Password1!')
        def hashing(_value):
            time.sleep(.012)
            return fixed_hash
        def checking(*_args):
            time.sleep(.012)
            return False
        def sending(*_args):
            time.sleep(.04)
            return True
        for endpoint in ('login','register','resend','reset'):
            samples={kind:[] for kind in kinds}
            with patch('auth.authentication.generate_password_hash',side_effect=hashing),patch('auth.auth_models.check_password_hash',side_effect=checking),patch('auth.authentication.send_auth_code_email',side_effect=sending),patch('auth.authentication.send_reset_email',side_effect=sending):
                for index,kind in enumerate(order):
                    email=f'{endpoint}{index}@example.test' if kind=='unknown' else f'{"owner" if kind=="active" else kind}@example.test'
                    start=time.monotonic()
                    if endpoint=='login': self.login(email)
                    elif endpoint=='register': self.register(email)
                    elif endpoint=='resend': self.resend(email)
                    else: self.app.test_client().post('/users/request-password-reset',json=dict(email=email,recaptcha_token='test-token'))
                    samples[kind].append(time.monotonic()-start)
            means=[statistics.mean(values) for values in samples.values()]
            medians=[statistics.median(values) for values in samples.values()]
            self.assertLess(max(means)-min(means),.035,(endpoint,samples))
            self.assertLess(max(medians)-min(medians),.03,(endpoint,samples))
            print('controlled timing',endpoint,{kind:{'n':len(values),'mean_ms':round(statistics.mean(values)*1000,1),'median_ms':round(statistics.median(values)*1000,1),'tail_ms':round(max(values)*1000,1)} for kind,values in samples.items()})

    def test_container_sender_slots_are_bounded_and_released(self):
        with delivery._sender_slot() as first:
            self.assertTrue(first)
            with delivery._sender_slot() as second:
                self.assertTrue(second)
                with delivery._sender_slot() as overflow:
                    self.assertFalse(overflow)
        with delivery._sender_slot() as released:
            self.assertTrue(released)

    def test_actual_budget_and_sender_resource_cost(self):
        self.app.config.update(TEST_AUTH_MAIL_RESPONSE_SECONDS=4.0,TEST_FAILED_LOGIN_RESPONSE_SECONDS=.4,
            MAIL_DELIVERY_MODE='log')
        before=resource.getrusage(resource.RUSAGE_CHILDREN)
        durations=[]
        for _ in range(3):
            started=time.monotonic()
            self.assertTrue(delivery.send_auth_code_email('Synthetic','isolated@example.test','Synthetic',started))
            durations.append(time.monotonic()-started)
        after=resource.getrusage(resource.RUSAGE_CHILDREN)
        self.assertLess(max(durations),3.0)
        print('sender resources',{'spawn_seconds':list(map(lambda value:round(value,3),durations)),
            'child_peak_rss_kib':after.ru_maxrss,
            'child_cpu_seconds':round(after.ru_utime+after.ru_stime-before.ru_utime-before.ru_stime,3),
            'sender_limit':delivery.MAX_SENDERS,'response_window_seconds':delivery.RESPONSE_SECONDS})
        durations=[]
        with patch('auth.authentication.send_reset_email',side_effect=lambda *args:(time.sleep(.2) or True)):
            for email in ('missing@example.test','owner@example.test'):
                started=time.monotonic()
                response=self.app.test_client().post('/users/request-password-reset',json=dict(email=email,recaptcha_token='test-token'))
                self.assertEqual(response.status_code,200)
                durations.append(time.monotonic()-started)
        self.assertTrue(all(3.95<value<4.5 for value in durations),durations)
        print('full response budget seconds',list(map(lambda value:round(value,3),durations)))

    def test_sender_dies_with_supervising_parent(self):
        # Loopback greeting never completes; no envelope/code is sent or forwarded.
        server=socket.socket()
        server.bind(('127.0.0.1',0))
        server.listen(1)
        server.settimeout(5)
        port=server.getsockname()[1]
        source=("import multiprocessing,os,time; from auth.password_reset_delivery import _deliver; "
            "settings={'MAIL_DELIVERY_MODE':'smtp','MAIL_SERVER':'127.0.0.1','MAIL_PORT':"+str(port)+
            ",'MAIL_USE_TLS':False,'MAIL_USE_SSL':False,'MAIL_SUPPRESS_SEND':False,'MAIL_DEFAULT_SENDER':'isolated@example.test'}; "
            "context=multiprocessing.get_context('spawn'); receiver,sender=context.Pipe(duplex=False); "
            "process=context.Process(target=_deliver,args=(settings,'isolated@example.test',('Synthetic','Synthetic'),sender,time.monotonic()+15,os.getpid())); "
            "process.start(); sender.close(); print(process.pid,flush=True); process.join()")
        parent=subprocess.Popen([sys.executable,'-c',source],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
        connection=None
        try:
            child_pid=int(parent.stdout.readline())
            connection,_=server.accept()
            connection.settimeout(2)
            parent.kill()
            parent.communicate(timeout=3)
            self.assertEqual(connection.recv(1),b'')
            print('parent shutdown: child SMTP connection closed',child_pid>0)
        finally:
            if parent.poll() is None:
                parent.kill()
                parent.communicate(timeout=3)
            if connection is not None:
                connection.close()
            server.close()

    def test_confirmation_malformed_code_cannot_probe_account(self):
        for endpoint in ('confirm-registration','confirm-password-reset'):
            for code in (None,{},[],True,123456,'bad','１'*6):
                outcomes=[]
                for email in ('owner@example.test','unconfirmed@example.test','disabled@example.test','missing@example.test'):
                    response=self.app.test_client().post('/users/'+endpoint,json=dict(email=email,code=code,new_password='DifferentPass2!',recaptcha_token='test-token'))
                    outcomes.append((response.status_code,response.json))
                self.assertTrue(all(result==outcomes[0] for result in outcomes))
                self.assertEqual(outcomes[0][0],400)

    def test_dummy_match_never_authenticates_unknown_or_inactive(self):
        with patch('auth.auth_models.check_password_hash',return_value=True) as check:
            for email in ('missing@example.test','unconfirmed@example.test','disabled@example.test'):
                response=self.login(email)
                # A real pending password match may reveal only the continuation status.
                self.assertEqual(response.status_code,409 if email=='unconfirmed@example.test' else 404)
                if email=='unconfirmed@example.test':
                    self.assertEqual(response.json['code'],'email_confirmation_required')
                self.assertNotIn('Set-Cookie',response.headers)
            self.assertEqual(check.call_count,3)
