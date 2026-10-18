---
stage: 009
title: Возобновление регистрации при входе, loading UI, напоминания и техработы
revision: 1
status: archived
created: 2026-10-18
completed: 2026-10-18
rules:
  - docs/rules/project.md
  - docs/rules/frontend.md
  - docs/rules/boundaries.md
  - docs/rules/validation.md
  - docs/rules/runtime-and-privacy.md
---

# Цель

1. Пользователь, не завершивший подтверждение почты при регистрации, после проверки правильного пароля на login продолжает существующий сценарий подтверждения, без обычной сессии до успешной активации.
2. Реальные loading-skeleton соответствуют заменяемым формам/панелям по размеру и контуру; существующий LoadIcon расположен строго по центру.
3. На georgii.gvozdik@studenti.unimi.it приходит минимальное напоминание за неделю до ручного удаления закрытой переписки.
4. Ручной режим техработ через Nginx включается/выключается простой командой без пересборки, работает без backend/DB и сохраняет доступ к юридической информации.
5. В конце владелец получает воспроизводимый изолированный стенд и короткий сценарий визуальной приёмки.

## Границы и сохранённые решения

- Код меняет имплементатор после поручения выполнить этот план. Работа только локально. Не трогать VPS/DNS/env/секреты/current_todo_list.md, рабочие данные/volumes, реальные письма, commit/push. Пользователь согласовал архитектуру техработ, не deployment.
- Архив 008 завершён: документы/PDF и reaccept, SMTP/IMAP-проверки, ручная поддержка через шесть календарных месяцев после закрытия, автоматический месяц служебных копий, отсутствие SMTP Sent-копий по проверке владельца. Не возвращать эти проверки как невыполненные и не переписывать сроки. Автоматическое удаление поддержки остаётся запрещённым.
- Все auth/JWT/CSRF/ownership/роль/terms-version gates, SMTP deadlines/sender cap, CAPTCHA iframe lifecycle и защита enumeration циклов 004/008 сохраняются. Новое поведение login только для явно незавершённой регистрации, не для disabled/legacy неизвестного статуса.
- Сохранять Redux/localStorage/drafts, пользовательский ввод, раскрытие дерева, Community AG Grid, палитру из menu.module.scss и Afacad_Flux. Комментарии и закомментированный код не удалять.
- Разрешены необходимые локальные backend/frontend/UI/SQLite state/изолированные тесты и шаблоны Nginx/Compose. Только обоснованная добавочная migration для защищённого лимита подтверждения, если текущих общих механизмов недостаточно; не менять unrelated auth/DB. Production nginx.conf/docker-compose.prod.yml игнорируются Git: подготовить также tracked инструкцию/шаблон и перечень будущих SFTP-файлов.

## Установлено чтением текущего кода

- User.login в auth_models.py ищет только active=True и делает один real/dummy hash. В authentication.login после пароля заново проверяется User под lock, затем terms ledger, commit и выдача JWT. Pending registration пока не может продолжить login.
- /users/resend-confirmation уже имеет neutral response, CAPTCHA action resend_code и ограниченный SMTP sender; выдача разрешена inactive+registration_completed=False. /users/confirm-registration уже есть, CAPTCHA action confirm_registration и TTL/одноразовый код. Registration.tsx содержит готовые code/resend UI. Не делать дубликат этого интерфейса в login.
- ConfirmationCode сейчас не хранит per-code attempt count; route limits сами по себе не доказывают общую защиту от перебора при смене IP/HTTP workers. Важно проверить фактическое общее хранилище и атомарность, не полагаться на frontend countdown.
- SingleSkeleton.tsx центрирует Box, но LoadIcon появляется только при isLoadIcon=true; height 100% без определённого родителя не задаёт размер формы. LoadIcon.tsx — существующий CircularProgress, его переиспользовать вместо рисования нового индикатора.
- Mail state хранит closed_at и HMAC handle, support due уже вычисляется через SUPPORT_RETENTION_MONTHS=6; автоматического напоминания нет. Сырой Message-ID не должен попадать в письмо или общий журнал.
- Nginx уже проксирует /api, раздаёт frontend volume и имеет rate limits/security headers. Отдельного maintenance flag/page пока нет. Страница должна переживать остановку backend/DB и пересборку frontend, поэтому её артефакты не зависят от заменяемого dist.

## Шаги

### 1. [x] Спроектировать и проверить безопасную ветку pending registration

- Файлы: wwwhypda-backend/auth/auth_models.py, auth/authentication.py, auth/password_reset_delivery.py для чтения существующих budgets; tests/test_auth_enumeration.py, test_auth_lifecycle.py и новые точечные fixtures.
- После валидного login CAPTCHA и ровно одной password hash проверки различать active, pending и отказ. Для отсутствующего адреса — заранее подготовленный dummy hash; для имеющегося — один реальный hash одинаковой стоимости. Не делать второй hash или быстрый return только для inactive. Если legacy hash отличается по cost, оценить влияние на timings вместо объявления абсолютной неразличимости.
- Новая ветка разрешена только при правильном пароле, active=False и registration_completed is False, с повторной проверкой row/account_version под существующим общим lock. Отключённый ранее подтверждённый аккаунт, неизвестный NULL legacy, удалённый/подменённый аккаунт и неправильный пароль получают прежний нейтральный отказ; никакой реактивации.
- Pending login возвращает 409 с безопасным машинным code `email_confirmation_required`, но без access/refresh JWT/cookies, кода подтверждения или личных полей. Такой статус раскрывается только предъявившему правильный пароль; до этого status/body/headers/cookie-effects и timings не должны сообщать существование/состояние адреса. Новая ветка не вызывает SMTP автоматически.
- Не продлевать registered_at/retention, не перезаписывать пароль/terms acceptance/роль/статус при одном login или resend. Не выдавать pending JWT, пригодный для обычных endpoints.
- Для сравнимых отказов сохранить общий monotonic elapsed floor failed login 0.4s (проверить актуальную реализацию), без lock/transaction во время ожидания. Не заменять выравнивание random sleep. Pending-ответ после правильного пароля также не должен получать account-dependent SMTP latency. Active успешный вход и terms review остаются существующими разрешёнными ветками.
- Приёмка: правильный пароль pending открывает только возможность продолжить подтверждение; wrong/unknown/disabled ветки и существующий terms gate не ухудшены. Результат не объявляет устранёнными все сетевые side channels; обязательные измерения — в шаге 7.

### 2. [x] Подключить существующую форму подтверждения и серверные лимиты

