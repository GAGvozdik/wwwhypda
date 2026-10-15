---
stage: 004
title: Защита входа, регистрации и восстановления от раскрытия аккаунтов
revision: 4
status: archived
created: 2026-10-15
completed: 2026-10-15
rules:
  - docs/rules/project.md
  - docs/rules/boundaries.md
  - docs/rules/frontend.md
  - docs/rules/validation.md
---

# Цель

Устранить раскрытие аккаунта через неуспешный вход, регистрацию, запрос/resend восстановления и resend подтверждения: одинаковые безопасные status/JSON/UI для сопоставимых запросов и проверка времени обработки. Успешный вход с правильными данными сохраняет обычный результат. Реальные reset-коды и письма создаются только для существующего активного аккаунта.

## Объём и ограничения

Локальная реализация и тесты. В этот план не входят OVH, публикация, VPS, автоочистка, миграции, пересмотр reCAPTCHA, юридические документы и обязательная галочка согласия. Никакого общего auth-redesign, новых зависимостей или почтовой платформы. Существующие комментарии и пользовательские данные сохранять.

Подтверждённый дефект: POST /users/request-password-reset отвечает unknown/inactive адресам 404, active — 200, SMTP failure — 202. Frontend использует эти различия. Выбран единый ответ 200 после валидного запроса и успешной CAPTCHA:

```json
{"message": "If an active account exists for this email address, password reset instructions will be sent."}
```

Это сообщение не обещает реальную доставку. CAPTCHA/rate-limit/ошибка формата запроса могут иметь отдельные ответы, если они не зависят от наличия аккаунта.

## Обязательная политика времени ответа — revision 4

1. **Основной механизм — устранить различие веток.** Failed login выполняет сопоставимую hash-проверку; registration не пропускает hash-work для existing; mail/no-mail пути не должны раскрывать состояние через синхронное ожидание только одной категории.
2. **Random jitter только дополнение.** Его распределение одинаково для всех сравниваемых категорий, не зависит от наличия/статуса аккаунта. Одинаковое случайное добавление не уничтожает базовую разницу: среднее t_base + J сохраняет разность средних t_base. План не считается выполненным добавлением random sleep.
3. **Если нужна общая нижняя граница ответа:** считать её от единого момента после общей проверки payload/CAPTCHA, учитывать уже потраченное monotonic elapsed time и ждать лишь остаток. Нельзя ждать одинаковые дополнительные N секунд после уже разной работы. Внутренние операции/SMTP должны иметь обоснованный bounded deadline; если бюджет превышается, безопасно обработать исход и честно записать границы защиты.
4. **Ограничить ресурсную цену.** Не делать busy loop, бессрочное ожидание и дополнительные дорогие hash-итерации. Задержка не должна держать DB transaction, advisory/row locks или соединение с открытой транзакцией. Блокирующий sleep занимает HTTP worker: оценить влияние на доступность остальных запросов. Существующие CAPTCHA, Nginx limits и server rate limits сохраняются, но их наличие само по себе не доказывает достаточность нового механизма.
5. **Не размножать subprocess без контроля.** Если используется spawn sender, обеспечить ограниченный ресурс/срок, cleanup/reap, корректный timeout/shutdown и отсутствие передачи request/DB context. Ошибки/переполнение не должны снова различать active и unknown. Не оставлять отправку без контролируемого результата.
6. **Уже предложенное решение не считается автоматически принятым для всех операций.** В журнале revision 2 есть reset-only вариант с 8s sender deadline и общим 10s window. Это текущая локальная реализация/гипотеза имплементатора, а не измеренная необходимая задержка для login/register/resend. Проверить обоснованность этих чисел, CPU/memory/занятость workers и UI-цену на synthetic стенде. Не переносить 10 секунд на остальные endpoint механически. При недопустимом влиянии на доступность выбрать меньший обоснованный бюджет или уточнить безопасное устройство отправки до завершения.
7. **Разделить доказательства.** Сопоставимое число hash-проверок и отсутствие early-return доказываются структурными tests; deadline/ошибки/cleanup — управляемыми process tests; временные распределения — повторной серией с одинаковыми mocked внешними условиями и перемешанным порядком категорий. Проверять не один замер, а mean/median/tail и сохранение устойчивой разницы. Число повторений, допуск и baseline указать в отчёте; учитывать шум, не вводить flaky тест с требованием идеально равных миллисекунд.
8. **Результат без преувеличений.** Локальные tests не доказывают отсутствие всех возможных сетевых side channels. В итогах отдельно: какие известные shortcut/mail различия устранены, стоимость защиты, что проверено synthetic и что проверить после последующего разрешённого deployment. Наличие подтверждённого устойчивого различия между категориями не закрывать словами «CAPTCHA мешает собрать много запросов».

