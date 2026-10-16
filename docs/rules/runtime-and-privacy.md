# Конфигурация, юридические документы и запуск

- Dev и prod разделены. Сборка локального образа не обновляет уже запущенный backend и не является публикацией на VPS. Продакшен-конфигурация и данные не подменяются dev-настройками.
- Правки auth/DB включают необходимую отдельную миграцию и проверку; не применять миграции к рабочей базе без разрешения. Не удалять volumes и данные ради проверки.
- /privacy-policy, /cookie-policy и /user-agreement — React-страницы, доступны без авторизации и reCAPTCHA; юридические страницы доступны при маленьком viewport. Не превращать их в PDF-механизм neurobaza.
- Изменение userAgreement.tsx требует синхронной версии в wwwhypda-backend/auth/terms.py и wwwhypda-frontendV2/src/common/userAgreementVersion.ts, обновлённого отпечатка deploy/privacy/check_terms_release.py. Не переписывать принятые старые версии и timestamps.
- Privacy Policy и другие публичные тексты описывают фактическую работу. Планы перехода, автоматизация и проверка не объявляются выполненными заранее; не обещать полной защиты от штрафов.
- Подробные текущие процедуры и оценки находятся в deploy/privacy/privacy-operations.md, recaptcha-assessment.md, ovh-contract-review.md и gmail-transfer-review.md. Читать по задаче; поддерживать вместе с поведением, не дублировать их противоречивыми правилами.
- Отдельный публичный научный каталог не смешивать с приватными InputData-заявками. Новая публикация пользовательских данных требует отдельного плана. Пустое authors не гарантирует отсутствия персональных данных в остальных полях.
- При изменении email сверять правила SMTP, входящих обращений и удаления. Решение перейти на OVH ещё не означает реального переключения. 24 часа VPS backup не переносить на email backup или все журналы.
- Server-side авторизация, ownership, CSRF, отзыв сессий и reCAPTCHA не отключаются ради исправления UI. Непустое authors в новых заявках временно запрещено сервером и формой; изменение этого ограничения — отдельная задача.
## Retention: проверенное локальное поведение цикла 002

- Новые обычные регистрации имеют серверные registered_at (UTC) и registration_completed=False; все успешные пути активации ставят True, отключение не сбрасывает. Клиентские значения запрещены. Duplicate/resend/reset не переписывают возраст или acceptance.
- До нового backend/worker обязательно применить auth.migrate_retention и --check. Миграция добавляет nullable поля без server default и индексы; прошлым строкам дата не выдумывается. Старым active=True можно отметить завершение; неизвестные inactive остаются NULL.
- Retention удаляет только inactive+completed=False с достоверной датой старше одного календарного месяца, исключая superuser. Одной транзакцией — аккаунт/acceptance, связанные заявки/коды, однозначные editing_by. Подтверждённые отключённые аккаунты не считаются незавершёнными.
- InputData всех статусов удаляется через шесть календарных месяцев от исходной подачи, без удаления аккаунта. Даты не сбрасываются при редактировании; naive created_at трактуется как UTC. NULL/future исключаются из планового отбора и требуют контроля.
- Отдельный maintenance.retention_cleanup: --once по умолчанию dry-run, удаление только --execute; continuous только --worker --execute. Immediate pass, затем ожидание 3600 секунд (положительный интервал не более часа), SIGTERM/SIGINT, retry после ошибки без busy loop. До миграции безопасный отказ; SMTP и mainApp не импортируются.
- Порядок users_db: общий transaction advisory lock → User → InputData/ConfirmationCode, совместно для guards/registration/activation/submission/self-delete/cleanup. Батчи максимум 100 кандидатов, коммит между батчами; rollback текущего батча, идемпотентный повтор. SQL/адреса/имена/ids/JSON в retention-журнал не выводить.
- Dev/prod Compose worker включается явно через профиль retention только после миграции и проверенного dry-run. Рабочую dev-БД не использовать для разрушительных тестов. PostgreSQL migration/concurrency/process suites запускаются через изолированный deploy/testing/retention.compose.yml.
- Автоматика локально реализована и проверена; на VPS не включена. Подготовленные тексты/договор 2026-10-14.2 публиковать только с проверенным включением. Локальная приёмка подтверждена пользователем, результаты и ограничения сохранены в docs/archive/002-automatic-data-retention.md. Legacy-операторский разбор и future deployment не объявлять завершёнными.

## reCAPTCHA: локальная реализация и документальная оценка цикла 003

