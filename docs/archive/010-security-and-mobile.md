---
stage: 010
title: Исправление сессий, reset-защиты и мобильного Home/Search
revision: 1
status: archived
created: 2026-10-18
completed: 2026-10-18
rules:
  - docs/rules/project.md
  - docs/rules/validation.md
  - docs/rules/boundaries.md
  - docs/rules/frontend.md
  - docs/rules/runtime-and-privacy.md
---

# Цель

Устранить подтверждённые локальным пентестом дефекты сессий и восстановления
пароля, ограничить занятость auth workers, обновить применимые уязвимые зависимости.
Исправить мобильный заголовок Home, размеры анимированного логотипа, переносы
подписей и лишнюю внутреннюю прокрутку Search in. Завершить повторной проверкой
безопасности и визуальной приёмкой владельца.

## Основание и состояние

- Отчёт: docs/security/2026-10-18-audit.md. Проверен завершённый commit 2c443fa,
  чистая рабочая копия; 202 файла совпали с изолированным снимком после уточнения
  владельца. Это не проверка промежуточной реализации 009.
- PostgreSQL137/SQLite-protocol104 — OK. Отдельные HTTP-пробы обнаружили SEC-01,
  SEC-02 и SEC-03; зелёные прежние тесты этих дефектов не исключают.
- Владелец сообщил, что миграции 009 уже применены локально и на VPS. Не включать
  повторное применение к рабочим базам как незавершённую задачу. Новые миграции
  этого цикла сначала проверяются только на disposable PostgreSQL.
- Скриншоты владельца: ../Capture.PNG (Home), ../Capture1.PNG (Search). Снимки
  просмотрены архитектором; дополнительное требование — убрать лишний scroll
  Search in на узком экране. Эти screenshots не являются browser QA новой реализации.

## Объём и ограничения

Работа только локальная, без VPS/DNS/рабочих БД/реального SMTP/IMAP/Google, без
чтения env и current_todo_list.md. Не применять миграции к рабочей локальной БД
без отдельного разрешения. Не выполнять commit/push. Контейнеры стенда должны
иметь отдельный project name, synthetic данные, internal/no-network, tmpfs и не
использовать пользовательские volumes/preview 8082/8083. Не затрагивать текущие
почтовые сообщения и timers.

Сохраняются registration continuation и budgets 009, accepted terms/history,
retention, CAPTCHA strict policy/iframe lifecycle, приватность InputData, CSRF,
роль из БД, Redux/drafts, Community AG Grid, темы, поиск/панели и анимация логотипа.
Security probes и узкие refactors не разрешают переписать приложение.

Публичные документы менять только при фактическом изменении описанного поведения;
при изменении текста соблюдать единый version/HTML/PDF/reaccept workflow 008/009.
Gmail в инструкции универсального локального запуска не удалять.

## Шаги

### 1. [x] Сохранить воспроизводимые regression-пробы и точную область аудита

- Прочитать отчёт, актуальные auth/session/input/admin/maintenance и правила.
  Сохранить commit/image identity, безопасный inventory тестового окружения.
- Локальные исходные probes находятся ../security-audit-2026-10-18/stage-009;
  взять их как доказательства, перенести необходимые минимальные проверки в
  tracked deploy/testing и backend tests. Не копировать snapshot/source в Git.
- Включить три уровня: anonymous HTTP, проверка кода/форм, user A/user B/admin.
  Отдельно фиксировать отсутствие полного infrastructure/production/browser аудита.
- Воспроизвести SEC-01/02/03 как failing security expectations до исправления.
  Fixtures только synthetic; любые тестовые access/refresh/коды не печатать.
- Проверить anonymous/protected/ownership/admin, forged/expired JWT, CSRF,
  CAPTCHA action/hostname/score/malformed input и terms gate. Не объявлять один
  SQL payload доказательством отсутствия всех инъекций.
- Приёмка: новый агент запускает probes по tracked инструкции без секретов,
  имеет исходную матрицу и baseline; отчёт описывает фактические результаты.

