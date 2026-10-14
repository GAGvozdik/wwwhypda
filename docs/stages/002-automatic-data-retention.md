---
stage: 002
title: Автоматическое удаление неподтверждённых аккаунтов и научных заявок
revision: 1
status: in_progress
created: 2026-10-14
completed: null
rules:
  - docs/rules/project.md
  - docs/rules/boundaries.md
  - docs/rules/frontend.md
  - docs/rules/validation.md
  - docs/rules/runtime-and-privacy.md
---

# Цель

Автоматически удалять незавершённые регистрации после одного календарного месяца, а приватные научные заявки InputData — после шести календарных месяцев с подачи. Подготовить соответствующие тексты сайта, которые публикуются вместе с включённой и проверенной очисткой. Зафиксировать реальные сроки и ограничения, а не обещать отсутствие любых юридических претензий.

## Объём и ограничения

Только локальная реализация, тесты и подготовка конфигурации/документов. Не подключаться к VPS, не изменять DNS/почту и не выполнять production-миграции. Существующие аккаунты и заявки рабочей dev-БД не использовать для разрушительных тестов. Не читать env и секреты.

Не удалять подтверждённые аккаунты за отсутствие активности. Не удалять публичный каталог rocks/source, научные справочники, браузерные черновики, письма или резервные копии этим процессом. Их правила отдельные. Не менять reCAPTCHA, сроки auth-кодов, API транспорта или версию зависимостей без необходимости. Миграция почты OVH — другой цикл.

Предполагаемый объём включает новый отдельный retention-worker в существующем backend-образе, добавляющую миграцию users_db, изменения серверной модели/активации и проверку документов. Celery, Redis, cron внутри Gunicorn и дополнительные библиотеки не нужны.

## Проверенное исходное состояние

- User в auth/auth_models.py не имеет даты регистрации. terms_accepted_at относится к принятому договору; не использовать её как универсальную дату создания аккаунта и не переписывать её.
- active=False используется и для ожидающего подтверждения пользователя, и после административного отключения. Один этот флаг не является достаточным условием автоудаления.
- Активация происходит в auth/authentication.py при проверке кода и через User.activate_user_by_id / User.activate_user. Проверить все реальные пути и вызовы при реализации.
- InputData.created_at существует, задаётся datetime.utcnow; строки находятся в users_db и содержат связанные JSON-поля, name/comment/editing_by. Статусы: New, In editing, Completed.
- Самоудаление /users/me уже транзакционно удаляет User, принадлежащие ему InputData, ConfirmationCode по email и однозначно относимые editing_by. JWT проверяется по существующему аккаунту и account_version; это поведение сохранить.
- auth.code_cleanup и отдельный auth-code-cleanup уже удаляют просроченные коды каждую минуту. Он не удаляет аккаунты или заявки и не должен потерять прежние гарантии.
- Privacy Policy и User Agreement сейчас описывают ручную очистку. Переход к автоматике ещё не реализован и не включён.

## Решение о сроках

- Один календарный месяц от первоначальной регистрации; повторная регистрация того же незавершённого аккаунта и повторная выдача кода не продлевают срок.
- Шесть календарных месяцев от первоначальной подачи InputData; чтение, изменение статуса, работа админа и редактирование не сбрасывают дату.
- Календарная арифметика UTC: сохранить время суток; день, отсутствующий в целевом месяце, ограничить последним днём этого месяца. Например, 31 января + один месяц = 28/29 февраля. Прибавлять сразу нужное число месяцев, без промежуточного накопления округлений. Не заменять срок на 30/180 суток.
- Worker выполняет первый проход сразу при запуске, затем каждые 3600 секунд. Удаление — на первом успешном проходе после достижения срока; при штатной работе обычно в пределах следующего часа, плюс фактическое время прохода. В публичном тексте написать это прямо, не сохранять обещание удаления строго мгновенно на календарной границе.
- Сбой БД или остановка worker могут задержать физическое удаление. Безопасный retry, наблюдаемость и операторская проверка обязательны; не обещать безусловное выполнение срока при отказе инфраструктуры.
- Эти сроки выбраны для текущего сервиса, не установлены GDPR как универсальные обязательные 1/6 месяцев. Принцип — хранить не дольше необходимого и достоверно описывать сроки: [GDPR, статьи 5(1)(e), 13(2)(a)](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679).