## Шаги

### 1. [x] Исправить backend initial/resend

**Файлы:** wwwhypda-backend/auth/authentication.py; common/error_messages.json. Существующий mail/code helper изменять только при доказанной необходимости этого исправления.

- В request_password_reset возвращать один status/JSON для active, неизвестного, неподтверждённого и административно отключённого аккаунта. В ответе нет error/exists/active/id и различающихся сообщений.
- Обе actions request_password_reset/resend_password_reset продолжают проходить текущую server-side reCAPTCHA и rate limit. Generic success нельзя возвращать до этих проверок или использовать как обход защиты.
- Unknown/inactive: не создавать аккаунт/код, не отправлять email и не хранить фиктивное обращение. Не менять пароль, активность или дату регистрации.
- Active: сохранить создание и отправку двухминутного одноразового кода. Отказ генерации/конкурентное удаление/ошибка SMTP не должны раскрывать аккаунт через account-specific 404/202/500. Безопасный rollback/журнал без email, кодов и request/response bodies; публичный нейтральный ответ.
- Невалидный JSON, тип/длина email обрабатываются безопасно и одинаково независимо от аккаунта. Не вводить несовместимую с регистрацией нормализацию адресов.
- Проверить timing: unknown не должен давать очевидный быстрый ответ, позволяющий отличить его от active с синхронным SMTP. Проверить управляемым тестом с искусственной задержкой отправки. При подтверждённом существенном различии уточнить конкретное минимальное решение в этом же плане до завершения; не маскировать его random sleep и не вводить ненадёжную fire-and-forget рассылку попутно. Не обещать устранение timing side channels только по равенству JSON.

**Готовность:** valid initial/resend имеют одинаковый публичный контракт; код/отправка только для active, защита сохранена. Подтверждённый существенный timing-признак не оставлен без решения.

### 2. [x] Согласовать форму сброса

**Файлы:** wwwhypda-frontendV2/src/components/users/auth/forgotPassword.tsx; src/common/error_messages.json.

- Для initial/resend использовать общий message key, согласованный с backend. Не возвращать fallback «code sent» или «confirmation code resent», утверждающий реальную отправку.
- После generic 200 одинаковое сообщение, переход к вводу кода и одинаковый 30-секундный resend countdown для всех valid адресов.
- Сохранить pendingRequest, loading/error UX, executeRecaptcha на явном действии, Axios src/components/api.tsx, форму подтверждения кода и нового пароля. Без второго транспорта, изменений Redux/темы/layout/SCSS.
- Не выводить токены, адреса, полные Axios errors в консоль. Подлинные network/CAPTCHA/rate-limit ошибки остаются безопасно видимыми и не превращаются в ложный успех.
- Не добавлять новый checkbox и не менять Privacy/User Agreement. Registration меняется только в пределах защиты от enumeration по шагу 2.2; существующее принятие договора/возраста сохраняется. UI остаётся английским, действующие LegalLinks сохраняются.

**Готовность:** сообщение, шаг, countdown и pending behaviour не зависят от наличия аккаунта. Подтверждение пароля продолжает работать прежним способом.

### 2.1. [x] Устранить timing-признак при неуспешном входе

**Файлы:** wwwhypda-backend/auth/auth_models.py (User.login); auth/authentication.py (/users/login) по необходимости; login.tsx/общие словари только при изменении публичного контракта.