### 2. [x] Отзывать сессию на сервере после logout и блокировки — SEC-01/02

- Файлы: auth/authentication.py, auth/auth_models.py, auth/session_security.py,
  auth/admin/admin.py при необходимости, новая additive migration и tests.
  Frontend: существующие logout consumers в users/accounts/account.tsx,
  superuser.tsx, users/auth/login.tsx, api.tsx/существующие CSRF helpers.
- Ввести постоянный server-side session identifier/revocation state в users_db,
  связанный с User; access и refresh одной сессии ссылаются на один sid. Ввести
  expiry/очистку state, FK/cascade, индексы. Существующий account_version оставить
  для замены пароля/id reuse. Память одного worker и удаление cookies недостаточны.
- Logout отзывает текущую сессию и оба её токена атомарно, затем очищает cookies.
  По умолчанию другие независимые сессии пользователя сохраняются. Повторный
  logout идемпотентен. Отсутствие нового terms acceptance не запрещает logout.
- Обязательно спроектировать и протестировать logout при истёкшем access и ещё
  действующем refresh: действующая сессия должна отзываться, а не только исчезать
  из UI. Выбрать cookie path/подтверждение refresh для logout или узкий безопасный
  механизм отзыва; описать решение. Проверять подпись, CSRF и принадлежность sid,
  не разрешать expired access на ordinary APIs и не принимать произвольный user_id.
- Deactivate отзывает все существующие сессии пользователя в общей транзакции;
  activate не восстанавливает их. Новый login выдаёт новую сессию. Demotion по-прежнему
  немедленно проверяет роль из БД; password reset/delete также отзывают всё.
- Additive migration apply/check/repeat/rollback-failure на PostgreSQL. Не удалять
  аккаунты, acceptance/заявки. Старые JWT без sid после rollout безопасно требуют
  нового входа; документировать это как однократное завершение прежних сессий.
- Проверки: replay access/refresh после logout 401; два браузера; expired access;
  CSRF/logout cross-origin отрицательные случаи; deactivate→activate→старые JWT401;
  multi-worker, одновременные logout/refresh/deactivate/reset/delete, persistence
  после restart; commit failure не оставляет частичного отзыва. Не расширять
  допускаемые JWT algorithms/locations ради совместимости.
- Обновить boundaries.md, runtime-and-privacy.md и инструкцию согласованного
  будущего rollout migration/backend/frontend. VPS не изменять.

### 3. [x] Исправить жизненный цикл и общий бюджет reset-кода — SEC-03

- Файлы: auth/auth_models.py, authentication.py request/confirm-password-reset,
  отдельный reset budget helper/model/migration при необходимости; tests.
- Оставить максимум один актуальный reset challenge на аккаунт: допустимая новая
  выдача атомарно инвалидирует прежние password_reset codes, registration не трогать.
- При успешном reset атомарно сменить hash, удалить ВСЕ reset-коды этого адреса,
  отозвать существующие сессии. Повторное использование любого старого кода — отказ.
- Общий DB-backed бюджет независимо от IP/workers: максимум 5 неверных проверок
  текущего reset challenge; максимум 3 выдачи за 15 минут на аккаунт. Сохранять
  нынешний TTL2min и CSPRNG. Повторная выдача не обходится альтернативным action.
  Wrong-attempt commit должен переживать следующий запрос; проверки/consume/locks
  совместимы с нынешним общим transaction lock и порядком User→challenge.
- Public request/resend: прежний нейтральный200/body и общий4s response window
  после допустимого CAPTCHA/validation для active/unknown/disabled/quota/SMTP error.
  Не создавать state для произвольных неизвестных адресов и не сообщать квоту/
  существование аккаунта. Rate/global-cap429 различать с нейтральным успехом.
- Подтверждение: прежний payload email/code/new_password/recaptcha_token и безопасная
  ошибка invalid/expired/exhausted без разницы, раскрывающей владельца. Клиент не
  управляет счётчиками/временем/пользователем. Не переносить activation semantics на reset.
