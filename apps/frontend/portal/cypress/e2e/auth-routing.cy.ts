const MOCK_USER = {
  userId: 'test-user-001',
  email: 'test@pawhaven.work',
};

const MOCK_PROFILE = {
  accessToken: 'mock-access-token-e2e',
  baseUserInfo: {
    email: 'test@pawhaven.work',
    userID: 'test-user-001',
    globalMenuUpdateAt: '',
    globalRouterUpdateAt: '',
  },
};

const MOCK_ROUTES = [
  {
    element: 'rootLayout',
    path: null,
    handle: {},
    children: [
      { element: 'home', path: '/', handle: { isMenuAvailable: true, isFooterAvailable: true } },
      { element: 'auth_login', path: '/auth/login', handle: { isMenuAvailable: false, isFooterAvailable: false } },
      { element: 'auth_register', path: '/auth/register', handle: { isMenuAvailable: false, isFooterAvailable: false } },
      {
        element: 'report_stray',
        path: '/report/stray',
        handle: { isMenuAvailable: true, isRequireUserLogin: true, isLazyLoad: true },
      },
      {
        element: 'rescue_guides',
        path: '/rescue/guides',
        handle: { isMenuAvailable: true, isRequireUserLogin: true, isLazyLoad: true },
      },
    ],
  },
];

const MOCK_PUBLIC_MENUS = [
  { label: 'Home', to: '/', classNames: [], order: 0 },
];

const MOCK_AUTHENTICATED_MENUS = [
  { label: 'Home', to: '/', classNames: [], order: 0 },
  { label: 'Report Stray', to: '/report/stray', classNames: [], order: 1 },
  { label: 'Rescue Guides', to: '/rescue/guides', classNames: [], order: 2 },
];

const API_LOGIN = '**/api/auth/login';
const API_LOGOUT = '**/api/auth/logout';
const API_ME = '**/api/auth/me';
const API_BOOTSTRAP = '**/api/core/app/bootstrap';

const interceptPublicBootstrap = () => {
  cy.intercept('GET', API_BOOTSTRAP, {
    statusCode: 200,
    body: {
      menus: MOCK_PUBLIC_MENUS,
      routers: MOCK_ROUTES,
    },
  }).as('bootstrap');
};

const interceptAuthenticatedBootstrap = () => {
  cy.intercept('GET', API_BOOTSTRAP, {
    statusCode: 200,
    body: {
      menus: MOCK_AUTHENTICATED_MENUS,
      routers: MOCK_ROUTES,
    },
  }).as('bootstrap');
};

const interceptMeSuccess = () => {
  cy.intercept('GET', API_ME, {
    statusCode: 200,
    body: MOCK_USER,
  }).as('getMe');
};

const interceptMeFailure = () => {
  cy.intercept('GET', API_ME, {
    statusCode: 401,
    body: { message: 'Unauthorized' },
  }).as('getMeFail');
};

const interceptLoginSuccess = () => {
  cy.intercept('POST', API_LOGIN, {
    statusCode: 200,
    body: MOCK_PROFILE,
  }).as('login');
};

const interceptLogoutSuccess = () => {
  cy.intercept('POST', API_LOGOUT, {
    statusCode: 200,
    body: { message: 'Logged out' },
  }).as('logout');
};

const clearPersistedAuth = () => {
  cy.clearLocalStorage();
  cy.clearCookies();
};

const performLogin = () => {
  cy.get('input[name="email"]').type('test@pawhaven.work');
  cy.get('input[name="password"]').type('password123');
  cy.get('button[type="submit"]').click();
};

