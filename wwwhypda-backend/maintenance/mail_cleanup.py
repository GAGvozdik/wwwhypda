"""Standalone one-shot IMAP cleanup. Runtime is Linux; default is readonly dry-run."""
import argparse
from datetime import datetime
import getpass
import hashlib
import hmac
import imaplib
import json
import os
import re
import sys

from maintenance.mail_common import Budget, Config, MailSafetyError, UTC, old_enough, month_after, SUPPORT_RETENTION_MONTHS, process_deadline, scheduled_window, execution_seconds
from maintenance.mail_imap import Mailbox, ID
from maintenance.mail_state import State, graph, observe


def summary(dry_run):
    return dict(dry_run=dry_run, scanned=0, folders=0, matched=0, eligible=0, open=0, closed=0,
        reopened=0, expired=0, unsafe=0, skipped=0, deleted=0, failed=0, pending=0,
        uidplus=False, sent_available=False, drafts_available=False, closed_available=False,
        support_delete=False, baseline_rebuilt=False)


def namespace(config, snapshot, digest):
    return digest("account", json.dumps([config.host,config.port,config.username,
        config.sent,config.closed,config.drafts,
        [[digest("folder",f.wire),sorted(a.decode("ascii") for a in f.attrs if a not in (b"\\MARKED",b"\\UNMARKED")),digest("delimiter",f.delimiter or b"")]
         for f in snapshot.folders],snapshot.roles],sort_keys=True))


def candidates(snapshot, first_seen, now):
    components, unsafe, ambiguous_draft = graph(snapshot)
    eligible = []
    # A malformed message can conceal a reply/reference; completeness is not proof of independence.
    if any(not message.valid for message in snapshot.messages.values()):
        return eligible
    for component in components:
        if len(component) != 1 or ambiguous_draft:
            continue
        message = component[0]
        if (message.service and message.valid and message.identity not in unsafe
                and b"\\DELETED" not in message.flags and b"\\DRAFT" not in message.flags
                and old_enough(message.date, now) and old_enough(first_seen.get(message.identity), now)):
            eligible.append(message)
    return sorted(eligible,key=lambda m:(m.folder,m.uid))


def addressed_delete(box, state, expected, targets, now, result):
    if "UIDPLUS" not in expected.capabilities:
        raise MailSafetyError("uidplus")
    # A small exact set, not a range with possibly unrelated intermediate UIDs.
    for start in range(0,len(targets),box.config.batch):
        portion = targets[start:start+box.config.batch]
        fresh = box.snapshot()
        if fresh.fingerprint(state.digest) != expected.fingerprint(state.digest):
            raise MailSafetyError("changed")
        if "UIDPLUS" not in fresh.capabilities:
            raise MailSafetyError("uidplus")
        grouped = {}
        for message in portion:
            grouped.setdefault(message.folder,[]).append(message)
        for token, messages in grouped.items():
            latest = box.snapshot()
            if latest.fingerprint(state.digest) != expected.fingerprint(state.digest) or "UIDPLUS" not in latest.capabilities:
                raise MailSafetyError("changed")
            fresh = latest
            folder = next((f for f in fresh.folders if state.digest("folder",f.wire)==token),None)
            if folder is None:
                raise MailSafetyError("changed")
            validity, upper = box.select(folder,readonly=False)
            if [validity,upper] != fresh.metadata[token][:2]:
                raise MailSafetyError("changed")
            # Validate each target once more in the selected writable mailbox before journalling.
            for message in messages:
                raw, flags, date, size = box.fetch([message.uid],full=message.body_ok)[message.uid]
                if (message.validity != validity or message.content != state.digest("content",raw)
                        or b"\\DELETED" in flags or flags != message.flags or date != message.date or size != message.size):
                    raise MailSafetyError("changed")
            ops = [(message,state.intent(message,now)) for message in messages]
            uid_set = ",".join(str(message.uid) for message in messages)
            box.call(box.client.uid,"STORE",uid_set,"+FLAGS.SILENT",r"(\Deleted)")
            for _,op in ops:
                state.outcome(op,"stored")
            box.call(box.client.uid,"EXPUNGE",uid_set)
            for _,op in ops:
                state.outcome(op,"expunge_sent")
            # Never trust a tagged OK alone: prove the exact targets are now absent.
            present = set()
            for message in messages:
                present.update(box.search(message.uid,message.uid))
            if present:
                raise MailSafetyError("pending")
            for message,op in ops:
                state.outcome(op,"confirmed_absent","deleted")
                result["deleted"] += 1
            expected.remove([message.identity for message in messages])


