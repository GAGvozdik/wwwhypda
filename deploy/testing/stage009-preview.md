# Stage009 — isolated owner acceptance (pending)

Only local disposable fixtures, no env files, working DB, real mail or Google.
AVG and browser protections remain fully enabled. Ports8082/8083 do not mean a
production deployment. Browser APIs are not connected to the implementer session;
owner observation is required before archiving009.

From repository root, build/start (the implementer prepares these before handoff):

```powershell
docker compose -p wwwhypda-stage009-preview -f deploy/testing/terms-preview.compose.yml run --rm --no-deps build
docker compose -p wwwhypda-stage009-preview -f deploy/testing/terms-preview.compose.yml up -d web nginx
```

Use http://localhost:8083/login for auth + maintenance together. Direct8082 is only
the fixture backend/static fallback and has no manual maintenance flag. Do not
use working accounts/passwords. Every fixture password is `Password1!`:
- `pending@example.test`: inactive, never confirmed, current acceptance.
- `current@example.test`: active/current documents.
- `disabled@example.test`: inactive/completed, cannot reactivate.
- `old@example.test`: active/previous documents, existing unchecked terms modal.

1. Pending correct login opens the SAME confirmation form as registration; no
   ordinary account session and no automatic mail. Wrong password/disabled/unknown
   gives Invalid email or password. Press Resend explicitly; current fixture code is shown at
   http://localhost:8083/__preview__/code after clicking «Показать актуальный код».
   Refresh that readout after EVERY Resend Code: previous code is invalidated.
   It also shows seconds remaining; no Inbox and no assumed fixed code. Each issue replaces the previous one,
   TTL2min, max3issues/15min including register;5wrong attempts require a later
   permitted new challenge. Fixture-only /__preview__/fixtures shows current test
   codes if you lose track. Enter one wrong code then current valid code. Activation
   returns to ordinary login with email intact; only that new login enters account.
   To test expiry leave one code for2min, then submit; request a new permitted code.
   No Inbox to check. Restart ONLY fixture web for a clean DB/counter set if needed.
   Current account enters normally; old account still reviews current documents.

2. http://localhost:8083/loading-fixture/index.html (такой же путь работает на8082).
   Не просто главная8082: откройте именно этот адрес. Кнопка «Показать загрузку»
   переключает реальные login/register/reset/confirmation, «Показать формы» возвращает
   их без потери ввода. «Сменить тему» — обе темы. Только auth contours/wave/центр
   LoadIcon: Search/tree/table больше не меняются. Размер/центр выводятся сверху.
   На /login и при /account до входа используется тот же реальный login skeleton;
   при проверке code/resend — именно confirmation skeleton.

3. Leave the actual login/register/input form with unsaved text open on8083. In
   PowerShell run the on command below; return focus to browser, or navigate/perform
   a request. Maintenance modal appears; no typing/submission behind it. Legal links
   open separately, PDF downloads work. A new tab8083 gives static503 page. Run off,
   press Try again: form and entries remain, nothing submits automatically. If
   session/code expires meanwhile, the ordinary guards/TTL still apply.

```powershell
python -B deploy/maintenance/control.py on --state-dir "$((Resolve-Path tmp/stage009-maintenance-state).Path)"
python -B deploy/maintenance/control.py status --state-dir "$((Resolve-Path tmp/stage009-maintenance-state).Path)"
python -B deploy/maintenance/control.py off --state-dir "$((Resolve-Path tmp/stage009-maintenance-state).Path)"
```

4. http://localhost:8083/__preview__/reminder — synthetic NO SEND subject/text:
   count3 and nearest date only, no private correspondence. This is not Inbox delivery.
   Policies/PDF show package2026-10-18.2; prior PDF files remain available.

Report browser(s), the3 main flows (confirmation/loading/maintenance), geometry
or console errors if present. Do not send real credentials or message contents.
After acceptance the implementer records owner results and archives009. To stop:

```powershell
docker compose -p wwwhypda-stage009-preview -f deploy/testing/terms-preview.compose.yml down
```

Only this disposable project stops. Do not add `--volumes` against any working
project or remove the owner's mail-state volume.

## Проверка непосредственно приложения на8082 (уточнение владельца)

Откройте http://localhost:8082/login и Ctrl+F5. Это само приложение с настоящими
формами; отдельная visual fixture не нужна. В preview backend намеренно добавлено
3секунды ожидания для auth POST и session check, чтобы состояние загрузки было
видно прямо при действиях. Только STAGE009_AUTH_DELAY_SECONDS=3 в disposable
Compose; production код и обычный dev backend не замедляются. Backend не
останавливается: формы продолжают реально проверять/подтверждать коды.

- До входа /account: сначала skeleton настоящего логина3сек, затем login.
- /login: current@example.test / Password1! — skeleton логина, затем account.
- /register: новый preview-new@example.test, уникальное имя и Password1!, обе
  галки — skeleton регистрации. При Resend Code/Confirm на следующем шаге —
  skeleton именно confirmation, email masked и Back link в continuation.
- /forgot-password: current@example.test — skeleton reset; на шаге кода актуальный
  код с purpose password_reset показывается в http://localhost:8082/__preview__/code.
  Новый пароль например NewPassword1! (только fixture).
- Для confirmation из login: pending@example.test / Password1!, Resend Code,
  тот же code inspector8082; при отправке кода видна confirmation wave/circle.

Вход+подтверждение и переотправка уже подтверждены владельцем. Новая проверка
только реальных loading состояний и оставшихся register/reset форм. Письма/Google
на стенде подставные, AVG не отключать. Restart fixture сбрасывает тестовую DB;
ни рабочие данные, ни реальные учётные записи не затрагиваются.
