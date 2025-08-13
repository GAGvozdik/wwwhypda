
## Задача

Исправить ошибку

### 1. Описание

Мои тесты ломаются, в частности первый тест в тестировании регистрации cypress

### 2. Файл для изменения

- **Путь к файлу:** `wwwhypda-frontend\cypress\e2e\registration.cy.ts`

### 3. Код ошибку с cypress

```python
should successfully register a user, confirm email, and see success message on login pagefailed
should display an error for invalid username formatpassed
should display an error for a password that does not meet requirementspassed
should display an error when registering with an email that already existsfailed

    test body
        1
        requestPOST 500 http://localhost:5000/users/

CypressError
cy.request() failed on:

http://localhost:5000/users/

The response we received from your web server was:

> 500: Internal Server Error

This was considered a failure because the status code was not 2xx or 3xx.

If you do not want status codes to cause failures pass the option: failOnStatusCode: false

-----------------------------------------------------------

The request we sent was:

Method: POST
URL: http://localhost:5000/users/
Headers: {
"Connection": "keep-alive",
"user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:139.0) Gecko/20100101 Firefox/139.0",
"accept": "/",
"accept-encoding": "gzip, deflate",
"content-type": "application/json",
"content-length": 110
}
Body: {"name":"existinguser1755048339158","email":"existinguser1755048339158@example.com","password":"Password123!"}

-----------------------------------------------------------

The response we got was:

Status: 500 - Internal Server Error
Headers: {
"server": "Werkzeug/3.1.3 Python/3.11.8",
"date": "Wed, 13 Aug 2025 01:25:40 GMT",
"content-type": "application/json",
"content-length": "113",
"access-control-allow-origin": "http://192.168.154.231",
"access-control-allow-credentials": "true",
"vary": "Origin",
"permissions-policy": "browsing-topics=()",
"x-frame-options": "SAMEORIGIN",
"x-content-type-options": "nosniff",
"content-security-policy": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self' http://localhost:3000 http://192.168.154.231; font-src 'self'; object-src 'none'; frame-src 'none'; worker-src 'self'; form-action 'self'",
"referrer-policy": "strict-origin-when-cross-origin",
"connection": "close"
}
Body: {
"data": null,
"error": "'NoneType' object has no attribute 'email'",
"message": "Something went wrong"
}
Learn more
cypress/e2e/registration.cy.ts:68:8

  66 |     const password = 'Password123!';
  67 |
> 68 |     cy.request('POST', 'http://localhost:5000/users/', {
     |        ^
  69 |       name: uniqueUsername,
  70 |       email: existingEmail,
  71 |       password: password,
 

View stack trace

     Print to console

should successfully register, confirm, and then log infailed

test body

    1
    visithttp://localhost:3000/register
    2
    getinput[placeholder="Username"]
    3
    typeloginuser1755048340630

        (xhr)GET 200 http://localhost:5000/rocks/rock_type2
        4
        getinput[placeholder="Email"]
        5
        typeloginuser1755048340630@example.com
        6
        getinput[placeholder="Password"]
        7
        typePassword123!
        8
        getinput[placeholder="Confirm Password"]
        9
        typePassword123!
        10
        getbutton12
        11
        containsRegister
        12
        click{force: true}
        (xhr)POST 500 http://localhost:5000/users/
        13
        getinput[placeholder="Confirmation Code"]0
        14
        assertexpected input[placeholder="Confirmation Code"] to be visible

AssertionError
Timed out retrying after 4000ms: Expected to find element: input[placeholder="Confirmation Code"], but never found it.
cypress/e2e/registration.cy.ts:99:54

   97 |
   98 |     // Confirmation
>  99 |     cy.get('input[placeholder="Confirmation Code"]').should('be.visible');
      |                                                      ^
  100 |     cy.request({
  101 |       method: 'GET',
  102 |       url: `http://localhost:5000/testing/get-confirmation-code?email=${uniqueEmail}`,
 

View stack trace
```