- Текущий код пропускает check_password_hash, если активного аккаунта нет. Для каждого валидного неуспешного входа выполнить сопоставимую дорогостоящую проверку: для известного active — реальный hash, для unknown/inactive — заранее подготовленный dummy hash с текущим алгоритмом/стоимостью. Не генерировать dummy hash на каждый запрос: это создаст другую разницу и лишнюю CPU-нагрузку.
- Dummy-проверка никогда не даёт входа, cookies или user data. Возврат по флагу active и правильности пароля остаётся безопасным; unknown, unconfirmed, disabled и active+wrong password получают одинаковые status/JSON/UI. Успешный пароль active остаётся успешным — его не требуется маскировать как ошибку.
- Не снижать стоимость/качество существующих хэшей и не менять пароли ради выравнивания. Проверить легаси-форматы без чтения рабочей БД; разные historical work factors учитывать в оценке и не обещать математически одинаковую длительность всех запросов.
- Сохранить reCAPTCHA action login, rate limits, creation cookies и account_version. Для плохого payload исключить account-specific ошибки; не добавлять задержку до общей валидации/anti-abuse.

**Готовность:** неизвестный пользователь не даёт shortcut без hash-work; все failed-login категории имеют один публичный контракт, а правильный вход и session lifecycle работают.

### 2.2. [x] Закрыть различия регистрации и resend подтверждения

**Файлы:** auth/authentication.py (POST /users/ и /users/resend-confirmation); auth_models.py/code/mail helpers только по необходимости; frontend auth/registration.tsx; common/error_messages.json и frontend словарь.

- Сравнить unknown/new, existing active, existing unconfirmed и existing disabled по status/JSON/UI, времени hash/DB/SMTP и отказам. Не считать docstring enumeration-safe доказательством. В текущем коде hash+mail для new и отсутствие mail для existing — разные ветки; resend отправляет только подходящему аккаунту.
- Для валидной новой/повторной регистрации и resend — один публичный ответ в пределах каждого endpoint, без подтверждения доставленного письма, наличия аккаунта или состояния active. Neutral message key и одинаковые step/countdown в UI. Содержимое ответа не должно утверждать отправку, если её не было.
- Для регистрации выровнять password-hash work до account-specific ветки: один hash вычисляется для валидного запроса, новый аккаунт использует этот результат; дубликат его отбрасывает. Не хэшировать дважды для new и не хранить dummy/hash входного пароля для existing. Не держать глобальную DB-блокировку на время лишней криптографической работы.
- Повторный запрос не меняет чужой пароль, email/name, права, registered_at, registration_completed, terms_accepted_at/version и не активирует аккаунт. Сохранить atomically-created acceptance, server timestamps, stale terms-version отказ и возрастной checkbox. Не создавать аккаунты/reset-коды для фиктивного выравнивания.
- Почта и реальные коды остаются только в разрешённых состояниях; неизвестному resend-адресу письма/аккаунты не создавать. Код/ошибка SMTP/конкурентное создание не должны раскрывать наличие аккаунта через иной status/body. Выбранный общий механизм безопасной отправки и timing, если он понадобился в шаге 1, применять согласованно; не вводить второй механизм.
- Сравнить все mail/no-mail ветки с управляемой SMTP-задержкой. Если синхронная отправка сохраняет существенный измеримый признак, выбрать минимальное безопасное решение в рамках existing architecture и уточнить эту revision до завершения. Не считать одинаковые sleep или случайный jitter доказательством; не создавать новый broker, ненадёжный background-thread или менять delivery guarantees без явного архитектурного решения.
- Сохранить CAPTCHA actions register/resend_code, лимиты и правильный confirm_registration. Не раскрывать существование аккаунта через доступные без доказанного кода соседние confirmation responses; если такая ветка найдена, зафиксировать точное исправление без общей переписи auth.

**Готовность:** регистрация/resend не раскрывают account state публичным ответом/интерфейсом; существенные вычислительные и mail timing-различия проверены и обработаны; новые регистрации и activation продолжают работать.

### 3. [x] Проверить исправление и регрессию

**Файлы:** wwwhypda-backend/tests/test_password_reset_privacy.py; новый tests/test_auth_enumeration.py; existing auth/terms/recaptcha tests только по затронутому контракту; frontend test script при необходимости.

