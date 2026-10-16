"""No network: synthetic probe fixture preparation/authorization and exact deletion."""
from dataclasses import replace
from datetime import datetime
import io
import json
import unittest
from contextlib import redirect_stdout
from unittest.mock import patch

from maintenance.mail_common import MailSafetyError,UTC
from maintenance.mail_imap import quoted
from maintenance.mail_probe_fixture import FOLDER,MANIFEST,prepare,check_or_execute,main
from tests.test_mail_cleanup import Fake,email,SECRET
from tests import test_mail_cleanup as cleanup_tests


class FixtureFake(Fake):
    def __init__(self):
        super().__init__()
        folder=FOLDER.encode()
        self.folders[folder]=set()
        self.messages[folder]={}
        self.validity[folder]=765
        self.next[folder]=1
        self.appenduid=None

    def append(self,folder,flags,date,raw):
        self.tick("APPEND",folder)
        assert folder==quoted(FOLDER.encode()) and flags in ("()",r"(\Deleted)")
        uid=self.next[FOLDER.encode()]
        self.add(FOLDER.encode(),uid,raw,
            flags=[b"\\Recent"]+([b"\\Deleted"] if flags==r"(\Deleted)" else []),
            date=datetime(2026,10,16,12,tzinfo=UTC))
        self.appenduid=f"765 {uid}".encode()
        return "OK",[b"appended"]

    def response(self,name):
        if name=="APPENDUID":
            value=self.appenduid
            self.appenduid=None
            return name,[value]
        return super().response(name)


class FixtureTests(unittest.TestCase):
    setUp=cleanup_tests.CleanupTests.setUp
    tearDown=cleanup_tests.CleanupTests.tearDown

    def fixture(self):
        self.fake=FixtureFake()
        return prepare(self.config,factory=self.fake.factory)

    def dry(self):
        return check_or_execute(self.config,factory=self.fake.factory)

    def execute(self,config=None,confirm=True):
        return check_or_execute(config or replace(self.config,dry_run=False),
            execute=True,confirm_delete=confirm,factory=self.fake.factory)

    def test_prepare_dry_execute_exact_target_and_two_controls_retained(self):
        self.assertEqual(self.fixture()["prepared"],3)
        # Recent is session-local and disappears on a later connection.
        for message in self.fake.messages[FOLDER.encode()].values():
            message["flags"].discard(b"\\Recent")
        dry=self.dry()
        self.assertTrue(dry["dry_run"])
        self.assertEqual(dry["eligible"],1)
        result=self.execute()
        self.assertEqual(result["deleted"],1)
        self.assertTrue(result["controls_preserved"])
        messages=self.fake.messages[FOLDER.encode()]
        self.assertEqual(set(messages),{2,3})
        self.assertIn(b"\\Deleted",messages[3]["flags"])
        self.assertEqual([args[0] for kind,args in self.fake.calls if kind=="EXPUNGE"],["1"])
        self.assertFalse(any(kind=="CLOSE" for kind,_ in self.fake.calls))
        with self.assertRaises(MailSafetyError):
            self.execute()

    def test_prepare_refuses_missing_or_nonempty_folder_without_mutations(self):
        self.fake=FixtureFake()
        self.fake.add(FOLDER.encode(),9,email("existing"))
        with self.assertRaises(MailSafetyError):
            prepare(self.config,factory=self.fake.factory)
        self.assertEqual(self.fake.mutations,[])
        del self.fake.folders[FOLDER.encode()]
        with self.assertRaises(MailSafetyError):
            prepare(self.config,factory=self.fake.factory)
        self.assertEqual(self.fake.mutations,[])

    def test_prepare_refuses_repeat_or_missing_uidplus(self):
        self.fixture()
        count=len(self.fake.mutations)
        with self.assertRaises(MailSafetyError):
            prepare(self.config,factory=self.fake.factory)
        self.assertEqual(len(self.fake.mutations),count)

    def test_no_uidplus_refuses_before_append(self):
        self.fake=FixtureFake();self.fake.cap=b"IMAP4rev1"
        with self.assertRaises(MailSafetyError):
            prepare(self.config,factory=self.fake.factory)
        self.assertEqual(self.fake.mutations,[])

    def test_execute_needs_dry_first_and_two_explicit_gates(self):
        self.fixture()
        count=len(self.fake.mutations)
        with self.assertRaises(MailSafetyError):self.execute()
        self.dry()
        with self.assertRaises(MailSafetyError):self.execute(confirm=False)
        with self.assertRaises(MailSafetyError):self.execute(config=self.config)
        self.assertEqual(len(self.fake.mutations),count)

    def test_manifest_tampering_and_account_change_fail_without_mail_mutations(self):
        self.fixture();self.dry()
        count=len(self.fake.mutations)
        with self.assertRaises(MailSafetyError):
            self.execute(config=replace(self.config,dry_run=False,username="different@example.test"))
        path=self.directory/MANIFEST
        document=json.loads(path.read_text())
        document["payload"]["uids"]["target"]=2
        path.write_text(json.dumps(document))
        with self.assertRaises(MailSafetyError):self.execute()
        self.assertEqual(len(self.fake.mutations),count)
        self.assertEqual(path.stat().st_mode & 0o777,0o600)
        self.assertNotIn(SECRET,path.read_text())

    def test_changed_uidvalidity_or_target_content_is_not_deleted(self):
        self.fixture();self.dry()
        count=len(self.fake.mutations)
        self.fake.validity[FOLDER.encode()]=766
        with self.assertRaises(MailSafetyError):self.execute()
        self.fake.validity[FOLDER.encode()]=765
        self.fake.messages[FOLDER.encode()][1]["raw"]=email("different")
        with self.assertRaises(MailSafetyError):self.execute()
        self.assertEqual(len(self.fake.mutations),count)

    def test_extra_message_in_fixture_folder_blocks_execute(self):
        self.fixture();self.dry()
        count=len(self.fake.mutations)
        self.fake.add(FOLDER.encode(),9,email("outsider"))
        with self.assertRaises(MailSafetyError):self.execute()
        self.assertEqual(len(self.fake.mutations),count)

    def test_creation_and_deletion_confirmation_required_before_password_or_network(self):
        for args in (["--prepare"],["--execute"]):
            with patch("maintenance.mail_probe_fixture.Config.from_env") as cfg:
                output=io.StringIO()
                with redirect_stdout(output):
                    self.assertEqual(main(args),1)
                cfg.assert_not_called()
                self.assertEqual(json.loads(output.getvalue())["error"],"probe_not_authorized")
                self.assertNotIn(SECRET,output.getvalue())
