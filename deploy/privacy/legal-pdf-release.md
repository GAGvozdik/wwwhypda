# Единый локальный комплект документов 2026-10-16.1

Три HTML React страницы остаются каноническим источником. Download PDF указывает
на public/legal/<slug>-<version>.pdf. Регистрация и login reaccept используют одну
редакцию с backend CURRENT_TERMS_VERSION/frontend USER_AGREEMENT_VERSION.
Изменение содержания любого документа требует новой общей версии, новых трёх PDF
и manifest. Старые выпущенные файлы, RELEASES hashes и acceptance facts не заменять.
Этот комплект ещё не опубликован; изменения VPS не выполняет агент.

## Воспроизводимая генерация и проверки

Нужны Node/esbuild из существующего frontend node_modules и build-only Python
reportlab==4.4.3. pypdf проверяет извлечённый текст, PyMuPDF==1.26.4 — renderer
для QA. Это локальные инструменты; Flask/Vite runtime не получают PDF dependencies.
Embedded шрифт — Bitstream Vera из ReportLab. A4, ссылки, списки, версия/дата,
номера страниц. UI Download исключён из PDF data-legal-download marker.

Команды из repo root:
~~~text
python -B deploy/privacy/build_legal_pdfs.py
python -B deploy/privacy/check_terms_release.py
node deploy/privacy/check_legal_pdfs.mjs
~~~

Генератор сначала рендерит настоящие React компоненты через ReactDOMServer/
MemoryRouter и esbuild в tmp/pdfs, затем структурно читает HTML через HTMLParser.
Нет regex extraction TSX/ручного копирования юридических абзацев/eval документов.
Полный извлечённый PDF текст сверяется с каноническим render с нормализацией
пробелов, list bullets и собственных page footers.
manifest содержит source hashes всех трёх страниц/общих источников и generator,
PDF SHA256/page count/content digest. npm run build до компиляции проверяет hashes
frontend источников и magic/checksum трёх PDF; полный root-check также сверяет
generator sources. Проверка не заменяет визуальный просмотр всех страниц.

Редакция сейчас: User Agreement 2 страницы, Privacy Policy 6, Cookie Policy 2.
После изменения текста обновить константы, RELEASES check_terms_release.py и PDF.
Проверить оба browser themes/узкое окно/Tab, доступность без аккаунта/CAPTCHA,
содержимое URL (%PDF-, application/pdf), корректный Vite base path.
Не считать 200/index.html от SPA fallback PDF.
Штатные build/lint команды — docs/rules/validation.md. Старые несвязанные lint
ошибки фиксировать отдельно; не менять научные формы ради зелёного full lint.

## История принятия и миграция

Новый ledger users_db.user_agreement_acceptances: user_id FK/cascade, version,
accepted_at UTC; unique(user_id,version). Старые User.terms_* остаются исходным
известным фактом и не переписываются. Миграция additive, без DML/backfill.
Повторное принятие idempotent. Время только server UTC, literal True + exactversion;
client timestamp/user identity не являются основанием acceptance.
Login после credentials/CAPTCHA запрашивает принятие до обычных JWT. Старые
active/refresh/direct endpoints возвращают terms_acceptance_required; logout и
самоудаление сохраняют JWT/active/version/CSRF/password checks без нового принятия.
Новый terms-status не вызывает accountDeletionEpoch/endAccountSession/удаление drafts.

Новая миграция:
~~~text
python -B -m auth.migrate_agreement_history
python -B -m auth.migrate_agreement_history --check
~~~

В этом цикле выполнять только в изолированной PostgreSQL fixture. Перед будущим
разрешённым rollout нужны применённые прежние terms/retention migrations,
новая history migration и успешный --check. Остановить старые auth/retention
процессы на время согласованного обновления и не смешивать worker разных редакций.
Backend/frontend/static PDF выкладываются согласованно. Старые cookies после
изменения пакета не должны открывать обычные APIs без явного принятия.
Никакие env/пароли не класть в repo или журнал.

## Граница почтовой части

Реальная owner-приёмка Zimbra пройдена, synthetic target удалён, оба controls
сохранены. Автоудаление поддержки запрещено из-за межпапочной гонки IMAP.
Публичный текст описывает ручную обработку, а не действующий auto timer.
Старый Gmail local guide и legacy переписка сохраняются.
План 008 остаётся активным до оставшихся обязательных проверок/решения архитектора.
