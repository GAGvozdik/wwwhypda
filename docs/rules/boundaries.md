# API, авторизация и сохранность данных

### 2. API и защита маршрутов

- Все HTTP-запросы к Flask выполнять через существующий Axios-instance из `wwwhypda-frontendV2/src/components/api.tsx`. Вызовы из компонентов через импортированный instance допустимы. Не создавать второй instance, прямой fetch или отдельный транспорт в обход этого файла без явного требования.
- Instance использует `VITE_API_BASE_URL`; не подменять его `VITE_BASE_URL`/`APP_BASE_PATH` из neurobaza. Новые endpoints и payload должны соответствовать реальному Flask API wwwhypda.
- Auth/session реализованы в `src/components/users/`: перед изменением изучить `useAuthCheck.tsx`, `tokenRefresh.ts`, `auth/`, `routes/` и только необходимые backend endpoints. Не создавать параллельную авторизацию и не считать refresh/interceptor-поведение neurobaza уже реализованным здесь.
- Сохранять существующий cookie/CSRF flow, `withCredentials`, CAPTCHA, redirects и guards. Не отключать защиту для устранения UI-ошибки; JavaScript не может удалить HttpOnly cookies.
- Frontend-validation улучшает UX, но не заменяет backend-validation. Права на просмотр, редактирование и административные действия определяются сервером; скрытые элементы и React guards не обеспечивают защиту API.
- Не выводить в консоль токены, cookies, пароли, секреты, полные auth/network error objects или чувствительные тела запросов/ответов. Пользователю показывать безопасное сообщение из общего словаря.

### 7. Сохранность кода и пользовательских данных

- Запрет удаления существующих комментариев действует также для закомментированных импортов, вызовов, TSX, SCSS и временно отключённых блоков. Не удалять их как cleanup/unused; отдельное требование пользователя рассматривается отдельно.
- Сохранять `src/components/tree/`, его связи с поиском и состоянием Redux, временно отключённые компоненты/маршруты и код для дальнейшей разработки. Не переносить отсутствующий каталог моделей neurobaza.
- Не очищать и не переименовывать localStorage-ключи, не терять черновики и таблицы измерений из Redux/localStorage вне задачи. При изменении структуры хранения предусмотреть совместимость/миграцию и проверить reload, переходы между шагами ввода и восстановление данных.
- Не менять backend, Docker/Nginx, Redux, API layer, темы и соседние компоненты ради попутного улучшения. Для frontend-only задачи читать backend только в объёме необходимого API/проверки расхождения.

### Защита auth от раскрытия аккаунтов

- Валидные request/resend восстановления после CAPTCHA имеют одинаковый 200 и
  нейтральное сообщение независимо от состояния адреса; реальные reset-коды и
  письмо разрешены только active. Отказ генерации/SMTP не раскрывает аккаунт.
- Failed login делает одну реальную либо заранее подготовленную dummy hash
  проверку; dummy не даёт сессию. Register делает один hash до DB lock, дубликат
  не меняет пароль, права, registered_at или acceptance. Activation/resend
  разрешены только явно незавершённой регистрации, без восстановления disabled.
- Общий monotonic elapsed floor после валидации/CAPTCHA: 4s для register/resend/reset,
  0.4s для failed login; ожидание без DB transaction/locks. SMTP выполняется
  синхронно ожидаемым изолированным Linux child с deadline до 3s, cleanup/reap и
  container-wide cap 2. Нейтральный ответ не обещает доставку. Не заменять это
  одним random sleep и не объявлять устранёнными все сетевые timing side channels.


### Публичный каталог Search — цикл 006

- GET /rocks/search?rock_type_id=<ID>&parameter_id=<ID|all>, через Axios params;
  X-Recaptcha-Token с прежним expected action search и глобальными rate limits.
  Lookups без CAPTCHA, JWT-only /rocks/samples и старый /samples/<int>/<int> сохранены.
- Корень определяется уникальной top-level записью (parent=-1) с точным нормализованным
  generic earth material, включая декоративные дефисы/регистр/пробелы; используется
  её фактический rt_id, числовой sentinel не вводится. В UI только label All rock types,
  исходное rt_name/ID/Redux не переименовываются; другие папки не включают потомков.