## Шаги

### 1. [x] Ввести безопасные признаки возраста и завершения регистрации

**Файлы:** wwwhypda-backend/auth/auth_models.py; новый wwwhypda-backend/auth/migrate_retention.py; wwwhypda-backend/auth/authentication.py; необходимые реальные пути активации в auth/admin/admin.py через модель. Модель InputData менять только для нужного индекса/UTC-обработки, не переносить данные.

- Добавить User.registered_at (nullable UTC timestamp) и User.registration_completed (nullable boolean). Для вновь создаваемой обычной регистрации сервер задаёт registered_at и registration_completed=False. Любая успешная активация ставит True; последующее отключение не возвращает False. Наличие двух полей нужно для отличия нового незавершённого аккаунта от отключённого и от неизвестной legacy-истории.
- Не принимать эти значения из пользовательского JSON; попытка задать серверные поля при регистрации должна безопасно отклоняться, без 500/секретов. Сохранить текущую generic-response и защиту регистрации.
- registered_at неизменна при duplicate/resend/password reset. Дата принятия договора и версия остаются отдельными неизменяемыми фактами.
- Добавляющая PostgreSQL-миграция по стилю auth.migrate_terms_acceptance: идемпотентность, --check, совместимость существующих колонок, транзакция, ограниченные lock/statement timeout, без импорта mainApp/рассылки, безопасные сообщения и сохранение прежних данных. Не ставить server default, заполняющий прошлые строки сегодняшней датой.
- Старым active=True допустимо поставить registration_completed=True как доказанный текущий активированный статус, без выдуманной даты регистрации. Старым active=False без достоверной истории оставить registration_completed=NULL и registered_at=NULL; автоматике нельзя считать их неподтверждёнными.
- Не брать дату из свежего ConfirmationCode: коды обновляются и удаляются. Достоверный backfill legacy по внешним данным — отдельное операторское решение, не часть автодогадки.
- Добавить индекс для отбора expired registrations; проверить существующий индекс InputData.created_at и добавить его при необходимости той же контролируемой миграцией. Не добавлять PostgreSQL индекс, несовместимый со схемой тестовой SQLite без обработанного пути.

**Готовность:** новые регистрации имеют достоверные серверные поля; все пути активации сохраняют завершение; миграция не меняет существующие acceptance/данные и не создаёт ложную дату. Legacy неизвестной истории отражается безопасным количеством в dry-run/инструкции и требует отдельной проверки владельцем перед prod-включением, а не бессрочного обещания, что уже очищена.

### 2. [x] Реализовать транзакционную очистку и dry-run

**Файлы:** новый wwwhypda-backend/maintenance/__init__.py и retention.py; при необходимости отдельный helper удаления в auth; auth/authentication.py только для переиспользования механизма; inputData/inputDataModels.py по реальной необходимости.

