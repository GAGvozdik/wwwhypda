import messages from '../../src/common/error_messages.json';

describe('Registration Flow', () => {
  it('should successfully register a user, confirm email, and see success message on login page', () => {
    const uniqueId = Date.now();
    const uniqueUsername = `testuser${uniqueId}`;
    const uniqueEmail = `${uniqueUsername}@example.com`;
    const password = 'Password123!';

    cy.intercept('POST', '**/users/').as('registerRequest');
    cy.visit('http://localhost:3000/register');

    cy.get('input[placeholder="Username"]').type(uniqueUsername);
    cy.get('input[placeholder="Email"]').type(uniqueEmail);
    cy.get('input[placeholder="Password"]').type(password);
    cy.get('input[placeholder="Confirm Password"]').type(password);
    cy.get('button').contains('Register').click({ force: true });

    cy.wait('@registerRequest').its('response.statusCode').should('eq', 201);
    cy.get('input[placeholder="Confirmation Code"]').should('be.visible');

    cy.request({
      method: 'GET',
      url: `http://localhost:5000/testing/get-confirmation-code?email=${uniqueEmail}`,
    }).then((response) => {
      expect(response.status).to.eq(200);
      const confirmationCode = response.body.confirmation_code;
      expect(confirmationCode).to.exist;

      cy.get('input[placeholder="Confirmation Code"]').type(confirmationCode);
      cy.get('button').contains('Confirm').click();

      cy.url().should('include', '/login');
      cy.contains(messages.account_activated).should('be.visible');
    });
  });

  it('should display an error for invalid username format', () => {
    cy.visit('http://localhost:3000/register');

    cy.get('input[placeholder="Username"]').type('invalid_username');
    cy.get('input[placeholder="Email"]').type(`test${Date.now()}@example.com`);
    cy.get('input[placeholder="Password"]').type('Password123!');
    cy.get('input[placeholder="Confirm Password"]').type('Password123!');
    cy.get('button').contains('Register').click({ force: true });

    cy.contains(messages.name_invalid_format).should('be.visible');
  });

  it('should display an error for a password that does not meet requirements', () => {
    cy.visit('http://localhost:3000/register');

    cy.get('input[placeholder="Username"]').type(`testuser${Date.now()}`);
    cy.get('input[placeholder="Email"]').type(`test${Date.now()}@example.com`);
    cy.get('input[placeholder="Password"]').type('123');
    cy.get('input[placeholder="Confirm Password"]').type('123');
    cy.get('button').contains('Register').click({ force: true });

    cy.contains(messages.password_invalid).should('be.visible');
  });

  it('should display an error when registering with an email that already exists', () => {
    const uniqueId = Date.now();
    const uniqueUsername = `existinguser${uniqueId}`;
    const existingEmail = `${uniqueUsername}@example.com`;
    const password = 'Password123!';

    cy.request('POST', 'http://localhost:5000/users/', {
      name: uniqueUsername,
      email: existingEmail,
      password: password,
    }).its('status').should('eq', 201);

    cy.visit('http://localhost:3000/register');
    cy.get('input[placeholder="Email"]').type(existingEmail);
    cy.get('input[placeholder="Username"]').type('anotheruser');
    cy.get('input[placeholder="Password"]').type(password);
    cy.get('input[placeholder="Confirm Password"]').type(password);
    cy.get('button').contains('Register').click({ force: true });

    cy.contains(messages.user_already_exists).should('be.visible');
  });
});
