import messages from '../../src/common/error_messages.json';

describe('Login Flow', () => {
  let uniqueId: number;
  let uniqueUsername: string;
  let uniqueEmail: string;
  const password = 'Password123!';

  beforeEach(() => {
    // Create a new user for each test
    uniqueId = Date.now();
    uniqueUsername = `testuser${uniqueId}`;
    uniqueEmail = `${uniqueUsername}@example.com`;

    // Directly register and confirm the user via API
    cy.request('POST', 'http://localhost:5000/users/', {
      name: uniqueUsername,
      email: uniqueEmail,
      password: password,
    }).its('status').should('eq', 201);

    cy.request({
      method: 'GET',
      url: `http://localhost:5000/testing/get-confirmation-code?email=${uniqueEmail}`,
    }).then((response) => {
      const confirmationCode = response.body.confirmation_code;
      cy.request('POST', 'http://localhost:5000/users/confirm-registration', {
        email: uniqueEmail,
        code: confirmationCode,
      }).its('status').should('eq', 200);
    });
  });

  it('should display an error for incorrect password', () => {
    cy.visit('http://localhost:3000/login');
    cy.get('input[placeholder="Email"]').type(uniqueEmail);
    cy.get('input[placeholder="Password"]').type('WrongPassword!');
    cy.get('button').contains('Login').click({ force: true });

    cy.contains('Invalid email or password').should('be.visible');
  });

  it('should display an error for non-existing email', () => {
    cy.visit('http://localhost:3000/login');
    cy.get('input[placeholder="Email"]').type('nonexisting@example.com');
    cy.get('input[placeholder="Password"]').type(password);
    cy.get('button').contains('Login').click({ force: true });

    cy.contains('Invalid email or password').should('be.visible');
  });

  it('should successfully log in and then log out', () => {
    // Login
    cy.visit('http://localhost:3000/login');
    cy.get('input[placeholder="Email"]').type(uniqueEmail);
    cy.get('input[placeholder="Password"]').type(password);
    cy.get('button').contains('Login').click({ force: true });

    // Assert successful login
    cy.url().should('include', '/account');

    // Logout
    cy.get('button').contains('Log Out').click({ force: true });

    // Assert successful logout
    cy.url().should('include', '/login');
  });

  it('should be redirected to login when access token expires', () => {
    // Set a short token expiration for this test
    cy.request('POST', 'http://localhost:5000/testing/config', { 
      'ACCESS_EXPIRES_SECONDS': 3 
    });

    // Login
    cy.visit('http://localhost:3000/login');
    cy.get('input[placeholder="Email"]').type(uniqueEmail);
    cy.get('input[placeholder="Password"]').type(password);
    cy.get('button').contains('Login').click({ force: true });

    // Assert successful login
    cy.url().should('include', '/account');

    // Wait for the token to expire
    cy.wait(4000);

    // Try to access a protected route
    cy.visit('http://localhost:3000/account');

    // Assert that the user is redirected to the login page
    cy.url().should('include', '/login');
  });
});