def parse_uid_set(value):
    if not re.fullmatch(r"[1-9][0-9]*(?:,[1-9][0-9]*)*",value):
        raise MailSafetyError("configuration")
    ids = [int(token) for token in value.split(",")]
    if len(ids)>100 or len(set(ids))!=len(ids) or max(ids)>4294967295:
        raise MailSafetyError("configuration")
    return set(ids)


def probe_targets(config, snapshot, digest, env, expected=None):
    from maintenance.mail_common import flag
    if not flag(env,"MAIL_CLEANUP_PROBE_DELETE_ENABLED"):
        raise MailSafetyError("probe_not_authorized")
    folder_name = env.get("MAIL_CLEANUP_PROBE_FOLDER","")
    if not re.fullmatch(r"WWHYPDA-Cleanup-Test-[A-Za-z0-9-]{1,40}",folder_name):
        raise MailSafetyError("probe_not_authorized")
    matches = [f for f in snapshot.folders if f.name==folder_name and f.selectable]
    if len(matches)!=1:
        raise MailSafetyError("probe_not_authorized")
    token = digest("folder",matches[0].wire)
    if token in snapshot.roles.values():
        raise MailSafetyError("probe_not_authorized")
    targets = parse_uid_set(env.get("MAIL_CLEANUP_PROBE_UIDS",""))
    controls = parse_uid_set(env.get("MAIL_CLEANUP_PROBE_CONTROL_UIDS",""))
    if targets & controls:
        raise MailSafetyError("probe_not_authorized")
    messages = {m.uid:m for m in snapshot.messages.values() if m.folder==token}
    # At least one pre-existing Deleted control proves absence of plain EXPUNGE.
    if not (targets | controls) <= messages.keys() or not any(b"\\DELETED" in messages[uid].flags for uid in controls):
        raise MailSafetyError("probe_not_authorized")
    if any(b"\\DELETED" in messages[uid].flags for uid in targets):
        raise MailSafetyError("probe_not_authorized")
    if expected is not None:
        # Owner fixture manifest pins identities and fingerprints across CLI invocations.
        if (set(messages) != targets | controls or
                expected != {str(uid):message.signature() for uid,message in messages.items()}):
            raise MailSafetyError("changed")
    return [messages[uid] for uid in sorted(targets)], {uid:messages[uid].signature() for uid in controls}, token


