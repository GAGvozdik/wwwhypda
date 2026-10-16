# OVH Zimbra cleanup — локальная подготовка, не включено

Код цикла 008 независим от Flask, SMTP, env loader и PostgreSQL. По умолчанию он
не меняет почтовый ящик. Реальные IMAP capabilities, SMTP-доставка из backend,
наличие Sent-копий и права удаления аккаунта **ещё не проверены**. План активен.

## Поведение и ограничения

Linux CLI: python -B -m maintenance.mail_cleanup --once в существующем
backend-образе, пересобранном с maintenance/mail_*.py. Новый сервис приложения
не нужен. Gmail в обычном локальном README и старая Gmail cleanup сохраняются.

Все selectable папки читаются readonly через BODY.PEEK; тела только кандидатов
Sent/Closed. Пределы: 100 папок, 10000 сообщений, 64 KiB заголовок, 128 KiB тело,
100 UID на FETCH, UID-окна 5000 (до 1000 на папку). Неполный снимок/превышение
останавливают проход; большое тело не становится кандидатом. Нет молчаливой
обрезки с объявлением снимка полным. Нечитаемая папка запрещает execute.

Служебные письма: три точные пары Subject/body из плана, точный From, только Sent.
Нет SMTP Sent-копий — matched=0, никаких APPEND. Месяц строго календарный,
сравнение add_month(date) < now. Требуются зрелый INTERNALDATE и месяц первого
локального наблюдения неизменной копии: импорт со старым INTERNALDATE не разрешает
немедленного удаления. Первый baseline всегда без execute.

Точные независимые служебные письма не объединяются по одинаковой теме.
Непонятные ссылки/дубли/черновики/ответы запрещают кандидата; некорректные
заголовки запрещают служебное удаление прохода, поскольку могут скрывать связь.
Распознавание любого человеческого ответа без технических связей не гарантируется.

Closed — ручная WWHYPDA-Closed, утилита её не создаёт. closedAt начинается с первого
полного наблюдения всей цепочки в Closed, не с возраста письма. Новый ответ,
изменение/перенос/UIDVALIDITY отменяют срок. Reopened не закрывается автоматически
из-за остатков в Closed. **Support-delete жёстко запрещён**: даже ошибочно включённый
SUPPORT_DELETE_ENABLED при execute даёт support_race_unapproved. IMAP не даёт
межпапочной транзакции между проверкой ответа и EXPUNGE. Шаг 4 остаётся неполным.

Service/probe путь использует точные UID STORE +FLAGS.SILENT (Deleted) и UID
EXPUNGE с тем же списком. Нет CLOSE, обычного EXPUNGE, MOVE/COPY/APPEND/CREATE,
очистки Trash или снятия чужих Deleted. Повторные проверки сокращают, но не
устраняют гонку нового ответа. Fake-тесты не доказывают поведение реального Zimbra.

## Приватная настройка — только владелец

Агент не читает env, пароли и ящик. Не присылайте их в чат. Для будущего запуска
нужен отдельный файл вне Git, например /etc/wwwhypda/mail-cleanup.env, права 0600.
Сейчас на VPS ничего создавать не нужно.

| Переменная | Значение |
| --- | --- |
| MAIL_CLEANUP_IMAP_HOST | imap.mail.ovh.net, строго |
| MAIL_CLEANUP_IMAP_PORT | 993, SSL с проверкой сертификата/hostname |
| MAIL_CLEANUP_IMAP_USERNAME | support@wwhypdatestdeployversion.it |
| MAIL_CLEANUP_IMAP_PASSWORD | пароль ящика, вводит только владелец |
| MAIL_CLEANUP_STATE_DIR | /mail-state внутри контейнера |
| MAIL_CLEANUP_DRY_RUN | true |
| MAIL_CLEANUP_SUPPORT_DELETE_ENABLED | false, не включать |
| MAIL_CLEANUP_SENT_FOLDER | точное имя, необязательно при однозначном SPECIAL-USE |
| MAIL_CLEANUP_DRAFTS_FOLDER | точное имя, необязательно при однозначном SPECIAL-USE |
| MAIL_CLEANUP_CLOSED_FOLDER | WWHYPDA-Closed |
| MAIL_CLEANUP_BATCH_SIZE | 100, допустимо 1–100 |
| MAIL_CLEANUP_MAX_RUN_SECONDS | 900, допустимо 1–3600 |
| MAIL_CLEANUP_IMAP_TIMEOUT_SECONDS | 15, допустимо 1–60 |
| MAIL_CLEANUP_MAX_FOLDERS | 100, допустимо 1–500 |
| MAIL_CLEANUP_MAX_MESSAGES | 10000, допустимо 1–100000 |
| MAIL_CLEANUP_MAX_HEADER_BYTES | 65536, допустимо 1024–1048576 |
| MAIL_CLEANUP_MAX_BODY_BYTES | 131072, допустимо 1024–1048576 |

Флаги только true/false, не yes/1. MAIL_PASSWORD не используется автоматически:
только явный MAIL_CLEANUP_USE_MAIL_PASSWORD=true разрешает runtime fallback к нему.
Нет чтения dotenv. Пароль не передавать через argv/URL. Для интерактивного ввода
можно добавить --prompt-password и docker -it. Не включать IMAP debug.