- Synthetic active/unconfirmed/disabled/unknown: точное равенство status/JSON на initial/reset-resend; unknown/inactive не создают User/ConfirmationCode и не вызывают mail helper.
- Добавить матрицу failed login / register / confirmation resend. Для failed login проверить ровно одну реальную/dummy hash-проверку и отсутствие shortcut; для регистрации сопоставимый hash work, неизменность пароля/acceptance/registered_at дубликата. Проверить status/body/UI, ошибки SMTP, конкурентный duplicate и отсутствие ложных cookies/письма.
- Timing проверять серией повторных запросов в перемешанном порядке с контролируемыми медленными helpers, после общей CAPTCHA/валидации. Не выводить наличие сетевого exploit из одного шумного измерения и не выдавать равенство mock duration за production-проверку.
- Active получает код и инициирует mock отправку; SMTP error/отказ создания не раскрывают наличие аккаунта. Request не меняет пароль или активность.
- Проверить incorrect CAPTCHA action/hostname, failure, invalid payload и rate limits. Это не generic-success bypass.
- Valid confirmation меняет пароль; неверный/истёкший/использованный код не меняет; старые сессии отзываются. Сроки кодов, новый CAPTCHA verifier и retention не ломаются.
- Измерение с управляемой SMTP-задержкой не выдавать за реальный сетевой аудит. Повторить тест после выбранного timing-исправления.
- UI /login, /register и /forgot-password: корректный/неуспешный вход, новая/повторная регистрация, activation/resend, reset. Проверить неизменность всех guards/terms/adult выбора, отсутствие raw account errors. Для /forgot-password: одинаковые шаги/messages/countdown, ошибка/повтор/loading, обе темы и поддерживаемые размеры. При невозможности самостоятельной browser-проверки получить конкретную безопасную приёмку владельца и указать её источник; не считать недоступную проверку выполненной.

Команды из корня wwwhypda:

```text
docker compose --env-file .env.development build backend
docker run --rm --pull=never --network none -e TEST_AUTH_DATABASE_URI=sqlite:// --entrypoint python wwwhypda-dev-backend -m unittest tests.test_password_reset_privacy tests.test_auth_enumeration tests.test_auth_lifecycle tests.test_recaptcha_policy tests.test_terms_acceptance -v
docker compose --env-file .env.development run --rm --build --no-deps frontend npm run build -- --mode development
docker compose --env-file .env.development run --rm --no-deps frontend npm run lint
```

Тесты работают на отдельной synthetic SQLite, без рабочих volumes, Google и SMTP. Прежние несвязанные ESLint-ошибки допускаются только с отчётом и scoped ESLint изменённого файла; новые ошибки не допускаются. Реальная доставка OVH не критерий этого отдельного исправления.

### 4. [x] Зафиксировать результат и архивировать

**Документы:** журнал этого плана; docs/STATE.md; docs/BACKLOG.md; docs/rules/boundaries.md — добавить проверенный invariant запроса восстановления без копирования журнала.

- Записать файлы, тесты, результат UI/timing и известные пределы. Не объявлять этот фикс полной юридической готовностью сайта.
- После всех критериев перевести completed, переместить этот же план в docs/archive/004-password-reset-enumeration.md, поставить archived; STATE.active_stage:null, last_archived: архив 004.
- Не исполнять backlog, не запускать VPS и не делать commit/push. Итог — короткий отчёт и имя коммита.

## Критерии завершения

- [x] Reset initial/resend, регистрация/confirmation resend и failed login не раскрывают наличие/активность через status/JSON/UI.
- [x] Unknown/inactive не создают code/account и не отправляют письма; active recovery сохранён.
- [x] CAPTCHA/rate limits, confirmation code TTL/one-use, password/session security и регистрационные acceptance/registered_at инварианты не ослаблены.
- [x] Устранены hash-work shortcuts, значимые mail/no-mail timing различия проверены и обработаны; реальные успешные login/register/activation/reset работают.
- [x] Существенный timing риск проверен повторной серией и обработан по политике revision 4; random delay не является единственным исправлением.
- [x] Проверена ресурсная цена: ожидание не удерживает DB-lock/transaction, sender ограничен и очищается, выбранный budget обоснован; tests/build/UI-приёмка завершены.
- [x] Проверенный результат записан, единственный план архивирован по WORKFLOW.