- Проверки PostgreSQL: два последовательно выданных кода; старый до/после reset;
  6 попыток с разных IP; смена worker/restart; одновременный resend/confirm/cleanup;
  два confirm не завершаются успешно; commit failure откатывает hash/codes/sessions;
  существующие pending/terms/retention scenarios сохраняются.
- Согласовать фактические правила/инструкцию новой миграции без backfill ложной истории.

### 4. [x] Ограничить auth-занятость и проверить доступность — AV-01

- Файлы: backend Dockerfile/запуск, password_reset_delivery.py и узкий admission
  helper, tests, tracked deploy/testing и инструкция prod. Игнорируемые prod
  Compose/Nginx менять локально только по необходимости, дать tracked перечень.
- Убрать единственный sync worker как production default. Начальная конфигурация
  для приёмки: 2 workers ×4 gthread threads, с возможностью операторской настройки.
  Проверить совместимость Flask-SQLAlchemy/common locks/SMTP child supervision.
- Добавить общий для workers/container nonblocking cap не более4 одновременно
  обрабатываемых тяжёлых auth-запросов, включая CAPTCHA/ожидание. На переполнение
  быстрый нейтральный429 без проверки состояния email. Освобождение в finally,
  отсутствие orphan locks после исключений/убитого worker; не использовать один
  счётчик в памяти процесса. Лимит SMTP child2/deadline3s и reap сохраняются.
- Сохранить floors4s/.4s и отсутствие DB tx/locks во время ожидания; не заменять
  их случайным sleep и не убирать защиту enumeration ради производительности.
  Согласовать Nginx auth rate/burst с измеренной пропускной способностью, не
  увеличивать лимиты вслепую. Нельзя обещать защиту от всех DDoS.
- Проверки только малым bounded local workload через Nginx→Gunicorn: насыщение
  четырьмя synthetic auth operations не блокирует обычный read >1s в принятом
  стенде; избыток быстро429, нет роста процессов/памяти/DB connections без границ.
  Timing существующего/неизвестного адреса, поведение после SIGTERM/restart и
  release slots записать с конфигурацией и числом samples. Это не VPS capacity SLA.

### 5. [x] Выполнить применимое обновление зависимостей и проверить hardening

- requirements.txt, package.json/package-lock.json, Dockerfile и реальные imports.
  Составить inventory runtime/browser/build tools и affected advisory на дату
  реализации. Проверить Python имена корректно: пустой невалидный OSV batch не
  выдавать за чистый аудит. Не считать aliases CVE/GHSA разными багами.
- Обновить согласованный Flask/Werkzeug/Jinja2/Flask-CORS/Requests/urllib3 набор
  и используемые frontend Axios/React Router; точные исправленные версии выбрать
  по primary advisory, протестировать, фиксировать reproducible lock. Обновлять
  только необходимую связанную цепочку, без npm audit fix --force/скачанных PoC.
- Для xlsx0.18.5 выбрать поддерживаемую безопасную реализацию экспорта с сохранением
  всех строк/нулей/null/символов; npm latest того же пакета может оставаться affected.
  Если менять поставщика/дистрибутив, документировать официальный источник и pin,
  проверить лицензию/Community ограничения; серверный Excel-сервис не вводить.
- Транзитивные Cypress/build dependencies классифицировать по фактическому
  использованию, не приписывать Node SSR/RSC RCE статической SPA. Для неприменимых
  advisory записать условия и доказательство недостижимости; не оставлять реально
  достижимую дыру только потому, что тесты проходят.
- Изолированные Nginx HTTP-пробы: dotfiles/traversal, auth rate/429, normalized paths,
  maintenance on/off/503/Retry-After, legal/PDF исключения, нет writable HTTP setter;
  fake upstream не должен обходить gate. Проверить secure-cookie/CORS/proxy defaults
  синтетической конфигурации, не читая env. Production значения вне приёмки.