- Файлы: src/components/users/auth/login.tsx, registration.tsx и небольшой общий компонент подтверждения рядом; users.module.scss, common/types.ts, клиентский/серверный error_messages.json. Backend — только необходимые registration confirmation/resend helpers/модель и тесты.
- Извлечь общий code/resend UI из существующей регистрации либо переиспользовать её шаг через общий компонент с явными props. Один источник поведения/стилей, без второго store/самостоятельной auth-системы. На login после email_confirmation_required показать эту форму с выбранным email, Back to sign in, resend и countdown. Объяснить, что отправить новый код нужно явной кнопкой; валидный ранее полученный код можно использовать по прежнему TTL.
- Контракты сохраняются: POST /users/resend-confirmation {email, recaptcha_token}, action resend_code; POST /users/confirm-registration {email, code, recaptcha_token}, action confirm_registration. Новый token на каждое действие, не переиспользовать login token. Код — ровно шесть ASCII-цифр; пароль/код не хранить в URL/Redux/storage/logs. При изменении email сбросить pending UI, код и состояние предыдущего действия.
- После подтверждения не выдавать сессию только по клику/response frontend. Выполнить обычный новый login с паролем и fresh login CAPTCHA либо вернуть в готовую форму входа; предпочтителен понятный переход с success и без потери email. Актуальную редакцию договора потребовать существующим flow после активации; code confirmation не является принятием новых документов. Старый current acceptance не спрашивается заново.
- Сохранить TTL, одноразовость, общие transaction/User lock и atomic verification/activation/consumption. Подтверждение должно проверять всё ещё pending User в той же транзакции; одновременные confirm/resend/retention/delete не дают повторную активацию или чужую сессию. При новом коде не оставлять неограниченно много одновременно пригодных registration-кодов; допустим один актуальный challenge, старые registration-коды инвалидируются атомарно без касания password_reset.
- Защита перебора и спама обязательна на сервере: прежние IP/route/global limits плюс общий целевой бюджет resend и попыток confirmation, работающий через разные IP/процессы и не сбрасываемый обходным endpoint. Начальные ориентиры — не более 5 неверных попыток на актуальный challenge и 3 resend/15 минут на аккаунт; окончательные constants/config обосновать и записать. Если нужны дополнительные счётчики, использовать существующее действительно общее хранилище либо маленькую добавочную users_db migration под тем же lock; in-memory limiter нескольких workers не считать общей защитой.
- Target throttling public resend не должен раскрывать существование адреса через разные HTTP status/latency. Сохранить neutral 200 для валидных email независимо от наличия/статуса/доставки; подавлять превышающую целевой бюджет отправку внутри, с тем же response window 4s. Общий IP-limit может давать привычный 429 до account-dependent ветки. В confirm не раскрывать remaining attempts/причину отсутствия кода; ограничение не должно навсегда блокировать легитимного пользователя. Поведение после исчерпания/TTL и повторного resend документировать, включая защиту от обхода старым кодом/сменой IP.
- Общие UI строки через словарь, цвета var(--tree-text)/--input/--border и существующие auth/checkbox/contour стили. Сохранить password-manager/autofill, keyboard/focus, pending/retry/error/cancel, preventing double submit. Не добавлять публичное определение pending аккаунта по одному введённому адресу.
- Приёмка: регистрация и возобновление из login пользуются одной формой, защищены одинаково, старые reset/terms/disabled scenarios проходят; UI ограничения подкреплены серверными атомарными лимитами.

### 3. [x] Auth-only skeleton по уточнению владельца при визуальной приёмке

- Действующий scope уточнён владельцем после первой реализации: border/wave/LoadIcon
  только у login/register/forgot-password/confirmation. Search/tree/table/account
  loader/style/color не менять; широкие правки SingleSkeleton отменены.
- AuthSkeleton — отдельный компонент с реальной mounted разметкой заменяемой формы:
  её собственная ширина/высота без viewport guesses и без общего account placeholder.
  Тот же form-color и contour authForm (общий formContour из окна техработ: border1px/radius25px/shadow), MUI wave слева направо,
  существующий LoadIcon строго по центру; refetch не теряет ввод.
- При ожидании guard используется сам Login checkingAccess в skeleton режиме,
  а не форма аккаунта, пустое окно или redirect без server check. Этот режим не
  отправляет login/CAPTCHA и не открывает terms modal. После ответа обычные guards.
- Во время проверки confirmation/resend показывается именно skeleton формы почты,
  код/notice/email сохраняются; busy сбрасывается в finally при возврате к login.
  Регистрация, login и reset используют skeleton своей текущей формы при ожидании.
- Email в confirmation замаскирован, Back to sign in — существующий styled Link.
- Deterministic auth-only fixture: /loading-fixture/index.html, кнопки
  «Показать загрузку»/«Показать формы»/«Сменить тему»; четыре настоящие формы.
  Собрать geometry/center observations в Chrome/Firefox/light/dark/zoom/Tab.
  Unit/build checks пройдены; владелец подтвердил нормальное отображение skeleton при финальной приёмке.

### 4. [x] Добавить минимальные SMTP-напоминания владельцу за неделю

