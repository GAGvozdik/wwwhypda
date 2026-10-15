# Оценка воздействия reCAPTCHA на защиту данных — цикл 003

Дата: 14.10.2026. Версия: 1. Область: реализованная локальная v3/legacy SiteVerify
интеграция wwwhypda. Controller: Georgii Gvozdik, Milan, Italy;
контакт без CAPTCHA: wwhypda@gmail.com. Подготовлено имплементатором по исходникам,
официальным документам и сведениям владельца. Это перспективная оценка конкретного
сценария, не аудит внутренних систем Google, не production-приёмка и не утверждение,
что риски отсутствуют. Факты и собственные оценочные выводы разделены ниже.

## 1. Операции, люди и данные

Точный перечень actions/endpoints и guards — в
[assessment](recaptcha-assessment.md); наблюдения владельца — в
[browser-check](recaptcha-browser-check.md). Google загружается после явного
search/login/register/confirmation/resend/password-reset действия. Начальные
справочники, session checks, legal pages и authenticated read/submit/delete
исключены из CAPTCHA-scope. В локальном цикле 005 SDK перенесён в отдельный
same-origin iframe, создаваемый при явном действии; уход с маршрута отменяет
очередь и удаляет весь browsing context без reload основной оболочки. Возврат
не загружает Google до нового действия. Это lifetime isolation, не защита от
злонамеренного same-origin SDK; произвольную невозможность доступа к parent
и удаление сохранённых cookies не утверждаем. Новое устройство может менять
доступный Google interaction context/score; dev-проверка не заменяет production
оценку эффективности и false positives.

Затронуты посетители поиска и люди, использующие account security functions.
Регистрация рассчитана на взрослых; возраст посетителя поиска не установлен,
поэтому возможное присутствие несовершеннолетних не исключается. Нет решения
о профессиональной/финансовой пригодности человека. Научные данные и account
password/email не включаются нашим сервером в SiteVerify: он отправляет token
и secret. Во внешнем браузерном скрипте консервативно учитываются IP, device/
browser attributes, interaction signals, page context и security identifier.
Отсутствие дополнительных browser-сигналов не предполагается.

Наблюдение владельца: Google cookie со сроком около 180 дней, HttpOnly/Secure;
это не срок внутреннего хранения сигналов и не двухминутный token TTL. Exact
provider retention каждого сигнала не опубликован в проверенных источниках:
применяются ограничение назначения и договорные правила удаления, а не
выдуманный единый срок. Число production-посетителей и частота false positives
не измерялись. Оценка не использует предполагаемый малый трафик как основание
исключить мониторинг или риск.

## 2. Основание, необходимость и соразмерность

Отдельная пофункциональная оценка законного интереса и технического исключения
находится в итоговом разделе assessment. Интерес — предотвращение автоматического
злоупотребления явно запрошенной функцией, защита аккаунтов и доступности выборок.
Контракт Google ограничивает Customer Data security/fraud/abuse целями; это
проверено публичными условиями и аккаунтным уведомлением владельца. Оно не
распространяется на consumer Gmail и все иные продукты Google.

Реализованная минимизация: explicit lazy load, отсутствие токенов фоновых checks,
endpoint-bound action, exact hostnames, fresh single-use tokens, отсутствие token
storage/cache и provider-response logging. Provider ошибки не дают обход защиты.
JWT/CSRF/ownership/password/rate limits сохраняются. Запросы к внешнему скрипту
нельзя считать анонимными лишь из-за recaptcha.net или отсутствия cookie.

## 3. Screening DPIA и автоматического решения

