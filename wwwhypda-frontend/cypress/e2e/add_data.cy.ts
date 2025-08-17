describe('Add Data Flow', () => {
  let uniqueId: number;
  let uniqueUsername: string;
  let uniqueEmail: string;
  const password = 'Password123!';

  beforeEach(() => {
    // Create a new user for each test that requires authentication
    uniqueId = Date.now();
    uniqueUsername = `testuser${uniqueId}`;
    uniqueEmail = `${uniqueUsername}@example.com`;

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

    // Login via UI
    cy.visit('http://localhost:3000/login');
    cy.get('input[placeholder="Email"]').type(uniqueEmail);
    cy.get('input[placeholder="Password"]').type(password);
    cy.get('button').contains('Login').click();
    cy.url().should('include', '/account');
  });

  it('should redirect unauthenticated user to login page', () => {
    // We need to clear cookies to simulate an unauthenticated user
    cy.clearCookies();
    cy.visit('http://localhost:3000/input');
    cy.url().should('include', '/login');
  });

  it('should allow authenticated user to see the add data page', () => {
    cy.visit('http://localhost:3000/input');

    // Check for a unique element on the InputPage to confirm access
    cy.contains('div', 'InputPage').should('be.visible'); 
  });
});