def run(config, *, execute=False, dry_run=False, preflight=False, list_folders=False,
        rebaseline=False, reclose=None, probe=False, outside_window=False, env=None,
        now=None, factory=imaplib.IMAP4_SSL, result=None, list_state=False, probe_expected=None, lookup_message_id=None, observation_hook=None):
    now = now or datetime.now(UTC)
    if lookup_message_id is not None and (not list_state or not isinstance(lookup_message_id,str)
            or not re.fullmatch(ID,lookup_message_id)):
        raise MailSafetyError("configuration")
    effective = execute and not dry_run and not config.dry_run and not (preflight or list_folders or list_state)
    result = summary(not effective) if result is None else result
    if effective and (rebaseline or reclose):
        raise MailSafetyError("configuration")
    if effective and config.support_delete:
        raise MailSafetyError("support_race_unapproved")
    if effective and not outside_window and not scheduled_window(now):
        raise MailSafetyError("outside_window")
    budget = Budget(execution_seconds(now, config.max_seconds) if effective and not outside_window else config.max_seconds)
    if preflight or list_folders:
        # No local state is created during preflight.
        secret = os.urandom(32)
        digest = lambda label,value: hmac.new(secret,label.encode()+b"\0"+(value if isinstance(value,bytes) else str(value).encode()),hashlib.sha256).hexdigest()
        box = Mailbox(config,budget,digest,factory)
        try:
            result["phase"]="connect"
            box.connect()
            result["phase"]="capability"
            caps=box.capabilities()
            result["uidplus"]="UIDPLUS" in caps
            result["phase"]="list"
            folders=box.folders()
            result["phase"]="resolve"
            roles=box.resolve(folders)
            result.update(sent_available=bool(roles["sent"]),drafts_available=bool(roles["drafts"]),closed_available=bool(roles["closed"]))
            result["phase"]="examine"
            for folder in folders:
                if folder.selectable:
                    box.select(folder)
            result.update(uidplus="UIDPLUS" in caps,folders=sum(f.selectable for f in folders),
                sent_available=bool(roles["sent"]),drafts_available=bool(roles["drafts"]),closed_available=bool(roles["closed"]))
            if list_folders:
                for index,folder in enumerate(folders,1):
                    print(json.dumps({"index":index,"folder":folder.name,"selectable":folder.selectable,
                        "sent":b"\\SENT" in folder.attrs,"drafts":b"\\DRAFTS" in folder.attrs},ensure_ascii=True))
            result["phase"]="complete"
            return result
        finally:
            box.finish()
    with State(config.state_dir) as state:
        box=Mailbox(config,budget,state.digest,factory)
        try:
            box.connect()
            first=box.snapshot()
            # A stable repeated complete observation; still not a cross-folder transaction.
            current=box.snapshot()
            if first.fingerprint(state.digest)!=current.fingerprint(state.digest):
                raise MailSafetyError("changed")
            state.namespace(namespace(config,current,state.digest))
            if rebaseline:
                state.baseline()
            result["baseline_rebuilt"]=state.fresh
            result["pending"]=state.reconcile(current)
            counts,_,_=observe(state,current,now,reclose=reclose)
            result.update(counts)
            if observation_hook is not None:
                observation_hook(state, current, counts, now)
            if list_state:
                # Explicit owner-only diagnostics, excluded from ordinary aggregate logs.
                lookup = state.db.execute("SELECT token FROM members WHERE mid=?",
                    (state.digest('id',lookup_message_id),)).fetchone() if lookup_message_id else None
                for handle,status,closed_at in state.db.execute("SELECT token,status,closed_at FROM threads ORDER BY token"):
                    if lookup_message_id and (lookup is None or handle!=lookup[0]):
                        continue
                    due_at = month_after(datetime.fromisoformat(closed_at), SUPPORT_RETENTION_MONTHS).isoformat() if closed_at else None
                    record=dict(handle=handle,status=status,closed_at=closed_at,due_at=due_at)
                    print(json.dumps(record))
            first_seen=state.observe_copies(current,now)
            matched=[m for m in current.messages.values() if m.service]
            selected=candidates(current,first_seen,now)
            result.update(scanned=len(current.messages),folders=len(current.metadata),matched=len(matched),eligible=len(selected),
                uidplus="UIDPLUS" in current.capabilities,sent_available=bool(current.roles["sent"]),
                drafts_available=bool(current.roles["drafts"]),closed_available=bool(current.roles["closed"]))
            controls,probe_folder={},None
            if probe:
                selected,controls,probe_folder=probe_targets(config,current,state.digest,os.environ if env is None else env,probe_expected)
                result["eligible"]=len(selected)
            result["skipped"]=len(matched)-len(selected) if not probe else 0
            if effective:
                if state.fresh or result["pending"]:
                    raise MailSafetyError("pending")
                if not probe and not current.roles["sent"]:
                    raise MailSafetyError("permissions")
                addressed_delete(box,state,current,selected,now,result)
                if probe:
                    after=box.snapshot()
                    remaining={m.uid:m.signature() for m in after.messages.values() if m.folder==probe_folder}
                    if any(remaining.get(uid)!=signature for uid,signature in controls.items()):
                        raise MailSafetyError("changed")
                    result["controls_preserved"]=True
            state.prune(now)
            return result
        finally:
            box.finish()