- Проверить HTML parameter rendering: пользовательская заявка не должна попасть в
  dangerouslySetInnerHTML; при доступном untrusted пути закрыть sanitization/plain
  text с сохранением нужных научных sup/sub. Не объявлять XSS без такого пути.
- Приёмка: обновлённый inventory и применимость, auth/mail tests, frontend tests/
  build, экспорт, router/terms/CSRF/CAPTCHA/maintenance regression; ограниченный
  повторный пентест не обнаруживает прежних дефектов.

### 6. [x] Исправить Home heading и масштаб анимированного SVG

- Файлы: pages/home.tsx/home.module.scss, src/logos/logo/AnimatedLogo.tsx и SCSS,
  menu.module.scss для нужного font-size token, общий словарь для редактируемых
  коротких UI-литералов. Не менять данные/смысл Home и остальные заголовки сайта.
- Уменьшить мобильный h1 относительно нынешнего head-font-size×2; responsive
  font token в общей палитре для обеих тем, rem-основа и разумная длина строки.
  Не компенсировать размер искусственным word-break/truncate или длинными отступами.
- Логотип: согласовать wrapper, viewBox, реальную область букв/group transform;
  убрать ограничение13vh/95vw как причину tiny/clipped zoom. Размер задаётся rem с
  ограничением доступной ширины, height по aspect ratio/контенту. Не угадывать zoom
  через DPR, outerWidth или JS resize; не делать counter-scale против browser zoom.
- Сохранить весь SVG/комментарии/GSAP рисунок, уникальные mask IDs и плавность.
  Проверить завершение анимации, resize/remount и reduced-motion, без мерцания и
  обрезания масок. Readable mobile логотип не должен превращаться в чрезмерный banner.
- Проверки: desktop1366/1920, portrait320/360/390/430CSSpx и landscape; zoom80/100/
  125/150/200, обе темы, Chrome/Firefox. Фиксировать CSS viewport отдельно от
  screenshot pixels. Буквы масштабируются с zoom, heading не заполняет весь экран.

### 7. [x] Исправить подписи и ненужный scroll Search in

- Файлы: search/searchTableRow.tsx, searchStyles.module.scss, search.tsx при
  необходимости; тип SearchParameterSelection, API и Redux неизменны.
- Причина: container query <=30rem принудительно ставит description во вторую
  строку; fixed symbol column и overflow:auto/ограниченная высота добавляют scroll.
- Уместить symbol, description и units в строку при достаточной фактической
  ширине, учитывая radio и отступы; уменьшить пустую symbol column. All parameters
  остаётся отдельным корректным вариантом. superscript/subscript и units сохранять.
- Не вводить глобальный white-space:nowrap/обрезание/ellipsis: когда строка реально
  не помещается при320px/200%/длинных названиях, разрешить осмысленный перенос,
  минимизировать ненужные разрывы. Label/radio click/focus остаются единым действием.
- В узкой stacked раскладке Search in растёт по содержимому, без внутренней
  вертикальной/горизонтальной прокрутки формы и parameterChoices; внешний scroll
  html остаётся. Не скрывать overflow с потерей параметров или Find data.
- Широкую фиксированную rem workspace/внутренний scroll длинного списка там
  сохранить; все8 состояний видимости панелей и анимация перераспределения работают.
  Если stacked tracks нужны auto-height, отдельно проверить grid-track transition
  и скрытую inert панель, без пустого зарезервированного пространства.
- Проверить Search, Tree/Form/Results/Show all, table Community pagination/export,
  All parameters, длинные/пустые/error/loading данные, обе темы/клавиатуру/zoom.
  Никаких изменений API /rocks/search или backend ради этой вёрстки.

### 8. [x] Итоговый пентест, визуальная приёмка и документация

- Повторить tracked anonymous/формы/user A/B/admin probes на окончательном commit/
  snapshot. SEC-01/02/03 теперь отрицательные401; отсутствие JWT до activation/
  terms, pending budgets, CSRF и приватность заявок не деградировали.
