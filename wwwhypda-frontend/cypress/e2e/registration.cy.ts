describe('Registration Flow', () => {
  it('should successfully complete the first step of registration and show the confirmation step', () => {
    // Генерируем уникальный email для каждого запуска теста, чтобы избежать конфликтов
    const uniqueEmail = `testuser_${Date.now()}@example.com`;

    // Шаг 1: Посещаем страницу регистрации
    cy.visit('http://localhost:3000/register');

    // Шаг 2: Находим поля и вводим данные
    cy.get('input[placeholder="Username"]').type('Test User');
    cy.get('input[placeholder="Email"]').type(uniqueEmail);
    cy.get('input[placeholder="Password"]').type('Password123!');
    cy.get('input[placeholder="Confirm Password"]').type('Password123!');

    // Шаг 3: Нажимаем на кнопку регистрации
    cy.get('button').contains('Register').click({ force: true });

    // Шаг 4: Проверяем, что мы перешли на второй шаг
    cy.get('input[placeholder="Confirmation Code"]').should('be.visible');
    cy.get('button').contains('Confirm').should('be.visible');
  });
});