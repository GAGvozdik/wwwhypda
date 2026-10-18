"""One-shot owner reminder. No deletion, auth import, env-file loader or mail fallback."""
import argparse
from datetime import datetime, timedelta
from email.message import EmailMessage
import getpass
import json
import os
import secrets
from zoneinfo import ZoneInfo

from maintenance.mail_common import Config, MailSafetyError, OWNER, UTC, flag, month_after, SUPPORT_RETENTION_MONTHS, process_deadline
from maintenance.mail_cleanup import run
from smtp_transport import open_verified_smtp, validate_mail_config

RECIPIENT = "georgii.gvozdik@studenti.unimi.it"
LEAD = timedelta(days=7)
RETRY = timedelta(hours=6)
MAX_ATTEMPTS = 3
MAX_BATCH = 100


def smtp_settings(env):
    config = dict(MAIL_SERVER=env.get("MAIL_SERVER", ""), MAIL_PORT=int(env.get("MAIL_PORT", "0")),
        MAIL_USE_SSL=flag(env,"MAIL_USE_SSL"), MAIL_USE_TLS=flag(env,"MAIL_USE_TLS"),
        MAIL_USERNAME=env.get("MAIL_USERNAME", ""), MAIL_PASSWORD=env.get("MAIL_PASSWORD", ""),
        MAIL_DEFAULT_SENDER=env.get("MAIL_DEFAULT_SENDER", ""), MAIL_DELIVERY_MODE=env.get("MAIL_DELIVERY_MODE", ""),
        MAIL_SUPPRESS_SEND=flag(env,"MAIL_SUPPRESS_SEND"))
    if (env.get("MAIL_REMINDER_TO") != RECIPIENT or config["MAIL_SERVER"] != "smtp.mail.ovh.net"
            or config["MAIL_USERNAME"] != OWNER or config["MAIL_DEFAULT_SENDER"] != OWNER
            or config["MAIL_DELIVERY_MODE"] != "smtp" or config["MAIL_SUPPRESS_SEND"]):
        raise MailSafetyError("configuration")
    validate_mail_config(config)
    return config


def message(dates, message_id):
    # Dates and counts only. No thread handles or correspondence in headers/body.
    due = sorted(datetime.fromisoformat(value) for value in dates)
    zone = ZoneInfo("Europe/Rome")
    mail = EmailMessage()
    mail["From"] = OWNER
    mail["To"] = RECIPIENT
    mail["Subject"] = "WWHYPDA: manual support retention reminder"
    mail["Message-ID"] = message_id
    mail.set_content(f"Closed support conversations requiring manual review: {len(due)}.\n"
        f"Nearest deletion deadline (Europe/Rome): {due[0].astimezone(zone).isoformat()}.\n"
        "Delete manually no later than six calendar months after recorded closure.\n"
        "A new reply cancels the previous closure deadline. This reminder does not delete or extend it.\n"
        "Inspect the private mail_cleanup --list-state locally before acting.\n"
        "SMTP acceptance is not proof of Inbox delivery.\n")
    return mail


def schema(state):
    with state.transaction():
        state.db.execute("CREATE TABLE IF NOT EXISTS reminder_outbox (cycle TEXT PRIMARY KEY, token TEXT NOT NULL, due TEXT NOT NULL, status TEXT NOT NULL, message_id TEXT, attempts INTEGER NOT NULL DEFAULT 0, retry_at TEXT)")
        state.db.execute("CREATE TABLE IF NOT EXISTS reminder_days (day TEXT PRIMARY KEY)")
    if [row[1] for row in state.db.execute("PRAGMA table_info(reminder_outbox)")] != ["cycle","token","due","status","message_id","attempts","retry_at"]:
        raise MailSafetyError("state")