- Файлы: wwwhypda-backend/maintenance/mail_state.py/mail_common.py и отдельный небольшой mail_reminders.py либо аналогичный helper; smtp_transport.py переиспользовать без auth/mainApp import; tests/test_mail_reminders.py; deploy/mail/ovh-cleanup.md и подготовленные systemd/one-shot шаблоны. PostgreSQL/пользовательские auth-email templates для напоминаний не менять.
- Источник — подтверждённые закрытые обращения и due_at = исходный closed_at + 6 календарных месяцев из существующего приватного state. Напомнить при now >= due_at - 7 суток, один раз на конкретный цикл закрытия; даты хранить UTC, владельцу показывать Europe/Rome. При пропущенном запуске отправить на следующем успешном проходе, даже если осталось меньше недели/уже просрочено, с корректным текстом, а не пропустить навсегда.
- Перед расчётом требуется свежий успешный полный readonly observation mailbox. Reopened/open/unsafe/отсутствующий closedAt/неполный scan/старый snapshot не считаются поводом удалить или напомнить о конкретной due-переписке. Новый ответ отменяет старый reminder, новое закрытие формирует новый cycle key. Изменение времени/перезапуск не дублирует подтверждённые уведомления.
- Получатель задан владельцем: georgii.gvozdik@studenti.unimi.it. Отправитель — существующий support@wwhypdatestdeployversion.it через SMTP OVH, верификация TLS и отсутствие Gmail fallback сохраняются. Recipient настраивается только оператором, не параметром публичного API/письма пользователя. Новых реальных писем без отдельного разрешения не отправлять.
- Содержание — короткое административное напоминание: число обращений, ближайшие даты удаления и инструкция открыть свой ящик/приватный --list-state. Никаких адресов/имён пользователей, Subject/тел писем, кодов, Message-ID, raw IMAP UID, паролей, attachments или копий переписки на университетский адрес. В обычном логе только счётчики SMTP submitted/skipped/failed, без адреса получателя/полного exception.
- Использовать persistent SQLite state для minimal outbox/идемпотентности, с теми же 0700/0600/lock и безопасной schema upgrade; backups/recreate не должны превращаться в рассылку всего архива. Утверждать доставку только после успеха SMTP, не после local log/suppression. SMTP accepted не гарантирует получение во Inbox, фиксировать статус корректно. Окно crash после SMTP accept до DB commit может дать неопределённый исход: bounded retry/cooldown, стабильный Message-ID и documented at-least-once risk вместо обещания exactly-once. Не рассылать каждый день одно и то же напоминание из-за неопределённости.
- По возможности объединять due notices в одно краткое письмо за проход/день. Общий лимит и retry/backoff не дают почтовый flood при сбое. Это административная отправка, не повод пользоваться auth timing process или менять его deadlines/response budgets.
- DRY_RUN/preview ни при каких обстоятельствах не отправляет письмо и не помечает его отправленным. Предусмотреть отдельный явный reminder send gate (например MAIL_REMINDER_ENABLED=false по умолчанию + CLI --send). Документировать MAIL_REMINDER_TO, SMTP MAIL_* и выбранный schedule без секретов. Письмо можно отправлять отдельным one-shot после успешного readonly cleanup; не нарушать семантику существующего cleanup --dry-run. Не менять его на автоматическое удаление support.
- Автотесты synthetic SMTP/state: >7 дней/ровно 7/<7/overdue/catch-up, repeated runs, reopened/reclose, неполный scan, timezone/DST/end-of-month, readonly preview, log/suppressed/no credentials, SMTP failure, interrupt/unknown outcome, concurrent workers и persistent state, отсутствие PII в payload/logs. Реальная пробная доставка владельцу — только по отдельному разрешению; сначала показать безопасный preview письма.
- Приёмка: напоминания подготовлены с неизменным ручным сроком и автоматическим service-delete, не отправляют пользователям и не раскрывают переписку. Процедура связи напоминания с конкретной цепочкой остаётся приватной существующей owner-only, не по публичной ссылке.

### 5. [x] Реализовать независимую страницу техработ и CLI-переключатель

