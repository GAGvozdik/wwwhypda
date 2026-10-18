"""Synthetic private state and protocol fakes; no SMTP/IMAP network."""
from datetime import datetime, timedelta
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock

from maintenance.mail_common import UTC, OWNER, MailSafetyError, month_after
from maintenance.mail_state import State
from maintenance.mail_reminder import observe_reminders, smtp_settings, RECIPIENT, LEAD, message

CLOSED = datetime(2026,4,30,12,tzinfo=UTC)
DUE = month_after(CLOSED,6)
ENV = dict(MAIL_REMINDER_ENABLED="true",MAIL_REMINDER_TO=RECIPIENT,MAIL_SERVER="smtp.mail.ovh.net",
    MAIL_PORT="465",MAIL_USE_SSL="true",MAIL_USE_TLS="false",MAIL_USERNAME=OWNER,
    MAIL_PASSWORD="synthetic-secret",MAIL_DEFAULT_SENDER=OWNER,MAIL_DELIVERY_MODE="smtp",MAIL_SUPPRESS_SEND="false")


class ReminderTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.state=State(Path(self.tmp.name)/"private").__enter__()
        self.host=Mock()
        self.host.send_message.return_value={}
        self.transport=Mock(return_value=self.host)

    def tearDown(self):
        self.state.__exit__()
        self.tmp.cleanup()

    def thread(self,now,closed=CLOSED,status="recently_closed",token="synthetic-private-handle"):
        with self.state.transaction():
            self.state.db.execute("INSERT OR REPLACE INTO threads VALUES (?,?,?,?,?,?)",
                (token,status,closed.isoformat() if closed else None,"private-composition",0,now.isoformat()))

    def run_at(self,now,send=False,counts=None):
        return observe_reminders(self.state,None,counts or {},now,send=send,env=ENV,transport=self.transport)

    def test_boundary_catchup_and_no_send_does_not_mark_accepted(self):
        for delta,expected in ((-1,0),(0,1),(1,1),(8*86400,1)):
            now=DUE-LEAD+timedelta(seconds=delta)
            self.thread(now)
            result=self.run_at(now)
            self.assertEqual(result["reminders"],expected)
            self.assertEqual(result["submitted"],0)
        self.transport.assert_not_called()
        self.assertEqual(self.state.db.execute("SELECT status FROM reminder_outbox").fetchone()[0],"pending")

    def test_accepted_persistence_dedup_reopen_and_new_closure(self):
        now=DUE-LEAD
        self.thread(now)
        result=self.run_at(now,True)
        self.assertEqual(result["submitted"],1)
        self.state.__exit__()
        self.state=State(Path(self.tmp.name)/"private").__enter__()
        self.thread(now+timedelta(days=1))
        self.assertEqual(self.run_at(now+timedelta(days=1),True)["submitted"],0)
        self.thread(now+timedelta(days=2),None,"reopened")
        self.assertEqual(self.run_at(now+timedelta(days=2),True)["submitted"],0)
        new_closed=now+timedelta(days=3)
        later=month_after(new_closed,6)-LEAD
        self.thread(later,new_closed)
        self.assertEqual(self.run_at(later,True)["submitted"],1)
        self.assertEqual(self.transport.call_count,2)

    def test_blocked_unsafe_stale_and_missing_cancel(self):
        now=DUE
        self.thread(now)
        self.assertTrue(self.run_at(now,True,{"support_observation_blocked":True})["observation_blocked"])
        for counts in ({"unsafe":1},{"closed_unread_bodies":1},{"invalid_headers":1}):
            self.assertEqual(self.run_at(now,True,counts)["submitted"],0)
        self.thread(now-timedelta(seconds=1))
        self.assertEqual(self.run_at(now,True)["submitted"],0)
        self.thread(now,None,"unsafe")
        self.assertEqual(self.run_at(now,True)["submitted"],0)
        self.transport.assert_not_called()

    def test_failure_crash_window_stable_id_daily_cap_and_max_attempts(self):
        now=DUE
        self.thread(now)
        self.host.send_message.side_effect=OSError("private-canary")
        for attempt in range(3):
            instant=now+timedelta(days=attempt)
            self.thread(instant)
            with self.assertRaises(OSError):self.run_at(instant,True)
            self.assertEqual(self.run_at(instant+timedelta(hours=1),True)["submitted"],0)
        self.thread(now+timedelta(days=4))
        result=self.run_at(now+timedelta(days=4),True)
        self.assertEqual(result["submitted"],0)
        self.assertEqual(result["attempts_exhausted"],1)
        self.assertEqual(self.transport.call_count,3)
        ids={call.args[0]["Message-ID"] for call in self.host.send_message.call_args_list}
        self.assertEqual(len(ids),1)

    def test_daily_cap_across_batches_and_exclusive_lock(self):
        now=DUE
        self.thread(now)
        self.run_at(now,True)
        self.thread(now,token="another-private-handle")
        self.assertTrue(self.run_at(now,True)["daily_cap"])
        with self.assertRaises(MailSafetyError):
            with State(Path(self.tmp.name)/"private"):pass

    def test_configuration_fail_closed_and_payload_minimal_calendar_dst(self):
        for change in ({"MAIL_REMINDER_ENABLED":"false"},{"MAIL_REMINDER_TO":"wrong@example.test"},
                {"MAIL_DELIVERY_MODE":"log"},{"MAIL_SUPPRESS_SEND":"true"},{"MAIL_PASSWORD":""},
                {"MAIL_SERVER":"smtp.gmail.com"},{"MAIL_USE_SSL":"false"}):
            self.thread(DUE)
            with self.assertRaises((MailSafetyError,ValueError)):
                observe_reminders(self.state,None,{},DUE,send=True,env=dict(ENV,**change),transport=self.transport)
        self.transport.assert_not_called()
        text=message([DUE.isoformat()],"<synthetic@example.test>").as_string()
        for private in ("synthetic-secret","synthetic-private-handle","private-composition","customer@example.test","123456"):
            self.assertNotIn(private,text)
        self.assertIn("Europe/Rome",text)
        self.assertIn("+01:00",text)  # October 30 follows Rome DST transition.
        self.assertEqual(month_after(datetime(2026,8,31,tzinfo=UTC),6).day,28)


if __name__ == "__main__":unittest.main()