## Изменение revision 3

По прямому запросу пользователя scope расширен на failed login, регистрацию и повтор кода активации. Revision 2 уже выполняется: имеющийся код, отметки и журнал сохраняются, status не возвращается в ready. Добавлены шаги 2.1/2.2 перед общей проверкой; номера старых шагов 1–4 сохранены, старые ссылки в журнале остаются понятными. Задачи OVH/VPS/другие циклы по-прежнему исключены. Имплементатор перед продолжением перечитывает revision 3, дополняет текущую реализацию и архивирует только после всей расширенной приёмки.

## Изменение revision 4

Уточнено по запросу пользователя о random ожидании: добавление случайной задержки не заменяет устранение различий вычислений/почты и проверку нескольких запросов. Добавлена общая политика elapsed-time/deadlines, ресурсных ограничений и статистической проверки. Особо выделен уже предложенный имплементатором reset-only subprocess 8s/общий 10s window: результаты и текст сохранены, но это решение требует проверки стоимости и не распространяется автоматически на новые области revision 3. Текущий status=in_progress, отметки и журнал не сброшены. Перед продолжением имплементатор читает revision 4; планнер код не меняет.

## Журнал выполнения

Revision 1: план создан 15.10.2026 после подтверждения unknown=404 / active=200 отдельным synthetic HTTP probe. Реализация не начиналась.

Revision 2: по последнему запросу пользователя план сокращён до одного исправления — initial/resend password reset. Внешняя почта, server rollout и остальные темы явно исключены. Выборочная защита reCAPTCHA/retention сохраняется. Меняется только документация плана; код не изменён. Ранее выполненных шагов нет.

Начало реализации 15.10.2026: инструкции/правила/план revision 2 прочитаны;
исходные изменения BACKLOG/STATE и новый stage сохранены. Найдены status/JSON
различия и синхронный send_auth_email без общей границы SMTP ожидания. Сначала
synthetic timing baseline; реальных SMTP/Google/working DB calls нет.
Имплементатор добавляет результаты сюда и отмечает [x] только после проверки.

## Итог

Реализована и локально проверена защита reset/resend, failed login, регистрации
и activation resend от раскрытия состояния аккаунта через публичный контракт,
hash shortcuts и известное mail/no-mail timing различие. Сохранены CAPTCHA,
rate limits, confirmation TTL/one-use, session security и acceptance/registered_at.

Проверки: 62 backend tests OK (4 PostgreSQL-only skips), отдельные 96 PostgreSQL
tests OK, новый fixture regression 1/1 OK, frontend handlers 4/4 OK, build OK.
Полный lint имеет прежние 59 errors/15 warnings; scoped сравнение с HEAD не
обнаружило новых замечаний. Браузерная приёмка получена от владельца на отдельном
synthetic стенде; собственного подключённого браузера нет. Timing/resource
измерения и пределы доказательств приведены в журнале ниже.

Все пункты завершены. План переведён completed и перемещён в архив со статусом
archived 15.10.2026. Работа только локально, без VPS/commit/push. Это не
production rollout, реальная SMTP-приёмка или полный аудит сетевых side channels.

Коммит реализации: fix(stage-004): prevent account enumeration in auth flows

Timing baseline 15.10.2026: isolated Docker/SQLite, mock sender sleep 0.2s:
unknown=404/0.005s, active=200/0.204s. Различие подтверждено. Минимальное решение
в рамках шага 1 уточнено здесь: только reset sender выполняется в изолированном
stdlib spawn subprocess, который HTTP handler дожидается не более 8s и при timeout
terminate/reap до ответа; общий account-independent window 10s после CAPTCHA.
Это не fire-and-forget/новая почтовая платформа, random sleep или очередь; новые
миграции/зависимости/worker service не нужны. Пауза детерминированная и ограничена
обоснованным delivery budget; цена — одинаковый loading до 10s. Все valid ветки
проходят этот же window; в TESTING допускается короткий тестовый budget. Код/SMTP
создаются только active; request/DB/OS scheduling side channels не объявляются
полностью устранёнными. Прочие email handlers сохраняют прежний helper. Проверки
deadline/process cleanup и управляемого timing обязательны перед закрытием шага.


