import messages from '../../src/common/error_messages.json';

describe('Login Flow', () => {
  let uniqueId: number;
  let uniqueUsername: string;
  let uniqueEmail: string;
  const password = 'Password123!';

  beforeEach(() => {
    uniqueId = Date.now();
    uniqueUsername = `testuser${uniqueId}`;
    uniqueEmail = `${uniqueUsername}@example.com`;
    cy.createNewUser(uniqueEmail, uniqueUsername, password);
  });

  it('should display an error for incorrect password', () => {
    cy.visit('http://localhost:3000/login');
    cy.get('input[placeholder="Email"]').type(uniqueEmail);
    cy.get('input[placeholder="Password"]').type('WrongPassword!');
    cy.get('button').contains('Login').click();

    cy.contains('Invalid email or password').should('be.visible');
  });

  it('should display an error for non-existing email', () => {
    cy.visit('http://localhost:3000/login');
    cy.get('input[placeholder="Email"]').type('nonexisting@example.com');
    cy.get('input[placeholder="Password"]').type(password);
    cy.get('button').contains('Login').click();

    cy.contains('Invalid email or password').should('be.visible');
  });

  it('should successfully log in and then log out', () => {
    cy.visit('http://localhost:3000/login');
    cy.get('input[placeholder="Email"]').type(uniqueEmail);
    cy.get('input[placeholder="Password"]').type(password);
    cy.get('button').contains('Login').click();

    cy.url().should('include', '/account');

    cy.get('button').contains('Log Out').click();

    cy.url().should('include', '/login');
  });

  it('should fail to login without a reCAPTCHA token (bot attack simulation)', () => {
    cy.request({
      method: 'POST',
      url: 'http://localhost:5000/users/login',
      body: {
        email: uniqueEmail,
        password: password,
      },
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.eq(400);
      expect(response.body.message).to.eq('reCAPTCHA token is missing');
    });
  });
});