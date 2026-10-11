# wwwhypda

## Local development

This document describes the local development environment. Install Docker with
Docker Compose and run commands from the repository root. Commands below work
in Git Bash; Docker and Git commands also work in PowerShell.

### Local configuration files

| Component | File |
| --- | --- |
| Compose database variables | `.env.development` |
| Backend | `wwwhypda-backend/env.dev` |
| Frontend | `wwwhypda-frontendV2/.env.development` |
| Docker Compose | `docker-compose.yml` |
| nginx | `nginx.dev.conf` |

The backend and frontend dev env files contain personal credentials and are
ignored by Git. The root `.env.development` contains public credentials for an
isolated local database. After cloning, create the two private dev files using
the examples below. Preserve your existing local credentials if the files
already exist. Duplicate `.example` files are not required.

### Backend env file

Create `wwwhypda-backend/env.dev`. Replace credential placeholders with your own
local development credentials. Compose supplies `DB_USER` and `DB_PASSWORD`
from the root `.env.development`.

```dotenv
MAIN_DATABASE_FILENAME='wwhypda.db'
USERS_DATABASE_FILENAME='users_data.db'
MAIL_SERVER=smtp.example.com
MAIL_PORT='465'
MAIL_USERNAME=your-email@example.com
MAIL_PASSWORD=replace-with-your-mail-app-password
SECRET_KEY=replace-with-a-long-random-secret
JWT_SECRET_KEY=replace-with-another-long-random-secret
JWT_ACCESS_COOKIE_NAME='jwt'
RECAPTCHA_SECRET_KEY=replace-with-your-recaptcha-secret
SWAGGER_URL='/swagger'
API_URL='/static/swagger.json'
ACCESS_EXPIRES_SECONDS=21600
REFRESH_EXPIRES_SECONDS=86400
TESTING=False
DEBUG=False
FLASK_DEBUG=False
DB_ENGINE=postgres
DB_USER=wwwhypda_dev
DB_PASSWORD=local-development-only
DB_HOST=db
DB_PORT=5432
MAIN_DB_NAME=wwhypda
USERS_DB_NAME=users_db
FORCE_HTTPS=False
JWT_COOKIE_SECURE=False
JWT_REFRESH_COOKIE_PATH=/api/users/refresh
JWT_COOKIE_SAMESITE=Lax
JWT_COOKIE_CSRF_PROTECT=True
JWT_REFRESH_COOKIE_NAME=refresh_token_cookie
JWT_ACCESS_COOKIE_PATH=/
JWT_ACCESS_CSRF_COOKIE_NAME=csrf_token
JWT_REFRESH_CSRF_COOKIE_NAME=csrf_refresh_token
SESSION_COOKIE_SAMESITE=Lax
MAIL_USE_TLS=False
MAIL_USE_SSL=True
MAIL_DELIVERY_MODE=smtp
MAIL_SUPPRESS_SEND=False
CONFIRMATION_CODE_TTL_SECONDS=600
PASSWORD_RESET_CODE_TTL_SECONDS=600
RECAPTCHA_ENABLED=True
RECAPTCHA_VERIFY_URL=https://www.google.com/recaptcha/api/siteverify
RECAPTCHA_MIN_SCORE=0.5
RECAPTCHA_TIMEOUT_SECONDS=5
RECAPTCHA_RETRIES=3
RECAPTCHA_RETRY_DELAY_SECONDS=1
RATELIMIT_ENABLED=True
RATELIMIT_DEFAULT=40000 per day;6800 per hour
RATELIMIT_STORAGE_URI=memory://
FRAME_OPTIONS=SAMEORIGIN
REFERRER_POLICY=no-referrer-when-downgrade
LOG_LEVEL=INFO
APP_HOST=127.0.0.1
APP_PORT=5000
PROXY_X_FOR=1
PROXY_X_PROTO=1
PROXY_X_HOST=1
CORS_ALLOW_HEADERS=["Content-Type", "Authorization", "X-CSRF-TOKEN", "X-Recaptcha-Token"]
CORS_SUPPORTS_CREDENTIALS=True
ENABLE_TEST_ENDPOINTS=False
APP_ENV=development
SESSION_COOKIE_SECURE=False
HSTS_ENABLED=False
HSTS_MAX_AGE=31536000
HSTS_INCLUDE_SUBDOMAINS=False
CSP_POLICY={"default-src":["'self'"],"script-src":["'self'","https://www.google.com/recaptcha/","https://www.gstatic.com/recaptcha/"],"frame-src":["'self'","https://www.google.com/recaptcha/","https://recaptcha.google.com/recaptcha/"],"connect-src":["'self'","https://www.google.com/recaptcha/","http://localhost:8080","http://localhost:5173","http://localhost:3000"],"style-src":["'self'","'unsafe-inline'"],"img-src":["'self'","data:"],"font-src":["'self'"],"object-src":["'none'"],"base-uri":["'self'"],"form-action":["'self'"]}
CORS_ORIGINS=["http://localhost:8080", "http://localhost:5173", "http://localhost:3000"]
EXPOSE_ERROR_DETAILS=True
AUTH_LOGIN_RATE_LIMIT=60 per minute;200 per hour
AUTH_REGISTRATION_RATE_LIMIT=60 per minute;200 per hour
AUTH_CONFIRMATION_RATE_LIMIT=60 per minute;200 per hour
AUTH_PASSWORD_RESET_RATE_LIMIT=60 per minute;200 per hour
AUTH_RESEND_RATE_LIMIT=60 per minute;200 per hour
MAIL_DEFAULT_SENDER=your-email@example.com
SWAGGER_ENABLED=True
SQLALCHEMY_TRACK_MODIFICATIONS=False
JWT_TOKEN_LOCATION=["cookies"]
```

