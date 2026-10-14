# Оценка reCAPTCHA — цикл 003, revision 2

Дата проверки источников/кода: 14.10.2026. Оператор: Georgii Gvozdik, контакт
wwhypda@gmail.com. Итоговая документальная оценка выполнена; минимальная локальная browser-карта
завершена по результатам владельца 15.10.2026. Текущий вывод — ограниченный technical security-only
режим по итоговой таблице ниже. Это аргументированная оценка конкретного сценария,
не заключение регулятора и не production-приёмка. Предыдущие промежуточные выводы
ниже сохранены как история; актуальны разделы «Итоговое решение» и DPIA.

## Карта исходной интеграции (до минимизации)

Префикс backend через Nginx — /api. Provider react-google-recaptcha-v3 монтируется
App.SiteContent сразу при посещении перечисленных девяти routes, с useRecaptchaNet.
Это загрузка api.js и потенциальная обработка browser-сигналов, отличная от
явного execute и backend siteverify. Не доказано, что Google не делает ничего
до явного execute. На остальных страницах provider отсутствует; переход границы
перезагружает документ, но не удаляет уже сохранённые cookies. JWT/CSRF/ownership
и Flask-Limiter действуют независимо от CAPTCHA.

| Route / роль | Запрошенная функция / момент execute | Action → endpoint | Реальная серверная защита / источник |
| --- | --- | --- | --- |
| /search, посетитель | mount дерева и списка параметров; выбор параметра/породы | rock_type → GET /rocks/rock_type; parameters → GET /rocks/parameters; search → GET /rocks/samples/{rock}/{parameter} | CAPTCHA + общие rate limits, без JWT. search.tsx/MainTree и rocks_bp.py |
| /login, посетитель | submit входа; затем лишний check | login → POST /users/login; check_auth_after_login → GET /users/check | CAPTCHA/password + login rate limit; check дополнительно JWT/current account/version. auth/login.tsx, authentication.py |
| /register, взрослый посетитель | submit, подтверждение, resend | register → POST /users/; confirm_registration → POST /users/confirm-registration; resend_code → POST /users/resend-confirmation | CAPTCHA/rate limits/validation/consent version; confirmation code TTL/verification. registration.tsx/authentication.py |
| /forgot-password, посетитель | запрос, resend, подтверждение | request_password_reset и resend_password_reset → POST /users/request-password-reset; confirm_password_reset → POST /users/confirm-password-reset | CAPTCHA/rate limits + active account, одноразовый код/TTL, password validation. forgotPassword.tsx/authentication.py |
| /input, активный пользователь | guard session check; mount справочников; до открытия modal подачи | check_auth → GET /users/check; get_measurement_data → GET /rocks/parameters + JWT-only qualities/experiment_types/interpretation_methods; get_sample_data → GET /rocks/rock_type + JWT-only fracturations/scales; submit_data → POST /input/submit | JWT/current account/version и CSRF на POST; CAPTCHA только parameters/rock_type/submit; authors запрещены. inputPage/steps/Measurements/MeasurementSample/ProtectedRoute/inputData.py |
| /account, активный обычный пользователь | ProtectedRoute и SuperProtectedRoute checks; delete submit | check_auth → GET /users/check; delete_account → DELETE /users/me | checks JWT; deletion JWT/current password/CSRF/CAPTCHA/rate limit. AccountDeletion/guards/authentication.py |
| /superaccount, администратор | guard session check; delete submit; admin actions без execute | check_auth; delete_account; остальные admin endpoints CAPTCHA не требуют | JWT и актуальная роль; deletion password/CSRF/rate limit; admin routes не освобождаются от guards. superProtectedRoute/admin.py |
| /read, владелец либо администратор | guard session check; mount тех же справочников | check_auth/get_measurement_data/get_sample_data; submit_data handler при completion state | GET /input/get_input_by_id/{id}: JWT + ownership/role. Обычная readonly-кнопка Finish уводит в /account; сохранённый completion state может открыть общую submit-ветку, поэтому read handler также учитывается. InputPageRead/stepper/inputData.py |
| /edit, администратор | guard session check; mount справочников; submit editing проверяет готовность CAPTCHA без execute | check_auth/get_measurement_data/get_sample_data; POST /input/complete/{id} без токена | JWT/role/CSRF. Строка submit_data в inputPageEdit закомментирована и не исполняется. InputPageEdit/steps/inputData.py |

