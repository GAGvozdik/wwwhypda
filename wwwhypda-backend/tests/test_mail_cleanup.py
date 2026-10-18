"""Protocol fake + private temporary SQLite only. No network, env loader, SMTP or mainApp."""
from contextlib import redirect_stdout
from dataclasses import replace
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from email import policy
import hashlib
import io
import json
import os
from pathlib import Path
import signal
import ssl
import tempfile
import time
import unittest
from unittest.mock import patch

from maintenance.mail_common import Config, OWNER, UTC, MailSafetyError, month_after, old_enough, scheduled_window, process_deadline, execution_seconds
from maintenance.mail_imap import parse_list, internal_date, service_message, quoted, Mailbox
from maintenance.mail_state import State, observe, graph
from maintenance.mail_cleanup import run, summary, main, parse_uid_set

NOW = datetime(2026,1,31,12,tzinfo=UTC)
LATER = datetime(2026,3,2,12,tzinfo=UTC)
OLD = datetime(2025,11,1,12,tzinfo=UTC)
SECRET = "CANARY-PASSWORD-NOT-IN-LOGS"


def email(mid="one", subject="A support question", body="Synthetic support text", sender="customer@example.test", refs=None):
    message=EmailMessage(policy=policy.SMTP)
    message["From"]=sender;message["To"]=OWNER if sender!=OWNER else "customer@example.test"
    message["Subject"]=subject;message["Message-ID"]=f"<{mid}@example.test>"
    if refs:message["References"]=" ".join(f"<{ref}@example.test>" for ref in refs)
    message.set_content(body)
    return message.as_bytes()


def service(mid="service", subject="Activate your account", body="Your activation code: 123456"):
    return email(mid,subject,body,OWNER)


class Fake:
    def __init__(self):
        self.cap=b"IMAP4rev1 UIDPLUS SPECIAL-USE"
        self.folders={b"INBOX":set(),b"Sent mail":{b"\\Sent"},b"Drafts":{b"\\Drafts"},b"WWHYPDA-Closed":set(),b"Trash":{b"\\Trash"}}
        self.messages={folder:{} for folder in self.folders}
        self.validity={folder:123 for folder in self.folders}
        self.next={folder:1 for folder in self.folders}
        self.selected=None;self.readonly=True;self.calls=[];self.debug=0;self.sock=None
        self.hook=None;self.fail_store=None;self.fail_expunge=False;self.partial=False
        self.notsticky=False;self.permission=True;self.bad_list=False;self.missing_fetch=False
        self.refuse_readonly=False;self.fail_login=False;self.logout_error=False

    def add(self, folder, uid, raw=None, flags=(), date=OLD):
        self.messages[folder][uid]=dict(raw=raw or service(),flags=set(flags),date=date)
        self.next[folder]=max(self.next[folder],uid+1)

    def tick(self, command, *args):
        self.calls.append((command,args))
        if self.hook:self.hook(self,command,args)

    @property
    def mutations(self):
        return [entry for entry in self.calls if entry[0] in ("STORE","EXPUNGE","CLOSE","MOVE","COPY","APPEND","CREATE")]

    def factory(self, host, port, ssl_context, timeout):
        assert host=="imap.mail.ovh.net" and port==993 and timeout>0
        assert ssl_context.verify_mode==ssl.CERT_REQUIRED and ssl_context.check_hostname
        return self

    def login(self,user,password):
        self.tick("LOGIN")
        if self.fail_login:raise RuntimeError(SECRET+" customer@example.test Subject <private@example.test>")
        return "OK",[b""]

    def capability(self):
        self.tick("CAPABILITY");return "OK",[self.cap]

    def list(self,*args):
        self.tick("LIST")
        if self.bad_list:return "OK",[b"malformed "+SECRET.encode()]
        return "OK",[b"("+b" ".join(sorted(attrs))+b') "/" '+quoted(folder) for folder,attrs in self.folders.items()]

    def select(self, folder, readonly=False):
        self.tick("EXAMINE" if readonly else "SELECT",folder)
        if readonly and self.refuse_readonly:return "NO",[SECRET.encode()]
        name=folder[1:-1].replace(b'\\"',b'"').replace(b"\\\\",b"\\")
        if name not in self.folders:return "NO",[b"missing"]
        self.selected=name;self.readonly=readonly
        return "OK",[str(len(self.messages[name])).encode()]

    def response(self,name):
        value={"UIDVALIDITY":str(self.validity[self.selected]).encode(),"UIDNEXT":str(self.next[self.selected]).encode(),
            "PERMANENTFLAGS":b"(\\Deleted \\Seen)" if self.permission else b"(\\Seen)"}.get(name)
        if name=="UIDNOTSTICKY" and self.notsticky:value=b""
        return name,[value]

    def uid(self,command,*args):
        self.tick(command,*args)
        messages=self.messages[self.selected]
        if command=="SEARCH":
            assert args[0] is None and args[1]=="UID" and "*" not in args[2]
            low,high=map(int,args[2].split(":"))
            return "OK",[b" ".join(str(uid).encode() for uid in sorted(messages,reverse=True) if low<=uid<=high)]
        ids=[int(value) for value in args[0].split(",")]
        if command=="FETCH":
            assert "BODY.PEEK[" in args[1] and not any(c in args[0] for c in ":*")
            full="BODY.PEEK[]" in args[1]
            import re
            limit=int(re.search(r"<0\.([0-9]+)>",args[1])[1])
            data=[]
            for uid in reversed(ids):
                if uid not in messages:continue
                message=messages[uid];raw=message["raw"]
                literal=raw if full else raw.split(b"\r\n\r\n",1)[0]+b"\r\n\r\n"
                literal=literal[:limit]
                date=message["date"]
                date=date.strftime("%d-%b-%Y %H:%M:%S %z") if isinstance(date,datetime) else date
                descriptor=(f'7 (UID {uid} FLAGS ('.encode()+b" ".join(message["flags"])+
                    f') INTERNALDATE "{date}" RFC822.SIZE {len(raw)} BODY[{" " if False else "" if full else "HEADER"}]<0> {{{len(literal)}}}'.encode())
                data.append((descriptor,literal));data.append(b")")
            if self.missing_fetch and data:data=data[2:]
            return "OK",data
        assert not self.readonly
        if command=="STORE":
            assert args[1:]==("+FLAGS.SILENT",r"(\Deleted)")
            if self.fail_store=="before":raise RuntimeError(SECRET)
            for uid in ids:
                if uid in messages:messages[uid]["flags"].add(b"\\Deleted")
            if self.fail_store=="after":raise RuntimeError(SECRET)
            return "OK",[b""]
        if command=="EXPUNGE":
            for uid in ids[:1] if self.partial else ids:
                if uid in messages and b"\\Deleted" in messages[uid]["flags"]:del messages[uid]
            if self.fail_expunge:raise RuntimeError(SECRET)
            return "OK",[b""]
        raise AssertionError("Forbidden protocol command")

    def logout(self):
        self.tick("LOGOUT")
        if self.logout_error:raise RuntimeError(SECRET)
        return "BYE",[b""]

    def shutdown(self):self.tick("SHUTDOWN")
    def close(self):self.tick("CLOSE");raise AssertionError("CLOSE forbidden")
    def expunge(self):raise AssertionError("plain EXPUNGE forbidden")


