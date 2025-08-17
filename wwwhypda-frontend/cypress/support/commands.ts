/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      createNewUser(email: string, username: string, password: string): Chainable<void>
    }
  }
}

Cypress.Commands.add('createNewUser', (email, username, password) => {
  cy.intercept('POST', '**/users/').as('registerRequest');
  cy.intercept('POST', '**/users/confirm-registration').as('confirmRequest');

  cy.visit('/register');

  cy.get('input[placeholder="Username"]').type(username);
  cy.get('input[placeholder="Email"]').type(email);
  cy.get('input[placeholder="Password"]').type(password);
  cy.get('input[placeholder="Confirm Password"]').type(password);
  cy.get('button').contains('Register').click();

  cy.wait('@registerRequest').its('response.statusCode').should('eq', 201);
  cy.get('input[placeholder="Confirmation Code"]').should('be.visible');

  cy.request({
    method: 'GET',
    url: `http://localhost:5000/testing/get-confirmation-code?email=${email}`,
  }).then((response) => {
    const confirmationCode = response.body.confirmation_code;
    cy.get('input[placeholder="Confirmation Code"]').type(confirmationCode);
    cy.get('button').contains('Confirm').click();
    cy.wait('@confirmRequest').its('response.statusCode').should('eq', 200);
  });
});