- Определить один календарный helper и функцию очистки с явным now для тестов. Текущий now вычислять один раз на проход. Naive InputData.created_at трактовать как UTC согласно текущему writer; будущие/NULL/неизвестные даты не считать просроченными без проверки.
- Аккаунт-кандидат: active=False, registration_completed=False, registered_at достоверна и срок достигнут. Legacy NULL, активные, ранее подтверждённые отключённые и суперпользователи не удаляются автоматически. Исключение суперпользователей документировать как предохранитель, при неверной конфигурации требуется операторская проверка.
- Прямое удаление аккаунта и связанных данных одной транзакцией users_db: все принадлежащие InputData, все его ConfirmationCode и User, включая acceptance-поля. Сохранить безопасную логику editing_by при совпадающих именах. Не удалять чужие записи и не менять отдельный научный каталог.
- Если общий helper переиспользуется /users/me, сохранить все HTTP guards, password/CSRF/CAPTCHA, cookies и JWT revocation; не менять их контракт попутно.
- Просроченные заявки удалять независимо от New/In editing/Completed. Удаление заявки не удаляет её активного владельца и коды аккаунта. Не сбрасывать created_at при обработке/редактировании.
- PostgreSQL: брать row locks и повторно проверять пригодность после блокировки. Установить единый порядок блокировок, совместимый с session_security и save_submission, чтобы не получить deadlock между User/InputData. Ограниченные батчи; завершать транзакцию между батчами. Если приходится выбрать общий порядок через владельца — согласовать все операции этого шага, не менять auth guard на обход блокировки.
- Гонки активации/повторной регистрации/другого cleanup: либо активация завершилась первой и аккаунт исключён, либо удаление завершилось первым и старый код не создаёт аккаунт заново. Конкурентное завершение заявки не восстанавливает удалённую строку. Совпадение id/email после новой регистрации не даёт старому JWT доступ к новому аккаунту.
- dry-run только читает и выдаёт агрегированные количества кандидатов/неизвестных legacy; не меняет данные, статусы, даты или acceptance. Для --once удаление требует явного --execute; без него dry-run. Повторный --execute не меняет уже обработанное и не падает.
- При ошибке rollback; следующий проход повторяет. Не логировать email/ники/record ids/JSON/коды/SQL с параметрами. Разрешены время и агрегированные счётчики.

**Готовность:** атомарность, отсутствие чужого удаления и безопасное поведение гонок доказаны тестами; нет побочного экспорта удаляемых персональных данных в журнал или backup.

### 3. [x] Добавить отдельный worker и подготовить Compose

**Файлы:** новый wwwhypda-backend/maintenance/retention_cleanup.py; wwwhypda-backend/mainApp.py; docker-compose.yml; локальный игнорируемый docker-compose.prod.yml; README.md.

- Отдельный процесс retention-cleanup на существующем backend-образе; не timer в HTTP request или каждом Gunicorn worker. AUTH_CODE_CLEANUP_INTERVAL_SECONDS/TTL и сервис auth-code-cleanup не менять.
- Настройка DATA_RETENTION_CLEANUP_INTERVAL_SECONDS=3600, проверка положительного значения и запрет конфигурации с интервалом больше обещанного часа без синхронного изменения документов. Сроки 1/6 календарных месяцев — единые константы, не разные значения для API/tests/docs.
- CLI --once с dry-run по умолчанию и --execute для удаления; отдельный явный --worker --execute для непрерывной работы. Immediate pass, корректные SIGTERM/SIGINT, закрытие сессии, bounded retry без busy loop. Worker не отправляет письма.
- Compose: отдельный сервис с явной командой, DB health dependency и restart policy; dev/prod пользователю показывают одинаковый интервал и существующую схему логирования. Ни image pull, ни запуск сервиса не должны оказаться забытым условием автоочистки.
- До миграции worker завершается с безопасным сообщением о необходимости схемы, не выполняет частичное удаление и не печатает подключение. Миграция обязательна до нового backend/worker.
- На этом этапе не запускать worker с --execute против рабочей dev-БД. Выполнять проверку на изолированных синтетических данных. Не редактировать env; дефолты/Compose позволяют локальную проверку без чтения секретов.
- Локальный prod-файл подготовить, но на VPS не отправлять. README отдельно перечисляет игнорируемые файлы: git pull их не доставляет.

**Готовность:** автономная очистка не зависит от посетителей; тестовый process правильно делает immediate/hourly pass, остановку и retry. Deployment на VPS не является критерием завершения этого локального цикла.

### 4. [x] Доказать безопасность на изолированной SQLite и PostgreSQL