- PostgreSQL migration/concurrency suite и mock mail/reminder/CAPTCHA/retention;
  tests транспорта и frontend scripts из текущего package.json/deploy/testing.
  Build/lint — штатными Docker-командами docs/rules/validation.md. Старый lint
  baseline отделить; scoped lint не выдавать за полный.
- Дать владельцу точный isolated preview URL и сценарии окончательной визуальной
  проверки: Home title/logo на телефоне и zoom; Search in без лишних переносов/
  внутреннего scroll; темы, три панели, Find data, skeleton и maintenance.
  Сохранить screenshots/viewport/browser/theme в журнале. Недоступный реальный
  browser/device не считать проверенным, принять фактическую owner-приёмку.
- Обновить docs/security/2026-10-18-audit.md с before/after и оставшимися границами,
  rules/boundaries/frontend/runtime/README и инструкции новых migrations/rollout.
  Не писать о гарантии отсутствия уязвимостей или штрафов.
- Если правки затронули фактическое описание cookies/session в policies, выпустить
  согласованный пакет HTML/PDF/backend/frontend version и acceptance fixtures;
  не перезаписывать прошлые версии. Если описание всё ещё верно — текст не менять.
- Подготовить будущий список Git/SFTP файлов и порядок migration/check/build/
  recreate всех сервисов, включая retention; сами VPS/deploy не выполнять.

## Критерии завершения цикла

- [x] Logout и deactivate необратимо отзывают нужные токены на сервере.
- [x] Старые reset-коды не переживают выдачу нового/успешный reset, общий бюджет работает.
- [x] Малый auth flood на isolated стенде не занимает все HTTP workers.
- [x] Применимые зависимости обновлены; advisory классифицированы без ложных выводов.
- [x] Home heading/logo читаемы и корректно масштабируются.
- [x] Search labels используют ширину; stacked Search in без лишнего внутреннего scroll.
- [x] Security suites/retest и итоговая графическая приёмка завершены, ограничения записаны.
- [x] Нет потери данных/drafts/acceptance, новых lint/build ошибок; docs актуальны.

## Журнал выполнения

18.10.2026 — архитектор: создан план по результатам разрешённого локального аудита
после завершения 009 и уточнений владельца. Код не менялся. Изолированные tests и
пробы перечислены в отчёте. Готовность миграций009 — сообщение владельца, не
результат подключения агента к VPS. Исправления и новые migrations010 не выполнялись.

## Итог

Исправлены server sessions/reset/admission/dependencies и мобильный Home/Search.
Автотесты и фактическая визуальная приёмка завершены; см. журнал ниже.
Предлагаемый planning commit: docs(stage-010): plan security and mobile fixes.

### Начало реализации

Исходный HEAD2c443fa5fbde30a4428aa5c82e33dc439b4d08ce; рабочие изменения
планнера — STATE, security report и stage010 — сохранены. Работа только
с isolated проектом stage010; dev8080/рабочая БД/env/VPS не используются.

Baseline actual HTTP: SEC01 access/refresh replay200, SEC02 reactivation replay200,
SEC03 older reset after success200; neutral active/unknown reset4.003–4.004s.
Три исходных дефекта воспроизведены. Tracked probes/README/compose перенесены без
snapshot и секретов. Docker image до изменений:wwwhypda-dev-backend из009;
HEAD2c443fa, synthetic SQLite, network:none, read-only+tmpfs.

Начат шаг2: persistent AuthSession/sid, общий lock/User/session порядок,
refresh/logout дочерний endpoint использует прежний refresh cookie path и его
CSRF; logout signature/type/expiry/CSRF проверяет даже при повторном отзыве.
Новые старые JWT без sid не принимаются; новая migration ещё готовится.

