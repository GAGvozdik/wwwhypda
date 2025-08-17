describe('Search Flow', () => {
  it('should allow a public user to search for data and initiate a download', () => {
    // Intercept the reCAPTCHA script to ensure it loads
    cy.intercept('GET', 'https://www.google.com/recaptcha/api.js*', (req) => {
      req.continue();
    });

    // Intercept the request for rock types
    cy.intercept('GET', '/rocks/rock_type').as('getRockTypes');

    // 1. Visit the search page
    cy.visit('http://localhost:3000/search');

    // 2. Open the side menu to ensure all components are active
    cy.get('[class*="drawerItem"]').click();

    // Wait for the rock types to be fetched
    cy.wait('@getRockTypes').its('response.statusCode').should('eq', 200);

    // 3. In the side menu, click on "generic earth material" to expand it
    cy.contains('[class*="treeItem"]', 'generic earth material').click();

    // 4. Click on "Sand"
    cy.contains('[class*="treeItem"]', 'Sand').click();

    // 5. In the search panel, select the "porosity" parameter
    // We find the row containing "Porosity" and click the radio button in it
    cy.contains('td', 'Porosity').parent('tr').within(() => {
      cy.get('input[type="radio"]').click();
    });

    // 6. Click the "Find data" button
    cy.get('button').contains('Find data').click();

    // 7. Assert that data appears in the results table
    cy.get('.ag-root-wrapper').within(() => {
      cy.get('.ag-row').should('have.length.greaterThan', 0);
    });

    // 8. Click the "Download data" button
    // Note: Cypress cannot verify the download itself, but it can ensure the button works without errors.
    cy.get('button').contains('Download data').click();
  });
});