## Постоянный state и команды

Host bind directory, например /var/lib/wwhypda-mail-cleanup, 0700, принадлежит
UID/GID пользователя образа. UID не угадывать: владелец проверяет docker run
--rm --network none --entrypoint id IMAGE без env. Каталог не в /tmp и не в слое
контейнера; всем экземплярам один постоянный каталог/lock namespace.

state.sqlite3/state.key/state.witness/mail.lock имеют 0600. Nonblocking flock
останавливает второй экземпляр. В SQLite HMAC identifiers, статусы/даты и
folder HMAC+UIDVALIDITY+UID для journal, без адресов/тем/тел/кодов/raw Message-ID.
Key/DB/witness приватны. Завершённые операции хранятся 30 суток, отсутствующие
копии/цепочки 90, quarantine-файлы 30. Pending не чистятся автоматически.

Потеря/повреждение state/key/witness даёт новый baseline без немедленного удаления.
Полный согласованный откат всех файлов на старую копию локально не обнаруживается.
Поэтому после любого restore/move state: остановить execute, readonly --rebaseline,
новый полный период наблюдения, повторная приёмка. Это операторское ограничение,
не обещание обнаружения согласованного rollback. Backup всего каталога делается
согласованно при остановленной задаче, не публикуется, отдельные файлы не смешиваются.

Следующие команды предназначены владельцу **после отдельного разрешения реального
подключения**, сейчас не выполнялись. IMAGE — пересобранный существующий backend
с новым кодом. Переменную IMAGE задайте в shell, пароль через shell argv не задавайте.
Рабочий каталог существующего Dockerfile — /, пользователь app.

~~~sh
docker run --rm --read-only --tmpfs /tmp --env-file /etc/wwwhypda/mail-cleanup.env --mount type=bind,src=/var/lib/wwhypda-mail-cleanup,dst=/mail-state --entrypoint python "$IMAGE" -B -m maintenance.mail_cleanup --preflight
docker run --rm --read-only --tmpfs /tmp --env-file /etc/wwwhypda/mail-cleanup.env --mount type=bind,src=/var/lib/wwhypda-mail-cleanup,dst=/mail-state --entrypoint python "$IMAGE" -B -m maintenance.mail_cleanup --once --dry-run
~~~

Preflight: post-login CAPABILITY/LIST/EXAMINE, без FETCH/state. Агрегат показывает
uidplus/sent_available/drafts_available/closed_available. UIDNOTSTICKY, ошибка TLS,
нечитаемая папка — отказ. Неоднозначный Sent отключает кандидатов. Нет Closed/Drafts —
нет разрешения удаления поддержки. --list-folders вместо --preflight даёт явный
приватный список реальных имён: не присылать в чат. Владелец вручную создаёт Closed
в Webmail и настраивает точную карту. Изменение карты начинает baseline заново.

## Реальная приёмка Zimbra — не выполнена

1. Отдельно согласовать подключение. Владелец запускает preflight и два readonly
   dry-run. Проверяет все папки, отсутствие изменений Seen/Deleted. В чат только
   булевые роли/capabilities, агрегированные счётчики и категории ошибок.
2. Отдельно проверить доставку из backend на разрешённый тестовый адрес.
   Webmail недостаточно. Не присылать адрес/код/headers. Проверить Sent-копии;
   отсутствие допустимо, искусственно их не создавать.
3. На искусственной переписке владельца проверить Closed → dry-run: closedAt
   начинается сейчас. Связанный ответ снаружи → reopened, следующий проход не
   закрывает остатки. Вся цепочка наружу → dry-run → целиком внутрь → dry-run:
   новый месяц. Если перенос между проходами не наблюдался: приватный --list-state,
   затем --once --dry-run --reclose HMAC_HANDLE. Только однозначная целиком
   закрытая цепочка принимает отметку; срок начинается заново. Не редактировать DB.
4. Для окончательного UIDPLUS теста получить **новое явное разрешение на точные
   синтетические UID** в изолированной папке. Без него только dry-run.
   Агент сейчас не создаёт/удаляет даже тестовые сообщения в реальном ящике.
5. Владелец готовит WWHYPDA-Cleanup-Test-acceptance: цель, обычный контроль,
   контроль с уже установленным Deleted. Клиент не должен автоматически expunge;
   после подготовки закрыть его. В доверенном IMAP-клиенте readonly снять точные
   UID/UIDVALIDITY, не sequence numbers. Если нельзя безопасно оставить Deleted,
   остановиться и согласовать инструмент подготовки. Реальные письма не брать.