**Файлы:** новые wwwhypda-backend/tests/test_retention_cleanup.py, test_retention_migration.py; расширения существующих auth/terms тестов только по изменившимся контрактам; при необходимости deploy/testing/retention.compose.yml для изолированного PostgreSQL-стенда.

- Проверить даты за мгновение до/на/после границы, 31-е числа, високосный февраль, шестимесячную арифметику, UTC/naive и future/NULL.
- Проверить удаление только новых доказанных незавершённых регистраций; сохранение active, completed+inactive, unknown legacy, суперпользователей, чужих данных и public catalogue.
- Проверить, что resend/duplicate не продлевают срок; клиент не задаёт registered_at/completed; все пути активации сохраняют completed=True после отключения.
- Проверить account cascade, совпадающие editing_by, все статусы заявок, сохранение активного владельца при удалении заявки, rollback, dry-run, повторный проход, безопасные логи, отсутствие SMTP.
- PostgreSQL обязательно: идемпотентная добавляющая миграция/--check/несовместимая схема/legacy; реальные конкурентные транзакции cleanup против activation/registration/submit/self-delete/другого cleanup. SQLite не доказывает SELECT FOR UPDATE и отсутствие гонок.
- Отдельный Compose-тестовый project с PostgreSQL 15, без опубликованных портов, env_file, рабочих volumes и прод-данных; только открытые тестовые реквизиты и ephemeral storage. Указанный test URI не должен вести в dev/prod. Test service использует backend-образ и synthetic Flask fixtures, без production mainApp SMTP-конфигурации.
- В тестовом PostgreSQL-стенде миграция работает со старой синтетической схемой users; tests создают/удаляют только тестовую users_db. Не применять create_all/drop_all к рабочей БД.

**Команды из корня приложения:**

```text
docker compose --env-file .env.development build backend
docker run --rm --pull=never --network none -e TEST_AUTH_DATABASE_URI=sqlite:// --entrypoint python wwwhypda-dev-backend -m unittest tests.test_retention_cleanup tests.test_auth_lifecycle tests.test_terms_acceptance tests.test_submission_authors -v
docker compose -p wwwhypda-retention-tests -f deploy/testing/retention.compose.yml up --abort-on-container-exit --exit-code-from tests
docker compose -p wwwhypda-retention-tests -f deploy/testing/retention.compose.yml down
```

В тестовом Compose tests запускает новые migration/concurrency suites и имеющиеся применимые PostgreSQL regression suites; имплементатор фиксирует точные классы. Создать этот файл в шаге, если нет равноценного существующего изолированного стенда; не ссылаться на несуществующий сервис. Не печатать env через compose config. Не считать skipped PostgreSQL-тесты успешной проверкой. Временные контейнеры удаляются только по точному тестовому project.

**Готовность:** значимые проверки выполнены, новые failures отсутствуют, старые несвязанные проблемы отдельно отражены. Никаких реальных удалений и реальных писем.

### 5. [ ] Согласовать документы и выпустить новую редакцию договора

**Файлы:** wwwhypda-frontendV2/src/components/pages/privacyPolicy.tsx и userAgreement.tsx; wwwhypda-frontendV2/src/common/userAgreementVersion.ts; wwwhypda-backend/auth/terms.py; deploy/privacy/check_terms_release.py; deploy/privacy/privacy-operations.md; README.md; docs/rules/runtime-and-privacy.md; docs/BACKLOG.md.