`CSP_POLICY` is a JSON object. `CORS_ORIGINS`, `CORS_ALLOW_HEADERS` and
`JWT_TOKEN_LOCATION` are JSON arrays. Boolean settings use `True` / `False`.
Rate limits use syntax such as `2 per minute;20 per hour`.

### Frontend env file

Create `wwwhypda-frontendV2/.env.development`:

```dotenv
VITE_API_BASE_URL=/api
VITE_RECAPTCHA_SITE_KEY=replace-with-your-development-recaptcha-site-key
VITE_CYPRESS_TEST=false
VITE_NAVIGATE_URL=http://localhost:8080
```

Use a reCAPTCHA v3 site key and secret key from the same development registration.
Allow `localhost` in that key's domain settings. The site key belongs in the
frontend env file; the secret key belongs only in backend `env.dev`.

Normal local use keeps `RECAPTCHA_ENABLED=True`, `TESTING=False`,
`ENABLE_TEST_ENDPOINTS=False` and `VITE_CYPRESS_TEST=false`. Public
`/api/rocks/rock_type` and `/api/rocks/parameters` requests do not require login,
but still require a valid CAPTCHA token, which the frontend obtains.

SMTP settings are independent of CAPTCHA. Configure your own development mail
account, or explicitly use `MAIL_DELIVERY_MODE=log` to write local confirmation
messages to the backend log without sending email.

### Create your own development credentials

For reCAPTCHA, register a reCAPTCHA v3 key in the
[reCAPTCHA console](https://www.google.com/recaptcha/admin) and allow `localhost`.
Put its site key in frontend `.env.development` and its paired secret key in
backend `env.dev`. Use your own credentials rather than somebody else's keys.

For Gmail SMTP, enable 2-Step Verification on your own account and create an
app password. Availability depends on the account; see
[Google's app password instructions](https://support.google.com/accounts/answer/185833).
Use your email address for `MAIL_USERNAME` and `MAIL_DEFAULT_SENDER`, and the app
password for `MAIL_PASSWORD`. For SMTP over SSL use `MAIL_SERVER=smtp.gmail.com`,
`MAIL_PORT=465`, `MAIL_USE_SSL=True`, `MAIL_USE_TLS=False` and
`MAIL_DELIVERY_MODE=smtp`. These are settings for your own local mail account.

1. Enable 2-Step Verification:

   ![Enable 2-Step Verification](instructions/instruction3.png)

2. Find App passwords in the account settings:

   ![Find App passwords](instructions/instruction1.png)

3. Create an app password for the local application:

   ![Create an app password](instructions/instruction2.png)

### Start, stop and rebuild

Start the local application:

```sh
docker compose --env-file .env.development up --build -d
```

Website: http://localhost:8080. DbGate: http://localhost:8081.

Stop and then rebuild/restart:

```sh
docker compose --env-file .env.development stop
docker compose --env-file .env.development up --build -d
```

Use the rebuild command after changing source code or env files. This setup
builds the frontend and serves it through local nginx; it does not run a
frontend HMR server. Reload the browser after rebuilding.

Check status and recent logs:

```sh
docker compose --env-file .env.development ps
docker compose --env-file .env.development logs --since 5m --tail 50 backend nginx
```

`stop` preserves data. `down` removes containers but preserves named volumes.
`down -v` deletes the local PostgreSQL volume.

### Local databases

On the first start with an empty local PostgreSQL volume, `init-db.dev.sh`
restores `wwhypda` and `users_db` from the SQL files in `db_dumps`.
Existing database contents are preserved. The script aligns five historical
table names with the current models and initializes missing ID sequences for
users, confirmation codes and submissions. Other historical tables are retained.

In DbGate use host `db`, port `5432` and the credentials in the root
`.env.development`. The databases are `wwhypda` and `users_db`.

To rerun local initialization without replacing existing data:

```sh
docker compose --env-file .env.development exec -T db sh /docker-entrypoint-initdb.d/init-db.dev.sh
```

For a local API check without login or CAPTCHA:

```sh
curl -i --max-time 15 http://localhost:8080/api/rocks/anonce
```

Check backend logs as well: this handler can return `[]` after a database error.
For CAPTCHA failures, inspect the rejection reason in backend logs. An HTTP
`200` from Google does not by itself confirm a valid token; verify that the
development key permits `localhost`.

### Generated files and Git

`wwwhypda-frontendV2/dist` is build output and is ignored by Git. Static source
assets remain in `wwwhypda-frontendV2/public`. Dependencies and caches are also
ignored.

In Git Bash, list untracked files, including private ignored configs, while
excluding builds, dependencies and caches:

```bash
git ls-files --others | grep -Ev '(^|/)(dist|build|node_modules|__pycache__|workEnv|venv|\.venv|\.vite|\.pytest_cache|\.mypy_cache|\.ruff_cache|coverage)(/|$)|\.(pyc|pyo|tsbuildinfo)$|-(shm|wal)$'
```

Check whether a file is tracked and why it is ignored:

```sh
git ls-files --error-unmatch wwwhypda-backend/env.dev
git check-ignore -v wwwhypda-backend/env.dev
```

An untracked file can still be required by the application. Check code and
Compose references before deleting it.

Commit code and documentation normally:

```sh
git add -A
git diff --cached
git commit -m "Describe your changes"
git push origin main
```

`git add -A` respects `.gitignore`. Ignore rules do not protect files that Git
already tracks. Review the staged diff and keep real credentials out of Git.
