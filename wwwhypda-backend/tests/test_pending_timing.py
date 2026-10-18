"""Randomized real-hash/floor comparison in isolated DB; no provider/network."""
from collections import defaultdict
import random
import statistics
import time
import unittest
from unittest.mock import patch
from tests import test_pending_login as fixtures

class PendingTimingTests(unittest.TestCase):
    setUp=fixtures.PendingLoginTests.setUp
    tearDown=fixtures.PendingLoginTests.tearDown
    code=fixtures.PendingLoginTests.code
    login=fixtures.PendingLoginTests.login

    def test_randomized_series_keep_real_failed_floor_and_bounded_spread(self):
        self.app.config['TEST_FAILED_LOGIN_RESPONSE_SECONDS']=.4
        groups=dict(wrong=('owner','wrong'),unknown=('missing','wrong'),disabled=('disabled','Password1!'),pending=('pending','Password1!'))
        values=defaultdict(list)
        with patch('auth.authentication.send_auth_code_email') as sender:
            for series in range(3):
                cases=list(groups)*4
                random.Random(900+series).shuffle(cases)
                for category in cases:
                    before=time.monotonic()
                    response=self.login(*groups[category])
                    elapsed=time.monotonic()-before
                    self.assertEqual(response.status_code,409 if category=='pending' else 404)
                    self.assertFalse(response.headers.getlist('Set-Cookie'))
                    self.assertGreaterEqual(elapsed,.395)
                    self.assertLess(elapsed,1.5)
                    values[category].append(elapsed)
            sender.assert_not_called()
        means=[];tails=[]
        for category,samples in values.items():
            mean=statistics.mean(samples);median=statistics.median(samples);tail=sorted(samples)[-2]
            means.append(mean);tails.append(tail)
            print(f'pending timing {category}: n={len(samples)} mean={mean:.4f} median={median:.4f} p90={tail:.4f}')
        self.assertLess(max(means)-min(means),.12)
        self.assertLess(max(tails)-min(tails),.20)
        # Local synthetic limits are disabled to avoid mixing rate-limit refusal
        # with post-CAPTCHA credential timing; separate existing tests cover caps.

if __name__=='__main__':unittest.main()
