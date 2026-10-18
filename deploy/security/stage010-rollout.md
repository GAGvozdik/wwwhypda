# Будущее обновление stage010 — инструкция оператору

В этом цикле выполнена только локальная работа. Команды ниже НЕ выполнялись
агентом на VPS. Не выводите env/секреты и не переносите тестовые данные.

## Что доставить

Один согласованный комплект изменений: wwwhypda-backend (включая requirements,
Dockerfile, gunicorn.conf.py, auth/sessions.py, reset_limits.py, admission.py,
migrate_security_state.py и изменённые auth/maintenance файлы), frontend src,
package.json/package-lock.json, Dockerfile, scripts и docs/deploy инструкции.
Список фактических изменений проверьте `git diff --name-only` и `git status --short`:
новые файлы тоже нужны, один git diff их не перечисляет. Не переносить tmp,
локальную БД/volumes, security fixtures или env с локальными тестовыми настройками.
Git commit/push агент не выполнял.

Игнорируемые docker-compose.prod.yml, nginx.conf, env.prod и frontend prod env
не доставляются git pull. Новый секрет/env для stage010 не требуется. Существующие
OVH/recaptcha/domain настройки сохраняются. Если приватный prod frontend Dockerfile
ещё делает npm install, оператору синхронизировать dependency step с tracked Dockerfile:
`RUN CYPRESS_INSTALL_BINARY=0 npm ci`. Cypress binary для сборки SPA не нужен.
Gunicorn command в private Compose не должен переопределять новый Dockerfile
старым single sync worker. /tmp должен разрешать private lock files app user.
Nginx rate/burst увеличивать не требуется; cookies/CSRF paths не расширять.

## Порядок (из корня приложения)

1. Доставить комплект, собрать образы, сохранив прежний работающий stack до
   переключения. При использовании maintenance применить существующую инструкцию
   deploy/maintenance/README.md; HTTP setter нет. Не смешивать старые/новые workers.
2. Остановить backend и auth-code-cleanup до миграции; также остановить применимые
   retention workers на время переключения. Названия сервисов проверить в своём
   Compose (не угадывать по имени контейнера). Не выполнять down -v/reset DB.
3. Старые migrations008/009 считаются уже применёнными по сообщению владельца;
   их не выполнять повторно как способ исправления новой ошибки. При несогласованной
   схеме сначала устранить конкретную причину, не удаляя users/acceptance.
4. Новым образом выполнить добавляющую migration и проверку:

```sh
sudo docker compose -f docker-compose.prod.yml --profile retention build
sudo docker compose -f docker-compose.prod.yml run --rm --no-deps --entrypoint python backend -B -m auth.migrate_security_state
sudo docker compose -f docker-compose.prod.yml run --rm --no-deps --entrypoint python backend -B -m auth.migrate_security_state --check
```

DB должна работать; env использует только Compose. При ошибке check не запускать
новый backend/cleanup. Migration создаёт auth_sessions/reset_limits атомарно,
проверяет структуру, не переписывает пользователей/acceptance/письма.

5. После успешного check пересоздать весь согласованный набор, включая retention:

```sh
sudo docker compose -f docker-compose.prod.yml --profile retention up -d --build --force-recreate
```

У frontend с копированием dist в volume дождаться exit0; сравнить asset URLs в
собранном /app/dist/index.html, frontend-dist и HTTP index, прежде чем объяснять
старую страницу браузерным cache. Старые файлы в volume не удалять вслепую.
Проверить running/healthy workers, status maintenance и только затем отключить
ручной maintenance по существующей инструкции.

6. Однократно всем прежним JWT без sid нужен новый вход. Проверить login/logout,
   повторный вход, expired-access refresh logout, Search/Home и новую выдачу reset.
   Не отправлять пароли/коды/cookies в чат. Production SMTP/Google и безопасность
   частной конфигурации этим локальным циклом не проверены.

На обычной локальной тестовой БД migration apply/check уже выполнены с разрешения
владельца; повторять для неё не требуется. На VPS агент ничего не выполнял.
Rollback к прежнему backend не возвращает старые JWT безопасными: прежняя версия
не проверяет sid. Не считать такой откат сохранением исправлений безопасности;
согласовать maintenance и версию, таблицы без необходимости не удалять.
