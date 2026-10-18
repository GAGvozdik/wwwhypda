# Security regression010 — только локально

Baseline HEAD2c443fa5fbde30a4428aa5c82e33dc439b4d08ce. Текущие исходники монтируются
read-only; synthetic users/provider/SMTP, никакого env_file/Google/IMAP/реальной
почты. Auth JWT/codes не выводятся. Контейнеры автоматических тестов не публикуют
порты. UI вручную — обычный dev http://localhost:8080 по уточнению владельца.
Docker Engine должен работать. Все команды из корня репозитория.

## Образы и пробы

```sh
docker build -t wwwhypda-stage010-backend -f wwwhypda-backend/Dockerfile .
docker build -t wwwhypda-stage010-frontend wwwhypda-frontendV2
docker compose -p wwwhypda-stage010 -f deploy/testing/security010/compose.yml run --rm regression /probes/http_probes.py
docker compose -p wwwhypda-stage010 -f deploy/testing/security010/compose.yml run --rm regression /probes/reset_probes.py
docker compose -p wwwhypda-stage010 -f deploy/testing/security010/compose.yml run --rm regression -m unittest tests.test_auth_admission tests.test_password_reset_privacy tests.test_auth_enumeration tests.test_recaptcha_policy tests.test_mail_cleanup tests.test_mail_reminder tests.test_smtp_transport -v
docker compose -p wwwhypda-stage010 -f deploy/testing/security010/compose.yml run --rm regression -m unittest tests.test_security_headers -v
docker compose -p wwwhypda-stage010-postgres -f deploy/testing/security010/postgres.compose.yml run --rm tests
```

PostgreSQL disposable tmpfs, internal network, пароль в Compose synthetic.
DDL failure/rollback/concurrency tests намеренно изменяют только эту БД. Suite
включает session revocation persistence через отдельный процесс. Не направлять
TEST_AUTH_DATABASE_URI на пользовательскую БД. Backend image copy layout /,
поэтому рабочая директория тестов /code и PYTHONPATH заданы в fixtures.
HTTP suite37 assertions, reset probe реальный elapsed4s active/unknown; CAPTCHA
provider mocked, application verifier настоящий. Baseline ранее воспроизводил
SEC01/02/03, финальные expectations должны проходить.

## Frontend и Nginx

Сначала на host (только Git/source JSON, без установки frontend dependencies):

```sh
python -B deploy/testing/security010/lint_baseline.py
docker compose -p wwwhypda-stage010-frontend -f deploy/testing/security010/frontend.compose.yml run --rm --entrypoint sh build -c 'node --experimental-vm-modules --test --test-reporter=dot scripts/test-*.mjs'
docker compose -p wwwhypda-stage010-frontend -f deploy/testing/security010/frontend.compose.yml run --rm --entrypoint node build scripts/lint-security010.mjs
docker compose -p wwwhypda-stage010-frontend -f deploy/testing/security010/frontend.compose.yml run --rm build
```

В sh -c строка тестов передаётся одним аргументом. Полный lint:
тот же контейнер `--entrypoint npm build run lint`; он имеет старый baseline,
scoped comparison не подменяет полный результат. Для сравнения после commit
использовать сохранённый baseline исходного HEAD, не считать новый HEAD прежним.

Build создаёт tmp/stage010-frontend и tmp/stage010-maintenance-public. До Nginx
подготовить host директории tmp/stage010-maintenance-state, tmp/stage010-acme и
файл tmp/stage010-acme/synthetic-token с точными байтами `synthetic-acme` (без LF).
Это disposable fixture directories, не dev maintenance state.

```sh
docker compose -p wwwhypda-stage010-nginx -f deploy/testing/security010/nginx.compose.yml up -d
python -B deploy/testing/security010/check_maintenance.py
docker compose -p wwwhypda-stage010-capacity -f deploy/testing/security010/capacity.compose.yml up -d backend nginx
docker compose -p wwwhypda-stage010-capacity -f deploy/testing/security010/capacity.compose.yml run --rm probe
```

check_maintenance.py — host orchestration Docker CLI; HTTP исполняется внутри
transport→Nginx, только fixed internal target. Нет host relay/browser/port8084.
Проверки gate/status503/RetryAfter/no-store/legalPDF/assets/ACME/dotfiles/rates;
остановка только fake upstream + временное отсутствие только fixture index.
Capacity:2workers×4threads,cap4/local3,3серии×4auth, read<1s/overflow429<1s.
SQLite capacity fixture может нейтрально обработать DB contention; корректность
reset transactions отдельно проверяется PostgreSQL. Это не SMTP delivery/VPS SLA.

## Очистка

```sh
docker compose -p wwwhypda-stage010-postgres -f deploy/testing/security010/postgres.compose.yml down
docker compose -p wwwhypda-stage010-nginx -f deploy/testing/security010/nginx.compose.yml down
docker compose -p wwwhypda-stage010-capacity -f deploy/testing/security010/capacity.compose.yml down
docker compose -p wwwhypda-stage010-frontend -f deploy/testing/security010/frontend.compose.yml down
docker compose -p wwwhypda-stage010 -f deploy/testing/security010/compose.yml down
```

Без down -v/удаления пользовательских volumes; dev8080 не останавливается.
Зависимости: `python -B deploy/testing/security010/dependencies.py` делает только
публичные OSV запросы и пишет inventory; npm audit выполнять в image с финальным
lock и отдельно разрешённой сетью. Это не infrastructure/production/browser audit.
