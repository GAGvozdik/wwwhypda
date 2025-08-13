import messages from '../../src/common/error_messages.json';

describe('Forgot Password', () => {
  it('should allow a user to reset their password', () => {
    const uniqueId = Date.now();
    const userEmail = `test${uniqueId}@test.com`;
    const password = 'Password123!';
    const newPassword = 'Newpassword123!';

    // Register a new user
    cy.intercept('POST', '**/users/').as('registerRequest');
    cy.visit('/register');
    cy.get('input[placeholder="Username"]').type('testuser');
    cy.get('input[placeholder="Email"]').type(userEmail);
    cy.get('input[placeholder="Password"]').type(password);
    cy.get('input[placeholder="Confirm Password"]').type(password);
    cy.get('button').contains('Register').click({ force: true });

    cy.wait('@registerRequest').its('response.statusCode').should('eq', 201);
    cy.get('input[placeholder="Confirmation Code"]').should('be.visible');

    // Fetch the confirmation code and confirm the user
    cy.request(`http://localhost:5000/testing/get-confirmation-code?email=${userEmail}`)
      .its('body.confirmation_code')
      .then((confirmationCode) => {
        cy.get('input[placeholder="Confirmation Code"]').type(confirmationCode);
        cy.get('button').contains('Confirm').click();
        cy.url().should('include', '/login');
        cy.contains(messages.account_activated).should('be.visible');
      });

    // Run the forgot password tests
    cy.visit('/forgot-password');

    // Test with invalid email
    cy.get('input[placeholder="Email"]').type('invalid@test.com');
    cy.contains('Send Code').click();
    cy.contains('User not found or inactive').should('be.visible');

    // Test with valid email
    cy.intercept('POST', '**/request-password-reset').as('requestPasswordReset');
    cy.get('input[placeholder="Email"]').clear().type(userEmail);
    cy.contains('Send Code').click();
    cy.wait('@requestPasswordReset').its('response.statusCode').should('eq', 200);
    cy.contains('Resend code in').should('be.visible');

    // Fetch the reset code from the testing endpoint
    cy.request(`http://localhost:5000/testing/get-password-reset-code?email=${userEmail}`)
      .its('body.reset_code')
      .then((resetCode) => {
        // Test with invalid code and valid password
        cy.get('input[placeholder="Reset Code"]').type('wrongcode');
        cy.get('input[placeholder="New Password"]').type(newPassword);
        cy.get('input[placeholder="Confirm New Password"]').type(newPassword);
        cy.contains('Reset Password').click();
        cy.contains('Invalid or expired reset code').should('be.visible');

        // Test with valid code and invalid password
        cy.get('input[placeholder="Reset Code"]').clear().type(resetCode);
        cy.get('input[placeholder="New Password"]').clear().type(newPassword);
        cy.get('input[placeholder="Confirm New Password"]').clear().type('wrongpassword');
        cy.contains('Reset Password').click();
        cy.contains('Passwords do not match!').should('be.visible');

        // Test with valid code and valid password
        cy.get('input[placeholder="Reset Code"]').clear().type(resetCode);
        cy.get('input[placeholder="New Password"]').clear().type(newPassword);
        cy.get('input[placeholder="Confirm New Password"]').clear().type(newPassword);
        cy.contains('Reset Password').click();
        cy.url().should('include', '/login');
        cy.contains('Password reset successful! Please log in.').should('be.visible');

        // Test logging in with the new password
        cy.get('input[placeholder="Email"]').type(userEmail);
        cy.get('input[placeholder="Password"]').type(newPassword);
        cy.contains('Login').click();
        cy.url().should('include', '/account');
      });
  });
});