class SafeParser(argparse.ArgumentParser):
    def error(self,_message):
        raise MailSafetyError("configuration")



def error_location(error):
    frame=error.__traceback__
    location=None
    allowed={"mail_cleanup.py","mail_imap.py","mail_state.py","mail_common.py","mail_probe_fixture.py"}
    while frame is not None:
        filename=frame.tb_frame.f_code.co_filename.replace(chr(92),"/").rsplit("/",1)[-1]
        if filename in allowed:
            location=filename+":"+str(frame.tb_lineno)
        frame=frame.tb_next
    return location

def main(argv=None):
    result=summary(True)
    try:
        parser=SafeParser(description="Standalone IMAP cleanup; default is readonly dry-run.")
        mode=parser.add_mutually_exclusive_group(required=True)
        mode.add_argument("--once",action="store_true")
        mode.add_argument("--preflight",action="store_true")
        mode.add_argument("--list-folders",action="store_true",help="Owner-only local folder map; never share this output.")
        mode.add_argument("--list-state",action="store_true",help="Owner-only pseudonymous handles for explicit reclose; never share output.")
        parser.add_argument("--lookup-message",action="store_true",help="Only with --list-state: privately prompt for one Message-ID to find its handle/due date.")
        parser.add_argument("--dry-run",action="store_true")
        parser.add_argument("--execute",action="store_true")
        parser.add_argument("--rebaseline",action="store_true")
        parser.add_argument("--reclose",help="Private HMAC thread handle, never a raw Message-ID.")
        parser.add_argument("--probe-delete",action="store_true",help="Future explicitly authorized synthetic-folder UIDPLUS acceptance only.")
        parser.add_argument("--allow-outside-window",action="store_true")
        parser.add_argument("--prompt-password",action="store_true")
        args=parser.parse_args(argv)
        if args.lookup_message and not args.list_state:
            raise MailSafetyError("configuration")
        if args.reclose and not re.fullmatch(r"[0-9a-f]{64}",args.reclose):
            raise MailSafetyError("configuration")
        password=getpass.getpass("Mailbox password: ") if args.prompt_password else None
        lookup_message_id=getpass.getpass("Message-ID (private): ").strip() if args.lookup_message else None
        config=Config.from_env(password=password)
        effective=args.execute and not args.dry_run and not config.dry_run and not(args.preflight or args.list_folders or args.list_state)
        result["dry_run"]=not effective
        os.umask(0o077)
        with process_deadline(execution_seconds(datetime.now(UTC),config.max_seconds) if effective and not args.allow_outside_window else config.max_seconds):
            run(config,execute=args.execute,dry_run=args.dry_run,preflight=args.preflight,list_folders=args.list_folders,
                rebaseline=args.rebaseline,reclose=args.reclose,probe=args.probe_delete,
                outside_window=args.allow_outside_window,result=result,list_state=args.list_state,lookup_message_id=lookup_message_id)
        print(json.dumps(result,sort_keys=True))
        return 0
    except MailSafetyError as error:
        result.update(failed=1,error=error.category,error_location=error_location(error))
    except Exception as error:
        # Builtin exception kind and a local code line only: never render values/traceback.
        kinds=(TypeError,AttributeError,KeyError,ValueError,UnicodeError,OSError,RuntimeError)
        result.update(failed=1,error="operation_failed",
            error_kind=next((kind.__name__ for kind in kinds if isinstance(error,kind)),"other"))
        result["error_location"]=error_location(error)
    print(json.dumps(result,sort_keys=True))
    return 1


if __name__=="__main__":
    raise SystemExit(main())
