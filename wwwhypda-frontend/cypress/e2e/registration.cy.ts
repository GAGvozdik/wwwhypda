describe('Registration Flow', () => {
  it('should successfully register a user, confirm email, and see success message on login page', () => {
    // Генерируем уникальные данные для каждого запуска теста
    const uniqueId = Date.now();
    const uniqueUsername = `testuser${uniqueId}`; // Убрали '_', чтобы соответствовать валидации
    const uniqueEmail = `${uniqueUsername}@example.com`;
    const password = 'Password123!';

    // Шаг 1: Перехватываем запрос на регистрацию, чтобы дождаться его завершения
    cy.intercept('POST', '**/users/').as('registerRequest');

    // Шаг 2: Посещаем страницу регистрации
    cy.visit('http://localhost:3000/register');

    // Шаг 3: Заполняем и отправляем форму регистрации
    cy.get('input[placeholder="Username"]').type(uniqueUsername);
    cy.get('input[placeholder="Email"]').type(uniqueEmail);
    cy.get('input[placeholder="Password"]').type(password);
    cy.get('input[placeholder="Confirm Password"]').type(password);
    cy.get('button').contains('Register').click({ force: true });

    // Шаг 4: Ждем завершения запроса и *после этого* убеждаемся, что перешли на шаг подтверждения
    cy.wait('@registerRequest').its('response.statusCode').should('eq', 201);
    cy.get('input[placeholder="Confirmation Code"]').should('be.visible');

    // Шаг 5: Используем специальный тестовый эндпоинт для получения кода
    // Backend должен быть запущен в режиме TESTING=True
    cy.request({
      method: 'GET',
      url: `http://localhost:5000/testing/get-confirmation-code?email=${uniqueEmail}`,
    }).then((response) => {
      expect(response.status).to.eq(200);
      const confirmationCode = response.body.confirmation_code;
      expect(confirmationCode).to.exist;

      // Шаг 6: Вводим полученный код и подтверждаем
      cy.get('input[placeholder="Confirmation Code"]').type(confirmationCode);
      cy.get('button').contains('Confirm').click();

      // Шаг 7: Проверяем, что нас перенаправило на страницу логина
      // и появилось сообщение об успешной активации
      cy.url().should('include', '/login');
      cy.contains('Account successfully activated').should('be.visible');
    });
  });
});