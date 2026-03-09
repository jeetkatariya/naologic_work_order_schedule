// Global E2E support file — runs before every spec.
// Clear localStorage before each test so sample data is always fresh.
beforeEach(() => {
  cy.clearLocalStorage();
});
