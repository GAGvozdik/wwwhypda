---
stage: 007
title: Локальная подготовка SMTP OVH
revision: 1
status: archived
created: 2026-10-16
completed: 2026-10-16
rules:
  - docs/rules/project.md
  - docs/rules/boundaries.md
  - docs/rules/validation.md
  - docs/rules/runtime-and-privacy.md
---

# Цель и границы

Прямое поручение владельца: подготовить локальный backend к OVH Zimbra Starter SMTP 465 SSL/TLS, сохранить библиотеку и авторизацию. Не читать/изменять env/пароль; не выполнять реальные письма, VPS, DNS, commit/push, IMAP/автоудаление, замену публичных договоров/контактов.

## Шаги

### 1. [x] Изучить документы и действующую отправку

Два PDF из родительской mail docks; относящиеся к SMTP положения зафиксированы в deploy/mail/ovh-smtp.md. Flask-Mail 0.10.0 подходит, резервного SMTP Gmail в Python-коде нет. Существующие MAIL_* сохраняются.

### 2. [x] Подготовить транспорт и валидацию

smtp_transport.py: VerifiedMail/VerifiedConnection сохраняют Flask-Mail, включают SSLContext с проверкой сертификата/hostname, timeout и отключённым protocol debug, без fallback. mainApp.py вызывает validate_mail_config; common_defenitions.py создаёт VerifiedMail. Auth endpoints/password_reset_delivery.py/БД/зависимости не изменены; deadline/supervision/cap сохраняются.

### 3. [x] Проверить и обновить документы

tests/test_smtp_transport.py проверяет OVH SSL/config/sender, local log mode, SSL/hostname, STARTTLS, отказ сертификата/login и отсутствие fallback. README и runtime правила ссылаются на инструкцию MAIL_*. Операторский статус отличает локальную подготовку от deployment и будущей очистки/замены публичных контактов.

## Критерии завершения

- [x] Существующие MAIL_* описаны; секреты и env не читались/не менялись.
- [x] Flask-Mail и auth-flow сохранены; сертификат/hostname проверяются, fallback отсутствует.
- [x] Синтетические SMTP tests и относящиеся auth regression tests прошли.
- [x] Локальная готовность отделена от реальной доставки, VPS и будущего IMAP/удаления.

## Журнал выполнения

16.10.2026. Windows, из wwwhypda-backend: `python -B -m unittest tests.test_smtp_transport -v` — 5 тестов OK.

Linux Docker: `docker run --rm --pull=never --network none --read-only --tmpfs /tmp -e PYTHONDONTWRITEBYTECODE=1 -e TEST_AUTH_DATABASE_URI=sqlite:// --mount type=bind,source=<абсолютный путь backend>,target=/code,readonly --workdir /code --entrypoint python wwwhypda-dev-backend -B -m unittest tests.test_smtp_transport tests.test_auth_lifecycle tests.test_password_reset_privacy tests.test_auth_enumeration -q` — 49 тестов, OK, skipped=3. Синтетическая SQLite, без сети/env_file/рабочих volumes. Пропущенные проверки PostgreSQL не заменяются этим прогоном; схема и DB-механика не менялись. Ожидаемые сообщения об отказах fixtures не являются ошибками реальной отправки. MainApp с настоящим env и реальные SMTP/IMAP не запускались.

## Итог

Подготовлена локальная SMTP-интеграция и инструкция. Проверки пройдены в согласованном объёме. Реальная доставка/очистка/почтовые backup/публичные документы и deployment — отдельные действия. Коммит не создан. Рекомендуемый коммит: `fix(stage-007): prepare verified ovh smtp transport`.
