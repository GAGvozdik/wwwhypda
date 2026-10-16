"""Owner-only synthetic fixture tool, separate from readonly cleanup.

--prepare explicitly APPENDs three synthetic messages into one manually-created
empty test folder. No CREATE, SMTP, STORE, CLOSE or EXPUNGE in preparation.
No actual fixture operation is run by automated tests or by the agent.
"""
from datetime import datetime
from email.message import EmailMessage
from email import policy
import getpass
import hmac
import imaplib
import json
import os
import re
import uuid

from maintenance.mail_common import Budget, Config, MailSafetyError, UTC, process_deadline
from maintenance.mail_imap import Mailbox, quoted
from maintenance.mail_state import State
from maintenance.mail_cleanup import SafeParser, error_location, run

FOLDER = "WWHYPDA-Cleanup-Test-acceptance"
MANIFEST = "probe-fixture.json"


def account(config,state):
    return state.digest("fixture_account",json.dumps([config.host,config.port,config.username]))


def save(state,payload):
    data=json.dumps(payload,sort_keys=True,separators=(",",":"))
    state._atomic(MANIFEST,json.dumps({"payload":payload,"mac":state.digest("fixture",data)}).encode())


def load(state,config):
    try:
        wrapper=json.loads(state._read(state.directory/MANIFEST))
        payload=wrapper["payload"]
        data=json.dumps(payload,sort_keys=True,separators=(",",":"))
        if (not hmac.compare_digest(wrapper["mac"],state.digest("fixture",data))
                or payload["account"]!=account(config,state) or payload["folder"]!=FOLDER
                or payload["status"]!="prepared"):
            raise MailSafetyError("probe_not_authorized")
        uids=payload["uids"]
        if (set(uids)!={"target","control","deleted_control"}
                or any(type(value) is not int or not 1<=value<=4294967295 for value in uids.values())
                or len(set(uids.values()))!=3 or len(payload["signatures"])!=3):
            raise MailSafetyError("probe_not_authorized")
        return payload
    except (OSError,ValueError,TypeError,KeyError):
        raise MailSafetyError("probe_not_authorized") from None


def synthetic(kind,token):
    message=EmailMessage(policy=policy.SMTP)
    message["From"]="cleanup-probe@example.invalid"
    message["To"]="cleanup-control@example.invalid"
    message["Subject"]="WWHYPDA cleanup acceptance "+kind
    message["Message-ID"]=f"<{token}-{kind}@cleanup.example.invalid>"
    message.set_content("Synthetic acceptance fixture. No real user data.")
    return message.as_bytes()


def prepare(config,*,factory=imaplib.IMAP4_SSL):
    with State(config.state_dir) as state:
        if (state.directory/MANIFEST).exists():
            raise MailSafetyError("probe_not_authorized")
        box=Mailbox(config,Budget(config.max_seconds),state.digest,factory)
        try:
            box.connect()
            if "UIDPLUS" not in box.capabilities():
                raise MailSafetyError("uidplus")
            folders=box.folders()
            found=[folder for folder in folders if folder.selectable and folder.name==FOLDER]
            if len(found)!=1:
                raise MailSafetyError("probe_not_authorized")
            folder=found[0]
            if state.digest("folder",folder.wire) in box.resolve(folders).values():
                raise MailSafetyError("probe_not_authorized")
            validity,upper=box.select(folder)
            if box.search(1,upper-1):
                raise MailSafetyError("probe_not_authorized")
            # Folder is already present and empty. Only fresh synthetic data is appended.
            token=uuid.uuid4().hex
            uids={}
            for kind in ("target","control","deleted_control"):
                raw=synthetic(kind,token)
                flags=r"(\Deleted)" if kind=="deleted_control" else "()"
                box.call(box.client.append,quoted(folder.wire),flags,
                    imaplib.Time2Internaldate(datetime.now(UTC)),raw)
                data=box.response("APPENDUID")
                if len(data)!=1 or not isinstance(data[0],bytes):
                    raise MailSafetyError("protocol")
                match=re.fullmatch(rb"([1-9][0-9]*) ([1-9][0-9]*)",data[0])
                if not match or int(match[1])!=validity or int(match[2])>4294967295:
                    raise MailSafetyError("changed")
                uids[kind]=int(match[2])
            if len(set(uids.values()))!=3:
                raise MailSafetyError("changed")
            snapshot=box.snapshot()
            folder_token=state.digest("folder",folder.wire)
            messages={m.uid:m for m in snapshot.messages.values() if m.folder==folder_token}
            if (snapshot.metadata[folder_token][0]!=validity or set(messages)!=set(uids.values())
                    or any(messages[uid].mid!=state.digest("id",f"<{token}-{kind}@cleanup.example.invalid>")
                           for kind,uid in uids.items())
                    or any(messages[uid].flags for kind,uid in uids.items() if kind!="deleted_control")
                    or messages[uids["deleted_control"]].flags!=frozenset({b"\\DELETED"})):
                raise MailSafetyError("changed")
            payload=dict(account=account(config,state),folder=FOLDER,uids=uids,
                signatures={str(uid):message.signature() for uid,message in messages.items()},
                status="prepared",dry_run_passed=False)
            save(state,payload)
            return dict(failed=0,prepared=3,deleted=0,deleted_controls=1)
        finally:
            box.finish()


