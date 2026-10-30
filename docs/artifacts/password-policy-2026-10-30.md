# Исправление правил паролей — 30.10.2026

Прямое поручение владельца: выполнить небольшое исправление без нового плана.
STATE/архив011 не изменялись. Работа локальная; VPS, публикация, реальные письма,
commit/push и браузерные проверки не выполнялись.

## Результат

Причина отказа: frontend допускал8–64 и широкий набор символов, backend только8–20
и @$!%*#?&. В частности, underscore и hyphen проходили frontend, но отвергались API.
Новые пароли регистрации/сброса теперь имеют одинаковые правила:

-15–128 Unicode code points (JS Array.from, Python len), без обязательных сочетаний
  uppercase/lowercase/цифр/знаков. Разрешены все корректные Unicode scalar characters,
  включая пробелы, ASCII punctuation, дефис и underscore; malformed surrogate отклоняется.
- Пароль не обрезается, не trim/normalize: исходная последовательность хешируется
  точно. NFC не внедрялась, чтобы не менять семантику существующих credentials.
- Небольшой локальный список очевидных паролей и полное повторение одного символа
  отклоняются. Это базовая blocklist, не полная база утечек и не заявление о полном
  соответствии всему OWASP/NIST. Новых сетевых обращений для проверки паролей нет.
- Existing login/повторное подтверждение удаления не используют новую length/strength
  policy: прежние8–20-символьные пароли и хеши продолжают работать без миграций.
- Подсказка показана заранее в регистрации и сбросе, связана aria-describedby;
  autofill/paste разрешены, autoComplete=new-password сохранён. Сброс валидирует локально
  до отправки, backend остаётся обязательной проверкой.

Источник: OWASP Authentication Cheat Sheet, проверено30.10.2026:
https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
Минимум15 без MFA, максимум хотя бы64, Unicode/whitespace, отсутствие composition
rules, поддержка менеджеров и блокировка common/breached перечислены источником.
Полное breached-password screening и strength meter в это небольшое исправление не
включены; существующие rate limits/CAPTCHA, хеширование, CSRF и сессии сохранены.

## Файлы

- common/passwordPolicy.json и frontend src/common/passwordPolicy.json — одинаковые
  min/max и локальный список; синхронность проверяется cross-runtime тестом.
- backend auth/password_policy.py, auth/validate.py; frontend common/passwordPolicy.ts,
  users/auth/validation.tsx, registration.tsx, forgotPassword.tsx, users.module.scss.
- Общий и frontend error_messages.json: точные ошибки и подсказки. Обновлён только
  source hash словаря в public/legal/manifest.json; версии/PDF/юридические тексты прежние.
- Новые backend/frontend tests; в существующих fixtures регистрации/сброса обновлены
  только новые credentials. Старые короткие credentials оставлены для legacy-login.

## Проверки

Docker frontend build/legal/TypeScript/Vite: pass (прежнее предупреждение large chunks).
node --experimental-vm-modules --test scripts/test-password-policy.mjs
scripts/test-auth-privacy.mjs scripts/test-account-session.mjs scripts/test-recaptcha-scope.mjs:
30/30 pass. Новый тест покрывает каждый ASCII special symbol,15/128 границы,
Unicode code points/emoji, spaces, malformed Unicode и локальную blocklist.

Backend, с frontend src/common mounted read-only at /frontend-common:
python -m unittest tests.test_password_policy tests.test_auth_lifecycle
 tests.test_pending_login tests.test_password_reset_privacy:
43 run,40 pass,3 PostgreSQL skips. Проверена синхронность policy/messages, настоящие
register/reset/login/delete endpoint сценарии на isolated SQLite/mock CAPTCHA/mail,
включая128-character Unicode и сохранение leading/trailing spaces.

Дополнительно python -m unittest tests.test_terms_acceptance tests.test_terms_login
 tests.test_registration_limits tests.test_security010 tests.test_auth_enumeration:
86 run,64 pass,22 PostgreSQL skips; включая auth enumeration/timing/session regression.
PostgreSQL concurrency/migration матрица не запускалась и не считается пройденной.

Full frontend lint:55errors/14warnings, без новых (два прежних regex escape errors
исчезли вместе со старой password regex). Scoped helper/validation без ошибок;
у registration/forgotPassword остаются две прежние only-export-components ошибки HOC.
Новые браузерные проверки не выполнялись по указанию владельца; git diff --check pass.

## Публикация и ручная проверка владельца

Нужно одновременно доставить frontend и backend с common/passwordPolicy.json:
одного Vercel frontend deploy недостаточно, старый сервер продолжит отвергать символы.
После публикации проверить Firefox-generated password, hyphen/underscore, passphrase,
короткий отклонённый новый пароль, reset и вход со старым. Пароли не присылать в чат
и не записывать в логи. На сервер агент не заходил, данные/схема не менялись.