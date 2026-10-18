# Support reminders — stage 009, local implementation

Reminder != deletion. The owner still manually deletes support conversations no later
than six calendar months after recorded closure. A new reply cancels that deadline;
reclosure starts a new cycle. Seven days is a reminder lead, not extra retention.

Worker: `python -B -m maintenance.mail_reminder` (default no-send). It performs two
stable complete readonly IMAP snapshots with the existing private state/lock and
closure observer. Unsafe, partial, ambiguous or stale observation sends nothing.
Output contains aggregate counts, nearest due date in Europe/Rome and no correspondence.
To inspect a conversation use the existing private `mail_cleanup --list-state` procedure.
Do not paste private state/handles/credentials in shared logs.

Sending needs BOTH `--send` and `MAIL_REMINDER_ENABLED=true` (default false).
Operator explicitly sets `MAIL_REMINDER_TO=georgii.gvozdik@studenti.unimi.it`, existing
verified OVH `MAIL_*` SMTP settings and IMAP/state settings. Sender must be
support@wwhypdatestdeployversion.it, smtp.mail.ovh.net:465 with verified TLS;
log/suppressed modes, missing credentials and provider fallback are rejected.
No env file is read by the CLI. No real send has been performed for stage 009.

The private SQLite outbox upgrades additively under the same lock and witness.
Dedup is per closure cycle; missed runs catch up including overdue conversations.
At most one SMTP batch attempt per Rome calendar day, up to 100 cycles per batch,
maximum three attempts per batch with at least six hours backoff. Failure does not
mark accepted. The aggregate report includes pending_total and attempts_exhausted. Exhausted attempts remain visible in private outbox for operator
review; no infinite retry spam. Reopen/missing cycle cancels pending delivery.
Accepted dedup remains while that closure exists; after state loss a rebuilt
baseline restarts conservative observations, and dedup history cannot be guaranteed.
A crash after SMTP acceptance before checkpoint can duplicate on retry: stable
Message-ID mitigates but does not provide exactly-once delivery. Accepted is not
proof of Inbox delivery. Check spam/bounces and private state independently.

Future explicit deployment: install the separate service/timer templates, load secrets
through the operator-owned protected EnvironmentFile, verify a no-send observation,
then enable only after separate authorization. Ordinary compose up enables no timer.
Stop with `systemctl disable --now wwwhypda-mail-reminder.timer`; disabling reminders
does not remove the manual deletion obligation or change cleanup timers. AVG and
browser protections stay enabled. Do not bypass certificate validation.
