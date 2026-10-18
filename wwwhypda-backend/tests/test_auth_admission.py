"""Kernel slot bounds and release on exception/process death; no providers."""
import subprocess,sys,time,unittest
from auth.admission import acquire,release,LIMIT
from tests import test_auth_lifecycle as fixtures
from unittest.mock import patch


class AdmissionTests(unittest.TestCase):
    def test_global_cap_and_release(self):
        slots=[]
        try:
            slots=[acquire() for _ in range(LIMIT)]
            self.assertTrue(all(fd is not None for fd in slots));self.assertIsNone(acquire())
            release(slots.pop());fd=acquire();self.assertIsNotNone(fd);slots.append(fd)
        finally:
            for fd in slots:release(fd)

    def test_worker_death_releases_kernel_slot(self):
        slots=[];child=None
        try:
            slots=[acquire() for _ in range(3)]
            script="from auth.admission import acquire;import time;fd=acquire();print('ready' if fd is not None else 'full',flush=True);time.sleep(15)"
            child=subprocess.Popen([sys.executable,'-B','-c',script],stdout=subprocess.PIPE,text=True)
            self.assertEqual(child.stdout.readline().strip(),'ready');self.assertIsNone(acquire())
            child.kill();child.wait(3)
            fd=acquire();self.assertIsNotNone(fd);slots.append(fd)
        finally:
            if child and child.poll() is None:child.kill();child.wait(3)
            if child and child.stdout:child.stdout.close()
            for fd in slots:release(fd)

    def test_overflow_precedes_validation_and_exception_does_not_leak_slot(self):
        fixture=fixtures.AccountDeletionTests();fixture.setUp();slots=[]
        try:
            slots=[acquire() for _ in range(4)]
            with patch('auth.authentication.verify_recaptcha') as verifier:
                start=time.monotonic()
                r=fixture.app.test_client().post('/users/login',json={})
                self.assertEqual(r.status_code,429);self.assertLess(time.monotonic()-start,.5)
                verifier.assert_not_called()
            for fd in slots:release(fd)
            slots=[]
            for _ in range(8):
                with patch('auth.authentication.verify_recaptcha',side_effect=RuntimeError('synthetic')):
                    r=fixture.app.test_client().post('/users/login',json={'email':'owner@example.test','password':'Password1!','recaptcha_token':'test-token'})
                self.assertEqual(r.status_code,500)
            self.assertEqual(fixture.app.test_client().post('/users/login',json={}).status_code,400)
        finally:
            for fd in slots:release(fd)
            fixture.tearDown()
