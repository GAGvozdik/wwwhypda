describe('Registration Flow', () => {
  it('should successfully register a user using a test endpoint to get the confirmation code', () => {
    // Генерируем уникальные данные для каждого запуска теста
    const uniqueId = Date.now();
    const uniqueUsername = `testuser${uniqueId}`;
    const uniqueEmail = `${uniqueUsername}@example.com`;
    const password = 'Password123!';

    // Перехватываем запрос, чтобы дождаться его завершения
    cy.intercept('POST', '**/users/').as('registerRequest');

    // Шаг 1: Посещаем страницу регистрации
    cy.visit('http://localhost:3000/register');

    // Шаг 2: Заполняем и отправляем форму регистрации
    cy.get('input[placeholder="Username"]').type(uniqueUsername);
    cy.get('input[placeholder="Email"]').type(uniqueEmail);
    cy.get('input[placeholder="Password"]').type(password);
    cy.get('input[placeholder="Confirm Password"]').type(password);
    cy.get('button').contains('Register').click({ force: true });

    // Шаг 3: Ждем завершения запроса и *после этого* убеждаемся, что перешли на шаг подтверждения
    cy.wait('@registerRequest');
    cy.get('input[placeholder="Confirmation Code"]').should('be.visible');

    // Шаг 4: Используем специальный тестовый эндпоинт для получения кода
    // Backend должен быть запущен в режиме TESTING=True
    cy.request({
      method: 'GET',
      url: `http://localhost:5000/testing/get-confirmation-code?email=${uniqueEmail}`,
    }).then((response) => {
      // Проверяем, что эндпоинт отработал корректно
      expect(response.status).to.eq(200);
      expect(response.body).to.have.property('confirmation_code');
      const confirmationCode = response.body.confirmation_code;

      // Шаг 5: Вводим полученный код и подтверждаем
      cy.get('input[placeholder="Confirmation Code"]').type(confirmationCode);
      cy.get('button').contains('Confirm').click();

      // Шаг 6: Проверяем, что нас перенаправило на страницу логина
      // и появилось сообщение об успешной активации
      cy.url().should('include', '/login');
      cy.contains('Account successfully activated').should('be.visible');
    });
  });
});