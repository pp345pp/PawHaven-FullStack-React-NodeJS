import {
  mockBootstrapAuthenticated,
  mockBootstrapUnauthenticated,
  mockUser,
} from '../support/commands';

describe('Auth Routing', () => {
  describe('Scenario 1: Login + Page Refresh', () => {
    it('should maintain login state after refresh and allow access to protected pages', () => {
      cy.mockAuthAPIs({ authenticated: true });
      cy.mockBootstrapAPI(mockBootstrapAuthenticated);

      cy.visit('/rescue/guides');

      cy.wait('@getMe');
      cy.wait('@getBootstrap');

      cy.url().should('include', '/rescue/guides');

      cy.reload();

      cy.wait('@getMe');
      cy.wait('@getBootstrap');

      cy.url().should('include', '/rescue/guides');
    });

    it('should load the full route tree correctly after login', () => {
      cy.mockAuthAPIs({ authenticated: true });
      cy.mockBootstrapAPI(mockBootstrapAuthenticated);

      cy.visit('/');

      cy.wait('@getMe');
      cy.wait('@getBootstrap');

      cy.url().should('eq', Cypress.config().baseUrl + '/');

      cy.visit('/rescue/guides');
      cy.url().should('include', '/rescue/guides');
    });
  });

  describe('Scenario 2: Unauthenticated Access to Protected Routes', () => {
    beforeEach(() => {
      cy.mockAuthAPIs({ authenticated: false });
      cy.mockBootstrapAPI(mockBootstrapUnauthenticated);
    });

    it('should redirect to login page when accessing protected route', () => {
      cy.visit('/rescue/guides');

      cy.wait('@getMe');
      cy.wait('@getBootstrap');

      cy.url().should('include', '/auth/login');
    });

    it('should redirect to login page when accessing /report-stray', () => {
      cy.visit('/report-stray');

      cy.wait('@getMe');
      cy.wait('@getBootstrap');

      cy.url().should('include', '/auth/login');
    });
  });

  describe('Scenario 3: Post-Login Navigation', () => {
    it('should navigate to home page after successful login', () => {
      cy.mockAuthAPIs({ authenticated: false });
      cy.mockBootstrapAPI(mockBootstrapUnauthenticated);

      cy.visit('/rescue/guides');

      cy.wait('@getMe');
      cy.wait('@getBootstrap');

      cy.url().should('include', '/auth/login');

      cy.mockAuthAPIs({ authenticated: true });
      cy.mockBootstrapAPI(mockBootstrapAuthenticated);

      cy.get('input[name="email"]').type('test@pawhaven.work');
      cy.get('input[name="password"]').type('password123');
      cy.get('button[type="submit"]').click();

      cy.wait('@login');
      cy.wait('@getMe');
      cy.wait('@getBootstrap');

      cy.url().should('eq', Cypress.config().baseUrl + '/');
    });

    it('should allow access to protected routes after login', () => {
      cy.mockAuthAPIs({ authenticated: false });
      cy.mockBootstrapAPI(mockBootstrapUnauthenticated);

      cy.visit('/');

      cy.wait('@getMe');
      cy.wait('@getBootstrap');

      cy.visit('/auth/login');
      cy.get('input[name="email"]').type('test@pawhaven.work');
      cy.get('input[name="password"]').type('password123');

      cy.mockAuthAPIs({ authenticated: true });
      cy.mockBootstrapAPI(mockBootstrapAuthenticated);

      cy.get('button[type="submit"]').click();

      cy.wait('@login');
      cy.wait('@getMe');
      cy.wait('@getBootstrap');

      cy.url().should('eq', Cypress.config().baseUrl + '/');

      cy.visit('/rescue/guides');
      cy.wait('@getMe');
      cy.wait('@getBootstrap');
      cy.url().should('include', '/rescue/guides');
    });
  });

  describe('Scenario 4: Logout Route Update', () => {
    it('should redirect to login page after logout and prevent access to protected pages', () => {
      cy.mockAuthAPIs({ authenticated: true });
      cy.mockBootstrapAPI(mockBootstrapAuthenticated);

      cy.visit('/');

      cy.wait('@getMe');
      cy.wait('@getBootstrap');

      cy.visit('/rescue/guides');
      cy.url().should('include', '/rescue/guides');

      cy.clearAuthLocalStorage();

      cy.mockAuthAPIs({ authenticated: false });
      cy.mockBootstrapAPI(mockBootstrapUnauthenticated);

      cy.reload();

      cy.wait('@getMe');

      cy.url().should('include', '/auth/login');

      cy.visit('/rescue/guides');

      cy.wait('@getMe');
      cy.wait('@getBootstrap');

      cy.url().should('include', '/auth/login');
    });

    it('should update route tree to unauthenticated state after logout', () => {
      cy.mockAuthAPIs({ authenticated: true });
      cy.mockBootstrapAPI(mockBootstrapAuthenticated);

      cy.visit('/');

      cy.wait('@getMe');
      cy.wait('@getBootstrap');

      cy.visit('/rescue/guides');
      cy.url().should('include', '/rescue/guides');

      cy.clearAuthLocalStorage();

      cy.mockAuthAPIs({ authenticated: false });
      cy.mockBootstrapAPI(mockBootstrapUnauthenticated);

      cy.reload();

      cy.wait('@getMe');

      cy.url().should('include', '/auth/login');
    });
  });

  describe('Scenario 5: Multi-Tab Login Sync', () => {
    it('should sync login state from another tab via localStorage', () => {
      cy.mockAuthAPIs({ authenticated: false });
      cy.mockBootstrapAPI(mockBootstrapUnauthenticated);

      cy.visit('/');

      cy.wait('@getMe');
      cy.wait('@getBootstrap');

      cy.url().should('not.include', '/rescue/guides');

      cy.setAuthLocalStorage(mockUser);

      cy.mockAuthAPIs({ authenticated: true });
      cy.mockBootstrapAPI(mockBootstrapAuthenticated);

      cy.reload();

      cy.wait('@getMe');
      cy.wait('@getBootstrap');

      cy.url().should('eq', Cypress.config().baseUrl + '/');

      cy.visit('/rescue/guides');
      cy.wait('@getMe');
      cy.wait('@getBootstrap');
      cy.url().should('include', '/rescue/guides');
    });

    it('should remain in sync when another tab logs out', () => {
      cy.mockAuthAPIs({ authenticated: true });
      cy.mockBootstrapAPI(mockBootstrapAuthenticated);

      cy.setAuthLocalStorage(mockUser);

      cy.visit('/');

      cy.wait('@getMe');
      cy.wait('@getBootstrap');

      cy.visit('/rescue/guides');
      cy.url().should('include', '/rescue/guides');

      cy.clearAuthLocalStorage();

      cy.mockAuthAPIs({ authenticated: false });
      cy.mockBootstrapAPI(mockBootstrapUnauthenticated);

      cy.reload();

      cy.wait('@getMe');

      cy.url().should('include', '/auth/login');
    });
  });
});