### Проверенные изменения revision 4 — 15.10.2026

Прежний reset-only прототип 8s/10s, описанный выше, заменён после проверки
стоимости. Итоговая общая политика в `auth/password_reset_delivery.py`: 4s elapsed
от общей валидации/CAPTCHA для register/activation resend/reset, отправителю не
более 3s с резервом на завершение; failed login — отдельный elapsed floor 0.4s.
Не добавляется одинаковая задержка после разной работы. Random jitter не нужен.
Валидация, CAPTCHA и rate limits выполняются до account-specific работы.

Backend: `auth/authentication.py`, `auth/auth_models.py`, новый
`auth/password_reset_delivery.py`, `common/error_messages.json`.
Reset initial/resend имеют один 200/message; код/письмо только active. Ошибки
генерации и доставки нейтральны, rollback/log не содержат email, кода или тела.
Failed login делает одну реальную/dummy проверку; dummy hash создаётся один раз
при импорте, dummy никогда не авторизует. Register вычисляет один hash до lock и
использует его только для нового пользователя; дубликат сохраняет пароль,
acceptance, registered_at и права. Activation-коды разрешены только явно
незавершённым регистрациям (`registration_completed=False`). Административно
отключённые завершённые аккаунты не могут активироваться через старый код.
Legacy inactive с неизвестным `registration_completed=NULL` не активируются
автоматически: их история требует отдельной проверки оператором, без миграции
рабочих данных в этом цикле. Невалидные JSON/типы/длина, включая malformed
confirmation code, отклоняются до account lookup одинаково для всех адресов.

Frontend: `auth/forgotPassword.tsx`, `auth/registration.tsx`, frontend
`common/error_messages.json`. Общие neutral messages, step 2 и 30s countdown
для initial/resend; notice остаётся виден во время отсчёта. Pending/error/terms,
возраст, CAPTCHA actions, API instance, layout и themes сохранены. Login UI и
транспорт не менялись.

Тесты: новые `tests/test_password_reset_privacy.py`, `tests/test_auth_enumeration.py`,
`wwwhypda-frontendV2/scripts/test-auth-privacy.mjs`. В существующих
`test_terms_acceptance.py`, `test_recaptcha_policy.py`, `test_retention_cleanup.py`
обновлены только соответствующие mail mock targets и ожидания нового neutral
account-phase контракта; реализации retention/миграций не менялись.

Проверки из корня проекта:

- `docker compose --env-file .env.development build backend` — успешно.
- Команда SQLite из шага 3 — **62 tests, OK, skipped=4** (PostgreSQL-only).
  Проверены четыре состояния, оба reset action, CAPTCHA action/host/reuse,
  реальные rate limits, rollback, отсутствие phantom records/mail/cookies,
  confirmation TTL/one-use, изменение пароля и отзыв обеих старых сессий.
- `docker compose -p wwwhypda-stage004-tests -f deploy/testing/retention.compose.yml up --abort-on-container-exit --exit-code-from tests --attach tests`
  — **96 tests, OK**, включая реальные PostgreSQL locks/concurrent registration,
  acceptance, lifecycle и существующие retention-регрессии. Только тестовая БД
  в tmpfs; затем выполнен `down` этого проекта, рабочие volumes не подключались.
- Frontend build командой шага 3 — успешно; прежнее предупреждение chunk >500kB.
- `docker run --rm --pull=never --network none --entrypoint node wwwhypda-dev-frontend --experimental-vm-modules --test scripts/test-auth-privacy.mjs`
  — **4/4 OK**: реальные TSX handlers через Node VM, neutral step/countdown,
  pending/429, terms/adult, failed/success login. Это не браузерная проверка.
- Full lint: прежние **59 errors / 15 warnings**. Scoped ESLint двух изменённых
  TSX: по одному `react-refresh/only-export-components` (HOC) в каждом.
  `ESLint.lintText` исходных файлов из `git show HEAD:...` в том же Docker image
  подтвердил ровно те же два правила/числа. Новых scoped замечаний нет.