Дополнительно: useAuthCheck выполняется каждым guard (на /account два guard).
useTokenRefresh содержит check_auth_after_refresh, но его импорт и вызов в
MainWindow закомментированы; карта фиксирует существующий неактивный hook, не
утверждает фактический timer. Logout POST /users/logout, refresh POST /users/refresh,
профиль, чтение/удаление заявок и админские действия не имеют самостоятельной
CAPTCHA-проверки. Сохраняются их существующие guards. CAPTCHA search не означает,
что все GET к каталогу защищены: /rocks/anonce уже публичный без токена.

## Данные и участники

Browser отправляет Google сетевые и технические/interaction-сигналы; IP виден
получателю запроса. Token/action не содержат идентификатор пользователя в нашем
коде. В siteverify сервер отправляет только secret и token (remoteip не отправляет),
проверка — отдельный server request. Email, пароль, JSON научной заявки нашим
verifier не передаются Google. Это описание payload кода, не гарантия отсутствия
browser-сигналов/страничного контекста у внешнего скрипта. Browser domain chain
recaptcha.net/gstatic.com и возможные дополнительные домены требуют наблюдения.
Не объявлять recaptcha.net независимым от Google сервисом.

## Проверенные публичные условия / недостающий факт аккаунта

Используемый клиентский режим по коду — v3 api.js/execute, backend — legacy
SiteVerify, а не CreateAssessment. Google допускает legacy-интеграции в Cloud
(FAQ/terminology); это не требует автоматической миграции кода или платной услуги.
Label используемой записи: wwhypdatestdeployversion. Владелец сообщил тип v3;
само название графика Score overview не является отдельным подтверждением типа.
Скриншот Google Cloud Key details показывает эту запись; скриншот Edit key
подтверждает Domain list: wwhypdatestdeployversion.it и
www.wwhypdatestdeployversion.it, Disable domain verification выключен
(проверка доменов включена), AMP выключен. Владелец подтвердил оба адреса для
production. Это подтверждённые настройки записи и намерение владельца, не
проверка DNS/VPS или соответствия секретов dev/prod данной записи. Получено адресованное
владельцу уведомление Google о смене договорного режима с 02.04.2026 (см. ниже).

Cloud Terms действуют при принятии/согласовании и имеют исключения (offline/reseller,
Starter Tier). CDPA включён в соответствующее соглашение; не искать отдельную
кнопку подписи CDPA. Наличие dashboard само по себе не доказывает применимое
соглашение. Владелец предоставил текст письма Google Cloud «[Legal Update] Google
transitions to data processor for reCAPTCHA starting Apr 2, 2026», в списке писем
дата 5 Feb (год в списке не отображён; вступление изменений явно 02.04.2026).
Письмо сообщает этому клиенту применение Cloud Data Processing Addendum,
изменение Service Specific Terms, processor-роль Google и удаление consumer
Privacy/Terms отсылок для reCAPTCHA. Дополнительное принятие CDPA в письме не
требуется; обязательное действие — обновить ссылки сайта. Это аккаунтное
подтверждение заявленного провайдером режима, согласующееся с текущим FAQ;
повторно искать отдельную подпись CDPA не требуется. Исходная дата принятия
Cloud Terms не восстановлена, но больше не используется как единственный
блокирующий факт при наличии данного уведомления. Источник — предоставленный
владельцем текст письма, не самостоятельный доступ агента к почте. Письмо
не подтверждает конкретные страны обработки, cookie-сроки или consent-exemption.

