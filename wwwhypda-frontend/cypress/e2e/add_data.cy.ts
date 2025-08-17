describe('Add Data Flow', () => {
  let uniqueId: number;
  let uniqueUsername: string;
  let uniqueEmail: string;
  const password = 'Password123!';

  beforeEach(() => {
    uniqueId = Date.now();
    uniqueUsername = `testuser${uniqueId}`;
    uniqueEmail = `${uniqueUsername}@example.com`;
    cy.createNewUser(uniqueEmail, uniqueUsername, password);

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