Timing после исправления: фиксированный seed 4, по 8 запросов каждой из четырёх
категорий, перемешанный порядок, 32 запроса на endpoint (128 всего). Управляемые
hash 12ms / SMTP 40ms, тестовые floors 40ms login / 120ms mail; проверяется разница
mean <35ms и median <30ms с запасом от шума. Последняя серия:

| Endpoint | Mean между категориями, ms | Median, ms | Максимальный tail, ms |
| --- | --- | --- | --- |
| failed login | 40.7–40.9 | 40.7–40.8 | 41.2 |
| register | 120.8–121.0 | 120.8–120.9 | 121.4 |
| activation resend | 120.8 | 120.8 | 121.0 |
| reset | 120.8–120.9 | 120.8–120.9 | 121.3 |

Baseline до исправления: unknown 404/5ms против active 200/204ms при SMTP 200ms.
Полный default floor проверен отдельно с управляемым SMTP: active и unknown
по 4.001s. Структурные tests отдельно доказывают число hash операций; mock timings
не выдаются за проверку реальной сети. Synthetic hash benchmark (5 wrong-password
проверок/формат, без рабочих hashes): scrypt:32768:8:1 median/max 68.2/71.6ms;
pbkdf2:sha256:260000 — 67.1/69.5ms; 600000 — 148.8/152.7ms;
1000000 — 246.6/257.9ms. 0.4s покрывает эти измеренные варианты с резервом,
но не любые исторические work factors/нагрузку; стоимость существующих hashes
не менялась и rehash при login не добавлен.

Ресурсы: spawn/log-mode три раза 0.429/0.431/0.407s, child CPU суммарно 1.265s;
`RUSAGE_CHILDREN.ru_maxrss` 105892KiB — максимум дочернего процесса за тестовый
процесс, не доказательство суммарного RSS всех workers. Mail budget 3s оставляет
резерв относительно измеренного spawn; 4s вместо исходных 10s уменьшает loading
на 60%. Реальная SMTP latency здесь не измерялась. Неудача/занятость sender
даёт тот же neutral ответ; доставка не гарантируется, очереди/retries не добавлены.

Не более двух SMTP child на Linux container, неблокирующие flock slots общие
между HTTP workers; empty lockfiles в /tmp без адресов/кодов. Перед sender/wait
транзакция и DB locks освобождены. Process deadline, terminate/kill/reap, отсутствие
оставшихся child и закрытие TCP при смерти supervising parent проверены реально
на loopback fake SMTP (без envelope/письма). В child передаются только mail config,
адрес и содержимое письма, без request/DB context. Реальный Google/SMTP не вызывался.

Цена доступности: sleep не расходует CPU активно, но занимает HTTP worker.
Один синхронный worker обслуживает не более ~0.25 valid mail-запроса/s при floor
4s (failed login ~2.5/s при 0.4s плюс остальная обработка). Остальные запросы на
занятый worker ждут; sender cap ограничивает дочернюю память, но не число спящих
HTTP requests. Существующие CAPTCHA/rate limits сохранены; это не load-test и
не доказательство достаточной production capacity. DB/OS stalls сверх floor и
неизмеренные historical hashes могут оставлять timing-признаки. После отдельно
разрешённого rollout нужны реальная SMTP latency и worker/load проверка; текущий
локальный результат не является аудитом всех сетевых side channels.

UI пока **не принят**. Доступных подключённых браузеров нет; создан opt-in
`tests/auth_privacy_preview.py`: только synthetic SQLite, фиксированный код 123456,
без SMTP/Google, отдельный 127.0.0.1:8082. Owner сообщил пустой экран и ошибку
`.map is not a function` в Search: отсутствующий API каталога получал HTML от
fallback fixture. Исправлен только fixture: каталог возвращает JSON [], неизвестные
API — JSON 404. JS/CSS MIME и HTTP-проверки проходят; owner повторно проверяет
именно `/forgot-password`. Не выдавать HTTP/VM checks за визуальную приёмку.
Рабочий localhost:8080, VPS, commit/push не затронуты. До конкретной UI-приёмки
шаги 2/2.2/3/4 и завершение остаются открытыми.

Заключительная статическая проверка: `git diff --check`, AST изменённых Python,
JSON словарей, UTF-8 и локальные ссылки — OK. Python tokenize подтвердил
сохранность всех прежних комментариев в изменённых auth-модулях. BACKLOG
синхронизирован с revision 4 и фактическим ожиданием browser acceptance.


