import type { ProfileType } from '../../src/features/Auth/types';

export interface MockBootstrapRoute {
  path: string;
  element: string;
  handle?: {
    isRequireUserLogin?: boolean;
    isLazyLoad?: boolean;
  };
  children?: MockBootstrapRoute[];
}

export interface MockBootstrapData {
  menus: Array<Record<string, unknown>>;
  routers: MockBootstrapRoute[];
}

export const mockUser: ProfileType = {
  accessToken: 'mock-access-token',
  baseUserInfo: {
    email: 'test@pawhaven.work',
    userID: 'mock-user-001',
    globalMenuUpdateAt: '',
    globalRouterUpdateAt: '',
  },
};

export const mockBootstrapAuthenticated: MockBootstrapData = {
  menus: [
    { key: 'home', label: 'Home', path: '/' },
    { key: 'rescue', label: 'Rescue', path: '/rescue/guides' },
  ],
  routers: [
    {
      path: '/',
      element: 'home',
      handle: {},
    },
    {
      path: '/auth/login',
      element: 'auth_login',
      handle: {},
    },
    {
      path: '/auth/register',
      element: 'auth_register',
      handle: {},
    },
    {
      path: '/rescue/guides',
      element: 'rescue_guides',
      handle: {
        isRequireUserLogin: true,
      },
    },
    {
      path: '/report-stray',
      element: 'report_stray',
      handle: {
        isRequireUserLogin: true,
      },
    },
    {
      path: '/rescue/:id',
      element: 'rescue_detail',
      handle: {
        isRequireUserLogin: true,
      },
    },
  ],
};

export const mockBootstrapUnauthenticated: MockBootstrapData = {
  menus: [
    { key: 'home', label: 'Home', path: '/' },
  ],
  routers: [
    {
      path: '/',
      element: 'home',
      handle: {},
    },
    {
      path: '/auth/login',
      element: 'auth_login',
      handle: {},
    },
    {
      path: '/auth/register',
      element: 'auth_register',
      handle: {},
    },
    {
      path: '/rescue/guides',
      element: 'notFund',
      handle: {},
    },
    {
      path: '/report-stray',
      element: 'notFund',
      handle: {},
    },
    {
      path: '/rescue/:id',
      element: 'notFund',
      handle: {},
    },
  ],
};

declare global {
  namespace Cypress {
    interface Chainable {
      mockAuthAPIs(options: { authenticated: boolean }): void;
      mockBootstrapAPI(data: MockBootstrapData): void;
      setAuthLocalStorage(user: ProfileType): void;
      clearAuthLocalStorage(): void;
    }
  }
}

Cypress.Commands.add('mockAuthAPIs', (options: { authenticated: boolean }) => {
  if (options.authenticated) {
    cy.intercept('GET', '/api/auth/me', {
      statusCode: 200,
      body: {
        userId: mockUser.baseUserInfo.userID,
        email: mockUser.baseUserInfo.email,
      },
    }).as('getMe');
    cy.intercept('POST', '/api/auth/logout', {
      statusCode: 200,
      body: { message: 'Logged out' },
    }).as('logout');
  } else {
    cy.intercept('GET', '/api/auth/me', {
      statusCode: 401,
      body: { message: 'Unauthorized' },
    }).as('getMe');
  }

  cy.intercept('POST', '/api/auth/login', (req) => {
    req.reply({
      statusCode: 200,
      body: mockUser,
    });
  }).as('login');

  cy.intercept('POST', '/api/auth/register', (req) => {
    req.reply({
      statusCode: 200,
      body: mockUser,
    });
  }).as('register');
});

Cypress.Commands.add('mockBootstrapAPI', (data: MockBootstrapData) => {
  cy.intercept('GET', '/api/core/app/bootstrap', {
    statusCode: 200,
    body: data,
  }).as('getBootstrap');
});

Cypress.Commands.add('setAuthLocalStorage', (user: ProfileType) => {
  const persistedState = {
    global: {
      profile: user,
      locale: 'en-US',
      isSysMaintain: true,
    },
    _persist: {
      version: -1,
      rehydrated: true,
    },
  };
  window.localStorage.setItem('persist:root', JSON.stringify(persistedState));
});

Cypress.Commands.add('clearAuthLocalStorage', () => {
  window.localStorage.removeItem('persist:root');
});