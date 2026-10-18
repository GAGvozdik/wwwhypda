# Локальная браузерная приёмка 008

Это отдельный одноразовый стенд на http://localhost:8082. Он не использует env,
рабочую базу, почтовый ящик или SMTP. SQLite живёт только в памяти процесса.
Исходящие соединения Python запрещены. Временный recaptcha-frame отвечает test-token
только на этом стенде; production CAPTCHA и исходный frontend не изменены.
Это проверка юридических страниц и auth, а не Search/SMTP/reCAPTCHA провайдера.
Никакие реальные данные или пароли здесь не вводить.

## Запуск из корня wwwhypda

Нужны Docker Desktop Engine running и существующие dev frontend/backend образы.

~~~powershell
docker compose -p wwwhypda-stage008-preview -f deploy/testing/terms-preview.compose.yml run --rm --no-deps build
docker compose -p wwwhypda-stage008-preview -f deploy/testing/terms-preview.compose.yml up -d --no-deps web
~~~

Сборка копирует frontend в игнорируемый tmp/terms-preview и задаёт API /api.
Рабочий Nginx/БД на 8080 не пересобираются и миграции к ним не применяются.
Стенд привязан только к 127.0.0.1:8082; это не production server.

## Проверка Chrome и Firefox

В светлой и тёмной теме, обычном и узком окне (например 390px), с Tab/Space:

1. /privacy-policy, /cookie-policy, /user-agreement доступны без входа. Download PDF
   скачивает соответствующий читаемый документ 2026-10-16.1, а не HTML.
   На юридических страницах и от скачивания нет запросов Google/reCAPTCHA.
2. /login: current@example.test / Password1! входит привычно, затем Logout.
3. old@example.test / Password1!: первый Sign in открывает модальное окно текущей редакции с общим
   CustomCheckbox (unchecked), Accept and sign in пока недоступна. HTML/PDF ссылки открывают
   отдельную вкладку и сохраняют исходную форму. Decline возвращает на публичную
   страницу без выдачи доступа. Повторить вход, поставить галочку, Accept and sign in:
   доступ появляется после успешного ответа. После Logout повторный вход без галочки.
   Tab остаётся внутри модального окна, Space переключает чекбокс; Escape/backdrop
   закрывает окно без принятия и сохраняет поля login. При повторном Sign in галочка
   снова пустая. Во время запроса кнопки/checkbox/закрытие заблокированы.
4. unknown@example.test / Password1! проверяет отсутствующий исторический факт:
   тот же явный выбор, без выдуманной старой даты. Неверный пароль показывает
   Invalid email or password и не раскрывает требование принятия.
5. /__preview__/old-session создаёт только тестовую старую валидную сессию
   session@example.test и переводит на /account: guard возвращает на login,
   ordinary account недоступен, уведомление показано в ModalWindow; Logout и Delete
   account доступны без принятия. Sign in to review documents/Escape закрывают уведомление и дают форму
   входа без принятия, Updated documents открывает его снова. Для полного сценария
   введите здесь session@example.test / Password1!, после проверки credentials
   появится окно с документами и unchecked checkbox. Уже принятый old@example.test
   при повторном входе правильно не показывает галочку.
   Проверить отказ в диалоге удаления с неверным паролем и Cancel. Удалять реальные
   аккаунты нельзя. Для отдельной проверки удаления здесь можно использовать только
   disposable session@example.test, пароль Password1!: после перезапуска web этот
   вымышленный аккаунт восстанавливается. Refresh/direct API/CSRF/roles/история и
   конкурентные операции дополнительно проверяются изолированными автотестами.

Подтверждение актуальной редакции сохраняется только до перезапуска web.
Чтобы повторить сценарий старого принятия с нуля:

~~~powershell
docker compose -p wwwhypda-stage008-preview -f deploy/testing/terms-preview.compose.yml restart web
~~~

Это сбрасывает только память стенда. Рабочая база не затрагивается.

## Антивирус

Для localhost:8082 оставить AVG полностью включённым. Здесь нет TLS/IMAP/SMTP,
Google SDK и внешних вызовов. Новая проверка реальной почты для этой приёмки не нужна.
Не отключать проверку сертификатов, не обходить browser security interstitial,
не добавлять непроверенные корневые сертификаты. Если ошибка возникает на localhost,
сообщить URL и текст ошибки, не отправляя пароль или значения cookies.

## Остановка только стенда

~~~powershell
docker compose -p wwwhypda-stage008-preview -f deploy/testing/terms-preview.compose.yml down
~~~

Команда не останавливает рабочий dev stack и не удаляет mail-state volume.