Промежуточный PostgreSQL166:164 passed,2 старых ожидания требуют синхронизации:
logout без CSRF больше не200; шестипоточный confirmation flood теперь429 от cap.
Исправлены ожидания/сохранены6попыток с3concurrent workers, не отключён admission.
Новые session/reset/migration tests прошли. SQLite16 новых security tests OK.
Первое capacity измерение выявило важный scheduler случай:4 global slots могли
занять все4threads одного worker. Добавлен дополнительный per-worker неблокирующий
предел3 (общий межпроцессный4 сохранён), минимум2configuredthreads. Это резерв
для обычных чтений, не замена глобального cap памятью одного процесса.

Capacity повторно: Nginx→2workers×4gthread, global4/local3,3серии×4auth.
Read0.003–0.004s,overflow429за0.002–0.003s,accepted reset4.004–4.098s.
Серииunknown/active/unknown, provider/SMTP mocks, без опубликованных портов.
Оба worker участвовали. Это bounded fixture sample, не VPS SLA.

Зависимости: проверены primary Flask/Router/Axios/urllib3/Jinja advisories и
официальные PyPI/npm metadata. Pins Flask3.1.3/Werkzeug3.1.9/Jinja3.1.6/
Flask-Cors6.0.5/Requests2.34.2/urllib3 2.8.0,Axios1.20.0/RouterDOM7.18.4.
SheetJS CE0.20.3 — official CDN tarball, lock integrity; import/API экспорта
сохранены. npm audit ещё имеет18 advisories, классификация в работе, clean
не объявлен. Frontend Dockerfile использует npm ci вместо npm install.

Начаты запланированные Home/Search правки: общий Home title token3rem/2rem
mobile, logo rem-width с tight viewBox реальных букв и без group0.6 scaling,
reduced-motion завершает master timeline. Search stacked form track1fr/0fr,
параметры по содержимому без внутреннего scroll; wide workspace сохранён.
Inline labels без принудительной второй строки; визуальная приёмка впереди.

Docker Desktop в этом окружении не публикует порт internal-only bridge:
HostConfig.PortBindings задан, NetworkSettings.Ports80=[]; nginx -t OK.
Чтобы сохранить обязательную internal изоляцию (не добавлять external network),
подготовлен loopback-only host relay8084 через docker exec fixed fixture web→Nginx.
Он не читает env, не выполняет shell, не логирует токены/тела, URL назначения
фиксирован; это тестовый транспорт, не часть приложения/deployment. HTTP guard
ошибку соединения до relay не выдаём за ошибку runtime приложения.

### Уточнение владельца: обычный dev8080

Владелец явно уточнил, что локальная БД тестовая, не передаётся на VPS, и просит
разрабатывать/проверять UI на обычном dev8080 вместо дополнительных портов.
Это уточнение разрешает локальную добавляющую security state migration и запуск
нового dev backend/frontend; прежний запрет working-local-DB в границах этого
плана заменён данным разрешением для локальной тестовой БД. VPS/env/реальная
почта/commit/push по-прежнему запрещены. Изолированная PostgreSQL остаётся только
для разрушительных автотестов, UI preview8084/relay останавливаются.

UI8084/host relay удалены из реализации по уточнению владельца. Nginx regression
теперь целиком internal/no-published-ports, HTTP через docker exec transport,
минимальный fake upstream вместо второго приложения. GUI-проверка только8080.
Локальная migration security state apply/check прошла; данные/acceptance не
перезаписываются, reset budget без ложного backfill; frontend/backend обновляются.

Владелец подтвердил визуальную приёмку Home/Search и остальных сценариев на dev8080,
кроме выравнивания строк Search. По уточнению: слева radio + описание + символ,
справа только единицы. Внесены grid/переносы без изменения данных и цветов.
Последнее выравнивание ожидает короткой визуальной проверки.


### Завершение шагов2–8 — 18.10.2026

