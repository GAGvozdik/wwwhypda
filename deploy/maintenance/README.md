# Manual maintenance — local implementation, not deployed

The flag belongs to an explicitly selected instance. No HTTP setter exists.
Run from the repository root (Python 3):

```powershell
python -B deploy/maintenance/control.py on --state-dir "$((Resolve-Path tmp/stage009-maintenance-state).Path)"
python -B deploy/maintenance/control.py status --state-dir "$((Resolve-Path tmp/stage009-maintenance-state).Path)"
python -B deploy/maintenance/control.py off --state-dir "$((Resolve-Path tmp/stage009-maintenance-state).Path)"
```

These commands control ONLY localhost:8083 preview. For dev use the separate existing
`deploy/maintenance/state/dev` directory; production must use its own dedicated
operator-owned directory. Directories must be absolute, existing, without symlinks;
the tool changes only its recognized `enabled` flag, atomically and idempotently.
Do not share the same flag bind across instances. Nothing is enabled by compose up.
The readonly flag bind survives container recreation; on/off needs no build/reload.
Nginx does not cache the flag test.

`build-maintenance.mjs` generates assets from the canonical React legal pages,
menu.module.scss palette, policy.module.scss and Afacad_Flux source font, plus every
versioned public/legal PDF. This output is mounted separately from replaceable dist.
Rebuild snapshots when releasing legal text/PDF; never manually edit their paragraphs.
Dev frontend prepares `maintenance_dev_public` volume. Runtime flag is a separate
bind; rebuilding frontend never enables it. The old volume remains available while
a normal frontend dist is missing. Never replace legal assets with an empty build.

Nginx server.conf is included INSIDE the existing server block. Keep current global
rate limits, TLS certificates, server_name, HTTP->HTTPS redirect, HSTS, ACME and dotfile
rules. Set `$maintenance_hsts` to the SAME existing HSTS value in production (empty
for localhost HTTP). Include gate.conf in EVERY ordinary frontend/API proxy location;
API also needs `error_page 503 = @maintenance_api`. Never add an unguarded backend
alias. server.conf provides only readonly status, static legal/PDF/assets, internal
503 page and named API JSON response. Keep production API rewrite/proxy unchanged.
Use the tracked nginx.dev.conf and maintenance.preview.conf as integration examples;
private nginx.conf/docker-compose.prod.yml were not read or changed by this stage.

Production Compose must bind `deploy/maintenance` to `/etc/nginx/maintenance:ro`,
prepared static output to `/maintenance-public:ro`, and its dedicated state directory
to `/maintenance-state:ro`. Prepare those directories/artifacts before nginx -t and
recreate. Normal page/API gets 503 + Retry-After/no-store; legal/contact/PDF stay
available. This mode works with backend/DB stopped. Outside manual mode a backend
502/503/504 remains a local failure; it does not enable maintenance. Whole VPS/Nginx
or DNS downtime cannot display this page.

Already-open tabs check status on navigation/focus/manual Try again (throttled,
no polling); a matching site_maintenance API response also opens the shared modal.
Forms, confirmation/terms choices, JWT epoch and drafts remain mounted. New ordinary
requests are blocked; nothing is queued/replayed. Retry after off restores access
without full reload. Normal JWT/CSRF expiry and terms guards still apply. Legal
links open separately. No outbound Google is requested by static/status endpoints.

Future SFTP/release inventory (NOT commands executed here): tracked backend auth/
registration_limits.py + migrate_registration_limits.py and changed models/routes/
retention; shared smtp_transport.py and maintenance/mail_reminder.py + hook; frontend
source/build/public/legal new PDFs+manifest; deploy/maintenance files and generated
static directory; deploy/mail/reminders.md + optional separate systemd templates.
Apply only additive registration migration before new backend routes, verify --check;
do not reset acceptance facts. Patch private production Nginx/Compose locally after
review, retain host/TLS/security/ACME and transfer those explicit configs separately.
No secrets or private mail state belong in release assets. Deployment/timers need
separate owner authorization. AVG/browser protections stay enabled.
