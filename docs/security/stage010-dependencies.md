# Зависимости stage010 — 18.10.2026

Inventory Python: stage010-dependencies.json, 36 непустых PyPI name/version queries,
OSV result count проверен, 0 advisory IDs для финальных pins. npm audit финального
lock: stage010-npm-audit.json, 0 vulnerabilities во всех категориях; промежуточные
18 сохранены отдельно (не финальный результат). Это база известных advisories,
а не доказательство отсутствия всех уязвимостей. CVE/GHSA/PYSEC aliases не складываем.

| Python runtime | До | После |
|---|---|---|
| Flask | 3.1.0 | 3.1.3 |
| Flask-Cors | 5.0.0 | 6.0.5 |
| idna | 3.10 | 3.20 |
| Jinja2 | 3.1.5 | 3.1.6 |
| PyJWT | 2.10.1 | 2.15.1 |
| python-dotenv | 1.1.0 | 1.2.4 |
| requests | 2.32.4 | 2.34.2 |
| urllib3 | 2.5.0 | 2.8.0 |
| Werkzeug | 3.1.3 | 3.1.9 |

Python requirements сохраняет исходную UTF-16 BOM. Flask/Werkzeug/Jinja/CORS
обрабатывают реальные HTTP/session/template/CORS boundaries, Requests/urllib3 —
исходящие CAPTCHA HTTP запросы; исключать эти обновления как dev нельзя.
PyJWT проверяет реальные токены. Обновлены также обнаруженные inventory idna и dotenv.
Primary references:
- [Flask](https://github.com/pallets/flask/security/advisories/GHSA-68rp-wp8r-4726)
- [Werkzeug](https://github.com/pallets/werkzeug/security/advisories/GHSA-29vq-49wr-vm6x)
- [Jinja](https://github.com/pallets/jinja/security/advisories/GHSA-cpwx-vrp4-4pq7)
- [urllib3](https://github.com/urllib3/urllib3/security/advisories/GHSA-2xpw-w6gg-jr37)

Browser runtime: Axios1.20.0, react-router-dom/react-router7.18.4; реальные Axios
API requests и SPA router используют их. Условия SSR/RSC advisories не переносим
на статическую SPA: production не запускает Node SSR/RSC request server. Тем не менее
поставлены исправленные версии, а не оставлена зависимость ради неприменимости
одного конкретного advisory.
[Axios advisory](https://github.com/axios/axios/security/advisories/GHSA-x97p-jq2g-jp4f),
[Router advisory](https://github.com/remix-run/react-router/security/advisories/GHSA-wrjc-x8rr-h8h6).

XLSX0.18.5 заменён official SheetJS CE0.20.3 tarball:
https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz . Версия и integrity закреплены
package-lock. [Официальная установка](https://docs.sheetjs.com/docs/getting-started/installation/bun/).
Package metadata установленного артефакта подтверждает Apache-2.0; лицензия и notices
сохраняются в дистрибутиве. Community, без платного AG Grid/нового сервиса. Приложение
экспортирует, не импортирует недоверенные Excel; parser-specific reachability этим
не утверждается, старая affected версия всё равно удалена. Проверен реальный
roundtrip125 строк, 0/null/Unicode/строка формулы без formula cell, исходные данные
не мутируются; экспорт не ограничен текущей страницей.

Build/test tooling: Vite6.4.4, Babel/PostCSS/browser targets, Sass/immutable,
source-map-js, js-yaml, humanfs, nanoid; Cypress и его request/zip/tmp/qs/uuid/
systeminformation цепочка — Node build/test tools, не browser server endpoints.
Уязвимости traversal/скачивания/локального файла могут быть важны на developer/CI
машине, поэтому выполнено targeted compatible lock update; npm audit fix --force,
новый major Cypress и сторонние PoC не использовались. Полные точные версии и
связи — в package-lock.json. После обновления финальный audit0, классификация не
служит исключением незакрытых достижимых advisories.
Docker frontend использует npm ci и CYPRESS_INSTALL_BINARY=0: Cypress binary не
нужен для статической сборки. Для отдельного Cypress запуска установить его
явно в предназначенном тестовом контейнере, не в production SPA image.

Проверки: backend auth/reset/session/migration/mail/retention suites, Nginx gate,
frontend59 tests, TypeScript/Vite build, export roundtrip, router/terms/CSRF/CAPTCHA.
Полный lint имеет прежние ошибки; baseline changed-file comparison:15→14 issues,
new0 (11 files). Нельзя называть это успешным full lint.