- Заменить ручной режим плановой очистки на реализованный: календарный месяц для незавершённой регистрации, шесть календарных месяцев от подачи заявки; первый успешный часовой проход после срока, возможная задержка при отказе и операторский контроль. Пояснить удаляемые сведения, отличие отключённых подтверждённых аккаунтов и судьбу legacy неизвестной истории.
- Прямо указать, что плановое удаление заявки не удаляет аккаунт, а ранее доступное самоудаление и законные запросы более раннего удаления сохраняются. Срок ответа на privacy-запросы не менять на шесть месяцев; ручная обработка таких запросов не стала автоматической.
- Не утверждать, что worker удаляет содержимое чужих браузеров, письма, отдельные научные записи или внутренние backup провайдера. Сохранить правило повторно применять удаления при восстановлении backup и ограниченность подтверждения 24 часов существующей VPS-услугой.
- User Agreement меняется: выпустить новую согласованную версию backend/frontend и новый hash, не перезаписывать acceptance существующих аккаунтов и не требовать автоматического принятия новой редакции без отдельного плана.
- Не писать о фактически работающей автоматике на VPS до включения. В README добавить условие выпуска: новые тексты deploy вместе с миграцией и worker после отдельного разрешения. Если оставшийся действующий сайт не обновлён, старые тексты описывают его реальное состояние.
- Обновлять factual rules и privacy-operations после проверки реализации; BACKLOG заменить ручное плановое удаление на контроль успешности автоматики. Известные legacy, операторские действия и будущий deployment не прятать под завершённым локальным циклом.
- UI/layout/auth-формы не переделывать. Страницы /privacy-policy и /user-agreement остаются доступными без auth/CAPTCHA и на маленьком viewport. policy.module.scss и общие компоненты не менять.

**Проверки:**

```text
docker compose --env-file .env.development run --rm --build --no-deps frontend npm run build -- --mode development
docker compose --env-file .env.development run --rm --no-deps frontend npm run lint
```

Проверку редакции выполнить без env_file и сети, смонтировав репозиторий только для чтения:

```text
docker run --rm --pull=never --network none --entrypoint python --mount "type=bind,source=C:/Users/gvozd/Desktop/01_programs/full_stack/32_wwwhypda/wwwhypda,target=/repo,readonly" -w /repo wwwhypda-dev-backend deploy/privacy/check_terms_release.py
``` При старых ошибках полного ESLint отдельно выполнить scoped ESLint изменённых страниц/версии через frontend container; согласованный критерий этого этапа допускает прежние несвязанные ошибки с явным отчётом, но не новые.

Просмотреть изменённые юридические страницы в локальном http://localhost:8080 после обновления dev bundle, обе темы и маленький viewport; не менять рабочую БД ради текстов. Браузерную недоступность явно записать, не выдумывать проверку.

### 6. [ ] Завершить локальный цикл и архивировать план

**Документы:** этот stage, docs/STATE.md, docs/BACKLOG.md, README.md.

- Записать итоговые файлы, выполненные тесты, результаты, ограничения и точный порядок будущего включения: миграция --check → новый backend → worker → проверенный dry-run/включение → согласованные тексты. Реальное production-включение остаётся отдельной работой.
- Указать, какие legacy-строки исключены по отсутствию даты/истории; перед prod нужен операторский разбор, не автоматическая утрата подтверждённых аккаунтов.
- Все обязательные локальные проверки завершены; недоступные проверки обработаны по WORKFLOW (план уточняется, а не молча завершает их).
- Перевести completed, перенести этот же файл в docs/archive/002-automatic-data-retention.md, поставить archived и active_stage:null, last_archived: путь архива. Commit/push не выполнять без поручения.

## Критерии завершения цикла

- [x] Миграция добавляющая и проверена, даты/завершение регистрации не подменяются.
- [x] Очистка удаляет только надлежащие аккаунты и заявки; атомарность, UTC/календарные границы и PostgreSQL-гонки проверены.
- [x] Отдельный worker и local/dev/prod конфигурация подготовлены; рабочие данные/VPS не затронуты.
- [x] Документы описывают сроки, часовой проход, операторский контроль и исключённые хранилища; версия договора и hash согласованы.
- [ ] Проверки выполнены и записаны; правила/README/BACKLOG обновлены. Будущая публикация и разбор legacy не объявлены выполненными.

## Журнал выполнения