- Google context eligible только на /search, /login, /register, /forgot-password и создаётся после явного search/auth action в отдельном same-origin recaptcha-frame.html. Provider/оболочка стабильны, но на остальных маршрутах executor недоступен; SDK не импортируется в основной window. Уход даже между eligible страницами отменяет pending execute и удаляет iframe целиком вместо reload; поздний token не разрешает отправку. Фоновые/session/read/authenticated submit/delete остаются без CAPTCHA. JWT/CSRF/ownership/password/revocation/rate limits и drafts сохраняются. Это управление lifetime кооперирующего same-origin документа, не security boundary против злонамеренного same-origin кода; сохранённые Google cookies удалять не обещает.
- Expected actions определяет endpoint. Hostname проверяется по exact RECAPTCHA_ALLOWED_HOSTNAMES JSON allowlist, не по Host/header клиента. Dev default localhost/127.0.0.1; prod без явного списка, с local/test hosts, отключённой CAPTCHA или отсутствующим secret отказывается стартовать.
- Google SiteVerify отвечает за invalid/expired/reused token; verifier требует strict success, finite numeric score/action/hostname. Не логировать provider body, token/secret или произвольные response поля. Test bypass только TESTING=True.
- Итоговый assessment оценивает lawful basis и technical exemption по каждому действию в ограниченном security-only scope; recaptcha-dpia.md учитывает scoring/monitoring/access risks вместо заявления «DPIA не нужна». Persistent cookie/передачи/false positives не объявлять отсутствующими. Новая цель, scope, tracking, значимые решения или неэффективность гарантий требуют пересмотра до включения.
- Тип/production-домены и аккаунтное уведомление Google о CDPA подтверждены владельцем. Browser-факты/их ограничения ведутся в recaptcha-browser-check.md; недоступную проверку не считать выполненной. Локальные документы не являются production-приёмкой; публикация и проверка VPS требуют отдельного разрешения.


## SMTP OVH: локальная подготовка цикла 007

- Flask-Mail использует smtp_transport.VerifiedMail: проверенные SSLContext/hostname для SSL и STARTTLS, без SMTP debug и fallback на Gmail. Прежние auth deadlines/sender cap сохраняются.
- Настройки остаются MAIL_*. OVH smtp.mail.ovh.net:465 требует MAIL_USE_SSL=True, MAIL_USE_TLS=False, smtp mode, MAIL_SUPPRESS_SEND=False и sender, совпадающий с username. Локальный log mode не отправляет писем.
- По сообщению владельца ящик support@wwhypdatestdeployversion.it создан. Отправка из приложения/VPS ещё не проверена этим циклом; IMAP, очистка и замена публичных контактов остаются отдельной работой. Инструкция: deploy/mail/ovh-smtp.md. Сроки VPS backup к почте не относятся.


## IMAP OVH: локальная подготовка цикла 008

- maintenance.mail_cleanup независим от Flask/auth/SMTP/DB/env loader. Linux CLI
  по умолчанию readonly DRY_RUN, PEEK, полный bounded snapshot всех selectable папок.
  Реальная Zimbra и SMTP Sent-копии пока не подтверждены: deploy/mail/ovh-cleanup.md.
- Exact UIDPLUS service/probe путь не использует CLOSE/plain EXPUNGE/fallback.
  Execute требует двух явных разрешений, свежих проверок и зрелого baseline.
  Автоудаление поддержки жёстко запрещено из-за межпапочной гонки IMAP.
- State/key/witness/lock в постоянном приватном host bind (0700/0600), не Git/образ.
  Месяц служебной копии также отсчитывается от первого наблюдения; closedAt — от
  наблюдения целиком закрытой цепочки. Reopened устойчив; reclose только явно.
  После любого restore state обязательны readonly rebaseline и новый месяц:
  согласованный откат всех локальных файлов автоматически не обнаруживается.
- Timer/service только шаблоны. Реальная адресная synthetic UIDPLUS приёмка требует
  отдельного разрешения; локальные fake tests её не заменяют. Шаги новых политик,
  PDF и повторного принятия редакции пока не реализованы; план 008 остаётся активным.


### Owner-приёмка IMAP 008

Владелец подтвердил реальный UIDPLUS/папки, readonly scans и сохранение baseline,
Draft veto, закрытие/reopened, адресное удаление одной synthetic цели с
controls_preserved=true (включая прежний Deleted). Код регистрации после
изменения production env пришёл от support; SMTP Sent-копия не найдена.
Это не deployment нового кода или включение автоматической очистки.
Support-delete остаётся запрещён из-за межпапочной гонки; шаг 4 не завершён.
