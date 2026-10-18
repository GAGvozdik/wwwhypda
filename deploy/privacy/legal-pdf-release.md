# Единый локальный комплект документов 2026-10-18.2

Три HTML React страницы остаются каноническим источником. Download PDF указывает
на public/legal/<slug>-<version>.pdf. Регистрация и login reaccept используют одну
редакцию с backend CURRENT_TERMS_VERSION/frontend USER_AGREEMENT_VERSION.
Изменение содержания любого документа требует новой общей версии, новых трёх PDF
и manifest. Старые выпущенные файлы, RELEASES hashes и acceptance facts не заменять.
Этот комплект ещё не опубликован; изменения VPS не выполняет агент.

## Воспроизводимая генерация и проверки

Нужны Node/esbuild из существующего frontend node_modules и build-only Python
reportlab==4.4.3. pypdf проверяет извлечённый текст, PyMuPDF==1.26.4 — renderer
для QA. Это локальные инструменты; Flask/Vite runtime не получают PDF dependencies.
Embedded шрифт — Bitstream Vera из ReportLab. A4, ссылки, списки, версия/дата,
номера страниц. UI Download исключён из PDF data-legal-download marker.

Команды из repo root:
~~~text
python -B deploy/privacy/build_legal_pdfs.py
python -B deploy/privacy/check_terms_release.py
node deploy/privacy/check_legal_pdfs.mjs
~~~

Генератор сначала рендерит настоящие React компоненты через ReactDOMServer/
MemoryRouter и esbuild в tmp/pdfs, затем структурно читает HTML через HTMLParser.
Нет regex extraction TSX/ручного копирования юридических абзацев/eval документов.
Полный извлечённый PDF текст сверяется с каноническим render с нормализацией
пробелов, list bullets и собственных page footers.
manifest содержит source hashes всех трёх страниц/общих источников и generator,
PDF SHA256/page count/content digest. npm run build до компиляции проверяет hashes
frontend источников и magic/checksum трёх PDF; полный root-check также сверяет
generator sources. Проверка не заменяет визуальный просмотр всех страниц.

Редакция сейчас: User Agreement 2 страницы, Privacy Policy 6, Cookie Policy 2.
После изменения текста обновить константы, RELEASES check_terms_release.py и PDF.
Проверить оба browser themes/узкое окно/Tab, доступность без аккаунта/CAPTCHA,
содержимое URL (%PDF-, application/pdf), корректный Vite base path.
Не считать 200/index.html от SPA fallback PDF.
Штатные build/lint команды — docs/rules/validation.md. Старые несвязанные lint
ошибки фиксировать отдельно; не менять научные формы ради зелёного full lint.

## История принятия и миграция

Новый ledger users_db.user_agreement_acceptances: user_id FK/cascade, version,
accepted_at UTC; unique(user_id,version). Старые User.terms_* остаются исходным
известным фактом и не переписываются. Миграция additive, без DML/backfill.
Повторное принятие idempotent. Время только server UTC, literal True + exactversion;
client timestamp/user identity не являются основанием acceptance.
Login после credentials/CAPTCHA запрашивает принятие до обычных JWT. Старые
active/refresh/direct endpoints возвращают terms_acceptance_required; logout и
самоудаление сохраняют JWT/active/version/CSRF/password checks без нового принятия.
Новый terms-status не вызывает accountDeletionEpoch/endAccountSession/удаление drafts.

Новая миграция:
~~~text
python -B -m auth.migrate_agreement_history
python -B -m auth.migrate_agreement_history --check
~~~

В этом цикле выполнять только в изолированной PostgreSQL fixture. Перед будущим
разрешённым rollout нужны применённые прежние terms/retention migrations,
новая history migration и успешный --check. Остановить старые auth/retention
процессы на время согласованного обновления и не смешивать worker разных редакций.
Backend/frontend/static PDF выкладываются согласованно. Старые cookies после
изменения пакета не должны открывать обычные APIs без явного принятия.
Никакие env/пароли не класть в repo или журнал.

## Граница почтовой части

Реальная owner-приёмка Zimbra пройдена, synthetic target удалён, оба controls
сохранены. Автоудаление поддержки запрещено из-за межпапочной гонки IMAP.
Публичный текст описывает ручную обработку, а не действующий auto timer.
Старый Gmail local guide и legacy переписка сохраняются.
Revision 4 принимает ручную поддержку вместо автоматического support-delete.
Текущая редакция 2026-10-18.1 включает шестимесячный ручной срок, прежняя 2026-10-16.1
и её PDF сохраняются как история; остальные результаты приёмки остаются действительными.


## История проверки редакции 2026-10-16.1 (18.10.2026)

Все 10 страниц финальных PDF (2/6/2) отрендерены PyMuPDF и просмотрены: нет
обрезаний, наложений или лишнего пустого листа. Полный текст повторно сверен с SSR,
встроенный TrueType шрифт подтверждён. check_terms_release.py и check_legal_pdfs.mjs
успешны. На отдельном localhost:8082 все три анонимных URL возвращают application/pdf
и %PDF-, отсутствующий PDF — 404. Это HTTP-проверка fixture, не production Nginx.
Изолированная PostgreSQL: 113 tests OK, включая ledger migration/constraints/
concurrency и смену редакции для существующей сессии. Preview build/TypeScript успешны.
Владелец подтвердил локальную браузерную приёмку PDF и login/reaccept/modal flow;
сценарии и остановка стенда: deploy/testing/terms-preview.md.
AVG для неё оставляется включённым, Google/SMTP/IMAP на стенде не вызываются.


### Сохранение выпущенной редакции