Планирование 14.10.2026: изучены модели, activation/delete routes, auth.code_cleanup, existing migration и документы. Программный код не изменён, очистка не выполнялась. Правовая основа срока — минимизация хранения; 1/6 месяцев не представляются гарантией полной юридической неуязвимости.

### Реализация 14.10.2026 — шаг 1

Файлы: auth/auth_models.py, auth/authentication.py, auth/migrate_retention.py,
inputData/inputDataModels.py; новый auth/transaction_lock.py. registered_at и
registration_completed nullable, без универсального/default backfill. Обычные
регистрации получают серверную дату и False; confirm-registration и оба модельных
пути активации — True. Admin использует activate_user_by_id, отдельного прямого
пути active=True не найдено. Отключение не сбрасывает факт завершения. Клиентские
поля отклоняются 400 через общий словарь (common и frontend error_messages.json).
Duplicate/resend/reset сохраняют дату/acceptance. Индексы User retention и
InputData.created_at добавляются идемпотентно; --check без DDL/DML, несовместимая
структура отклоняется, ошибки DDL откатывают транзакцию. Старым active=True можно
отметить завершение без даты, inactive неизвестной истории остаётся NULL.

Проверки: синтаксис всех Python через ast.parse; PostgreSQLRetentionMigrationTests
(добавление/повтор/--check, неизменность acceptance/связанных данных, NULL legacy,
несовместимые колонки/индекс/отсутствующие таблицы, DDL rollback, CLI). Реальные
RegistrationRetentionTests проверили клиентские поля, duplicate/resend/reset и
все три пути активации. Шаг завершён; рабочие данные не исследовались.

### Шаг 2

Файлы: maintenance/__init__.py, retention.py; общая транзакционная блокировка в
session_security, registration/code issuance/verify, model activation и
save_submission/set_status/delete_by_id_if_owned. /users/me переиспользует
единственный delete_account_data, пароль/CSRF/CAPTCHA/cookies/JWT guards сохранены.

Порядок блокировок: общий PostgreSQL transaction advisory lock (207002,1), затем
User и InputData/ConfirmationCode; SQLite no-op. Это консервативная сериализация
users_db-операций, необходимая для чужих editing_by и административной работы с
заявками без FK. Ограничение: конкурирующие защищённые операции ожидают общий lock;
при росте нагрузки нужна отдельная оценка. lock_timeout 5s, statement_timeout 30s.
Батчи до 100 кандидатов, commit между батчами. Текущий батч атомарен; ранее
завершённые не откатываются при последующей ошибке. Идемпотентный retry.

Единый add_months сохраняет UTC-время, clamp последнего дня, сразу +1/+6.
Один now на проход, naive writer InputData трактуется как UTC. NULL/future
не отбираются. Предварительная индексируемая граница с запасом 3 дня учитывает
необратимость calendar clamp, фактическая пригодность повторно проверяется под lock.
Аккаунт удаляется только inactive+never completed+known expired date, без superuser;
заявки всех статусов — независимо, аккаунт/коды при их удалении сохраняются. Dry-run
только читает, не экспортирует персональные данные, не считает каскады дважды.

Проверки: RetentionTests (границы, каскад, имена, NULL/future, владельцы/статусы,
батчи, rollback, dry-run/repeat, public catalogue, безопасные журналы, отсутствие
SMTP); PostgreSQLRetentionConcurrencyTests — реальные ожидающие транзакции
подтверждены pg_stat_activity.wait_event=advisory. Гонки activation (оба порядка),
duplicate/new registration против cleanup, save_submission, completion (оба
порядка), self-delete helper и два cleanup. Между батчами обновление может законно
закончиться раньше удаления; тест доказывает отсутствие восстановления удалённой
строки. Старые JWT/self-delete guards дополнительно проверены lifecycle suites.
Изменённые ошибки записи InputData не выводят SQL/параметры/id. Шаг завершён.

### Шаг 3