FAQ Google (обновлён 13.10.2026), data processing: с 02.04.2026 Customer — controller,
Google — processor Customer Data; переработать disclosures, consumer Privacy/Terms
не являются обязательными ссылками CAPTCHA. FAQ допускает скрытый badge с сообщением
«This site is protected by reCAPTCHA». _GRECAPTCHA заявлен для security risk analysis;
это позиция провайдера, не отдельное освобождение сайта от consent.

Service Specific Terms (12.10.2026), §46: использование только fraud/abuse,
ограниченная security-цель Customer Data, не персонализированная реклама.
CDPA (08.06.2026), §§4–6,9–11 и Appendix 3: processor/controller, ограниченные
инструкции, доступ/удаление средствами услуги, subprocessors, возможная обработка
в странах присутствия и механизмы международной передачи. Сроки исполнения
указаний удаления — договорные пределы (до 180 дней, после окончания также recovery
до 30 дней), а не установленный срок хранения каждого сигнала/cookie. Точный срок
внутреннего хранения текущей интеграции не установлен. Подтверждённые country/transfer
гарантии конкретного аккаунта и доступные controls пока не зафиксированы; SCC/иные
основания необходимо сверить с применимым договором, не заменять словом DPF.

## Первоначальный выбор минимизации по функциям (до уточнения пользователя; правовой вывод условный)

| Действие | Риск и дополнительные меры / альтернативы | Минимальный выбранный объём |
| --- | --- | --- |
| login | Распределённый credential stuffing; password/rate limits не ограничивают всю распределённую автоматизацию; DDoS не доказывает легитимность account attempt. Альтернативы: только per-IP лимит либо отдельная MFA (новая система вне плана). Реальная статистика атак не предъявлена. | Оставить CAPTCHA только при явном submit, без post-login/background execute. Security-исключение требует подтверждения договора/наблюдений. |
| register/confirmation/resend | Автоматические аккаунты, почтовые запросы и угадывание кода; rate limits/TTL/one-use/validation сохраняются, CAPTCHA не заменяет их. Только per-IP лимит слабее против разных источников. | Оставить endpoint-bound действия при явной отправке формы; Google не нужен при простом посещении страницы. Правовой вывод условный. |
| password reset/request/resend/confirm | Злоупотребление почтовой функцией, автоматическое угадывание; rate limits/TTL/active user/password validation остаются. | Оставить explicit actions, одинаковый endpoint принимает только request/resend reset actions, а не arbitrary action. Правовой вывод условный. |
| search/справочники/read | Публичные научные GET и приватный GET с JWT/ownership; necessity дополнительной Google-обработки не установлена относительно Nginx/Flask limits и действующего контроля доступа. | Убрать provider и execute, соответствующие public read CAPTCHA-gates; JWT-only endpoints не делать публичными. |
| session check/check after login/refresh | JWT/current account/version доказывают сессию, добавочный поведенческий сигнал для read проверки не обоснован. | Убрать CAPTCHA на /users/check и в hooks, сохранить JWT/role/revocation и cookie flow. |
| authenticated submit/edit/delete | Изменение собственной заявки или аккаунта уже имеет JWT/current account, CSRF, ownership/role; delete дополнительно password и rate limit. CAPTCHA не определяет права, дополнительная necessity не показана. | Убрать CAPTCHA при сохранении перечисленных проверок. Не менять записи, retention, roles и drafts. |

Момент загрузки: только после явной попытки оставленного auth-действия; provider
не должен подключаться при посещении search/account/input/read/edit или при GET
session check. После загрузки Google может собирать сигналы до конца текущего
auth-документа; переход из auth-группы должен прерывать document execution reload.
Строго техническое исключение оценивается отдельно от GDPR legitimate interests,
по конкретному явно запрошенному действию и действительному объёму. Само желание
не иметь баннер юридическим основанием не является. Исходный девятимаршрутный режим
нельзя объявить полностью exempt. Окончательный вывод до получения договорных и
browser-фактов не принят; stage нельзя архивировать на одной этой таблице.

## Исходные дефекты verifier и требования к проверкам (история)