def check_or_execute(config,*,execute=False,confirm_delete=False,factory=imaplib.IMAP4_SSL,now=None):
    # Both ordinary execute gates plus explicit fixture-only confirmation are mandatory.
    if execute and (not confirm_delete or config.dry_run or config.support_delete):
        raise MailSafetyError("probe_not_authorized")
    with State(config.state_dir) as state:
        payload=load(state,config)
        if execute and not payload["dry_run_passed"]:
            raise MailSafetyError("probe_not_authorized")
        uids=payload["uids"]
    env=dict(MAIL_CLEANUP_PROBE_DELETE_ENABLED="true",MAIL_CLEANUP_PROBE_FOLDER=FOLDER,
        MAIL_CLEANUP_PROBE_UIDS=str(uids["target"]),
        MAIL_CLEANUP_PROBE_CONTROL_UIDS=f'{uids["control"]},{uids["deleted_control"]}')
    result=run(config,probe=True,execute=execute,dry_run=not execute,outside_window=execute,
        env=env,factory=factory,now=now,probe_expected=payload["signatures"])
    with State(config.state_dir) as state:
        current=load(state,config)
        if current!=payload:
            raise MailSafetyError("changed")
        payload["status"]="consumed" if execute else "prepared"
        payload["dry_run_passed"]=True
        save(state,payload)
    return result


def main(argv=None):
    try:
        parser=SafeParser(description="Explicit owner-only synthetic IMAP acceptance fixture.")
        mode=parser.add_mutually_exclusive_group(required=True)
        mode.add_argument("--prepare",action="store_true",help="Append 3 synthetic messages to the existing empty test folder.")
        mode.add_argument("--dry-run",action="store_true")
        mode.add_argument("--execute",action="store_true")
        parser.add_argument("--confirm-create-fixture",action="store_true")
        parser.add_argument("--confirm-delete-fixture-target",action="store_true")
        parser.add_argument("--prompt-password",action="store_true")
        args=parser.parse_args(argv)
        if args.prepare and not args.confirm_create_fixture:
            raise MailSafetyError("probe_not_authorized")
        if args.execute and not args.confirm_delete_fixture_target:
            raise MailSafetyError("probe_not_authorized")
        password=getpass.getpass("Mailbox password: ") if args.prompt_password else None
        config=Config.from_env(password=password)
        os.umask(0o077)
        with process_deadline(config.max_seconds):
            result=prepare(config) if args.prepare else check_or_execute(config,
                execute=args.execute,confirm_delete=args.confirm_delete_fixture_target)
        print(json.dumps(result,sort_keys=True))
        return 0
    except MailSafetyError as error:
        result=dict(failed=1,error=error.category,error_location=error_location(error))
    except Exception:
        # Do not expose raw exception values, responses or fixture identifiers.
        result=dict(failed=1,error="operation_failed")
    print(json.dumps(result,sort_keys=True))
    return 1


if __name__=="__main__":
    raise SystemExit(main())