Файлы: maintenance/retention_cleanup.py, mainApp.py, docker-compose.yml и локальный
игнорируемый docker-compose.prod.yml. Отдельный worker на том же backend-образе;
не импортирует mainApp и SMTP, не читает env-файлы. Нормальная app-конфигурация
проверяет положительный DATA_RETENTION_CLEANUP_INTERVAL_SECONDS ≤3600; Compose
явно 3600. Оба сервиса имеют DB health dependency, restart unless-stopped,
профиль retention, чтобы обычный dev up не запускал удаление рабочей БД.
Prod сохранён с существующим service-logging anchor; dev использует текущую схему
Docker-логирования. auth-code-cleanup/TTL не изменены.

CLI: --once без --execute — dry-run; continuous требует --worker --execute.
Immediate pass, interruptible wait, bounded retry, remove сессии, безопасный отказ
старта до миграции. PostgreSQLRetentionProcessTests проверил реальный CLI dry-run,
execute/repeat и временно неприменённую схему без удаления; stdout/stderr не содержат
тестовых email/имён/password. Отдельный process проверен на immediate/periodic
pass и SIGTERM/SIGINT. Worker-интервал 3600/повтор после сбоя проверен без сна mock
Event; процессный тест использует разрешённый тестовый интервал 1 секунду.
README и privacy-operations содержат команды и порядок включения, перечислены
приватные файлы, не доставляемые git pull. Рабочий worker не запускался. Шаг завершён.

### Шаг 4 — результаты команд

- `docker compose --env-file .env.development build backend` — успешно; env использует Docker, содержимое не читалось/не выводилось.
- SQLite-команда из плана — первый прогон обнаружил старый несовместимый package import в TermsAcceptanceTests; исправлен import для package/discover. После исправления fixture: 85 tests, OK, skipped=26 (PostgreSQL-only). Это 59 выполненных tests, не доказательство row locks.
- `docker compose -p wwwhypda-retention-tests -f deploy/testing/retention.compose.yml up --abort-on-container-exit --exit-code-from tests --attach tests` — финально 96 tests, OK, без skipped, exit 0. Предыдущий прогон 95 tests также OK; финальный добавляет реальную CLI-интеграцию.
- PostgreSQL 15.17 в tmpfs, без env_file, опубликованных портов, production/mainApp, рабочих mounts/volumes. URI только retention_test/isolated-test-only@db/retention_test; drop_all только внутри тестовых fixtures. Миграционные tests используют отдельные случайные схемы и удаляют их.
- Suites: CalendarTests, RetentionTests, RegistrationRetentionTests, PostgreSQLRetentionConcurrencyTests, PostgreSQLRetentionProcessTests; MigrationConfigurationTests/PostgreSQLRetentionMigrationTests; AuthLifecycleTests/AccountDeletionTests/AuthenticationFlowTests/PostgreSQLConcurrencyTests/PostgreSQLWorkerProcessTests; TermsAcceptanceTests, ConfigurationTests/PostgreSQLTermsMigrationTests, SubmissionAuthorsTests. Наследуемые regression methods повторяются в некоторых suites; счётчик tests не означает столько уникальных сценариев.
- Тест конкурентной terms-registration синхронизирован перед advisory lock вместо INSERT; ORM-fixture старой terms migration дополнен двумя nullable колонками, acceptance-проверка сохранена.
- Ранние ошибки новых fixtures исправлены: защищённым аккаунтам заданы разные имена для проверки однозначной метки, а completion-race допускает оба законных порядка между батчами и проверяет окончательное отсутствие строки. Новых failures в финальном прогоне нет.
- Новая кириллица, испорченная PowerShell pipe encoding, восстановлена в UTF-8; существующие комментарии не удалены. Финальный контроль UTF-8 (без replacement/question-mark corruption), Python ast.parse, JSON, STATE/stage/архивных путей и dev/prod retention declarations — OK. git diff --check — exit 0. После финального прогона test project удалён точной командой down, рабочие volumes не затронуты.

Шаг завершён. Реальных удалений и писем не было.