Повторная UI-приёмка 15.10: owner подтвердил отображение формы и отправку для
owner/missing, но затем сообщил отказ подтверждения/входа. Отказ свежего кода
воспроизведён HTTP на 8082. Причина только fixture: постоянный код 123456 имел
несколько записей, verify_code выбирал старую истёкшую. Исправлен
`tests/auth_privacy_preview.py`: перед выдачей фиксированного synthetic кода
заменяется предыдущая запись этого адреса/типа, ORM identity синхронизируется.
Реальная генерация/проверка приложения не изменялась. Добавлен regression test
`test_preview_reissued_fixed_code_replaces_expired_copy`: истёкший fixed code →
повторная выдача дважды → один свежий код, verify=True. После исправления HTTP
цепочка: request 200 дважды, confirm 200 Password successfully updated, login
200 Successfully logged in; повторное подтверждение того же кода 401. Прежний
код теперь считается использованным; owner может войти на 8082 с synthetic
owner@example.test / DifferentPass2!. Ручная browser-приёмка ещё не завершена.


Приёмка владельца: после исправления fixed-code fixture пользователь сообщил
«окей логин работает» — подтверждён браузерный вход с новым паролем на 8082.
Новый isolated regression test повторной выдачи fixed code выполнен отдельно:
`docker run --rm --pull=never --network none -e TEST_AUTH_DATABASE_URI=sqlite:// --entrypoint python wwwhypda-dev-backend -m unittest tests.test_password_reset_privacy.PasswordResetPrivacyTests.test_preview_reissued_fixed_code_replaces_expired_copy -v`
— 1 test, OK (после синхронизации ORM identity без предупреждений). Это дополнение
к ранее успешной серии 62 tests, а не повторный запуск всей серии. `git diff --check`
после fixture исправления — OK. Остаются конкретная browser-приёмка новой/повторной
регистрации, activation/login и читаемость трёх форм в обеих темах/узком окне;
owner получил одну объединённую инструкцию. Архивирование пока не выполнено.


### Завершение и источник браузерной приёмки — 15.10.2026

Владелец подтвердил отображение reset-формы и отправку для owner/missing;
после исправления fixture — «окей логин работает» с новым паролем. Затем:
«получилось зарегаться и войти preview-new@example.test» — новая регистрация,
активация и вход подтверждены. На объединённую последнюю проверку повторной
регистрации, neutral notice/step/countdown и читаемости login/register/reset
в обеих темах/узком окне ответил «да», уточнив отказ повторной активации 123456.
Отказ ожидаем: уже активированный аккаунт не получает новый activation code,
использованный код не восстанавливает аккаунт и не создаёт второй с тем же email.
Это owner acceptance, не самостоятельный просмотр агентом и не утверждение о
проверке всех браузеров. Ранее записанные ожидания UI-проверок выше — история;
эта запись фиксирует окончательный результат.

Реальные запросы подтверждения/смены пароля/входа дополнительно проверены HTTP
на synthetic 8082; malformed/error/expiry/resend/pending/terms guards проверены
автоматически. Рабочий localhost:8080 не обновлялся и не использовался для тестов;
актуальные исходники и Docker образы готовы локально. Synthetic данные и bundle
на 8082 удаляются вместе с временным стендом после приёмки. STATE, BACKLOG,
README, boundaries и индекс архива синхронизированы с архивом 004. Для дальнейшего
production rollout остаются описанные SMTP latency/capacity проверки; они не
входят в завершённый локальный цикл и не исполнялись.

Финальный контроль после архивирования: все checkboxes закрыты, status archived,
completed 2026-10-15, active_stage null, ссылки/UTF-8/AST/JSON и git diff --check
прошли. Временные wwwhypda-stage004-preview (container),
wwwhypda-stage004-preview-ui (volume), wwwhypda-stage004-preview-net (network)
удалены, отсутствие подтверждено Docker lists. Рабочие контейнеры и volumes
не удалялись. Stand 8082 после приёмки закрыт. Commit/push/VPS не выполнялись.