def observe_reminders(state, snapshot, counts, now, *, send=False, env=None, transport=open_verified_smtp):
    env = os.environ if env is None else env
    # Called only under the existing exclusive state lock after two stable complete
    # readonly snapshots and observe(). Never trust stale --list-state alone.
    if counts.get("support_observation_blocked") or any(counts.get(key,0) for key in
            ("unsafe","invalid_headers","ambiguous_drafts","closed_unread_bodies","closed_invalid_dates","closed_unsafe_links","closed_marked")):
        return dict(reminders=0, submitted=0, observation_blocked=True)
    if state.db.execute("SELECT 1 FROM threads WHERE status IN ('recently_closed','expired') AND observed_at != ? LIMIT 1",(now.isoformat(),)).fetchone():
        return dict(reminders=0,submitted=0,observation_blocked=True)
    schema(state)
    current = {}
    for token,status,closed_at,observed_at in state.db.execute("SELECT token,status,closed_at,observed_at FROM threads"):
        if status not in ("recently_closed","expired") or not closed_at or observed_at != now.isoformat():
            continue
        closed = datetime.fromisoformat(closed_at)
        if closed.tzinfo is None or closed > now:
            continue
        due = month_after(closed, SUPPORT_RETENTION_MONTHS)
        cycle = state.digest("reminder-cycle", token+":"+closed_at)
        current[cycle] = (token,due.isoformat())
    with state.transaction():
        for cycle,status in state.db.execute("SELECT cycle,status FROM reminder_outbox").fetchall():
            if cycle not in current and status != "accepted":
                state.db.execute("UPDATE reminder_outbox SET status='cancelled' WHERE cycle=?",(cycle,))
        for cycle,(token,due) in current.items():
            if now >= datetime.fromisoformat(due)-LEAD:
                state.db.execute("INSERT OR IGNORE INTO reminder_outbox (cycle,token,due,status) VALUES (?,?,?,'pending')",(cycle,token,due))
        # Keep accepted dedup for every still-existing closure cycle. Historical
        # rows are removed only after the cycle disappears, never by age alone.
        for cycle, in state.db.execute("SELECT cycle FROM reminder_outbox WHERE status IN ('accepted','cancelled')").fetchall():
            if cycle not in current:
                state.db.execute("DELETE FROM reminder_outbox WHERE cycle=?",(cycle,))
        state.db.execute("DELETE FROM reminder_days WHERE day < ?",((now-timedelta(days=32)).date().isoformat(),))
    rows = state.db.execute("SELECT cycle,due,message_id,attempts,retry_at FROM reminder_outbox WHERE status='pending' ORDER BY due,cycle").fetchall()
    rows = [row for row in rows if row[0] in current and row[3]<MAX_ATTEMPTS and (not row[4] or datetime.fromisoformat(row[4])<=now)]
    result = dict(reminders=len(rows),submitted=0,observation_blocked=False,
        pending_total=state.db.execute("SELECT count(*) FROM reminder_outbox WHERE status='pending'").fetchone()[0],
        attempts_exhausted=state.db.execute("SELECT count(*) FROM reminder_outbox WHERE status='pending' AND attempts>=?",(MAX_ATTEMPTS,)).fetchone()[0])
    if not rows:
        return result
    # Retry one persisted batch before creating another. Stable ID survives crash
    # after remote acceptance; at-least-once delivery can duplicate a reminder.
    existing = next((row[2] for row in rows if row[2]),None)
    rows = [row for row in rows if row[2]==existing][:MAX_BATCH]
    mid = existing or "<wwhypda-reminder-"+secrets.token_hex(16)+"@wwhypdatestdeployversion.it>"
    mail = message([row[1] for row in rows],mid)
    result["preview"] = dict(subject=str(mail["Subject"]),text=mail.get_content())
    if not send:
        return result
    if not flag(env,"MAIL_REMINDER_ENABLED"):
        raise MailSafetyError("configuration")
    config = smtp_settings(env)  # validate before recording an attempt
    day = now.astimezone(ZoneInfo("Europe/Rome")).date().isoformat()
    if state.db.execute("SELECT 1 FROM reminder_days WHERE day=?",(day,)).fetchone():
        result["daily_cap"] = True
        return result
    with state.transaction():
        state.db.execute("INSERT INTO reminder_days VALUES (?)",(day,))
        for cycle,_,_,_,_ in rows:
            state.db.execute("UPDATE reminder_outbox SET message_id=?,attempts=attempts+1,retry_at=? WHERE cycle=?",
                (mid,(now+RETRY).isoformat(),cycle))
    host = transport(config)
    try:
        refused = host.send_message(mail)
        if refused:
            raise MailSafetyError("tls_or_login")
        with state.transaction():
            for cycle,_,_,_,_ in rows:
                state.db.execute("UPDATE reminder_outbox SET status='accepted' WHERE cycle=?",(cycle,))
        result["submitted"] = len(rows)
    finally:
        host.close()
    return result


def main(argv=None):
    result = dict(reminders=0,submitted=0,failed=0)
    try:
        parser=argparse.ArgumentParser(description="Readonly IMAP observation; reminder is no-send by default.")
        parser.add_argument("--send",action="store_true")
        parser.add_argument("--prompt-password",action="store_true")
        args=parser.parse_args(argv)
        config=Config.from_env(password=getpass.getpass("Mailbox password: ") if args.prompt_password else None)
        def observed(state,snapshot,counts,now):
            result.update(observe_reminders(state,snapshot,counts,now,send=args.send))
        with process_deadline(config.max_seconds):
            run(config,dry_run=True,observation_hook=observed)
        print(json.dumps(result,sort_keys=True))
        return 0
    except Exception as error:
        result.update(failed=1,error=error.category if isinstance(error,MailSafetyError) else "operation_failed")
        result.pop("preview",None)
        print(json.dumps(result,sort_keys=True))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