За основу взяты [Garante 467/2018](https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/9058979)
и [EDPB](https://www.edpb.europa.eu/topics/accountability-and-compliance-tools/data-protection-impact-assessment_en).
Scoring, systematic monitoring и ограничение попытки доступа учитываются
консервативно как применимые критерии; оценка выполнена вместо заявления
«DPIA не нужна». Остальные критерии проверены отдельно:

| Критерий | Оценка текущей интеграции |
| --- | --- |
| Scoring | Да, anti-bot score используется для отказа попытке. |
| Решение с правовым/аналогично значимым эффектом | Такой эффект по функции сайта и коду не установлен; это не автоматическая оценка права, работы, кредита или страхования. |
| Systematic monitoring | Да, технические/interaction signals и постоянный cookie; не исключать по названию security. |
| Highly personal/special-category data | Наш SiteVerify не передаёт их; page context внешнего скрипта рассматривается как риск, не как доказанно пустой payload. |
| Large scale | Production-объём неизвестен; оценка не полагается на отсутствие этого критерия. |
| Matching datasets | Сайт не объединяет CAPTCHA score с научными/профильными наборами. Внутренние security models Google не аудировались; действует purpose restriction. |
| Vulnerable people | В публичном поиске возможны; нет персонализации по возрасту и сбора возрастных документов через CAPTCHA. |
| Novel technology | Существующая v3 интеграция; это не самостоятельная причина исключить остальные риски. |
| Impeding access | Да, конкретный search/auth request может быть отклонён; нельзя считать это безвредным лишь из-за возможности retry. |

Art.22: в текущем сценарии значимый юридический/аналогичный эффект не установлен,
поэтому отдельное исключение Art.22(2) или blanket consent в User Agreement
не вводятся. Это оценка контекста, не правило для любой CAPTCHA. Постоянная
блокировка человека, зависимость трудовых/учебных прав от сайта или иное существенное
влияние требуют пересмотра до такого использования. Контакт для оспаривания доступен
без CAPTCHA, независимо от состояния аккаунта. Не обещается мгновенное автоматическое
получение доступа после обращения.

## 4. Риски и реализованные меры

Шкала оценки: вероятность и тяжесть 1–3; произведение 1–2 — низкий, 3–4 — средний,
6–9 — высокий. Числа являются экспертной перспективной оценкой по приведённым
основаниям, не измеренной статистикой атак/ошибок. До мер учитывается прежний
широкий scope; после — фактический локальный код и договорные ограничения.

| Риск для человека | До мер | Реализованные меры и основание остаточной оценки | После мер |
| --- | --- | --- | --- |
| Неожиданный сбор при чтении сайта/работе с черновиком | 3×2=6 | Google не монтируется до explicit action; legal/read/session/submit/delete исключены. Код/queue tests и owner observations. | 1×2=2 |
| Идентификация/повторная связь действий внешним security cookie | 3×2=6 | Scope только защитных операций; contractual security purpose, отсутствие рекламы/аналитики в коде, disclosure и browser controls. Persistent identifier остаётся; это существенный остаточный privacy risk. | 2×2=4 |
| Передача page/device context вне ЕЭЗ | 3×2=6 | Нет server payload научных данных/email/password; HTTPS, CDPA и механизм передач, уведомление. Передача технических сигналов остаётся, EU-only не обещается. | 2×2=4 |
| Ложный отказ человеку, в том числе privacy browser/shared network | 3×2=6 | Отказ отдельной попытке, не permanent account ban; retry, CAPTCHA-free contact и human review. Не предполагается, что retry всегда успешен. Права и юридическая информация доступны отдельно. | 2×2=4 |
| Разглашение token/secret или неверный допуск | 2×3=6 | Endpoint action/hostname/score, prod startup guards, no secret/response logs, expiry/reuse Google; synthetic negative tests. | 1×3=3 |
| Outage/quota исключает доступ или даёт ложный допуск | 2×2=4 | Bounded wait, safe error, server fail-closed включая quota fallback, повторная попытка/контакт. Автоматическое отключение защиты не применяется. | 2×2=4 |
| Невозможность воспользоваться правами из-за CAPTCHA | 2×3=6 | Контакт/Privacy/Cookie доступны без provider; authenticated delete без дополнительной CAPTCHA, сохраняет JWT/password/CSRF. | 1×3=3 |

Остаточный риск оценивается как средний для ограниченного описанного использования.
Это вывод оценки, а не утверждение о фактической безошибочности Google или его
внутренней модели. Высокий риск после перечисленных мер по данному сценарию
не выявлен; основание для prior consultation по Art.36 сейчас не установлено.
При выявлении устойчивого существенного ограничения доступа, иных целей передачи
или неэффективности гарантий нельзя продолжать использовать эту оценку как
разрешение: остановить расширение режима и пересмотреть mitigation/consultation.

## 5. Получатели, передачи и controls

Google — processor Customer Data по уведомлению аккаунта с 02.04.2026. Применяются
Cloud Terms/CDPA/Service Specific Terms, а не consumer Privacy/Terms для CAPTCHA.
Перечень subprocessors/возможных мест — [официальный список](https://cloud.google.com/terms/subprocessors);
это разрешённые участники, не доказательство получения каждой компанией каждого
сигнала сайта. CDPA допускает facilities worldwide. Для EU/EEA→US опубликован
[Alternative Transfer Solution](https://cloud.google.com/terms/alternative-transfer-solution)
с DPF; для иных restricted transfers действуют соответствующие условия SCC
в Appendix 3. EU-only processing не предполагается. Это оценка договорного
механизма, не трассировка конкретного дата-центра.

Control criteria: [CDPA](https://cloud.google.com/terms/data-processing-addendum)
§§6,9,11 — доступ/удаление с учётом возможностей услуги, помощь по rights requests,
уведомление о новых subprocessors. Для не предоставленного console control
обращаться через Cloud Support/Data Protection Team; удаление key или browser
cookie не выдавать за стирание всех provider records. Запросы поддержке не отправлялись.
Не установлена console-кнопка индивидуального удаления всех raw signals;
право на обращение/договорная помощь сохраняются. Сведения о трансферах/copy of
safeguards доступны по обращению к controller, как описано в Privacy Policy.

## 6. Порядок human review и пересмотра

Оператор принимает обращение на опубликованную почту без CAPTCHA. Запрашивает
минимальные несекретные сведения о действии/времени/ошибке и соразмерно проверяет
личность, если затронут аккаунт/данные. Password, token, cookie value, secret или
полный HAR не запрашиваются. Проверяет availability/quota/config/false-positive
причину, отвечает о результате и способе безопасно повторить действие; rights
requests рассматриваются по обычной процедуре, без требования пройти CAPTCHA.
Для возражения оценивает конкретную ситуацию и compelling grounds; автоматический
отказ по одному факту существования security interest недопустим. Human review
не означает выдачу чужих данных или отключение JWT/CSRF/ownership.

Владелец проверил Firefox, дал сведения ключа/договора и подтвердил поиск/уведомления.
Отдельного опроса всех будущих посетителей не проводилось: нет заявленного
представительного sample и пользовательских оценок false positives. DPO, если
назначен для оператора, привлекается по его обязанностям; назначение и мнение
DPO этим документом не выдумываются.

Пересмотр обязателен при новом scope/payload, analytics/advertising, смене provider
terms/subprocessors/transfer mechanism, иного масштаба/значимого назначения сайта,
устойчивых false positives или изменении retention/security поведения. На VPS
отдельно проверить соответствие production ключа двум доменам, allowlist, HTTPS/CSP,
квоту и фактический Network. Deployment и его проверка не выполнены в локальном цикле.

## 7. Вывод и границы

Оценка воздействия выполнена для локального prospective scenario; риск не нулевой,
постоянный Google identifier и передачи признаны явно. Минимизация и перечисленные
локальные guards уже реализованы, не обещаны будущей задачей. Итоговое решение
по lawful basis/cookie exemption — в assessment; DPIA его не заменяет. Необходимость
дополнительных мер пересматривается при указанных изменениях. Этот документ не
подтверждает весь GDPR сайта, consumer Gmail или безопасность production deployment.

Источники/дата доступа: 14.10.2026. [GDPR Art.22,35–36](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32016R0679),
[Google FAQ](https://docs.cloud.google.com/recaptcha/docs/faq),
[Service Specific Terms §46](https://cloud.google.com/terms/service-terms),
[EDPB: necessity/менее вмешивающиеся альтернативы](https://www.edpb.europa.eu/news/edpb-adopts-opinion-on-processors-guidelines-on-legitimate-interest-statement-on-draft_ga).
Шаблон EDPB 2026 на опубликованной странице ещё описан как consultation template;
он не выдан за обязательный окончательный стандарт.


## Техническое уточнение цикла 005

Локальная реализация описана в [browser-check](recaptcha-browser-check.md).
MainWindow не исчезает при смене scope; сообщения action/token проходят bridge
с exact origin/source, ограниченными request IDs, deadline/cancel, без account
payload и логирования токена. Google работает только в создаваемом по действию
дочернем документе; после ухода он удаляется. Same-origin sandbox не объявляется
полной границей доверия. Browser/score/provider поведение на VPS не проверялось;
перед отдельно разрешённым rollout остаются hostname/action/score, CSP/Network
и оценка существенных false positives. Оценка правовых оснований всего сайта
этим UI-циклом заново не утверждается. Исторические наблюдения 003 сохраняются.