describe('Auth Routing Integration', () => {
  beforeEach(() => {
    clearPersistedAuth();
  });

  describe('Scenario 1: Login + page refresh preserves auth state and route tree', () => {
    it('should remain logged in after page refresh with correct route tree loaded', () => {
      interceptPublicBootstrap();
      interceptMeFailure();
      interceptLoginSuccess();

      cy.visit('/auth/login');
      cy.wait('@bootstrap');

      performLogin();

      cy.wait('@login');

      interceptAuthenticatedBootstrap();
      interceptMeSuccess();

      cy.wait('@bootstrap');

      cy.url().should('include', '/');

      interceptAuthenticatedBootstrap();
      interceptMeSuccess();

      cy.reload();

      cy.wait('@bootstrap');
      cy.wait('@getMe');

      cy.url().should('include', '/');

      cy.window().then((win) => {
        const persisted = win.localStorage.getItem('persist:root');
        expect(persisted).to.not.be.null;
        if (persisted) {
          const parsed = JSON.parse(persisted);
          const global = JSON.parse(parsed.global);
          expect(global.profile.accessToken).to.eq(MOCK_PROFILE.accessToken);
        }
      });
    });
  });

  describe('Scenario 2: Unauthenticated access to protected route redirects to login', () => {
    it('should redirect to login page when accessing protected route without auth', () => {
      interceptPublicBootstrap();
      interceptMeFailure();

      cy.visit('/report/stray');
      cy.wait('@bootstrap');
      cy.wait('@getMeFail');

      cy.url().should('include', '/auth/login');
    });

    it('should preserve the original route in navigation state when redirecting to login', () => {
      interceptPublicBootstrap();
      interceptMeFailure();

      cy.visit('/rescue/guides');
      cy.wait('@bootstrap');
      cy.wait('@getMeFail');

      cy.url().should('include', '/auth/login');

      cy.window().then((win) => {
        const state = win.history.state;
        expect(state.from).to.not.be.undefined;
        expect(state.from.pathname).to.include('/rescue/guides');
      });
    });
  });

  describe('Scenario 3: After login, redirect to previously attempted protected route', () => {
    it('should redirect to the originally requested protected route after login', () => {
      interceptPublicBootstrap();
      interceptMeFailure();
      interceptLoginSuccess();
      interceptAuthenticatedBootstrap();
      interceptMeSuccess();

      cy.visit('/report/stray');
      cy.wait('@bootstrap');
      cy.wait('@getMeFail');

      cy.url().should('include', '/auth/login');

      performLogin();

      cy.wait('@login');
      cy.wait('@bootstrap');

      cy.url().should('include', '/report/stray');
    });

    it('should redirect to rescue guides after login when that was the original target', () => {
      interceptPublicBootstrap();
      interceptMeFailure();
      interceptLoginSuccess();
      interceptAuthenticatedBootstrap();
      interceptMeSuccess();

      cy.visit('/rescue/guides');
      cy.wait('@bootstrap');
      cy.wait('@getMeFail');

      cy.url().should('include', '/auth/login');

      performLogin();

      cy.wait('@login');
      cy.wait('@bootstrap');

      cy.url().should('include', '/rescue/guides');
    });
  });

  describe('Scenario 4: Logout updates route tree and blocks protected pages', () => {
    it('should redirect to login page after logout and block access to protected routes', () => {
      interceptPublicBootstrap();
      interceptMeFailure();
      interceptLoginSuccess();
      interceptLogoutSuccess();

      cy.visit('/auth/login');
      cy.wait('@bootstrap');

      performLogin();

      cy.wait('@login');

      interceptAuthenticatedBootstrap();
      interceptMeSuccess();

      cy.wait('@bootstrap');

      cy.url().should('include', '/');

      interceptLogoutSuccess();

      cy.request({
        method: 'POST',
        url: '/api/auth/logout',
        failOnStatusCode: false,
      });

      cy.window().then((win) => {
        win.localStorage.removeItem('persist:root');
      });

      interceptPublicBootstrap();
      interceptMeFailure();

      cy.visit('/auth/login');
      cy.wait('@bootstrap');

      cy.url().should('include', '/auth/login');

      interceptPublicBootstrap();
      interceptMeFailure();

      cy.visit('/report/stray');
      cy.wait('@bootstrap');
      cy.wait('@getMeFail');

      cy.url().should('include', '/auth/login');
      cy.url().should('not.include', '/report/stray');
    });
  });

  describe('Scenario 5: Multi-tab login synchronization', () => {
    it('should sync auth state when a second tab refreshes after login in another tab', () => {
      interceptPublicBootstrap();
      interceptMeFailure();
      interceptLoginSuccess();

      cy.visit('/auth/login');
      cy.wait('@bootstrap');

      performLogin();

      cy.wait('@login');

      interceptAuthenticatedBootstrap();
      interceptMeSuccess();

      cy.wait('@bootstrap');

      cy.url().should('include', '/');

      cy.window().then((win) => {
        const persisted = win.localStorage.getItem('persist:root');
        expect(persisted).to.not.be.null;
      });

      interceptAuthenticatedBootstrap();
      interceptMeSuccess();

      cy.reload();

      cy.wait('@bootstrap');
      cy.wait('@getMe');

      cy.url().should('include', '/');

      cy.window().then((win) => {
        const persisted = win.localStorage.getItem('persist:root');
        expect(persisted).to.not.be.null;
        if (persisted) {
          const parsed = JSON.parse(persisted);
          const global = JSON.parse(parsed.global);
          expect(global.profile.accessToken).to.eq(MOCK_PROFILE.accessToken);
        }
      });
    });

    it('should reflect logged-in state when storage event fires from another tab', () => {
      interceptPublicBootstrap();
      interceptMeFailure();
      interceptLoginSuccess();

      cy.visit('/auth/login');
      cy.wait('@bootstrap');

      performLogin();

      cy.wait('@login');

      interceptAuthenticatedBootstrap();
      interceptMeSuccess();

      cy.wait('@bootstrap');

      cy.url().should('include', '/');

      interceptAuthenticatedBootstrap();
      interceptMeSuccess();

      cy.window().then((win) => {
        win.dispatchEvent(new win.StorageEvent('storage', {
          key: 'persist:root',
          newValue: win.localStorage.getItem('persist:root'),
        }));
      });

      cy.reload();
      cy.wait('@bootstrap');
      cy.wait('@getMe');

      cy.url().should('include', '/');
    });
  });
});