class CleanupTests(unittest.TestCase):
    def setUp(self):
        self.temporary=tempfile.TemporaryDirectory()
        self.directory=Path(self.temporary.name)/"state"
        self.config=Config("imap.mail.ovh.net",993,OWNER,SECRET,self.directory)
        self.fake=Fake()

    def tearDown(self):self.temporary.cleanup()

    def call(self, now=NOW, **kwargs):
        return run(kwargs.pop("config",self.config),now=now,factory=self.fake.factory,**kwargs)

    def mature(self):
        self.call();return self.call(LATER)

    def execute(self, now=LATER, **kwargs):
        return self.call(now,config=replace(self.config,dry_run=False),execute=True,outside_window=True,**kwargs)

    def snapshot(self, state):
        from maintenance.mail_common import Budget
        box=Mailbox(self.config,Budget(20),state.digest,self.fake.factory).connect()
        try:return box.snapshot()
        finally:box.finish()

    def test_dry_run_is_readonly_no_seen_or_mutations_even_with_execute_cli(self):
        self.fake.add(b"Sent mail",91)
        result=self.call(execute=True)
        self.assertTrue(result["dry_run"]);self.assertEqual(result["matched"],1)
        self.assertEqual(self.fake.mutations,[])
        self.assertNotIn(b"\\Seen",self.fake.messages[b"Sent mail"][91]["flags"])
        self.assertTrue(all(command!="SELECT" for command,_ in self.fake.calls))
        self.assertTrue(self.fake.calls[-1][0]=="LOGOUT")

    def test_explicit_dry_run_stronger_than_both_execute_gates(self):
        self.fake.add(b"Sent mail",91);self.mature()
        result=self.call(LATER,config=replace(self.config,dry_run=False),execute=True,dry_run=True)
        self.assertTrue(result["dry_run"]);self.assertEqual(self.fake.mutations,[])

    def test_service_calendar_age_and_copy_first_observation_both_required(self):
        self.fake.add(b"Sent mail",91)
        first=self.call();self.assertEqual(first["eligible"],0)
        boundary=self.call(datetime(2026,2,28,12,tzinfo=UTC));self.assertEqual(boundary["eligible"],0)
        later=self.call(LATER);self.assertEqual(later["eligible"],1)
        self.fake.add(b"Sent mail",92,service("new-copy"))
        self.assertEqual(self.call(LATER)["eligible"],1)

    def test_addressed_delete_uses_exact_uids_and_keeps_foreign_deleted(self):
        self.fake.add(b"Sent mail",91);self.fake.add(b"Sent mail",93,service("second"))
        self.fake.add(b"Sent mail",92,email("control"),flags=[b"\\Deleted"])
        self.mature();result=self.execute()
        self.assertEqual(result["deleted"],2)
        self.assertEqual(set(self.fake.messages[b"Sent mail"]),{92})
        self.assertEqual([args[0] for name,args in self.fake.calls if name=="EXPUNGE"],["91,93"])
        self.assertFalse(any(name=="CLOSE" for name,_ in self.fake.calls))

    def test_invalid_unrelated_header_blocks_service_due_to_possible_hidden_reply(self):
        self.fake.add(b"Sent mail",91);self.mature()
        self.fake.add(b"INBOX",5,email("broken").replace(b"Message-ID:",b"Broken-ID:"))
        self.assertEqual(self.call(LATER)["eligible"],0)
        self.execute()
        self.assertEqual(self.fake.mutations,[])

    def test_owner_handles_are_opt_in_readonly_and_do_not_disclose_mail(self):
        self.fake.add(b"WWHYPDA-Closed",4,email("private-handle-canary"))
        output=io.StringIO()
        with redirect_stdout(output):
            self.call(list_state=True,execute=True,config=replace(self.config,dry_run=False))
        rows=[json.loads(line) for line in output.getvalue().splitlines()]
        self.assertEqual(len(rows),1)
        self.assertRegex(rows[0]["handle"],r"^[0-9a-f]{64}$")
        self.assertNotIn("private-handle-canary",output.getvalue())
        self.assertEqual(self.fake.mutations,[])

    def test_runtime_budget_stops_at_rome_two_even_for_late_start(self):
        self.assertEqual(execution_seconds(datetime(2026,1,31,0,59,59,tzinfo=UTC),900),1)
        self.assertEqual(execution_seconds(datetime(2026,7,30,23,30,tzinfo=UTC),900),900)
        with self.assertRaisesRegex(MailSafetyError,"outside_window"):
            execution_seconds(datetime(2026,1,31,1,0,tzinfo=UTC),900)

    def test_connection_failure_categories_do_not_render_server_or_secret(self):
        import socket
        from maintenance.mail_common import Budget
        cases = [
            (socket.gaierror(SECRET), "network_dns"),
            (TimeoutError(SECRET), "network_timeout"),
            (ConnectionRefusedError(SECRET), "network_connection"),
            (ssl.SSLCertVerificationError(SECRET), "tls_certificate"),
            (ssl.SSLError(SECRET), "tls_handshake"),
            (RuntimeError(SECRET), "connection_failed"),
        ]
        for failure,category in cases:
            with self.subTest(category=category):
                def factory(*args,**kwargs):
                    raise failure
                box=Mailbox(self.config,Budget(20),lambda *args:"unused",factory)
                with self.assertRaises(MailSafetyError) as caught:
                    box.connect()
                self.assertEqual(str(caught.exception),category)
                self.assertNotIn(SECRET,str(caught.exception))

    def test_login_rejection_and_disconnect_are_distinguished_without_response(self):
        import imaplib
        from maintenance.mail_common import Budget
        for failure,category in [
                (imaplib.IMAP4.error(SECRET),"login_rejected"),
                (imaplib.IMAP4.abort(SECRET),"network_connection"),
                (RuntimeError(SECRET),"login_failed")]:
            with patch.object(self.fake,"login",side_effect=failure):
                box=Mailbox(self.config,Budget(20),lambda *args:"unused",self.fake.factory)
                with self.assertRaisesRegex(MailSafetyError,category):
                    box.connect()
                self.assertEqual(self.fake.calls[-1][0],"LOGOUT")

    def test_preflight_exposes_safe_progress_not_folder_names_or_response(self):
        result=summary(True)
        def fail(fake,command,args):
            if command=="LIST":
                raise TypeError(SECRET+" private-folder-canary")
        self.fake.hook=fail
        with self.assertRaises(TypeError):
            self.call(preflight=True,result=result)
        self.assertEqual(result["phase"],"list")
        self.assertTrue(result["uidplus"])
        self.assertNotIn("private-folder-canary",json.dumps(result))

    def test_fetch_metadata_after_literal_is_joined_before_uid_validation(self):
        self.fake.add(b"Sent mail",91)
        original=self.fake.uid
        def reordered(command,*args):
            kind,data=original(command,*args)
            if command!="FETCH":
                return kind,data
            reordered=[]
            for entry in data:
                if isinstance(entry,tuple):
                    descriptor,raw=entry
                    prefix,body=descriptor.split(b" BODY[",1)
                    sequence,metadata=prefix.split(b" (",1)
                    reordered.extend([(sequence+b" (BODY["+body,raw),b" "+metadata+b")"])
            return kind,reordered
        with patch.object(self.fake,"uid",side_effect=reordered):
            report=self.mature()
            self.assertEqual(report["matched"],1)
            self.assertEqual(report["eligible"],1)
            self.assertEqual(self.execute()["deleted"],1)

    def test_fetch_duplicate_uid_after_literal_is_rejected(self):
        self.fake.add(b"Sent mail",91)
        original=self.fake.uid
        def duplicate(command,*args):
            kind,data=original(command,*args)
            if command=="FETCH":
                data=[b" UID 91)" if entry==b")" else entry for entry in data]
            return kind,data
        with patch.object(self.fake,"uid",side_effect=duplicate):
            with self.assertRaisesRegex(MailSafetyError,"protocol"):
                self.call()
        self.assertEqual(self.fake.mutations,[])

    def test_multipart_support_headers_are_parsed_without_missing_body_defect(self):
        from email.parser import BytesParser
        msg=BytesParser(policy=policy.SMTP).parsebytes(email("multipart-support"))
        msg.add_alternative("<p>Synthetic support text</p>",subtype="html")
        raw=msg.as_bytes(policy=policy.SMTP)
        self.fake.add(b"WWHYPDA-Closed",4,raw)
        report=self.call()
        self.assertEqual(report["closed"],1)
        self.assertEqual(report["invalid_headers"],0)
        self.assertFalse(report["support_observation_blocked"])
        self.assertFalse(service_message(raw))

    def test_unsafe_observation_reports_aggregate_reasons_without_headers(self):
        self.fake.add(b"WWHYPDA-Closed",4,email("private-invalid").replace(b"Message-ID:",b"Invalid-ID:"))
        report=self.call()
        self.assertEqual(report["unsafe"],1)
        self.assertEqual(report["invalid_headers"],1)
        self.assertTrue(report["support_observation_blocked"])
        self.assertNotIn("private-invalid",json.dumps(report))
        self.assertEqual(self.fake.mutations,[])

    def test_exact_templates_and_bad_variants(self):
        self.assertTrue(service_message(service()))
        for subject,body in [("Your new activation code","Your new activation code: 123456"),("Password Reset Code","Your password reset code: 123456")]:
            self.assertTrue(service_message(service(subject=subject,body=body)))
        for raw in [service(body="Your activation code: １２３４５６"),service(body="Your activation code: 123456\nsupport text"),
                    service(subject="Re: Activate your account"),email(body="Your activation code: 123456"),
                    service().replace(b"charset=\"utf-8\"",b"charset=\"unknown-codec\""),
                    service().replace(b"Content-Type: text/plain",b"Content-Type: text/html"),
                    service().replace(b"Subject: Activate",b"Subject: Duplicate\r\nSubject: Activate"),
                    service().replace(b"MIME-Version: 1.0",b"MIME-Version: 1.0\r\nContent-Disposition: attachment")]:
            self.assertFalse(service_message(raw))
        multipart=EmailMessage();multipart["From"]=OWNER;multipart["Subject"]="Activate your account";multipart["Message-ID"]="<multi@example.test>"
        multipart.set_content("Your activation code: 123456");multipart.add_alternative("<p>code</p>",subtype="html")
        self.assertFalse(service_message(multipart.as_bytes(policy=policy.SMTP)))

    def test_references_reply_and_drafts_veto_service(self):
        self.fake.add(b"Sent mail",91)
        self.fake.add(b"INBOX",2,email("reply",refs=["service"]))
        self.mature();self.assertEqual(self.execute()["deleted"],0)
        self.fake.messages[b"INBOX"].clear()
        self.fake.add(b"Drafts",3,email("draft",refs=["service"]))
        self.assertEqual(self.call(LATER)["eligible"],0)

    def test_reference_less_reply_is_veto_not_positive_merge(self):
        self.fake.add(b"Sent mail",91)
        self.fake.add(b"INBOX",2,email("reply",subject="Re: Activate your account"))
        self.mature();self.assertEqual(self.call(LATER)["eligible"],0)

    def test_empty_sent_and_ambiguous_sent_do_not_create_copies(self):
        self.assertEqual(self.call()["matched"],0);self.assertEqual(self.fake.mutations,[])
        self.fake.folders[b"Other Sent"]={b"\\Sent"};self.fake.messages[b"Other Sent"]={};self.fake.validity[b"Other Sent"]=123;self.fake.next[b"Other Sent"]=1
        self.fake.add(b"Sent mail",91)
        self.assertFalse(self.call()["sent_available"])
        self.assertTrue(self.call(config=replace(self.config,sent="Sent mail"))["sent_available"])

    def test_closed_at_starts_at_first_observation_and_expires_strictly(self):
        self.fake.add(b"WWHYPDA-Closed",4,email("support"))
        first=self.call();self.assertEqual(first["closed"],1);self.assertEqual(first["expired"],0)
        self.assertEqual(self.call(datetime(2026,2,28,12,tzinfo=UTC))["expired"],0)
        self.assertEqual(self.call(LATER)["expired"],0)
        self.assertEqual(self.call(datetime(2026,7,31,12,tzinfo=UTC))["expired"],0)
        self.assertEqual(self.call(datetime(2026,7,31,12,0,1,tzinfo=UTC))["expired"],1)
        with State(self.directory) as state:
            self.assertEqual(state.db.execute("SELECT closed_at FROM threads").fetchone()[0],NOW.isoformat())

    def test_reopened_is_sticky_with_remnants_then_observed_outside_cycle(self):
        self.fake.add(b"WWHYPDA-Closed",4,email("support"));self.call()
        self.fake.add(b"INBOX",2,email("reply",refs=["support"]));self.assertEqual(self.call(LATER)["reopened"],1)
        self.fake.messages[b"INBOX"].clear()
        self.assertEqual(self.call(LATER)["reopened"],1)
        old=self.fake.messages[b"WWHYPDA-Closed"].pop(4)
        self.fake.add(b"INBOX",9,old["raw"]);self.call(LATER)
        self.fake.messages[b"INBOX"].clear();self.fake.add(b"WWHYPDA-Closed",10,old["raw"])
        result=self.call(LATER);self.assertEqual(result["closed"],1)
        with State(self.directory) as state:
            self.assertEqual(state.db.execute("SELECT closed_at FROM threads").fetchone()[0],LATER.isoformat())

    def test_explicit_reclose_is_narrow_and_restarts_support_period_without_mail_mutation(self):
        self.fake.add(b"WWHYPDA-Closed",4,email("support"));self.call()
        self.fake.add(b"INBOX",2,email("reply",refs=["support"]));self.call()
        self.fake.messages[b"INBOX"].clear();self.call()
        with State(self.directory) as state:token=state.db.execute("SELECT token FROM threads").fetchone()[0]
        self.assertEqual(self.call(LATER,reclose=token)["closed"],1)
        self.assertEqual(self.fake.mutations,[])

    def test_private_due_lookup_matches_message_without_exposing_raw_ids(self):
        self.fake.add(b"WWHYPDA-Closed",4,email("owner-map"))
        self.call()
        output=io.StringIO()
        with redirect_stdout(output):
            self.call(list_state=True,lookup_message_id='<owner-map@example.test>')
        row=json.loads(output.getvalue().splitlines()[0])
        self.assertEqual(row["due_at"],datetime(2026,7,31,12,tzinfo=UTC).isoformat())
        self.assertNotIn('owner-map',output.getvalue())
        self.assertEqual(len(row['handle']),64)
        with self.assertRaisesRegex(MailSafetyError,"configuration"):
            self.call(lookup_message_id='<owner-map@example.test>')
        output=io.StringIO()
        with redirect_stdout(output):self.call(list_state=True,lookup_message_id='<missing@example.test>')
        self.assertEqual(output.getvalue(),'')
        self.assertEqual(self.fake.mutations,[])

    def test_existing_monthly_expired_state_recomputes_six_months_without_resetting_closure(self):
        self.fake.add(b"WWHYPDA-Closed",4,email("old-rule"));self.call()
        with State(self.directory) as state:
            with state.transaction():
                state.db.execute("UPDATE threads SET status='expired'")
        report=self.call(LATER)
        self.assertEqual(report["expired"],0)
        self.assertEqual(report["closed"],1)
        with State(self.directory) as state:
            self.assertEqual(state.db.execute("SELECT closed_at FROM threads").fetchone()[0],NOW.isoformat())
        self.assertEqual(self.fake.mutations,[])

    def test_six_month_calendar_keeps_original_day_and_leap_boundary(self):
        self.assertEqual(month_after(datetime(2023,8,31,12,tzinfo=UTC),6),datetime(2024,2,29,12,tzinfo=UTC))
        self.assertEqual(month_after(datetime(2024,8,31,12,tzinfo=UTC),6),datetime(2025,2,28,12,tzinfo=UTC))
        self.assertEqual(month_after(NOW,6),datetime(2026,7,31,12,tzinfo=UTC))
        self.assertTrue(old_enough(NOW,LATER))  # Unchanged one-month service rule.
        self.assertFalse(old_enough(NOW,LATER,6))

    def test_reply_cancels_six_month_due_and_explicit_reclose_restarts_it(self):
        self.fake.add(b"WWHYPDA-Closed",4,email("six-month-reopen"));self.call()
        future=datetime(2026,8,1,12,tzinfo=UTC)
        self.fake.add(b"INBOX",2,email("new-reply",refs=["six-month-reopen"]))
        self.assertEqual(self.call(future)["reopened"],1)
        self.fake.messages[b"INBOX"].clear()
        with State(self.directory) as state:
            token,status,closed_at=state.db.execute("SELECT token,status,closed_at FROM threads").fetchone()
            self.assertIsNone(closed_at)
        self.assertEqual(self.call(future,reclose=token)["closed"],1)
        self.assertEqual(self.call(datetime(2026,9,2,12,tzinfo=UTC))["expired"],0)
        self.assertEqual(self.call(datetime(2027,2,1,12,0,1,tzinfo=UTC))["expired"],1)
        self.assertEqual(self.fake.mutations,[])

    def test_support_flag_cannot_bypass_unresolved_cross_folder_race(self):
        self.fake.add(b"WWHYPDA-Closed",4,email());self.mature()
        with self.assertRaisesRegex(MailSafetyError,"support_race_unapproved"):
            self.call(LATER,config=replace(self.config,dry_run=False,support_delete=True),execute=True,outside_window=True)
        self.assertEqual(self.fake.mutations,[])

    def test_unknown_draft_duplicate_id_missing_reference_and_cycles_are_unsafe(self):
        self.fake.add(b"WWHYPDA-Closed",4,email("a",refs=["b"]))
        self.fake.add(b"WWHYPDA-Closed",5,email("b",refs=["a"]))
        self.assertGreater(self.call()["unsafe"],0)
        self.fake.messages[b"WWHYPDA-Closed"].clear()
        self.fake.add(b"WWHYPDA-Closed",4,email("a",refs=["missing"]))
        self.assertEqual(self.call()["unsafe"],1)
        self.fake.messages[b"WWHYPDA-Closed"].clear();self.fake.add(b"WWHYPDA-Closed",4,email("a"));self.fake.add(b"WWHYPDA-Closed",5,email("a"))
        self.assertGreater(self.call()["unsafe"],0)
        self.fake.add(b"Drafts",3,email("draft").replace(b"Message-ID: <draft@example.test>\r\n",b""))
        self.assertGreater(self.call()["unsafe"],0)

    def test_invalid_naive_future_dates_skip(self):
        self.fake.add(b"Sent mail",91,date="31-Feb-2026 12:00:00 +0000");self.mature()
        self.assertEqual(self.call(LATER)["eligible"],0)
        self.fake.messages[b"Sent mail"][91]["date"]=LATER+timedelta(days=1)
        self.assertEqual(self.call(LATER)["eligible"],0)
        self.assertIsNone(internal_date("01-Jan-2026 12:00:00"))
        self.assertIsNone(internal_date("01-Jan-2026 12:00:00 +9960"))

    def test_uidplus_notsticky_permissions_and_readonly_refusal_fail_closed(self):
        self.fake.add(b"Sent mail",91);self.mature()
        self.fake.cap=b"IMAP4rev1"
        with self.assertRaises(MailSafetyError):self.execute()
        self.assertEqual(self.fake.mutations,[])
        self.fake.cap=b"IMAP4rev1 UIDPLUS";self.fake.notsticky=True
        with self.assertRaises(MailSafetyError):self.call()
        self.fake.notsticky=False;self.fake.permission=False
        with self.assertRaises(MailSafetyError):self.execute()
        self.assertEqual(self.fake.mutations,[])
        self.fake.permission=True;self.fake.refuse_readonly=True
        with self.assertRaises(MailSafetyError):self.call()
        self.assertEqual(self.fake.mutations,[])

    def test_uidvalidity_change_before_store_blocks_mutation(self):
        self.fake.add(b"Sent mail",91);self.mature()
        def change(fake,command,args):
            if command=="SELECT":fake.validity[args[0][1:-1]]=124
        self.fake.hook=change
        with self.assertRaises(MailSafetyError):self.execute()
        self.assertEqual(self.fake.mutations,[])

    def test_new_reply_before_mutation_stops_fresh_snapshot(self):
        self.fake.add(b"Sent mail",91);self.mature()
        count=0
        def change(fake,command,args):
            nonlocal count
            if command=="LIST":
                count+=1
                if count==3:fake.add(b"INBOX",3,email("reply",refs=["service"]))
        self.fake.hook=change
        with self.assertRaises(MailSafetyError):self.execute()
        self.assertEqual(self.fake.mutations,[])

    def test_failures_before_store_between_store_expunge_and_after_expunge_reconcile_only(self):
        for failure in ("before","after","expunge"):
            with self.subTest(failure=failure):
                with tempfile.TemporaryDirectory() as folder:
                    cfg=replace(self.config,state_dir=Path(folder)/"state")
                    self.fake=Fake();self.fake.add(b"Sent mail",91)
                    self.call(config=cfg);self.call(LATER,config=cfg)
                    self.fake.fail_store=failure if failure!="expunge" else None
                    self.fake.fail_expunge=failure=="expunge"
                    with self.assertRaises(RuntimeError):self.call(LATER,config=replace(cfg,dry_run=False),execute=True,outside_window=True)
                    count=len(self.fake.mutations)
                    self.fake.fail_store=None;self.fake.fail_expunge=False
                    report=self.call(LATER,config=cfg)
                    self.assertEqual(len(self.fake.mutations),count)
                    self.assertEqual(report["pending"],1 if failure=="after" else 0)
                    self.assertFalse(any(name=="CLOSE" for name,_ in self.fake.calls))

    def test_partial_batch_unknown_outcome_never_replays(self):
        self.fake.add(b"Sent mail",91);self.fake.add(b"Sent mail",93,service("other"));self.mature()
        self.fake.partial=True
        with self.assertRaises(MailSafetyError):self.execute()
        count=len(self.fake.mutations)
        self.assertEqual(self.call(LATER)["pending"],1);self.assertEqual(len(self.fake.mutations),count)
        with self.assertRaisesRegex(MailSafetyError,"pending"):self.execute()
        self.assertEqual(len(self.fake.mutations),count)

    def test_change_after_first_portion_stops_remaining_and_records_partial_result(self):
        self.fake.add(b"Sent mail",91);self.fake.add(b"Sent mail",93,service("other"));self.mature()
        def change(fake,command,args):
            if command=="EXPUNGE":fake.add(b"INBOX",2,email("newreply",refs=["other"]))
        self.fake.hook=change
        result=summary(False)
        with self.assertRaises(MailSafetyError):
            self.call(LATER,config=replace(self.config,dry_run=False,batch=1),execute=True,outside_window=True,result=result)
        self.assertEqual(result["deleted"],1);self.assertIn(93,self.fake.messages[b"Sent mail"])

    def test_state_permissions_hmac_no_content_and_nonblocking_lock(self):
        self.fake.add(b"WWHYPDA-Closed",4,email("private-marker",body="PRIVATE-BODY-CANARY"));self.call()
        self.assertEqual(self.directory.stat().st_mode & 0o777,0o700)
        for name in ("state.key","state.sqlite3","state.witness","mail.lock"):
            self.assertEqual((self.directory/name).stat().st_mode & 0o777,0o600)
        data=(self.directory/"state.sqlite3").read_bytes()
        for value in [OWNER.encode(),b"PRIVATE-BODY-CANARY",b"private-marker",b"A support question",SECRET.encode(),b"WWHYPDA-Closed"]:
            self.assertNotIn(value,data)
        with State(self.directory):
            with self.assertRaisesRegex(MailSafetyError,"locked"):
                with State(self.directory):pass

    def test_missing_key_corrupt_state_and_witness_rollback_reset_baseline(self):
        self.fake.add(b"WWHYPDA-Closed",4,email());self.call()
        before=(self.directory/"state.sqlite3").read_bytes()
        self.call(LATER)
        (self.directory/"state.sqlite3").write_bytes(before)
        report=self.call(LATER);self.assertTrue(report["baseline_rebuilt"]);self.assertEqual(report["expired"],0)
        (self.directory/"state.key").unlink()
        self.assertTrue(self.call(LATER)["baseline_rebuilt"])
        (self.directory/"state.sqlite3").write_bytes(b"broken sqlite")
        self.assertTrue(self.call(LATER)["baseline_rebuilt"])

    def test_namespace_change_and_explicit_restore_baseline_never_shorten_hold(self):
        self.fake.add(b"Sent mail",91);self.mature()
        changed=self.call(LATER,config=replace(self.config,username="different@example.test"))
        self.assertTrue(changed["baseline_rebuilt"]);self.assertEqual(changed["eligible"],0)
        restored=self.call(LATER,rebaseline=True);self.assertEqual(restored["eligible"],0)
        self.assertEqual(self.fake.mutations,[])

    def test_no_select_utf7_quoted_and_literal_folder_names(self):
        entries=[b'(\\NoSelect) "/" "Container"',b'(\\Sent) "/" "Sent mail"',b'() "/" "&BB8EQAQ4BDIENQRC-"',
            (b'() "/" {13}',b'Literal space')]
        folders=parse_list(entries)
        self.assertTrue(any(f.name=="Привет" for f in folders))
        self.assertTrue(any(f.name=="Literal space" for f in folders))
        self.assertFalse(next(f for f in folders if f.name=="Container").selectable)
        self.fake.folders[b"Container"]={b"\\NoSelect"}
        self.assertEqual(self.call()["folders"],5)

    def test_incomplete_list_fetch_limits_never_mutate(self):
        self.fake.add(b"Sent mail",91);self.mature()
        self.fake.bad_list=True
        with self.assertRaises(MailSafetyError):self.execute()
        self.fake.bad_list=False;self.fake.missing_fetch=True
        with self.assertRaises(MailSafetyError):self.execute()
        self.fake.missing_fetch=False
        with self.assertRaises(MailSafetyError):self.call(config=replace(self.config,max_header=20))
        with self.assertRaises(MailSafetyError):self.call(config=replace(self.config,max_messages=0))
        self.assertEqual(self.fake.mutations,[])

    def test_bad_flags_credentials_failure_and_exception_output_never_leak(self):
        env={"MAIL_CLEANUP_IMAP_USERNAME":OWNER,"MAIL_CLEANUP_IMAP_PASSWORD":SECRET,"MAIL_CLEANUP_STATE_DIR":str(self.directory)}
        for value in ("yes","","0"):
            with self.assertRaises(MailSafetyError):Config.from_env({**env,"MAIL_CLEANUP_DRY_RUN":value})
        self.assertNotIn(SECRET,repr(self.config))
        self.fake.fail_login=True;output=io.StringIO()
        with patch.dict(os.environ,env,clear=True),patch("maintenance.mail_cleanup.run",side_effect=RuntimeError(SECRET+" private@example.test Private-Folder-Canary Subject")),redirect_stdout(output):
            self.assertEqual(main(["--once"]),1)
        for value in [SECRET,"private@example.test","Subject","Private-Folder-Canary"]:self.assertNotIn(value,output.getvalue())
        with self.assertRaises(MailSafetyError):self.call()
        self.assertFalse(any(name=="CLOSE" for name,_ in self.fake.calls))

    def test_timeout_and_cleanup_logout_failure_never_close(self):
        self.fake.logout_error=True;self.call()
        self.assertEqual(self.fake.calls[-1][0],"SHUTDOWN")
        with self.assertRaisesRegex(MailSafetyError,"deadline"):
            with process_deadline(.03):time.sleep(.2)
        with self.assertRaisesRegex(MailSafetyError,"terminated"):
            with process_deadline(1):os.kill(os.getpid(),signal.SIGTERM)

    def test_probe_is_separate_explicit_test_folder_only_and_retains_deleted_control(self):
        folder=b"WWHYPDA-Cleanup-Test-acceptance"
        self.fake.folders[folder]=set();self.fake.messages[folder]={};self.fake.validity[folder]=765;self.fake.next[folder]=1
        self.fake.add(folder,7,email("probe1"));self.fake.add(folder,11,email("control"),flags=[b"\\Deleted"]);self.fake.add(folder,8,email("control2"))
        env={"MAIL_CLEANUP_PROBE_DELETE_ENABLED":"true","MAIL_CLEANUP_PROBE_FOLDER":folder.decode(),
             "MAIL_CLEANUP_PROBE_UIDS":"7","MAIL_CLEANUP_PROBE_CONTROL_UIDS":"8,11"}
        self.call(probe=True,env=env)
        result=self.execute(now=NOW,probe=True,env=env)
        self.assertEqual(result["deleted"],1);self.assertEqual(set(self.fake.messages[folder]),{8,11})
        with self.assertRaises(MailSafetyError):self.call(probe=True,env={**env,"MAIL_CLEANUP_PROBE_FOLDER":"INBOX"})
        with self.assertRaises(MailSafetyError):self.call(probe=True,env={**env,"MAIL_CLEANUP_PROBE_UIDS":"8,11"})

    def test_preflight_creates_no_state_or_messages(self):
        result=self.call(preflight=True)
        self.assertTrue(result["uidplus"]);self.assertTrue(result["sent_available"])
        self.assertFalse(self.directory.exists());self.assertEqual(self.fake.mutations,[])
        self.assertFalse(any(name=="FETCH" for name,_ in self.fake.calls))

    def test_calendar_month_dst_window_and_invalid_uids(self):
        self.assertEqual(month_after(NOW),datetime(2026,2,28,12,tzinfo=UTC))
        self.assertEqual(month_after(datetime(2024,1,31,tzinfo=UTC)).day,29)
        self.assertEqual(month_after(datetime(2026,12,31,tzinfo=UTC)).year,2027)
        self.assertFalse(old_enough(datetime(2026,1,1),NOW))
        self.assertTrue(scheduled_window(datetime(2026,10,24,23,30,tzinfo=UTC)))
        self.assertFalse(scheduled_window(datetime(2026,10,25,0,30,tzinfo=UTC)))
        self.assertFalse(scheduled_window(datetime(2026,10,25,1,30,tzinfo=UTC)))
        self.assertTrue(scheduled_window(datetime(2026,3,29,0,30,tzinfo=UTC)))
        for value in ("*","1:3","1,1","0","1,999999999999"):
            with self.assertRaises(MailSafetyError):parse_uid_set(value)

    def test_prune_completed_operations_and_missing_threads_is_bounded(self):
        self.fake.add(b"WWHYPDA-Closed",4,email());self.call()
        with State(self.directory) as state:
            with state.transaction():
                state.db.execute("INSERT INTO operations VALUES (1,?,'done','hmac-folder',1,9,'hmac-content','absent')",(OLD.isoformat(),))
                state.db.execute("INSERT INTO operations VALUES (2,?,'intent','hmac-folder',1,10,'hmac-content','pending')",(OLD.isoformat(),))
            state.prune(LATER)
            self.assertEqual(state.db.execute("SELECT id FROM operations").fetchall(),[(2,)])


if __name__=="__main__":unittest.main()