- Согласованный механизм: Nginx читает наличие host-флага в отдельной постоянной bind-директории и отдаёт статическую страницу вместо обычного сайта. Подготовить deploy/maintenance/control.py (или столь же простой переносимый CLI) с on/off/status и tracked инструкцией. Планируемые команды на VPS: python3 deploy/maintenance/control.py on, off, status; точные рабочие варианты уточнить в реализации. Они не выполняются в этом цикле.
- Файлы: deploy/maintenance/ статическая page/assets/control/docs; nginx.dev.conf, необходимые локальные prod nginx.conf/docker-compose.prod.yml и tracked template/patch-инструкция, docker-compose.yml для dev bind при необходимости; .gitignore для runtime flag. Никаких секретных URL, HTTP-кнопки изменения режима или зависимости от входа администратора.
- Переключение — атомарное создание/удаление только своего flag-файла, без пересборки frontend/backend, удаления volumes или restart всей системы. Flag переживает container recreate, хранится вне image/dist; Nginx видит директорию read-only. Dev/production state разделить так, чтобы локальный preview не включал режим другой установки. Проверять разрешённый путь/тип файла и понятные ошибки; повторные on/off идемпотентны. Перед работой nginx-конфигов сохранить текущие комментарии/SSL/rate limits/resolver/security headers.
- Статическая page не зависит от Flask/DB/React bundle и их внешних ресурсов, хранится отдельно от обновляемого dist. В стиле сайта, английский UI: временная недоступность, понятное сообщение, контакт поддержки, Retry. Уважать текущую light/dark предпочтительную палитру через допустимый CSP локальный небольшой bootstrap и переиспользованные дизайн-переменные/сгенерированные стили из единого источника, без новой независимой палитры. Не загружать reCAPTCHA/analytics/чужие шрифты.
- При включении обычные HTML маршруты возвращают именно HTTP 503 с Retry-After и Cache-Control:no-store, а API — 503 с JSON code site_maintenance, не HTML со статусом 200/302 и не ложный auth failure. Read/write/registration/login не проходят к backend. Отдельный публичный readonly status endpoint Nginx даёт только флаг режима для открытых вкладок, без зависимости от backend/DB; он не позволяет менять режим. Старые POST нельзя автоматически повторять после выключения режима.
- Сохранить HTTP→HTTPS redirect и оба production hostname, ACME .well-known для будущего сертификата, необходимые локальные assets и юридические /privacy-policy,/user-agreement,/cookie-policy плюс versioned /legal/*.pdf. Whitelist только необходимых static/legal путей, не обход к /api/admin или альтернативному backend host. Проверить, что Nginx/SSL поднимается и page/legal/PDF доступны при остановленном backend/DB и отсутствующей обычной frontend-сборке; для независимых HTML legal подготовить соответствующие статические release snapshots из канонического источника при необходимости, без ручного переписывания текстов.
- В конфигурации исключить cache flag/stat и error_page loops, проверять статус при каждом нужном запросе. Защиты CSP/HSTS/headers сохраняются и на maintenance responses. Не расслаблять CSP unsafe-eval/широким wildcard ради простой страницы.
- Это ручной режим; не включать его автоматически навсегда по единственному таймауту. При недоступном backend вне manual mode допустима отдельная корректная страница/локальное сообщение временного сбоя по 502/503/504 без обещания плановых работ; не маскировать 400/401/403/429/500 как maintenance. Если VPS/Nginx полностью остановлены или DNS не работает, эта система не может показать страницу — явно записать ограничение.
- Приёмка: три простые команды, состояние сохраняется/идемпотентно и меняется без build/restart; 503 page и API не зависят от backend/DB, legal/contact работают, отсутствует HTTP/security обход.

### 6. [x] Обработать техработы в уже открытых вкладках без потери данных

- Файлы: src/components/api.tsx, MainWindow/маленький общий maintenance context/view, словарь и scoped styles; не создавать второй Axios/Redux store. Нужны известный machine code site_maintenance и readonly status endpoint шага 5.
- При соответствующем ответе или явной проверке status показать спокойное уведомление/maintenance view с Retry и контактами. Доступ к уже загруженным legal/PDF сохраняется; не запускать logout/endAccountSession/accountDeletionEpoch, не стирать drafts/формы/таблицы. Отдельная ошибка API не должна без признака manual flag закрывать весь исправный сайт.
- Открытая вкладка замечает режим при следующем запросе; чтобы чистая навигация SPA тоже проверялась, использовать ограниченную проверку Nginx status на navigation/возврат фокуса/ручной Retry, без бессмысленного частого polling и Google-запросов. Не обещать мгновенный push без запросов.
- Пока режим включён, запретить обычные отправки и повторные клики; не ставить пароль/коды/изменяющие POST в offline queue и не повторять их после восстановления без действия пользователя. По выключению вернуть доступ без полной reload оболочки и с сохранёнными данными; просроченная JWT/CSRF потом обрабатываются прежними guards, а не обходятся.
- Приёмка: login/register/input/search/terms review не теряют данные на 503; восстановления/повторные отправки понятны, текущий email confirmation и terms state не смешиваются с maintenance. Статическая аварийная page и уведомление SPA выглядят согласованно.

### 7. [x] Выполнить автоматические проверки, включая timing и протоколы

- Backend suites: новые pending-login/registration-limits и reminders; существующие test_auth_lifecycle, test_auth_enumeration, test_password_reset_privacy, test_terms_acceptance/history, recaptcha-policy, retention и mail-cleanup в релевантном объёме. Без реальной SMTP/Google/IMAP и рабочей DB; новые counters/migrations/concurrency — в изолированной PostgreSQL fixture, не выдавать SQLite за row-lock доказательство.
- Pending security matrix: wrong/unknown/active/unconfirmed/disabled/NULL legacy/deleted, correct password только для разрешённой ветки; отсутствие JWT/cookies до email+terms; concurrent activation/resend/delete/retention, код истёк/неверен/повторён/старый после resend, лимит через разные IP/workers, UI countdown bypass, SQL/HTML/header injection, malformed/oversize input, CAPTCHA bad/action mismatch/reuse, no sensitive logs. CAPTCHA score/hostname/одноразовость не отключать.
- Timings измерять на равных malformed-vs-valid boundaries после CAPTCHA, раздельно wrong/unknown/disabled и correct-pending. Подтвердить один hash, отсутствие SMTP в login, прежние floors и bounded SMTP resend. Несколько рандомизированных серий с mean/median/tail и допуском под окружение, отдельно нагрузку/rate limits; не один запрос и не тест «время больше заданного sleep». Зафиксировать практические границы, не заявлять абсолютной защиты от всех timing attacks.
- Frontend build/lint из docs/rules/validation.md через Docker. Дополнить текущие scripts/test-auth-privacy.mjs, test-account-session.mjs, test-navigation-lifecycle.mjs/recaptcha-scope или небольшой отдельный suite: общая confirmation форма, pending/reset/terms/maintenance состояния, отсутствие повторных запросов/потери drafts и double submit, loader semantics. Старые несвязанные lint-ошибки отделить; scoped lint изменённых TS/TSX разрешён по правилу.
- Nginx: nginx -t в отдельном disposable Compose project с синтетическим upstream и localhost-only тестовыми портами. Проверить flag on/off/status, 503 status/body/headers, legal/PDF и ACME, GET/HEAD/POST, путь обхода и dotfiles; backend остановлен/недоступен, flag сохраняется при recreate; состояние другого dev/prod экземпляра не меняется. Не останавливать настоящие пользовательские dev/prod контейнеры ради теста. HTTP проверка fixture не является production TLS-приёмкой.
- Приёмка: проверки выполнены и записаны точными командами; недоступную обязательную проверку не закрывать формальной отметкой. Не расширять тестирование несвязанных частей после успешного целевого прогона без новой причины.

### 8. [x] Подготовить визуальную приёмку владельца и актуальные инструкции

- Использовать/аккуратно расширить disposable localhost:8082 preview из deploy/testing/terms-preview.compose.yml либо отдельный stage009 preview, не вмешиваясь в рабочую DB/env/SMTP. Подготовить фиксированные синтетические pending/active/disabled/terms accounts, демонстрационный код и deterministic loading fixtures. Медленный ответ/переключение loading разрешены только в тестовом стенде, не production.
- Дать владельцу короткую последовательность: правильный pending login → существующая code форма → неверный/верный/истёкший код → resend/cooldown → активация → обычный вход/terms; показать active/disabled отказ отдельно. Тестовые адрес/пароль/код — только fixtures, не реальные пользователи/ящики. Письма и Google на стенде не вызываются.
- Показать рядом/последовательно skeleton и реальную форму одинакового размера: по центру LoadIcon, такой же контур; минимум auth guard, подтверждение и релевантная большая форма/таблица. Chrome/Firefox, обе темы, resize/zoom/Tab. Дать конкретный локальный URL и способ переключить тестовые состояния, а не требовать угадать момент секундной загрузки.
- Показать maintenance mode отдельным локальным Nginx-стендом: on → page/503 и legal/PDF → уже открытая форма с сохранением данных → off/retry; backend fixture можно остановить только в этом изолированном проекте. Для reminders показать локальный безопасный preview темы/текста с synthetic counts/dates, no-send, не отправлять в университетский ящик ради графической проверки.
- Не просить отключать AVG/браузерную защиту. Если preview недоступен, диагностировать конкретную локальную причину. Собрать минимальные screenshot/измерения и передать владельцу визуальную приёмку; требуемую user-проверку не объявлять выполненной автоматически, не архивировать до результата/явного исключения владельцем.
- Обновить docs/rules/frontend.md, boundaries.md и runtime-and-privacy.md вместе с фактом реализации; README обычного local setup сохраняет Gmail, новые operator-процедуры — deploy/mail и deploy/maintenance. Список будущих prod/SFTP файлов и команд применять только после отдельного разрешения. Отдельно отметить, что общий запуск compose не активирует systemd reminder/cleanup timer сам.
- В операторских документах: автоматическое напоминание за 7 суток не является удалением, не продлевает срок и не меняет ручную обязанность; проверка состояния/неполучение письма/SMTP accepted/повторные открытия/остановка задания описаны. Privacy/Agreement/PDF не переписывать ради технической косметики. Если фактически меняется публично описанное поведение (например continuation registration), синхронизировать только нужные утверждения и при правке канонического legal текста выпустить новый version/PDF/hash по уже существующему guide; не выполнять новую миграцию или сброс принятия без необходимости.
- Завершение: журнал каждого шага, ясные результаты/ограничения, user visual acceptance, затем completed → archive и STATE/BACKLOG. До этого код не считается опубликованным, реальные письма/таймеры/VPS не считаются включёнными.

## Критерии завершения

- [x] Pending registration возобновляется после правильного пароля без аккаунтного раскрытия до проверки и без premature session; disabled/terms/reset/retention сохранены.
- [x] Подтверждение/повторная отправка переиспользуют общий UI, защищены серверными общими лимитами и одноразовыми кодами; timing matrix проверена.
- [x] Skeleton совпадают с заменяемыми формами/панелями по размеру и контуру, существующий LoadIcon по центру в целевых браузерах/темах.
- [x] Reminder за 7 суток подготовлен для указанного владельцем адреса через OVH, с persistent dedup/catch-up/отменой после reopen и без пользовательской переписки в сообщении.
- [x] Режим техработ включается/выключается/проверяется без build, работает без backend/DB, выдаёт 503, legal/PDF/contact доступны, drafts и guards сохранены.
- [x] Автотесты/изолированные migrations/Nginx проверки пройдены, владелец получил и завершил визуальную приёмку; обязательные недоступные проверки явно остаются открытыми.
- [x] Правила и инструкции согласованы с кодом; VPS/env/рабочие данные/реальные отправки не изменены в этом цикле, план архивирован только после завершения.

## Первичные технические источники

Проверены архитектором 18.10.2026; использовать для конкретных механизмов, не как обещание полного аудита:
- https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html — generic failures, throttling и сравнение credentials.
- https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html — одноразовые ограниченные коды, ограничения перебора и единообразие публичных ответов; reset-flow не переносить механически на регистрацию.
- https://nginx.org/en/docs/http/ngx_http_core_module.html#error_page — статические ответы/ошибки; сохранить реальный статус 503 и исключить loops.

## Журнал выполнения

18.10.2026, архитектор: завершение/архив 008 подтверждены STATE и владельцем. Изучены текущие auth/registration, SingleSkeleton/LoadIcon, mail state/SMTP и dev/prod Nginx. Владелец согласовал ручное управление техработами через Nginx. Создан план; код приложения, real mail, migrations и VPS не изменялись.

## Итог

Заполняет имплементатор. Коммиты: docs(stage-009): plan activation recovery and maintenance; итоговый код при соответствующем объёме — feat(stage-009): add activation recovery and maintenance controls. Commit/push без поручения не выполнять.


### Начало локальной реализации — 18.10.2026

Прочитаны README/роль/workflow/STATE, revision 1 и применимые правила. При начале
были только изменения планнера docs/BACKLOG.md, STATE и новый stage009: сохранены.
VPS/DNS/env/секреты/рабочие volumes/реальные письма/commit/push не используются.
Изучены существующие login/terms/confirmation/SMTP budgets, shared registration UI,
SingleSkeleton consumers и предыдущий disposable preview. Подтверждена необходимость
общего DB-backed лимита challenge/resend: per-IP route limits не дают общего счётчика.


Уточнение владельца в ходе реализации: CAPTCHA должна сохраняться на continuation
и публичные документы должны соответствовать новому поведению. Подтверждено: backend
expected actions login/confirm_registration/resend_code сохраняются; frontend
allowlist /login расширяется только двумя уже существующими registration actions,
с fresh token на каждое действие. Lazy iframe/page-visit отсутствие загрузки остаётся.


### Шаг 1: credential-verified pending login

User.login делает один real hash для имеющегося адреса либо prepared dummy для
unknown; pending разрешён только allow_pending=True и completed is False.
Authentication повторно проверяет User/account_version под common/User lock;
правильный pending получает 409 email_confirmation_required без JWT/SMTP/PII,
ожидание общего failed floor после rollback. Active/terms/disabled/NULL сохранены.
Новые pending tests + targeted dummy regression + existing terms suite: 21 OK,
2 PostgreSQL concurrency cases skipped в SQLite (запланированы отдельной fixture).
Первый прогон выявил пропущенный fixture alias code и прежнее ожидание 404 при
mock real pending match; harness/ожидание исправлены, session никогда не выдаётся.
Существующая randomized timing/resource suite до этого прошла свои cases; новая
полная pending timing матрица остаётся шагом 7, не объявлена измеренной.

### Начало шага 2: общие серверные budgets

Добавлена RegistrationLimit (users_db): одна строка на account, current challenge,
wrong-attempt count и 15-min issue window. Предварительно выбраны 5 неверных попыток
на challenge и 3 выпуска за 15 минут через ВСЕ registration/duplicate/resend пути,
включая initial issue, чтобы публичным повторным register нельзя было сбросить budget.
Новый код атомарно инвалидирует прежние registration codes, password_reset не трогает.
Wrong attempts коммитятся при generic 401, activation/code consumption в той же
User transaction, guard очищается вместе с аккаунтом. Добавлена additive migration
без DML/backfill, пока не применялась к рабочей БД; lazy adoption legacy challenge.
Тесты/общий frontend confirmation UI ещё в работе, шаг 2 не закрыт.

### Шаг 2 — результаты
Общая RegistrationConfirmation используется login/register: ASCII code, fresh CAPTCHA
на confirm/resend, явная отправка, cooldown, возврат к обычному login. /login allowlist
расширен только confirm_registration/resend_code. PostgreSQL fixture: 132 tests OK
(48.816s), включая migration/idempotence/constraints/concurrent budgets. Frontend
auth-privacy + recaptcha-scope: 17 tests OK. Working DB/env не изменялись.
Команды: docker compose -p wwwhypda-stage009-tests -f deploy/testing/retention.compose.yml
up --abort-on-container-exit --exit-code-from tests; frontend node test через build
service terms-preview.compose.yml, --no-deps, network none. Старое ожидание двух
registration codes исправлено на один current challenge + sent_count=2.

### Шаг 3 — карта и реализация в работе
Consumers: guards (раньше 40vh/empty); input/edit/read stepper tables с definite
34rem parent и compact 7.5x2.5rem action; Search tree/lookups/results с panel height;
account/admin tables 25rem. SingleSkeleton теперь общий persistent wrapper: loader
по умолчанию, existing LoadIcon, inputContour, inert скрытый уже загруженный DOM при
refetch, прежние значения/геометрия сохраняются. Первый load не монтирует consumer
с неготовыми данными, минимальная panel высота 8rem; compact controls без этого
минимума. Guards используют общий с ready routeFrame минимум 34rem из stepContent,
вместо guessed viewport. Геометрия неизвестного первичного контента не объявлена
измеренной: deterministic preview и проверка владельца остаются обязательными.

### Шаг 4 — напоминания
mail_reminder.py использует hook под lock после двух стабильных readonly snapshots
mail_cleanup и observe; никакого delete. Private additive outbox, cycle dedup,
catch-up, cancellation, cap 1 batch/day/100 cycles, max3attempts/backoff6h, stable ID
и documented at-least-once crash window. --send + enabled + exact owner/OVH settings
обязательны, default no-send. Тело только count/nearest due/Rome/instructions.
SMTP TLS connection helper выделен из существующего transport без mainApp/envloader.
56 fake reminder/mail-cleanup/SMTP tests OK (3.575s), реальных подключений нет.
Первый тест обнаружил сброс retry при stale observation; stale-closed gate теперь
отказывает до любых outbox mutations. deploy/mail/reminders.md и disabled service/
timer templates описывают ручную обязанность, delivery limits и остановку.

### Шаг 5 — Nginx manual mode
control.py on/off/status изменяет только recognized atomic enabled в явно выбранном
абсолютном отдельном каталоге; rejects root/symlink/unowned-file/type. server/gate/
headers snippets, static bootstrap + canonical palette/font/legal SSR+PDF generator
отделены от dist; tracked dev Compose integration, отдельный preview8083. Приватные
prod configs/env не читались/не менялись. HTTPS/HSTS/servername/ACME instructions
в deploy/maintenance/README.md. check_maintenance.py: 2 tests OK (69.191s): nginx -t,
GET/HEAD/POST503, APIcode/no-store/RetryAfter/security headers, HTML/PDF/status200,
ACME/dotfiles/internal-only page, off/on idempotent, fixture backend stopped + normal
dist index отсутствует, recreate flag survives, off/backenddown502 не manual mode.
Рабочие dev containers/DB не останавливались, preview restored и flag off.

### Шаги 6–7 — результаты в работе
SPA separate maintenance state через existing Axios, shared ModalWindow, status on
route/focus/Retry с throttle/no polling. Block requests/no replay/no session cleanup;
useAuthCheck сохраняет прежний результат при manual503, после off заново проверяет
обычную session. API regression+dictionaries/scope/auth/navigation: 53 frontend tests
OK (1.980s), scoped ESLint no errors, existing profile dependency warning остаётся.
Новые skeleton/guard tests, account/admin profile wrappers и browser preview завершаются.
Timing: 3 seeded randomized series x4 categories x4 samples, real hashes + real .4s
floor: pending mean .4012/median .4008/p90 .4010; wrong .4009/.4009/.4010;
disabled .4009/.4009/.4010; unknown .4008/.4008/.4010 seconds. 84 SQLite/mock
enumeration/reset/reminder/mail/SMTP tests OK (57.599s), full response budget
unknown/known reset 4.001/4.001s, sender bound/resource/parent death tests passed.
Допуски mean spread<.12s/tail<.20s, локальный стенд, не обещание отсутствия всех
сетевых side channels. Первый harness ошибочно задал empty DB URI; заменён на
явный sqlite://, после этого полный прогон successful. Реальные providers не вызывались.

### Документы — новая локальная редакция 2026-10-18.2
Синхронизированы canonical User Agreement/Privacy/Cookie: credential continuation,
explicit resend/fresh CAPTCHA, server guard counters/retention, minimal owner reminder.
Новая общая version, RELEASES hash, три PDF+manifest. PDF skill marker выполнен
один раз для этой authoring operation. Полный текст сверён с SSR; все 12 страниц
(Agreement3/Privacy7/Cookie2) отрендерены и просмотрены: читаемы, без обрезаний/
наложений; последние страницы содержат завершающие разделы, не пустые. Старые PDF
сверены с сохранёнными SHA256 и побайтно сохранены. Migration/reset принятия
для смены version не выполнялись; существующий terms flow применит новую редакцию.

### Финальные локальные проверки / передача владельцу
PostgreSQL final:133 tests OK (48.954s), включая concurrent wrong attempts cap5
и simultaneous confirmation [200,401], migration/DDL/ledger/retention. После этого
добавлены только tests (не runtime): deleted/password-changed/disabled-after-hash
recheck + malformed/oversize/injection reject-before-CAPTCHA/hash;7pending tests OK
(3.559s) на explicit sqlite://. Это проверка recheck, не имитация PG row-lock.
Existing CAPTCHA-policy/mail-probe fixture:20 tests OK (1.717s), no external providers.
Reminder final retry aggregate pending_total/attempts_exhausted:6tests OK (.036s).

Frontend общий набор:53 tests OK + отдельный новый guard case и 503 values/terms
case (targeted auth suite13 OK,1.040s); вместе55 unique cases, не объявлены одним
общим последним запуском. После auth contour уточнения skeleton2tests OK (.495s).
Scoped ESLint no errors;2 прежних warnings account fetchUserData/superuser
performAction. Full baseline до skeleton fix был61errors/16warnings, из них новые
3ref-render errors и1unused directive устранены; окончательный baseline ниже.
HOC login/register для scoped lint признан через extraHOCs:[withRecaptcha],
правило не выключено; scripts/lint-stage009.mjs воспроизводит команду.
Финальная Docker build/TypeScript + legal check успешны, Vite chunk-size warning
сохранён; production splitting не входит в план. Build-only loading fixture
не импортируется обычным приложением.

HTTP check_activation_preview.py прошёл:409pending/no cookies, explicitresend,
wrong401/right200 confirmation, no cookies до ordinarylogin200/check200, disabled404,
synthetic reminder/loading URLs, локальный external mock script под CSP. Первый
HTTP harness ошибочно принял SPAindex за readiness; исправлены fixture-only proxy
маршруты и ожидание настоящего JSON backend. Реальный CAPTCHA iframe production
на preview не раздаётся: exact mock route только в preview Nginx, с external
local JS (inline не разрешается CSP). Никакого ослабления production verifier.

Финальный check_maintenance.py:2tests OK (13.330s), добавлены GET/HEAD-only status405
для POST и403 для assets/.env. Первый повтор после recreate поймал connection
startup race; harness теперь ждёт только готовности socket и проверяет503. Backend
fixture после теста запущен с чистой ephemeral DB, flag off; dev instance flag
не включался. Обычный backend failure502/504 не выдаётся за manual maintenance.

Обновлены README, frontend/boundaries/runtime rules, legal release/operator mail/
maintenance guides, future SFTP inventory; Gmail local setup сохранён. Canonical
legal/PDF sync checks OK. Рабочая DB/env/private configs не читались/не менялись.
План НЕ архивирован: шаг3 (браузерная геометрия/контур) и шаг8 owner visual
acceptance открыты. Полная инструкция: deploy/testing/stage009-preview.md.
URLs:localhost:8083/login; /loading-fixture/index.html; /__preview__/reminder.
Chrome/Firefox inventory пуст; реальная browser matrix не выполнена агентом.
Владелец проверяет continuation, skeleton/geometry/themes/zoom/Tab, maintenance
on/off+сохранение формы+legal/PDF. AVG/браузерную защиту не отключать.
Commit/push/VPS/real mail/real удаления не выполнялись. Предлагаемое имя будущего
коммита: feat(stage-009): add activation recovery and maintenance controls.

Final full lint:58 errors/15warnings — прежний baseline, без новых scoped errors.
При final layout audit maintenance portal вынесен после MainBody и его host имеет
display:contents: он не создаёт четвёртый grid row, MainMenu остаётся первым
element child для прежнего header measurement. Никаких новых viewport assumptions.

### Исправление по визуальной приёмке владельца (продолжение 009)
Владелец уточнил scope шага3: bordered wave+MUI loader только для login/register/
reset/confirmation. Во время auth check нужен skeleton ЛОГИНА (не account/пустота);
во время code verification нужен skeleton текущей confirmation формы. Broad
SingleSkeleton/Account/Superuser changes отменены до HEAD; Search/tree больше
не получают новый contour/background/min-height. Прежний routeFrame34rem удалён.
AuthSkeleton выделен отдельно и резервирует размер настоящей mounted формы;
checkingAccess использует тот же Login component без собственных login requests
и без terms modal. Цвета прежние form-color, border3px/radius8px, wave и LoadIcon.
Login/register/forgot/code pending сохранили значения, callback busy сбрасывается
в finally даже при activation->login переходе. Back — styled Link; email masked.
Неверный/истёкший код не подменяется успехом:2min TTL и invalidation при resend
сохранены. Вместо инструкции всегда вводить123456 создан fixture-only code
inspector с remaining TTL; HTTP check проверяет2resends, old401/new200.
Предыдущие записи этого журнала о global panel/frame implementation исторические
и отменены этим явным уточнением владельца; шаг3 всё ещё ждёт приёмки.

После уточнений владельца: общий frontend57tests passed (dot reporter), включая
обновлённый navigation guard harness с Login checkingAccess (старый harness ждал
импорт общего SingleSkeleton, исправлен только test dependency и assertions).
Targeted18 auth/loading/maintenance cases passed до этого. Build/TypeScript passed
(12.54s), обновлены раздаваемые normal+auth-only fixture bundles. Scoped lint
только реально изменённых TS/TSX: восстановленные profile/SingleSkeleton исключены.

HTTP повторная отправка проверена через2явных resend: актуальный код заменился,
прежний401, свежий200; activation сама не выдалаcookies, обычныйlogin/check200.
Code inspector/JS доступны, показывают TTL; fixture затем сброшена только restart
preview web, codes=[]/pending account снова начальный, maintenanceoff.
Auth-only visual page доступна200 с готовыми bundles. Scoped lint final clean.
Документы/UI инструкции обновлены; legal content/PDF из-за CSS/маскирования не
менялись. Новая visual acceptance ещё нужна; план остаётся in_progress.

Владелец подтвердил реальный login->email confirmation и resend: работают.
Попросил приёмку внутри приложения8082 вместо отдельной страницы. В fixture
добавлен явно preview-only 3s delay перед auth POST/check (outside transaction),
чтобы наблюдать реальные AuthSkeleton login/register/reset/confirmation. Это
не production latency floor; обычные dev/backend/VPS и validation не меняются.
Owner loading/form visual acceptance ещё ожидается, отдельная страница не требуется.

8082 live fixture smoke: check401/login-pending409/reset malformed400/register malformed400
каждый реально ждёт3секунды, страницы login/register/reset/code inspector200;
fixture code state чист, реальные requests/providers не вызывались. Задержка
проверена только в изолированном preview, production code не менялся.

Владелец заметил отличие footer при ADD DATA/account guard: route уже protected,
хотя visible form — login skeleton. Добавлен data-auth-check marker на реальном
Login и CSS visibility fallback notice в shell. На время проверки подпись такая
же, как у login; никакого Google executor/allowlist на protected routes не добавлено.
Правка UI-only, canonical legal/PDF и backend не меняются.

Дополнительное уточнение владельца: заметен именно footer layout jump, когда notice
исчезает и правая колонка центрируется заново. Проверен текущий официальный FAQ
https://docs.cloud.google.com/recaptcha/docs/faq#hiding-the-badge: при скрытом badge
нужен protected-by notice; FAQ data processing после02.04.2026 убирает consumer
GooglePrivacy/Terms links. Это совпадает с deploy/privacy/recaptcha-assessment.md
и текущим Cookie Policy, где session check/submit не запускают CAPTCHA. Прямое
открытие текущей service-terms страницы вернуло web fetch error; новый вывод о
её полном тексте не делался, использованы прямой актуальный FAQ и прежняя
документированная оценка§46. Notice оставлен в eligible/visible auth flow, остальные
переходы сохраняют его естественный layout box через visibility:hidden вместо
display:none. Footer геометрия не зависит от скрытия подписи; legal/PDF содержание
не менялось, CAPTCHA routes/SDK scope сохранены. Визуальный результат ещё проверяет владелец.

Владелец подтвердил последнее исправление footer («да всё окей»): сдвиг после
скрытия CAPTCHA notice устранён. Это приёмка footer/переходов из последнего
сценария, не объявление проверки manual maintenance. При audit перед архивом
найдены остающиеся обязательные owner результаты шага8: maintenance on/off в
открытой форме с сохранением ввода/доступностью legal и browser/theme/zoom рамки
приёмки. Автотесты Nginx/no-backend уже успешны и повторно не требуются.
По WORKFLOW план пока active/in_progress, архив не создаётся до этих результатов
или явного изменения обязательного объёма владельцем. Код/окружение не менялись.

Уточнение владельца во время maintenance приёмки: outer contour окна техработ
применён ко всем auth формам (оба шага register/reset/login/confirmation), их
skeleton и общему ModalWindow (edit/submit choice, updated terms). Один Sass
formContour mixin:1px var(--menu-border),25px radius, прежняя modal shadow;
background существующих форм сохранён. Input controls/Search/tree не меняются.
Maintenance mailto/legal links используют тот же users.link, что под login;
отдельная static maintenance страница собирает contour/link rules из тех же
канонических Sass источников. Functional API/auth/acceptance логика не менялась.

Проверка общего оформления:18 targeted auth/loading/maintenance tests passed;
scoped ESLint clean; TypeScript/Vite build passed, canonical maintenance assets
пересобраны. git diff --check: ошибок пробелов нет (только прежние LF/CRLF
предупреждения). Legal PDF check: три текущих PDF согласованы, содержание
документов не менялось. Новые ссылки/обводку ещё должен посмотреть владелец.
Для завершения начатой проверки сохранения ввода maintenance flag выключен
только в изолированном preview8083; рабочий dev/VPS не менялись.

Следующее явное уточнение владельца: та же обводка нужна всем input fields.
Общий inputContour теперь включает formContour вместо отдельной 2px/4px рамки;
потребители — auth/code/reset/register, общие inputField и delete password.
Фон/размеры/отступы и состояния полей сохранены, checkbox/radio и панели
Search/tree не менялись. Результат требует визуального просмотра владельцем.

Input contour проверен TypeScript/Vite build (passed,10.21s), legal PDF check
passed; static maintenance assets пересобраны, preview bundle обновлён.
git diff --check без whitespace errors (прежние LF/CRLF warnings). Изменения
только Sass/документации, API логика не менялась; новые unit tests не нужны.
Визуально проверить поля после Ctrl+F5 на localhost8082/8083, обе темы.

По следующему уточнению владельца inputContour переопределяет только radius
на прежние4px; тонкая обводка/тень сохранены, внешние формы остаются25px.
Проверки: TypeScript/Vite build passed (10.65s), legal PDF check passed,
git diff --check без ошибок; локальный preview пересобран.

По замечанию владельца приглушены тень форм/инпутов и обводка полей
в светлой теме: отдельные form-contour-shadow/field-contour-border плюс
спокойные hover/focus. Тёмная тема, фон/размеры/скругление и остальные
потребители under-body-color сохранены. Новые цвета — в общей палитре.
Проверки светлой палитры: TypeScript/Vite build passed (10.38s), legal PDF
check passed; independent maintenance assets и preview bundle обновлены.
git diff --check без ошибок; визуальный результат ожидает владельца.

Уточнение владельца: внешняя рамка формы в светлой теме оставалась слишком
насыщенной (унаследованный тёмный menu-border). Добавлен form-contour-border:
30% текущего tree-text +70% form-color; общая рамка форм/modal/skeleton и
static maintenance использует этот token. Тёмная тема, инпуты и тени не меняются.
Проверки: TypeScript/Vite build passed (10.49s), legal PDF check passed,
git diff --check без ошибок; preview и static maintenance обновлены.
Визуальная приёмка нового цвета владельцем ещё ожидается.

Владелец одобрил мягкий цвет рамки формы и попросил тот же для инпутов
в светлой теме: field-contour-border теперь var(--form-contour-border).
Тёмная тема, radius4px и hover/focus/error состояния сохранены.

Дополнительное уточнение владельца во время сборки: hover/focus/active тоже
должны соответствовать светлой палитре. Убраны отдельные серо-зелёные hex:
цвета рамки теперь одна смесь tree-text/form-color с долей акцента30/45/85%
для normal/hover/focus+active. Тёмная тема и error/disabled поведение сохранены.
Предыдущая сборка обычной рамки прошла (10.59s); итоговая пересобирается ниже.
Итоговая проверка normal/hover/focus/active палитры: TypeScript/Vite build
passed (10.86s), legal PDF check passed, git diff --check без ошибок.
Preview и independent maintenance assets обновлены; визуальный просмотр ожидается.

Владелец одобрил обновлённые цвета и попросил поменять местами theme/account.
MainMenu JSX: сначала account, затем theme; margin-left:auto перенесён
на account, чтобы обе иконки оставались справа. Поведение и подписи сохранены.
Проверка перестановки иконок: scoped ESLint mainMenu clean, TypeScript/Vite
build passed (11.35s), legal PDF check passed, git diff --check без ошибок.
Локальный preview обновлён; новые функциональные тесты для перестановки не нужны.

Владелец подтвердил нормальное отображение skeleton и начал оставшийся
maintenance/input-preservation сценарий: ввёл почту. Включён только
изолированный localhost8083 flag; reload и отправка формы не требуются.
Результат сохранения ввода ещё ожидается.

Владелец подтвердил: в открытой вкладке появилось maintenance окно,
ссылки на документы и контакт доступны и работают. Тестовый flag8083
выключен (status off); ожидается Try again без reload и подтверждение
сохранения введённой почты. Остальные окружения не менялись.

### Завершение и архивирование — 18.10.2026

Владелец подтвердил нормальное отображение skeleton, одобрил итоговые цвета
форм/инпутов и порядок иконок. Последняя обязательная практическая проверка:
в уже открытой форме localhost8083 введена почта, включён isolated maintenance,
владелец увидел окно и проверил работающие документы/контакт. После выключения
flag и Try again без reload владелец подтвердил: «да всё сохранилось».
Это пользовательская приёмка, не автоматизированный отчёт об отдельных browser/
zoom combinations: точные версии браузеров и screenshots владелец не передавал.
Прежние ограничения агентского browser inventory сохранены в журнале.

Результат: шаги1–8 завершены, acceptance закрыта по фактическим результатам
автотестов и владельца. Сохранены activation/terms/auth/CAPTCHA gates, защищённые
server confirmation budgets; auth-only loaders, reminders no-send, независимые
maintenance CLI/static assets и сохранение mounted form. Инструкции deploy/mail,
deploy/maintenance и deploy/testing актуальны. Working DB/env/VPS/DNS, реальные
письма, удаления и commit/push не затрагивались. Reminder/cleanup production
таймеры не включены. Preview остаётся доступным, maintenance flag выключен.

Проверки: PostgreSQL133 passed; отдельные7 pending regression passed;
SQLite/mock enumeration/reset/reminder/SMTP84 passed; CAPTCHA-policy/mail-probe20
passed; frontend57 passed и последующие targeted18 passed; Nginx2 passed.
Timing matrix и ресурсы зафиксированы выше. Итоговая UI-сборка TypeScript/Vite
passed (11.35s), scoped ESLint mainMenu clean, текущие3 legal PDF согласованы.
Полный lint сохраняет прежние baseline ошибки; scoped не выдаётся за full lint.
Документальное завершение не требует повторной сборки приложения.

Статус completed → archived; STATE очищен, индекс архива и ссылка BACKLOG обновлены.
Предлагаемое название коммита: feat(stage-009): add activation recovery and maintenance controls.
Коммит не создавался.