Повторная генерация с тем же canonical content сохраняет существующие PDF побайтно
после checksum/text/page-count проверки. Несовпадение содержания или файла не
перезаписывает редакцию: нужна новая версия. UI-only изменение общего словаря может
обновить source hashes manifest без изменения PDF. Для новых файлов canvas factory
явно задаёт invariant=True, включая случай invariant=None от SimpleDocTemplate.
Проверены повторный запуск и безопасный отказ на временных повреждённых копиях.


## Короткий порядок выпуска следующей редакции

Commit или git pull не меняют редакцию сами по себе. Backend сравнивает
CURRENT_TERMS_VERSION с сохранёнными фактами принятия, а не Git hash.

1. Изменить нужные канонические React документы и их дату. Проверить существующие
   версии и выбрать следующую новую общую редакцию (текущая 2026-10-18.1).
2. Указать одинаковую НОВУЮ версию в auth/terms.py и src/common/userAgreementVersion.ts.
   Даже изменение одной Privacy/Cookie страницы выпускает новый общий комплект.
3. Добавить SHA256 нормализованного userAgreement.tsx (UTF-8, CRLF → LF) под новой
   версией в RELEASES deploy/privacy/check_terms_release.py. Старые записи сохранить.
4. Из корня repo выполнить в этом порядке:

~~~text
python -B deploy/privacy/build_legal_pdfs.py
python -B deploy/privacy/check_terms_release.py
node deploy/privacy/check_legal_pdfs.mjs
docker compose --env-file .env.development run --rm --build --no-deps frontend npm run build -- --mode development
~~~

   Генератор создаёт три новых имени PDF и manifest. Не заменять старые versioned PDF.
   Проверить извлечённый текст и все страницы через renderer, MIME/%PDF- и Download.
5. Владелец делает commit выбранных tracked исходников и новых PDF/manifest,
   проверив diff; env/пароли/state и preview bundle не добавлять. Агент commit/push
   не выполняет. Старые файлы PDF и записи acceptance не удалять/не переписывать.

### Будущий согласованный rollout на VPS — только по отдельному поручению

- Получить новую tracked версию. git pull сам по себе не обновляет контейнеры.
- При ПЕРВОМ внедрении ledger, после прежних terms/retention prerequisites, выполнить
  в настроенном backend-контейнере auth.migrate_agreement_history и --check. До этого
  согласованно остановить старые auth/retention процессы по плану deployment.
- Согласованно пересобрать/пересоздать backend, frontend/static PDFs и относящиеся
  workers штатным production Compose с фактическими именами сервисов/локальными
  приватными конфигами. Смешанные backend/frontend версии не оставлять.
- При следующих текстовых редакциях без schema changes эта миграция повторно не
  требуется, как и массовый UPDATE пользователей. Проверить новые HTTP PDF и
  current/old login/active request на уже развёрнутом сайте отдельной приёмкой.
- Не включать IMAP service-delete или timer просто потому, что обновлены документы.
  Поддержка остаётся ручной, авто support-delete запрещён. Gmail cleanup отдельно.

### Что увидит пользователь

После rollout следующий login со старым/null принятием после верных credentials и
CAPTCHA покажет текущие документы и пустую галочку. Принятая текущая версия входит
как обычно. Для открытой сессии gate срабатывает на СЛЕДУЮЩЕМ защищённом запросе;
само наличие cookie без запроса не открывает окно по таймеру. Logout, self-delete,
public legal/PDF/contact сохраняются. Прежняя история остаётся, добавляется версия
с серверным временем. Не нужно вручную сбрасывать принятие, рассылать письма,
менять пароли или заново регистрировать пользователей. Checkbox не является
согласием на произвольные будущие цели обработки.

### Сроки этой редакции

Обычная поддержка: ручной максимум шесть календарных месяцев от recorded closure,
с приватной связью цепочки/dueAt/напоминанием и пересмотром необходимости/ранних
правомерных запросов. Служебные доступные копии: прежний один календарный месяц.
Ответ на GDPR-запрос по-прежнему обычно один месяц. Процедура и обоснование:
deploy/mail/ovh-cleanup.md, deploy/privacy/privacy-operations.md.


## Итог текущей редакции 2026-10-18.1

Локальный цикл 008 завершён/архивирован 18.10.2026. PDF 2/6/2 страницы: полный текст
проверен, все 10 страниц просмотрены, старые файлы сохранены. Новые и прежние PDF
анонимно отдаются как application/pdf/%PDF- на preview. 59 mail/114 PostgreSQL/
46 frontend tests OK, build/scoped lint/root checks OK. Сохранён прежний full-lint
baseline 58 errors/15 warnings. Owner UI/real IMAP приёмка действительна; revision 4
не требует повторять неизменённые сценарии. Publication/VPS/timer не выполнялись.
Архив: docs/archive/008-ovh-mail-cleanup.md. AVG для localhost остаётся включённым.


### Локальная редакция 2026-10-18.2 — stage009
Только фактически новые утверждения: продолжение регистрации после пароля без
сессии/auto SMTP, explicit fresh CAPTCHA, общие challenge/issue counters и их
retention, минимальный owner reminder. Выпущены новые три PDF, hashes/manifest
и синхронные version constants. Все12страниц (3/7/2) просмотрены после render;
полный текст совпадает с SSR, прежние опубликованные PDF SHA256 неизменны.
Принятие в рабочей DB не сбрасывалось. Новая registration_limits migration
добавляет технический budget, а не acceptance facts. Static maintenance snapshots
строятся отдельно из тех же canonical sources и копируют все версии PDF.
Stage009 user visual acceptance пока ожидается; VPS release не выполнялся.