Шаг2: AuthSession/sid в auth_models/sessions/session_security, logout consumers
account/superuser/login и refresh CSRF helper. Refresh logout дочерний endpoint
сохраняет cookie path; clear только после commit, repeat idempotent. Global revoke
на password/deactivate; activate не оживляет. Auth cleanup/retention удаляет state.
Migration auth.migrate_security_state additive apply/check/repeat/failure проверена
на disposable PG; обычная локальная тестовая БД — только по уточнению владельца.
Однократный новый вход для legacy JWT документирован; drafts сохраняются.

Шаг3: ResetLimit/reset_limits,3issues/15min/5wrong,current code replacement,
успешный reset удаляет все reset codes/revokes. Wrong budget commit, rollback,
concurrent reset/refresh lifecycle и неизвестные/disabled подтверждены тестами.
Registration continuation/terms/mail/retention не заменены новым reset flow.

Шаг4: gunicorn.conf2×4gthread, kernel flock global4 и per-worker3, overflow429 до
provider/state; per-worker резерв добавлен после реального неудачного capacity
прогона. SMTP cap2/deadline3s/reap и floors сохранены; Nginx rates не увеличены.
Повтор3×4: read.003–.005s,overflow429 .002–.005s,accepted4.004–4.016s.
SQLite active contention нейтрален, PG корректность отдельно. Это не VPS SLA.

Шаг5: requirements UTF16,package/lock,Dockerfile npm ci,official SheetJS CE0.20.3
Apache2.0; inventory36OSV0/npm audit0. Промежуточный18 не финальный результат.
Правило no forced major соблюдено, SSR/RSC не приписаны SPA. HTML catalogue
boundary проверен; новых untrusted writes в Parameter нет. Nginx3 и cookies/CORS1
passed. Подробности docs/security/stage010-dependencies.md и audit retest.

Шаг6: home token3rem/2rem,42rem SVG/tightviewBox/naturalheight/reduced-motion,
GSAP/masks/comments сохранены, useMemo устраняет restart и прежний lint warning.
Шаг7: stacked1fr/0fr tracks/height content/nointernal scroll,wide workspace прежний;
All parameters/Find data/sup-sub сохранены. По последнему уточнению radio/description/
symbol слева, units справа. Владелец ответил «ВЫРАВНЕНО НОРМ» после Ctrl+F5.
Остальные предложенные визуальные сценарии до этого приняты как «да всё ок».
Точные browser versions/viewports/screenshots не получены; не выдумываем matrix.
GUI-автоматизации не было: доступных браузеров нет, принята фактическая owner QA.

Шаг8 проверки (Docker, synthetic fixtures; только orchestration/edit/metadata на host):
- PostgreSQL168 passed61.568s + новый process persistence1 passed.527s;
- SQLite/protocol/mail/timing97 passed40.652s; cookie/CORS1 passed.315s;
- HTTP37/37, отдельный fresh token до deactivate; reset old401/new200;
- frontend59 passed; XLSX125rows; dev final build9.15s/3PDF/maintenance assets OK;
- full lint старые58errors15warnings; changed11files baseline15/current14/new0;
- git diff --check clean (только LF/CRLF conversion notices).

README, rules/boundaries/frontend/runtime, audit before/after, dependency inventory,
tracked testing README и future rollout инструкция обновлены. Policies/version/PDF
не меняются: новые processing purposes/cookies не введены. Gmail local guide сохранён.
Будущая доставка Git/SFTP/ignored config/migration→check→все workers, включая
retention, описана; на VPS не выполнялась. Реальные письма/секреты не трогались.
Автотестовые проекты останавливаются; обычный dev8080 остаётся работать.

Итог: все шаги и фактическая owner acceptance выполнены; ограничения браузерной
матрицы и инфраструктуры записаны. Commit/push не выполнялись.
Предлагаемый commit: fix(stage-010): revoke sessions and secure reset lifecycle.

18.10.2026 — completed: проверки/owner QA/документы завершены.
Автотестовые контейнеры/сети удалены без volumes; docker ps показывает только
обычные dev backend/nginx/db. Nginx публикует только127.0.0.1:8080.

18.10.2026 — archived по WORKFLOW; active_stage очищен.