Исходный helper принимал success/score, но только логировал hostname/action.
Не проверял точный endpoint action/domain, формат score и production disable.
Локальное исправление начато: fixed expected actions, exact hostname allowlist,
finite numeric score и безопасные журналы. Нужны synthetic HTTP/regression tests,
затем повторная browser-карта. Google SiteVerify отвечает за invalid/expired/reused
токены; время cookie и собственный cache его не заменяют.

## Источники (дата доступа 14.10.2026)

- [Google FAQ, §§cookies/badge/data processing; updated 13.10.2026](https://docs.cloud.google.com/recaptcha/docs/faq).
- [Cloud Terms, начало/определения URL Terms, 12.10.2026](https://cloud.google.com/terms) — текущая доступная редакция; принятие аккаунта не подтверждено.
- [CDPA, §§4–6,9–11, Appendix 3; 08.06.2026](https://cloud.google.com/terms/data-processing-addendum).
- [Service Specific Terms §46; 12.10.2026](https://cloud.google.com/terms/service-terms).
- [Google legacy terminology](https://docs.cloud.google.com/recaptcha/docs/reconcile-legacy-terminology) и [migration overview](https://docs.cloud.google.com/recaptcha/docs/migration-overview) — обновлены 09.10.2026 и 13.10.2026 соответственно.
- [Subprocessors](https://cloud.google.com/terms/subprocessors) — опубликованный список; отдельное подтверждение применимости к текущему аккаунту открыто.
- [Garante, cookie/other tracking guidelines, §§4–5; 10.06.2021](https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/9677876): техническое исключение строго связано с необходимой явно запрошенной услугой; иные цели требуют согласия. Оно касается также иных идентификаторов, не только cookies.
- [Google v3, actions/placement, updated 10.07.2024](https://developers.google.com/recaptcha/docs/v3) и [SiteVerify, Token Restrictions, updated 14.10.2024](https://developers.google.com/recaptcha/docs/verify): action проверяется backend, token одноразовый и действует две минуты; execute непосредственно при действии.
- [GDPR, Regulation 2016/679, HTML](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32016R0679): итоговая HTML-версия доступна и сверена, включая Art.22/35–36; прежняя попытка через другой URL вернула защитную страницу.

Browser-факты и ограничения ведутся в [recaptcha-browser-check.md](recaptcha-browser-check.md), не дублируются как собственные наблюдения.


## Локальная минимизация реализована (итоговая карта кода, не browser-приёмка)

Provider eligible после уточнения пользователя: /search, /login, /register, /forgot-password. До явной попытки execute
Google provider не монтируется. После нажатия, custom request context загружает
существующий react-google-recaptcha-v3 provider с recaptcha.net в отдельной
соседней ветке, не пересоздавая MainWindow/формы. Очередь ждёт готовности до 15s,
не кэширует token, каждый action выполняется один раз, повторный ready не создаёт
повторных токенов, уход из документа отклоняет pending callbacks. После load
Google может продолжать security processing внутри auth-документа; это остаётся
browser-фактом для оценки, не обещанием нулевого сбора.

| Конечное действие | Execute/action | Endpoint | Момент/защита |
| --- | --- | --- | --- |
| sign-in | login | POST /users/login | После submit, затем /users/check без Google; password/rate + exact verifier |
| register | register | POST /users/ | После validation/submit; adult/terms-version/validation/rate + exact verifier |
| registration confirmation | confirm_registration | POST /users/confirm-registration | После submit; code/TTL/one-use/rate + exact verifier |
| registration resend | resend_code | POST /users/resend-confirmation | Кнопка resend с существующим countdown/rate + exact verifier |
| reset request/resend | request_password_reset / resend_password_reset | POST /users/request-password-reset | Explicit request/resend; endpoint принимает только эти два action, active user/rate |
| reset confirm | confirm_password_reset | POST /users/confirm-password-reset | Submit кода/нового пароля; code/TTL/one-use/validation/rate |
| search | search | GET /rocks/samples/{rock}/{parameter} | После явного submit поиска; exact verifier/rate limits, не фоновый execute |
| rock_type/parameters/lookup/session/read | Нет execute/provider | Прежние GET /rocks и /users/check | Начальные справочники public с прежними limits; JWT-only GET сохраняют JWT/ownership/role |
| authenticated submit/edit/account delete | Нет execute/provider | Прежние /input и DELETE /users/me | Существующие JWT/CSRF/role/ownership; delete также current password/rate. Retention не менялся |

Версия User Agreement 2026-10-14.2 не изменяется: cookie blanket-consent в договор
не добавлен, изменены только Privacy/Cookie Policy и CAPTCHA notice. Gmail-раздел
consumer Privacy/Terms сохранён. Для будущей production hostname policy владелец
подтвердил wwhypdatestdeployversion.it и www.wwhypdatestdeployversion.it.
Production-конфигурация не изменялась; dev default localhost/127.0.0.1 не является
prod allowlist. На скриншоте этой записи localhost не указан; соответствие dev-ключа
данной записи не проверялось, ключи/env не читались.

## Первоначальный Art.22 / DPIA screening (история; заменён полной оценкой ниже)

Эффект кода: автоматический отказ конкретной auth-попытке по score, без постоянной
блокировки аккаунта, решения о работе/кредите/страховании или отказа в privacy-правах.
Контакт для human review открыт без CAPTCHA/аккаунта. Это ограничивает возможный
эффект, но не доказывает автоматически неприменимость Art.22: фактическая длительность
ложных отказов и возможность ручного рассмотрения должны быть подтверждены.

По [Еврокомиссии, права людей](https://commission.europa.eu/law/law-topic/data-protection/information-individuals_en)
Art.22 касается исключительно автоматических решений с правовым либо аналогично
значимым эффектом. Для описанного необязательного научного сервиса такой эффект по
коду не установлен; это конкретная оценка, не общее исключение CAPTCHA.

[Garante, provvedimento 467 от 11.10.2018](https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/9058979)
и WP248 screening учитывают scoring, systematic monitoring и возможное ограничение
доступа к услуге; несколько критериев — индикатор высокого риска. Для security
score нельзя просто написать «DPIA не нужна»: параметры мониторинга текущего Google
режима, retention/controls и реальный масштаб/эффект ещё не установлены. Large-scale,
чувствительные категории, уязвимые группы и cross-dataset matching нашим CAPTCHA
payload не вводятся; это не подтверждает внутренние операции Google. Если screening
выявит высокорисковый сценарий/обязательную категорию, закончить DPIA в этом цикле
до утверждения готовности либо изменить объём по явному решению владельца.
[Еврокомиссия, обязанности/DPIA](https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/obligations_en).

Текущее решение: техминимизация и server checks выполнены, а договорный критерий,
полный browser-объём и окончательный Art.22/DPIA/exemption не закрыты. Это условия
завершения stage 003, не future backlog после готового запуска.


Уточнение пользователя 14.10.2026: CAPTCHA внедрялась в том числе для поиска,
регистрации, логина и сброса пароля. На auth-действиях она не отключалась; с поиска
первоначально снята при выборе минимизации, затем восстановлена на самой операции
GET /rocks/samples/{rock}/{parameter}, с action=search и всеми verifier guards.
Начальные lists/lookup и session checks остаются без Google. Ключевой риск поиска —
распределённые массовые запросы к выборке измерений, расход DB/server ресурсов;
OVH/Nginx/per-IP limits не классифицируют всё распределённое поведение. Это модель
риска, а не предъявленная статистика атак. Защита сохраняется по требованию
владельца; желание владельца само по себе не доказывает technical cookie-exemption.
Для search окончательные necessity/proportionality и browser/contract факты остаются
обязательными критериями этого цикла. Предыдущая строка о снятии search в
первоначальной таблице — история выбора, не описание итогового кода.


Дополнительная сверка Google migration overview (§Billing and enforcement,
13.10.2026): legacy SiteVerify может при исчерпании квоты вернуть success=True,
score=0.9 и сообщение об ошибке. Verifier поэтому отклоняет и такие ответы при
непустых error-codes/error, не считает их полноценной оценкой риска. Тесты имитируют
quota response без настоящих assessments. Billing не включался/не менялся;
оператору требуется контроль доступности/квоты перед выпуском. Источник:
[официальный migration overview](https://docs.cloud.google.com/recaptcha/docs/migration-overview).


## Промежуточная сверка готовности к архивированию — 14.10.2026 (история)

Получены пользовательские подтверждения: production-домены/проверка доменов,
тип v3, адресное уведомление Google о CDPA; Firefox cookie после auth/search
действий, визуальная приёмка Privacy/Cookie/footer и успешный поиск; обычные GET
без CAPTCHA на Privacy/Cookie после reload. Проверки и ограничения browser-фактов
собраны в browser-check. Эти результаты снимают перечисленные прежние вопросы,
но не устанавливают автоматически правовую готовность оставленного CAPTCHA-scope.

Оценка рисков: Google risk score является scoring; постоянный security cookie и
interaction signals требуют рассмотрения systematic monitoring; отказ по score
ограничивает конкретную попытку доступа к поиску/аккаунту. Нельзя без анализа
исключить сочетание критериев DPIA. Garante 467/2018 рассматривает два и более
критерия как указание на высокий риск. По имеющимся фактам окончательный вывод
о неприменимости DPIA не установлен; если критерии применимы, необходима DPIA,
а не замена её подтверждением успешного поиска.

Риски прав и меры: передача технических сигналов внешнему получателю — explicit
lazy scope/CDPA/disclosure/no payload; ложный отказ — retry и открытый контакт,
без постоянного server ban; фоновые сигналы после активации — reload при уходе
из группы; длительное сохранение идентификатора — наблюдаемое около 180 дней,
браузерное удаление и публичное уведомление. Эти меры снижают риск, но не доказывают
строгую необходимость всего объёма/срока обработки для каждого действия. Контакт
для human review доступен, однако конкретный механизм восстановления доступа
после устойчивого false positive и фактический масштаб/мониторинг не установлены.

Итоговый статус: техническая реализация и перечисленные проверки готовы локально;
режим без согласия для всего оставленного scope не объявлен установленным.
Шаги 4, итоговая часть 6 и 7 сохраняются открытыми. В частности, для поиска
нужен обоснованный предел Google-обработки в сравнении с менее вмешивающимися
антиавтоматизационными средствами; принадлежность cookie к security и желание
сохранить CAPTCHA не заменяют этот анализ. Не требуется выдумывать статистику
прошлых атак. Полная DPIA/окончательное necessity решение не выполнены этой записью.
Если подтвердить допустимый режим без согласия не удаётся, решение об ином режиме
или изменении цели принимает владелец с фиксацией revision по активному плану;
полноценная consent-система не добавляется имплементатором самовольно.


## Итоговое решение по функциям — 14.10.2026

Вывод исполнителя: для ограниченного реализованного security-only режима есть
аргументированное основание применять GDPR Art.6(1)(f) и техническое исключение
Art.122 итальянского Codice Privacy, отдельно друг от друга. Основание — конкретная
запрошенная функция, модель распределённого злоупотребления, минимизация и
договорное ограничение Customer Data security-назначением. Это вывод оценки;
не приравнивать его к решению Garante о любой reCAPTCHA или гарантии отсутствия
штрафов. Прежние условные таблицы больше не являются окончательным решением.

[Garante §§4–5](https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/9677876)
допускает техническое исключение в строго необходимом объёме явно запрошенной
услуги, с информированием. Само отсутствие рекламы, название cookie или legitimate
interest не заменяют этот тест. Ни ранняя загрузка на всех страницах, ни токен
для каждой JWT-проверки этим выводом не оправдываются.

### Тест законного интереса и альтернативы

Интерес конкретен: сохранить безопасный доступ к аккаунту/кодам и доступность
запрошенной выборки, не оценивать пригодность или личные качества человека.
Профилактике не нужна выдуманная статистика прошлых атак. OVH anti-DDoS защищает
инфраструктуру, но не доказывает легитимность application request. JWT/CSRF
доказывают сессию/источник, ownership — права; они не распознают распределённую
автоматизацию публичного поиска/входа/регистрации. Per-IP limits дают объёмное
ограничение, но распределённые источники обходят отдельный IP; грубый общий лимит
может блокировать обычных пользователей вместе с атакой.

Оставленный риск-анализ добавляет независимую оценку automation. Только email
confirmation не останавливает массовую отправку писем до подтверждения;
password/MFA не защищают public registration/search и не заменяют защиту
кодовых попыток. Honeypot/задержка проще обходятся прямым API-клиентом и не дают
равной проверки; first-party challenge/Proof of Work возможен как иной проект,
но равная эффективность здесь не установлена, а нагрузка на device/accessibility
также требует оценки. Это сравнение механизмов, не benchmark их точности.
В соответствии с [EDPB necessity guidance](https://www.edpb.europa.eu/news/edpb-adopts-opinion-on-processors-guidelines-on-legitimate-interest-statement-on-draft_ga),
при появлении разумной равноэффективной менее вмешивающейся альтернативы
применимость этого выбора пересматривается.

Баланс: Google получает технические сигналы и постоянный security identifier;
это вмешательство в privacy даже без рекламы. Взамен защищается запрошенная
операция. Снижены scope/момент/повторные execute, не передаются дополнительные
server identity/data fields, не сохраняется score-профиль человека в БД сайта.
Нет permanent account ban по score; lawful requests/контакт доступны без CAPTCHA,
предусмотрены retry и human review. Ограничение конкретной попытки признано
в DPIA; оно не представлено как всегда безвредное. По совокупности мер баланс
для указанного security-сценария оценён в пользу ограниченного законного интереса.
Возражения рассматриваются индивидуально, не отклоняются автоматически.

| Действие | Угроза и предел иных мер | Решение по GDPR / устройству |
| --- | --- | --- |
| login | Distributed credential guessing/stuffing; password/limits не распознают automation всех источников. | Оставить после submit, Art.6(1)(f); техническая защита запрошенного входа, без post-login execute. |
| register | Массовые ложные регистрации и инициирование code mail; подтверждение следует после запроса. | Оставить после validation/submit; тот же GDPR security interest и technical exemption только этой попытки. |
| confirm_registration | Распределённое угадывание activation code; TTL/one-use/limits остаются, CAPTCHA дополняет. | Оставить отдельный endpoint-bound action при submit; без фоновых проверок ожидания кода. |
| resend_code | Распределённая нагрузка на email-code function, обход per-IP; countdown не server authorisation. | Оставить после кнопки resend, вместе с rate/countdown, не при показе формы. |
| request_password_reset / resend_password_reset | Code-mail abuse и нагрузка; active account/rate controls не дают полной automation классификации. | Оставить после явного request/resend; endpoint принимает только два соответствующих action. |
| confirm_password_reset | Угадывание кода/злоупотребление password-changing function. | Оставить после submit, с code TTL/one-use/password validation; не использовать score вместо кода. |
| search | Distributed expensive sample queries угрожают доступности выборок; per-IP/anti-DDoS не различают все distributed application requests. | Оставить только explicit samples query, Art.6(1)(f) и technical protection запрошенной выборки. Не загружать для дерева/parameters; не оправдывать scope желанием владельца или запретом легитимных научных обращений. |
| lookup/session/protected read | JWT/ownership и limits достаточны для данной операции; дополнительный Google-объём не обоснован. | CAPTCHA удалена; session cookies и исходные guards сохраняются. |
| authenticated submit/edit/delete | JWT/CSRF/ownership/role, delete также current password; CAPTCHA не определяет права. | Дополнительная CAPTCHA удалена, эти guards не заменяются score. |

### Объём и срок: какие условия входят в решение

Решение касается security risk analysis Customer Data под подтверждённым CDPA,
включая описанные Google security signals и _GRECAPTCHA. Не утверждается, что
recaptcha.net исключает Google-сбор. Данные/идентификатор провайдера используются
для защиты, а сайт не добавляет advertising/analytics/персонализацию или передачу
email/dataset в assessment payload. В исходниках нет дополнительных таких
интеграций. Сайт не управляет HttpOnly cookie Google и не обещает его сокращения.
Наблюдаемые около 180 дней раскрыты как browser-факт; внутренняя retention
оценивается по ограничению цели/договорным deletion criteria, не по token TTL.
Невозможность назвать точный дата-центр или срок каждого model signal не подменяется
ложной цифрой; для запросов действует contractual assistance/controller contact.

Security processing может продолжаться после первого execute в текущем документе
четырёх CAPTCHA-маршрутов: это явно включено в DPIA/уведомление, не объявлено нулевым
фоном. Уход к другим страницам прекращает документ, а не стирает уже созданный cookie.
Новая самостоятельная background/analytics цель не покрывается данным исключением.
Если реальные signals/purpose окажутся шире security, появятся дополнительные
cookies/third-party integrations или бессрочный monitoring вне этих границ,
использование этого вывода прекращается до пересмотра режима/минимизации/consent.

### Договор, передачи и DPIA: итог

Аккаунтное письмо, код v3/SiteVerify и настройки записи подтверждают applicable
Cloud processor-режим. [CDPA](https://cloud.google.com/terms/data-processing-addendum)
Appendix 4 GCP отсылает к опубликованному списку subprocessors; он проверен,
но не выдан за трассировку фактических получателей каждого сигнала. Facilities
могут находиться вне ЕЭЗ. [Alternative Transfer Solution](https://cloud.google.com/terms/alternative-transfer-solution)
публикует DPF для EU/EEA→US; иные restricted transfers регулируются механизмами
Appendix 3, включая применимые SCC. Это подтверждённый договорный framework,
не обещание EU-only. Доступные controls и путь обращения описаны в DPIA;
удаление key/cookie не выдано за полное уничтожение provider данных.

[Оценка воздействия](recaptcha-dpia.md) выполнена для текущего prospective scope,
с учётом scoring/monitoring/access effects, вместо неподтверждённого исключения
«DPIA не нужна». Остаточные privacy/availability риски оценены как средние после
реализованных мер. Art.22 significant effect для нынешней научной/account функции
не установлен; постоянный ban или значимые права/услуги изменили бы этот вывод.
Нельзя переносить его на credit/employment/essential-service решения.

### Локальная готовность и последующее включение

Документальная оценка готова, server/client минимизация и synthetic checks выполнены.
Минимальная browser-карта завершена результатами владельца 15.10.2026; её
результат и ограничения записаны отдельно и не заменяются этой правовой таблицей. Необходимость
consent не «устраняется» успешным поиском: аргументация выше самостоятельна.
При указанных подтверждённых границах выбран режим технической защиты без
дополнительного consent-banner; blanket consent в договор не добавлен.

Перед отдельным production-включением: secret/site key одной production записи,
exact allowlist [wwhypdatestdeployversion.it, www.wwhypdatestdeployversion.it],
enabled CAPTCHA, HTTPS/CSP, quota/availability и Network на действительных доменах.
Это будущая проверка иной среды, не утверждение о VPS в локальном цикле.
Изменение назначения/масштаба/термов/recipients/tracking/false-positive эффекта
требует пересмотра assessment/DPIA до расширения. Gmail/OVH email migration,
retention deployment и другие вопросы сайта не объявлены готовыми этим решением.


Завершение локального цикла: 15.10.2026. Получены последние результаты владельца
для главной/guest protected paths/перехода после Search; User Agreement работает.
Архив — [003](../../docs/archive/003-recaptcha-consent-assessment.md).
Существенных открытых критериев выбранной локальной оценки не осталось;
ограничения наблюдений, остаточные риски и условия отдельного production-включения
сохранены, не объявлены устранёнными. Полный аудит Google/всего сайта не выполнен.