### Шаг 5 — реализация готова, визуальная проверка остаётся

Файлы: privacyPolicy.tsx, userAgreement.tsx, userAgreementVersion.ts, auth/terms.py,
check_terms_release.py, README.md, privacy-operations.md,
docs/rules/runtime-and-privacy.md, docs/BACKLOG.md. Договор backend/frontend
2026-10-14.2, SHA-256 обновлён; прежний fingerprint 2026-10-14.1 сохранён.
Существующие acceptance не перезаписывались, механизма автоматического перепринятия
не добавлено. Тексты объясняют 1/6 календарных месяцев, successful hourly pass,
отказы/операторский контроль, legacy/disabled/superuser, исключённые хранилища,
отдельность аккаунта при удалении заявки и более ранние законные запросы.
Месячный срок ответа на privacy-запросы и service-specific 24h VPS backup сохранены.
При restore повторно применять плановые и запрошенные удаления. CSS/layout/auth
формы и guards юридических страниц не менялись.

Проверки:
- `docker compose --env-file .env.development run --rm --build --no-deps frontend npm run build -- --mode development` — успешно, TypeScript + Vite; старое предупреждение chunk >500kB.
- `docker compose --env-file .env.development run --rm --no-deps frontend npm run lint` — exit 1: 70 errors, 18 warnings в неизменённых файлах (types, inputData steps, modal, tree, accounts/auth, redux, cypress). Изменённые legal/version файлы не фигурируют.
- `docker compose --env-file .env.development run --rm --no-deps frontend npx eslint src/components/pages/privacyPolicy.tsx src/components/pages/userAgreement.tsx src/common/userAgreementVersion.ts` — exit 0.
- `docker run --rm --pull=never --network none --entrypoint python --mount "type=bind,source=C:/Users/gvozd/Desktop/01_programs/full_stack/32_wwwhypda/wwwhypda,target=/repo,readonly" -w /repo wwwhypda-dev-backend deploy/privacy/check_terms_release.py` — версии, hash, payload и словари согласованы, exit 0.
- Обе юридические страницы по коду остаются публичными, без auth/CAPTCHA; фактический просмотр обеих тем/маленького viewport НЕ выполнен. CUA сообщил «Browser is not available: iab», inventory apps=[]/browsers=[]. Раздаваемый dev bundle не обновлялся одноразовой проверочной сборкой; перед просмотром нужен штатный rebuild frontend и reload, без обновления backend/рабочей схемы.

Пользователь отдельно ответил «Оставить план активным до визуальной проверки».
Шаг 5 остаётся [ ], статус in_progress; это не отказ тестов кода, а недоступная
обязательная UI-проверка по WORKFLOW. Архивирование и шаг 6 не выполнены.
После подключения браузера: обновить только dev frontend штатной командой,
посмотреть http://localhost:8080/privacy-policy и /user-agreement без login/CAPTCHA
в light/dark и на маленьком viewport, отметить результат, затем выполнить шаг 6.
Повторять весь backend-прогон без новых изменений не требуется.

## Итог

Локальная реализация, изолированные backend-проверки, frontend build/scoped lint и
согласование документов выполнены. План не завершён и не архивирован по прямому
указанию пользователя: остаётся обязательная визуальная проверка шага 5, затем
финальное закрытие шага 6. active_stage сохранён, completed:null. VPS, DNS, SMTP,
рабочие dev/prod-данные, commit/push не затронуты.

Будущее включение: добавляющая миграция → --check → новый backend → dry-run worker
→ операторский разбор legacy → явное включение worker → успешные проходы →
согласованные тексты. Неизвестные старые inactive, NULL/future даты и superuser
требуют индивидуального разбора, их реальные количества не исследовались.

Рекомендуемые названия коммитов (коммиты не выполнялись):
- docs(stage-002): plan automatic data retention
- feat(stage-002): add automatic account and submission cleanup
- docs(stage-002): archive completed retention plan