- Корень снимает фильтр пород; all снимает фильтр параметра. Одна строка на измерение,
  повторы/нули/error/null сохраняются. All включает образцы без измерений, все Measure
  поля у них null. row_id measure:<id> или sample:<id>:no-measure; единый набор ключей:
  прежний Measure.to_dict плюс id_Sample/sample_name/rt_id/rt_name/param_name/parameter_code/units/row_id.
- Некорректные/отсутствующие/дублированные/лишние query значения 400, неизвестный ID 404,
  известные без результатов 200 [], SQL/неоднозначный корень 500 без внутренних деталей.
  В запросах только публичные Sample/Measure/Rock_type/Parameter; users_db/InputData не участвуют.


### Stage 009: защищённая continuation и manual maintenance
- User.login(allow_pending=True) разрешён только login endpoint: один real/dummy
  hash, recheck User/account_version под прежним common/User lock. Inactive +
  completed is False + правильный пароль ->409 email_confirmation_required, без
  JWT/cookies/PII/SMTP. Disabled/NULL/wrong/unknown neutral404, floor.4s вне tx.
- RegistrationLimit/users_db — additive migration auth.migrate_registration_limits
  apply/check до новых routes; не DML/backfill/reset acceptance. 5wrong/current
  challenge;3issues/15min через initial/duplicate/resend вместе, общие DB locks
  между workers/IP. Один current registration code, reset codes не изменяются.
  Wrong attempt commit, activation/consume/guard delete atomic; expiry2min, permitted
  new issue сбрасывает wrong budget, window15min. Public resend neutral200/4s.
- Ручной flag только filesystem/operator CLI; readonly Nginx status не имеет setter.
  Gates до каждого ordinary proxy/SPA location; API503 code site_maintenance,
  legal/PDF/assets/ACME исключения без backend. Не обходить rate limits/security/TLS.
  SPA использует прежний Axios и отдельное неаккаунтное состояние; при manual503
  guards сохраняют прежний auth state, после off делают обычный recheck.


### Stage 010: серверный отзыв сессий и reset budget
- AuthSession в users_db связывает access/refresh одной сессии через случайный sid;
  JWT без sid требуют нового входа. Проверяются принадлежность, срок и revoked_at.
  Logout отзывает только текущую сессию, deactivate/password change/reset — все.
  Activate старые сессии не восстанавливает. Роль по-прежнему берётся из БД.
- POST /users/refresh/logout использует прежний refresh cookie path и refresh CSRF,
  работает при истёкшем access. Подпись/type/expiry/CSRF обязательны; повторный
  logout идемпотентен. Cookies очищаются только после успешного DB commit.
  Logout frontend завершает protected request epoch, сохраняя Redux/drafts.
- ResetLimit хранит общий для workers/IP бюджет: 3 выдачи/15min и 5 неверных
  проверок текущего challenge. При допустимой выдаче остаётся один reset-код;
  successful reset атомарно меняет hash, удаляет все reset-коды и отзывает сессии.
  TTL2min/CSPRNG/нейтральный200/4s сохранены. Unknown/disabled не получают state.
- auth.migrate_security_state additive apply/check до нового backend и cleanup.
  Две таблицы/FK/index/check constraints, без DML/backfill истории. Очистка сессий
  только после refresh expiry; удаление User очищает связанные state записи.

### Новые пароли регистрации/сброса — 30.10.2026

-15–128 Unicode code points, любые корректные Unicode/пробелы/спецсимволы; никаких
  composition whitelist/обязательных типов символов. Malformed surrogate отклонять.
- Не trim/normalize/truncate credentials. Login/повторное подтверждение прежнего
  пароля проверяют существующий hash без применения новой strength policy.
- Политика common/passwordPolicy.json и frontend src/common/passwordPolicy.json
  синхронна; cross-runtime test проверяет обе копии и messages. Базовая локальная
  common/repeated blocklist не заменяет полноценную базу утечек. Пароли наружу не отправляются.
- Подсказки регистрации/сброса соответствуют API; paste/autofill не ограничивать.
  При публикации обновлять frontend и backend вместе. Детали и результаты:
  ../artifacts/password-policy-2026-10-30.md. Выполнено без stage по прямому указанию владельца.