6. После адресного разрешения в приватной конфигурации задать
   MAIL_CLEANUP_PROBE_DELETE_ENABLED=true,
   MAIL_CLEANUP_PROBE_FOLDER=WWHYPDA-Cleanup-Test-acceptance,
   MAIL_CLEANUP_PROBE_UIDS=<UID цели>,
   MAIL_CLEANUP_PROBE_CONTROL_UIDS=<два контроля через запятую>.
   Только положительные числа, без ranges/*/повторов/пересечения, максимум 100.
   Сначала --once --dry-run --probe-delete: eligible=1, контрольные флаги неизменны,
   baseline сохранён. UID/названия не публиковать.
7. Только для согласованного теста установить MAIL_CLEANUP_DRY_RUN=false и заменить
   --once --dry-run командой --once --execute --probe-delete --allow-outside-window.
   Последний флаг только для ручной приёмки вне 01:00–02:00 Europe/Rome.
   Ожидается deleted=1, цель отсутствует по UID, оба контроля сохранены, включая
   прежний Deleted, флаги/UIDVALIDITY не изменены. Tagged OK недостаточно:
   код проверяет отсутствие цели и повторно сверяет контролы.
   Probe обходит месяц только в этой отдельной синтетической папке.
8. Вернуть DRY_RUN=true, PROBE_DELETE_ENABLED=false, удалить probe UID из настройки.
   Остатки тестовых сообщений агент не чистит. Записать обезличенный результат.
   Успех probe не разрешает support-delete; его гонку передать архитектору.

Форма отчёта: дата/часовой пояс; preflight pass/fail и UIDPLUS/roles booleans;
два dry-run; SMTP backend delivered yes/no/не проверено; Sent copies yes/no;
Closed/reopened/reclose pass/fail; probe отдельно разрешён yes/no;
цель исчезла yes/no; оба контроля, включая Deleted, сохранены yes/no;
категории ошибок/счётчики. Секреты, UID, папки, адреса и тексты не нужны.

## Сбои и расписание

Durable intent до STORE, фазы после STORE/EXPUNGE. Неизвестный исход не успех.
Следующий dry-run только reconcile той же folder/UIDVALIDITY/UID/fingerprint.
Absent/retained закрывают intent; Deleted/изменённая identity остаётся pending
и блокирует execute. Нет повторного удаления или снятия чужих флагов.
Владелец разбирает конкретные сообщения приватно при остановленной задаче.
--rebaseline после разбора означает abandoned intents и новый полный месяц,
а не доказательство удаления. Не использовать его для продолжения старого batch.
Уже удалённые письма rollback не возвращает.

Обычный execute: DRY_RUN=false и --execute, UIDPLUS/права Deleted, зрелый baseline,
неизменные полные снимки и отсутствие pending. --dry-run сильнее всего.
Не включать до реальной приёмки и отдельного решения владельца.

systemd/*.service/*.timer — неустановленные шаблоны. Перед использованием подставить
IMAGE/пути и проверить права. 01:30 Europe/Rome, без catch-up/RandomizedDelay.
Обычный execute вне часа 01 отказывает. Бюджет ограничен минимумом из 900 секунд
и остатка до 02:00 Rome, включая сигнал жёсткого deadline; общий lock сохраняется.
Отсутствие timezone Europe/Rome даёт отказ, не fallback. Timer сейчас не включать.
Перед будущей установкой проверить на целевом Linux:
systemd-analyze verify <путь к service> <путь к timer>;
systemd-analyze calendar --iterations=4 '*-*-* 01:30:00 Europe/Rome'.
Для DST повторить calendar с --base-time='2026-03-28 00:00:00 UTC' и
--base-time='2026-10-24 00:00:00 UTC'. На Windows systemd не проверялся.
Будущее отключение владельцем: systemctl disable --now wwwhypda-mail-cleanup.timer,
а при работающем проходе systemctl stop wwwhypda-mail-cleanup.service; state не удалять.
Эти команды в текущем цикле не выполняются.
Код не подключён к Flask startup/Compose/retention worker.

Тесты: tests.test_mail_cleanup и tests.test_smtp_transport, Docker --network none,
readonly исходники, tmpfs /tmp, без env loader/рабочей DB.

## Зависимость документов и выпуска

Шаг 8 требует реальную SMTP/Sent/IMAP приёмку до финализации публичных текстов.
Поэтому тексты/контакты пока не менялись. PDF шага 9 и новая редакция с серверным
принятием/ledger шага 10 следуют после него и пока не реализованы. Не объявлять
их готовыми или опубликованными. Не архивировать план по fake-тестам.
Gmail README, текущие публичные документы и auth gates этим IMAP этапом не меняются.

Источники: [IMAP](https://www.rfc-editor.org/rfc/rfc3501.html),
[UIDPLUS](https://www.rfc-editor.org/rfc/rfc4315.html),
[SPECIAL-USE](https://www.rfc-editor.org/rfc/rfc6154.html),
[imaplib](https://docs.python.org/3.11/library/imaplib.html).


### Диагностика подключения

По первому запуску владельца preflight завершился tls_or_login до LIST:
реальные UIDPLUS/roles остаются неизвестными, false в ошибочном отчёте не
доказывает отсутствия возможностей. Тела не сканировались, deleted=0.
Обобщённая ошибка заменена безопасными категориями:
network_dns — разрешение имени; network_timeout — таймаут;
network_connection — отказ/обрыв сети; tls_certificate — сертификат;
tls_handshake — TLS; login_rejected — сервер отклонил вход;
login_failed/connection_failed — неклассифицированный сбой соответствующего этапа.
Текст исключения/ответа сервера не выводится. Для уточнения повторить прежний
preflight с readonly bind актуальных исходников, пересборка образа не нужна.
Успешный TLS или неверный пароль из прежней общей ошибки не выводятся.


### TLS preflight: локальный AVG — 16.10.2026

Владелец получил tls_certificate. Выполнена только неаутентифицированная TLS
диагностика публичного imap.mail.ovh.net:993 из существующего локального образа,
без env/логина/пароля/чтения ящика. Проверка включена: OpenSSL verify_return_error.
Python verify_code=19; issuer depth=1 — AVG Web/Mail Shield Root
(AVG Antivirus SSL/TLS scanning). Причина на этом соединении — недоверенная
подставленная цепочка AVG. Состояние пароля, папок и capabilities неизвестно.
Ни verification, ни настройки AVG агент не отключал. Требуется настройка
локального почтового TLS-фильтра или явного доверия экспортированному AVG CA.
После устранения — повторить тот же preflight. VPS не затрагивался.


### Диагностика следующего preflight

Владелец получил operation_failed после изменения локального AVG. По этому
агрегату нельзя подтвердить успешный login или определить место ошибки.
Preflight дополнен phase (connect/capability/list/resolve/examine/complete).
Для непредвиденной ошибки выводятся только фиксированный builtin error_kind и
имя/номер строки разрешённого локального mail_*.py, без значений exception,
stack locals, server response или traceback. 42 fake/SMTP tests прошли в Docker
без сети/env/рабочих данных. Нужен следующий owner preflight; шаг 7 остаётся открыт.


### Реальный preflight владельца успешен

По выводу владельца: failed=0, phase=complete, uidplus=true,
sent_available=true, drafts_available=true, closed_available=true, folders=6.
Успешные login/post-login CAPABILITY/LIST/EXAMINE подтверждены для этого запуска.
scanned=0/deleted=0: содержимое/связи/удаление не проверялись. Предыдущий
operation_failed не воспроизвёлся, его причина не установлена.
Агент пароля и имён пользовательских папок не получал.

Для следующего локального Windows DRY_RUN создан Docker named volume
wwwhypda-stage008-mail-state, приватный подкаталог /mail-state/state 0700 app:app.
Инициализация без сети (--network none), без env и без подключения к ящику.
Это отдельное сохраняемое Docker Desktop хранилище для локальной приёмки,
не production deployment: будущий Linux запуск по-прежнему требует host bind.
Не удалять volume между проходами; docker volume prune может удалить неиспользуемое
хранилище. После потери/restore — новый baseline. Прежний preflight /mail-state
не создавал state и не используется как начатый период хранения.

Следующий запуск владельцем из корня repo:

~~~powershell
docker run --rm -it --read-only --tmpfs /tmp --mount "type=bind,source=${PWD}\wwwhypda-backend,target=/code,readonly" --mount "type=volume,source=wwwhypda-stage008-mail-state,target=/mail-state" --workdir /code -e MAIL_CLEANUP_IMAP_USERNAME=support@wwhypdatestdeployversion.it -e MAIL_CLEANUP_STATE_DIR=/mail-state/state --entrypoint python wwwhypda-dev-backend -B -m maintenance.mail_cleanup --once --dry-run --prompt-password
~~~

Этот проход читает заголовки всех selectable папок и тела только кандидатов
Sent/Closed, сохраняет обезличенный локальный state. Почту и Seen не меняет.
После первого успешного запуска повторить ту же команду. Обычно первый
baseline_rebuilt=true, второй false; eligible=0 допустимо (новый baseline).
Настройки AVG меняет только владелец, после короткой проверки возвращает защиту.
Пароль/письма/приватный state не присылать.


### Первый реальный DRY_RUN: protocol, удалений нет

Владелец получил failed=1/error=protocol, deleted=0. Полный scan не подтверждён;
нулевые counters/roles в таком отчёте не отменяют предыдущий успешный preflight.

При проверке найден дефект FETCH parser: imaplib может вернуть UID/FLAGS/
INTERNALDATE/RFC822.SIZE после literal отдельным bytes-хвостом. Раньше ожидались
до literal. Теперь части одной записи собираются перед строгой проверкой UID,
размера literal/полноты; неоднозначные/дублированные UID по-прежнему отклоняются.
Добавлены fake-сценарии метаданных после literal и дубликата UID в хвосте.
44 tests cleanup+SMTP прошли в Docker без сети/env/рабочих данных.
Это выявленный локальный дефект и возможная причина текущего отказа,
не подтверждённое чтением реального server response объяснение данного запуска.

Фиксированное безопасное error_location (mail_*.py:line) теперь доступно и для
MailSafetyError/protocol, без exception values, server response, headers или
stack locals. Требуется повтор прежнего readonly --once --dry-run владельцем.
Никаких reset/rebaseline/очистки state, действий с реальной почтой или VPS агент
не выполнял. Реальная приёмка и план остаются незавершёнными.


### Первый успешный реальный readonly scan владельца

Владелец выполнил прежний --once --dry-run с постоянным локальным Docker volume.
Результат: failed=0, dry_run=true, baseline_rebuilt=true, folders=6, scanned=10,
open=10, matched=0, eligible=0, closed=0, reopened=0, expired=0, unsafe=0,
pending=0, deleted=0; UIDPLUS и Sent/Drafts/Closed доступны.
Полный scan этого запуска успешен, создан baseline. Это ещё не подтверждение
сохранения baseline между запусками, SMTP доставки, наличия/отсутствия Sent-копий,
переходов Closed/reopened или адресного удаления. matched=0 означает отсутствие
распознанных служебных кандидатов, а не отсутствие любых писем в Sent.
Следующая проверка — та же команда повторно, ожидается baseline_rebuilt=false
при неизменной карте/ящике/state. Никакого execute или архивирования.
Агент получил только агрегат, пароль/письма/state не читал.


### Второй успешный реальный readonly scan владельца

Повтор с тем же постоянным Docker volume: failed=0, dry_run=true,
baseline_rebuilt=false, folders=6, scanned=10, open=10, matched=0, eligible=0,
closed=0, reopened=0, expired=0, unsafe=0, pending=0, deleted=0.
UIDPLUS и все три роли доступны. Сохранение baseline между этими двумя
запусками подтверждено; это не проверка восстановления после backup.
Следующая owner-проверка — только искусственное обращение: сообщение со второго
контролируемого адреса, ручной перенос в Closed и readonly scan, затем связанный
ответ снаружи Closed и повторные scans для sticky reopened.
Реальные адреса/содержимое агенту не передаются. SMTP backend/Sent-копии,
Closed transitions и synthetic UIDPLUS expunge ещё не подтверждены.
План остаётся in_progress, шаг 7 не завершён, execute не разрешён.


### Closed owner check: unsafe и исправление header-only MIME parsing

По выводу владельца: failed=0, baseline_rebuilt=false, scanned=11, folders=6,
open=10, unsafe=1, closed=0, deleted=0, pending=0. Роли и UIDPLUS доступны.
Один закрытый компонент признан unsafe, приёмка закрытия пока не пройдена.
Причина именно этого письма по прежнему агрегату не установлена.

Найден независимый дефект: BytesParser для header-only multipart создавал
ошибку отсутствующего MIME body. Заменён только header-only этап на
BytesHeaderParser. Строгий full-message service classifier сохранён:
multipart/HTML не становятся служебными кандидатами удаления.
Добавлены aggregate reason counters invalid_headers/ambiguous_drafts/
closed_unread_bodies/closed_invalid_dates/closed_unsafe_links/closed_marked/
support_observation_blocked, без имён/IDs/содержимого.
46 cleanup+SMTP tests прошли в изолированном Docker без сети/env/рабочих данных.

Владелец повторяет прежний readonly scan. Ранее unsafe цепочка не получает новый
closedAt автоматически после исправления: при отсутствии остальных препятствий
возможен reopened. Для восстановления нужен предусмотренный наблюдаемый ручной
цикл всей тестовой цепочки наружу Closed → dry-run → внутрь Closed → dry-run
или явный приватный reclose. State агент не сбрасывал и не редактировал.
План и шаг 7 остаются незавершёнными, удаления не разрешены.


### Причина unsafe установлена агрегатом владельца

Следующий DRY_RUN: failed=0, baseline_rebuilt=false, scanned=11, folders=6,
invalid_headers=0, closed_invalid_dates=0, closed_marked=0,
closed_unread_bodies=0, ambiguous_drafts=1, support_observation_blocked=true,
closed_unsafe_links=1, unsafe=1, closed=0, deleted=0, pending=0.
Наблюдается неоднозначный черновик без технических связей: план требует
блокировать весь support observation, если принадлежность черновика не исключена.
closed_unsafe_links здесь включает глобальный veto от черновика и сам по себе
не доказывает поломанную ссылку тестового письма. Исправление header-only parser
устранило ложные ошибки заголовков: invalid_headers=0.

Требуется приватный owner просмотр Drafts/флага Draft, без передачи содержимого
агенту. Нужные черновики нельзя удалять/отправлять ради прохождения теста.
Обход проверки, сброс state, мутации почты или ослабление плана не выполнялись.
Closed acceptance остаётся неполной; план не архивируется.


### Устранение неоднозначного Draft и подтверждение sticky reopened

Владелец подтвердил: ненужный тестовый черновик
WWHYPDA - Email verification test переместился из Drafts в Trash.
После отдельного явного разрешения владельцу дана инструкция удалить навсегда
только этот тестовый черновик, без очистки всей Trash. Агент не подключался
к ящику, не читал пароль/содержимое и не выполнял мутаций.

Следующий owner DRY_RUN: failed=0, baseline_rebuilt=false, folders=6, scanned=8,
ambiguous_drafts=0, invalid_headers=0, closed_invalid_dates=0, closed_marked=0,
closed_unread_bodies=0, closed_unsafe_links=0, support_observation_blocked=false,
unsafe=0, pending=0, closed=0, reopened=1, open=7, deleted=0.
Блокировка Draft снята, unsafe устранён, прежнее неоднозначное закрытие не
получило новое closedAt автоматически: sticky reopened подтверждён в этом сценарии.
Разницу scanned (11 → 8) нельзя приписывать трём удалениям утилиты: deleted=0,
из агрегата не выводится причина всех изменений состава ящика.

Следующий шаг владельца: переместить только искусственную цепочку Cleanup test 008
из WWHYPDA-Closed в Inbox, выполнить readonly scan для наблюдения all-outside;
затем целиком вернуть в Closed и снова scan. Ожидается closed=1, reopened=0,
expired=0, deleted=0 при отсутствии новых препятствий. Это не глобальный
rebaseline и не редактирование SQLite. Реальный UIDPLUS probe/SMTP backend/Sent
ещё не приняты; план не архивируется.


### Реальное наблюдаемое повторное закрытие успешно

Владелец выполнил цикл тестовой цепочки Closed → Inbox → readonly scan →
Closed → readonly scan. Первый агрегат: failed=0, reopened=1, closed=0.
Второй: failed=0, closed=1, reopened=0, expired=0, deleted=0.
В обоих: baseline_rebuilt=false, scanned=8, folders=6, open=7, pending=0,
ambiguous_drafts=0, invalid_headers=0, unsafe=0,
support_observation_blocked=false; роли и UIDPLUS доступны.
Наблюдаемый all-outside/all-inside цикл начинает новое закрытие без сброса
всего state. Фактическую точную дату closedAt агент из private state не читал.

Дальше требуется реальный связанный новый ответ, оставленный вне Closed,
и два readonly scan, подтверждающие reopened и отсутствие автоматического
закрытия остатков. Backend SMTP доставка/Sent copies и адресный synthetic
UIDPLUS probe остаются отдельными незавершёнными проверками. Общий шаг 7
и цикл пока не завершены; support-delete не включается.


### Реальный новый связанный ответ и sticky reopened подтверждены

Владелец ответил через Zimbra на искусственное Cleanup test 008, оставив
исходное письмо в Closed, новый исходящий ответ вне Closed. Первый успешный
DRY_RUN: scanned=9, open=7, closed=0, reopened=1, failed=0, deleted=0.
Следующий успешный DRY_RUN без новых действий дал те же показатели.
В обоих: baseline_rebuilt=false, folders=6, ambiguous_drafts=0,
invalid_headers=0, closed_invalid_dates=0, closed_marked=0,
closed_unread_bodies=0, closed_unsafe_links=0, unsafe=0, pending=0,
support_observation_blocked=false; UIDPLUS/Sent/Drafts/Closed доступны.
Между ними неуспешный configuration/mail_common.py:77 не выполнял mail scan
и не считается успешной проверкой или потерей состояния.

Реальные owner сценарии readonly preflight, сохранение baseline, fail-closed
Draft, наблюдаемый ручной цикл повторного закрытия, новый связанный исходящий
ответ и sticky reopened теперь проверены. Это не подтверждает backend SMTP:
ответ из Webmail не является кодом, доставленным приложением.
Остаются реальная backend SMTP доставка и факт Sent-копий кодов, а также
отдельно разрешённый адресный synthetic UIDPLUS probe с сохранением чужого
Deleted control. Support-delete по-прежнему запрещён из-за IMAP гонки;
общий шаг 7/цикл не завершены. Новые политики/PDF/reaccept не объявляются готовыми.


### Владелец подтвердил получение запрошенного кода

После запроса кода на сайте владелец сообщил: код пришёл в его Яндекс-почту.
Доступ в Chrome блокировал сертификат, выданный AVG Web/Mail Shield Root;
владелец показал только публичные поля сертификата, не пароль/письмо/код.
Это подтверждает доставку запрошенного кода по сообщению владельца.
Точный тип кода, sender, транспорт OVH и наличие SMTP Sent-копии из этого
сообщения сами по себе не установлены: дальнейшая проверка не подменяется
одной доставкой или фактом отправки из Webmail.
Нужно уточнить публичный From support@wwhypdatestdeployversion.it и наличие
копии именно этого кодового письма в Zimbra Sent. Отсутствие копии допустимо,
утилита не создаёт её искусственно.
Адресный synthetic UIDPLUS probe ещё не выполнялся; план остаётся активным.


### Владелец сообщил о production SMTP доставке после своей пересборки

Уточнение предыдущей проверки: код от wwhypda@gmail.com запрашивался на localhost,
это подтверждённая локальная Gmail доставка, не OVH. Локальный Gmail guide остаётся.

Владелец самостоятельно перенёс production backend env и пересобрал окружение,
затем запросил код регистрации и получил письмо. Следующим сообщением подтвердил
отправителя: «от support». В контексте проверяется support@wwhypdatestdeployversion.it.
Это owner-подтверждение доставки кода после production настройки, не действие
агента на VPS и не чтение production env/SMTP логов или полного адреса из письма.
Наличие/отсутствие SMTP Sent-копии этого кодового письма пока не подтверждено.
Адресный synthetic UIDPLUS expunge с Deleted controls ещё не проверен;
support-delete запрещён, план остаётся in_progress.


### Уточнение границ deployment и отсутствие SMTP Sent-копии

Владелец уточнил: текущие изменения кода на VPS не загружены; на сервере
обновлён только production env для OVH SMTP и выполнена его пересборка.
Нельзя считать новый VerifiedMail/IMAP cleanup/PDF/reaccept развернутыми.
Получение кода регистрации от support подтверждает owner delivery после
изменения конфигурации существующего backend, не проверку нового локального кода
на сервере. Локальный Gmail SMTP остаётся отдельной dev-настройкой.

По owner просмотру Zimbra Sent копия именно нового письма с кодом не найдена.
Фиксируется отсутствие наблюдаемой Sent-копии этой отправки, не отсутствие
технических очередей/копий провайдера вообще. Искусственные копии не создаются.

Проверки IMAP выполнялись владельцем локальным кодом через readonly bind
актуальных исходников и реальный Zimbra. Для них deployment на VPS не требуется.
Остался реальный адресный synthetic UIDPLUS probe в изолированной папке:
цель исчезает, обычный контроль и заранее Deleted контроль сохраняются.
Удаление ранее ненужного черновика владельцем через Webmail не заменяет probe
реализации cleanup. Разрешение на такой probe ещё не получено; прежнее отдельное
разрешение относилось только к конкретному ненужному тестовому черновику.

Полный план всё ещё включает после почтовой приёмки шаги 8–10:
синхронизацию политик/контактов, три PDF и новое явное принятие версии с ledger/
защитой сессий. Они пока не реализованы. Ограничение межпапочной гонки support
остаётся неразрешённым и требует решения архитектора, даже при успехе probe.
План не архивируется и новый код не объявляется опубликованным.


## Упрощённая owner-процедура synthetic probe (подготовлена, ещё не выполнена)

Отдельный maintenance.mail_probe_fixture нужен только для приёмки. Он не вызывается
обычным cleanup и не включается timer. Его явный --prepare --confirm-create-fixture
выполняет APPEND ровно трёх новых синтетических писем в уже созданную владельцем
пустую WWHYPDA-Cleanup-Test-acceptance. Никаких SMTP/CREATE/STORE/EXPUNGE в подготовке.
Такое APPEND не является режимом DRY_RUN cleanup или созданием SMTP Sent-копий.

Все поля/тексты fixtures искусственные, адреса example.invalid, без реальных кодов.
Одно письмо — target, второе — обычный control, третье — control с Deleted.
Приватный probe-fixture.json (0600) в постоянном state содержит HMAC account/
fingerprints и конкретные UID. Содержимое/UID не выводятся в aggregate.
HMAC, UIDVALIDITY, точный состав папки и fingerprint проверяются перед execute.
Чужое/изменённое/дополнительное сообщение запрещает удаление, повторный prepare
не добавляет дубликаты. --execute без успешного dry-run и двух разрешений запрещён.
Успешное окончательное выполнение помечает fixture consumed; повтор не разрешён.

Шаги владельца:
1. В Firefox Webmail вручную создать пустую top-level папку
   WWHYPDA-Cleanup-Test-acceptance. Не брать реальные письма и не переносить
   существующие в неё. После создания закрыть только вкладку Webmail, чтобы
   клиент не менял флаги и не expunge контроль. Весь браузер закрывать не требуется.
2. AVG остальную защиту оставить включённой. Только для этого IMAP теста временно
   выключить Email Shield → Scan SSL connections, которое подставляет AVG CA.
   HTTPS/Web Shield для команд не отключать. После теста вернуть почтовую настройку.
   Проверка SSLContext/hostname в Python сохраняется.
3. Из корня repo выполнить подготовку (явно создаёт только 3 синтетических письма):

~~~powershell
docker run --rm -it --read-only --tmpfs /tmp --mount "type=bind,source=${PWD}\wwwhypda-backend,target=/code,readonly" --mount "type=volume,source=wwwhypda-stage008-mail-state,target=/mail-state" --workdir /code -e MAIL_CLEANUP_IMAP_USERNAME=support@wwhypdatestdeployversion.it -e MAIL_CLEANUP_STATE_DIR=/mail-state/state --entrypoint python wwwhypda-dev-backend -B -m maintenance.mail_probe_fixture --prepare --confirm-create-fixture --prompt-password
~~~

Ожидается failed=0, prepared=3, deleted=0, deleted_controls=1.
Если preparation прервалась, не повторять автоматически и не очищать папку:
возможен частичный APPEND. Сохранённые письма требуют приватного owner разбора.

4. Повторить эту docker-команду, заменив
   --prepare --confirm-create-fixture на --dry-run (модуль остаётся mail_probe_fixture).
   Ожидается failed=0, dry_run=true, eligible=1, deleted=0.
   Новая папка меняет namespace, первый baseline_rebuilt=true допустим и
   консервативно начинает наблюдение заново. Это не разрешает service-delete.

5. Окончательное удаление требует нового явного разрешения на единственный target
   именно этой подготовленной fixture. Разрешение на удаление прежнего ненужного
   черновика сюда не переносится. До успешных prepare/dry-run не запрашивать
   подтверждение необозримой цели и не выдавать test за выполненный.

После адресного разрешения владелец запускает:

~~~powershell
docker run --rm -it --read-only --tmpfs /tmp --mount "type=bind,source=${PWD}\wwwhypda-backend,target=/code,readonly" --mount "type=volume,source=wwwhypda-stage008-mail-state,target=/mail-state" --workdir /code -e MAIL_CLEANUP_IMAP_USERNAME=support@wwhypdatestdeployversion.it -e MAIL_CLEANUP_STATE_DIR=/mail-state/state -e MAIL_CLEANUP_DRY_RUN=false --entrypoint python wwwhypda-dev-backend -B -m maintenance.mail_probe_fixture --execute --confirm-delete-fixture-target --prompt-password
~~~

Эта команда сейчас не разрешена и не выполнялась. Она использует тот же
mail_cleanup.run/probe/addressed_delete, не отдельный упрощённый EXPUNGE.
Вне расписания разрешён только этот явно подтверждённый ручной fixture-test.
Двойной gate: DRY_RUN=false + --execute, плюс --confirm-delete-fixture-target.
Никаких диапазонов/wildcards, только сохранённый один UID.
Ожидается failed=0, deleted=1, controls_preserved=true; два control остаются,
в том числе Deleted. Остатки не чистить автоматически, Trash целиком не expunge.

Сам по себе флаг Recent — session-local: исключён из fingerprint/flags в
mail_imap.fetch. Deleted/Seen/Draft и прочие флаги проверяются по-прежнему.
Исчезновение Recent между соединениями не должно подменять fixture identity.


### Реальная owner-подготовка synthetic fixture успешна

Владелец выполнил локально mail_probe_fixture --prepare --confirm-create-fixture
--prompt-password с постоянным Docker volume.
Результат: failed=0, prepared=3, deleted_controls=1, deleted=0.
Это подтверждает создание трёх синтетических сообщений в заранее созданной
пустой WWHYPDA-Cleanup-Test-acceptance и сохранение private manifest.
APPEND выполнен владельцем явной командой, не агентом; password/UID/содержимое
manifest агент не читал. Никакого SMTP/удаления/автоматического CREATE.

Далее нужен mail_probe_fixture --dry-run; обычный cleanup --once не подменяет
эту проверку закреплённой fixture. Пока dry-run fixture не подтверждён,
никакого --execute. Новый адресный synthetic delete ещё не разрешён.
Webmail тестовую папку пока не открывать, чтобы клиент не expunge Deleted control.
План остаётся активным.


### Реальный owner fixture DRY_RUN успешен, готова конкретная цель

Владелец выполнил mail_probe_fixture --dry-run --prompt-password:
failed=0, dry_run=true, eligible=1, deleted=0, pending=0, uidplus=true,
folders=7, scanned=12, open=11, unsafe=0, ambiguous_drafts=0,
invalid_headers=0, support_observation_blocked=false; роли доступны.
baseline_rebuilt=true ожидаем после добавления новой тестовой папки и изменения
namespace. Private fixture manifest успешно проверен, dry_run_passed сохранён.
Ровно один target в WWHYPDA-Cleanup-Test-acceptance; обычный и Deleted controls
закреплены fingerprint/UIDVALIDITY/UID. Никаких UID/паролей/содержимого агенту
не передавалось.

Подготовка конкретного адресного delete-теста завершена. Следующий шаг требует
нового явного разрешения владельца на окончательное удаление ровно этой одной
синтетической цели через mail_probe_fixture --execute с сохранением обоих
контролей. Пока разрешения и результата execute нет. Прежние разрешения на
подготовку/ненужный черновик не считаются разрешением этого удаления.
План остаётся in_progress, реальный UIDPLUS expunge ещё не принят.


### Реальная адресная UIDPLUS приёмка успешна

После отдельного явного «да» владельцу передана конкретная команда удаления
одной подготовленной synthetic цели. Первая попытка была вставкой старого JSON
в PowerShell и дала ParserError, не запуск cleanup. Затем владелец выполнил
mail_probe_fixture --execute --confirm-delete-fixture-target с
MAIL_CLEANUP_DRY_RUN=false и private manifest.

Получен aggregate: failed=0, dry_run=false, deleted=1,
controls_preserved=true, eligible=1, baseline_rebuilt=false, pending=0,
uidplus=true, folders=7, scanned=12, unsafe=0, ambiguous_drafts=0,
invalid_headers=0, support_observation_blocked=false.
Ровно target отсутствует, обычный и заранее Deleted controls сохранили
identities/flags по postcheck. Synthetic fixture consumed; повтор execute
не требуется и не разрешает удаление controls или обычной переписки.
Реальный addressed path UID STORE + UID EXPUNGE принят для этого Zimbra.
SMTP owner доставку/отсутствие Sent-копии и readonly/closure/reopened проверки
записали выше. Шаг 7 технической owner-приёмки отмечен выполненным.

Это не включает timer/service cleanup на VPS и не разрешает support-delete:
межпапочная гонка остаётся ограничением шага 4, он не завершён. Владелец менял
на VPS только env, новый код не загружен. Агент пароля/state/почты не читал
и не выполнял сетевых мутаций. Владелец возвращает AVG Email Shield SSL scanning.
Теперь продолжаются локальные шаги 8–10 на подтверждённых фактах, без публикации.
