import { routePaths } from '@/router/routePaths';

type StorageSnapshot = Record<string, string>;

type SuccessEnvelope<T> = {
  code: string;
  data: T;
  isSuccess: true;
  message: string;
  status: number;
};

type ErrorEnvelope = {
  code: string;
  data: null;
  isSuccess: false;
  message: string;
  status: number;
};

type MockMenuItem = {
  classNames: string[];
  label: string;
  order: number;
  to: string;
};

type MockRouterItem = {
  children?: MockRouterItem[];
  element: string;
  handle: {
    isFooterAvailable?: boolean;
    isLazyLoad?: boolean;
    isMenuAvailable?: boolean;
    isRequireUserLogin?: boolean;
  };
  path: string | null;
};

type MockProfile = {
  accessToken: string;
  baseUserInfo: {
    email: string;
    globalMenuUpdateAt: string;
    globalRouterUpdateAt: string;
    userID: string;
  };
};

type AuthState = {
  authenticated: boolean;
  bootstrapVersion: number;
  email: string;
  userId: string;
};

const protectedRoute = '/report-stray';
const testEmail = 'rescuer@pawhaven.test';
const testPassword = 'Password123!';

const createSuccessEnvelope = <T>(data: T): SuccessEnvelope<T> => ({
  code: 'OK',
  data,
  isSuccess: true,
  message: 'ok',
  status: 200,
});

const createUnauthorizedEnvelope = (): ErrorEnvelope => ({
  code: 'Unauthorized',
  data: null,
  isSuccess: false,
  message: 'Unauthorized',
  status: 401,
});

const createMockProfile = (state: AuthState): MockProfile => ({
  accessToken: `access-token-${state.bootstrapVersion}`,
  baseUserInfo: {
    email: state.email,
    globalMenuUpdateAt: `${state.bootstrapVersion}`,
    globalRouterUpdateAt: `${state.bootstrapVersion}`,
    userID: state.userId,
  },
});

const createMockMenus = (authenticated: boolean): MockMenuItem[] => {
  const sharedMenus: MockMenuItem[] = [
    {
      classNames: ['menuItem'],
      label: 'home.home_page',
      order: 1,
      to: routePaths.home,
    },
    {
      classNames: ['menuItem'],
      label: 'common.guides',
      order: 2,
      to: routePaths.rescueGuides,
    },
  ];

  if (authenticated) {
    return [
      ...sharedMenus,
      {
        classNames: ['menuItem'],
        label: 'home.report',
        order: 3,
        to: protectedRoute,
      },
      {
        classNames: ['login'],
        label: 'auth.login',
        order: 4,
        to: routePaths.login,
      },
    ];
  }

  return [
    ...sharedMenus,
    {
      classNames: ['login'],
      label: 'auth.login',
      order: 3,
      to: routePaths.login,
    },
  ];
};

const createMockRouters = (): MockRouterItem[] => [
  {
    children: [
      {
        element: 'home',
        handle: {
          isFooterAvailable: true,
          isMenuAvailable: true,
        },
        path: '',
      },
      {
        element: 'report_stray',
        handle: {
          isFooterAvailable: false,
          isLazyLoad: true,
          isMenuAvailable: true,
          isRequireUserLogin: true,
        },
        path: 'report-stray',
      },
      {
        element: 'rescue_guides',
        handle: {
          isFooterAvailable: true,
          isLazyLoad: true,
          isMenuAvailable: true,
        },
        path: 'rescue/guides',
      },
    ],
    element: 'rootLayout',
    handle: {
      isFooterAvailable: true,
      isMenuAvailable: true,
    },
    path: '/',
  },
  {
    element: 'auth_login',
    handle: {
      isFooterAvailable: false,
      isMenuAvailable: false,
    },
    path: routePaths.login,
  },
  {
    element: 'auth_register',
    handle: {
      isFooterAvailable: false,
      isMenuAvailable: false,
    },
    path: routePaths.register,
  },
  {
    element: 'notFund',
    handle: {
      isFooterAvailable: false,
      isMenuAvailable: false,
    },
    path: '*',
  },
];

const createBootstrapPayload = (state: AuthState) => ({
  menus: createMockMenus(state.authenticated),
  routers: createMockRouters(),
});

const registerNetworkMocks = (state: AuthState) => {
  cy.intercept('GET', '**/api/core/app/bootstrap*', () => {
    state.bootstrapVersion += 1;

    return {
      body: createSuccessEnvelope(createBootstrapPayload(state)),
      statusCode: 200,
    };
  }).as('bootstrapRequest');

  cy.intercept('GET', '**/api/core/rescues*', {
    body: createSuccessEnvelope([
      {
        animalID: 'rescue-1',
        description: 'Recovered safely and waiting for foster placement.',
        img: 'https://images.example.com/rescue-1.jpg',
        location: 'Central Park',
        name: 'Luna',
        status: 'recovering',
        time: '2026-06-06T08:00:00.000Z',
      },
    ]),
    statusCode: 200,
  }).as('rescuesRequest');

  cy.intercept(
    'POST',
    '**/api/auth/login',
    (req: {
      body: unknown;
      reply: (response: {
        body: SuccessEnvelope<MockProfile>;
        statusCode: number;
      }) => void;
    }) => {
    expect(req.body).to.deep.equal({
      email: testEmail,
      password: testPassword,
    });

    state.authenticated = true;

    req.reply({
      body: createSuccessEnvelope(createMockProfile(state)),
      statusCode: 200,
    });
  }).as('loginRequest');

  cy.intercept('POST', '**/api/auth/register', () => {
    state.authenticated = true;

    return {
      body: createSuccessEnvelope(createMockProfile(state)),
      statusCode: 200,
    };
  }).as('registerRequest');

  cy.intercept('POST', '**/api/auth/logout', () => {
    state.authenticated = false;

    return {
      body: createSuccessEnvelope({ message: 'logged out' }),
      statusCode: 200,
    };
  }).as('logoutRequest');

  cy.intercept('GET', '**/api/auth/me', () => {
    if (!state.authenticated) {
      return {
        body: createUnauthorizedEnvelope(),
        statusCode: 401,
      };
    }

    return {
      body: createSuccessEnvelope({
        email: state.email,
        userId: state.userId,
      }),
      statusCode: 200,
    };
  }).as('currentUserRequest');
};

const submitLoginForm = () => {
  cy.get('input[name="email"]').should('be.visible').clear().type(testEmail);
  cy.get('input[name="password"]').clear().type(testPassword, { log: false });
  cy.contains('button', /^Log in$/).click();
};

const assertRedirectTargetPreserved = (expectedPath: string) => {
  cy.location('search').then((search: string) => {
    if (search) {
      expect(decodeURIComponent(search)).to.contain(expectedPath);
      return;
    }

    cy.window().then((win: Window) => {
      const historyState = win.history.state as {
        usr?: {
          from?: {
            pathname?: string;
          };
        };
      } | null;

      expect(historyState?.usr?.from?.pathname).to.eq(expectedPath);
    });
  });
};

const assertProtectedPageLoaded = () => {
  cy.location('pathname').should('eq', protectedRoute);
  cy.contains('h2', 'Report Stray Animal').should('be.visible');
};

const captureLocalStorage = () => {
  return cy.window().then((win: Window) => {
    const snapshot: StorageSnapshot = {};

    for (let index = 0; index < win.localStorage.length; index += 1) {
      const key = win.localStorage.key(index);

      if (!key) {
        continue;
      }

      const value = win.localStorage.getItem(key);

      if (value !== null) {
        snapshot[key] = value;
      }
    }

    return snapshot;
  });
};

const visitWithStorageSnapshot = (
  path: string,
  storageSnapshot: StorageSnapshot,
) => {
  cy.visit(path, {
    onBeforeLoad(win: Window) {
      Object.entries(storageSnapshot).forEach(([key, value]) => {
        win.localStorage.setItem(key, value);
      });
    },
  });
};

describe('portal auth routing', () => {
  let authState: AuthState;

  beforeEach(() => {
    authState = {
      authenticated: false,
      bootstrapVersion: 0,
      email: testEmail,
      userId: 'user-portal-1',
    };

    cy.clearAllCookies();
    cy.clearAllLocalStorage();
    registerNetworkMocks(authState);
  });

  it('登录后刷新页面时保持登录状态并正确加载受保护路由', () => {
    cy.visit(routePaths.login);
    cy.wait('@bootstrapRequest');

    submitLoginForm();
    cy.wait('@loginRequest');
    cy.wait('@bootstrapRequest');

    cy.visit(protectedRoute);
    cy.wait('@bootstrapRequest');
    cy.wait('@currentUserRequest').its('response.statusCode').should('eq', 200);
    assertProtectedPageLoaded();

    cy.reload();
    cy.wait('@bootstrapRequest');
    cy.wait('@currentUserRequest').its('response.statusCode').should('eq', 200);
    assertProtectedPageLoaded();
    cy.get('header').contains('Report').should('be.visible');
  });

  it('未登录直接访问受保护路由时自动跳转到登录页并保留目标路由', () => {
    cy.visit(protectedRoute);
    cy.wait('@bootstrapRequest');
    cy.wait('@currentUserRequest').its('response.statusCode').should('eq', 401);

    cy.location('pathname').should('eq', routePaths.login);
    cy.contains('h1', 'Log in').should('be.visible');
    assertRedirectTargetPreserved(protectedRoute);
  });

  it('登录成功后自动跳转回先前尝试访问的受保护路由', () => {
    cy.visit(protectedRoute);
    cy.wait('@bootstrapRequest');
    cy.wait('@currentUserRequest').its('response.statusCode').should('eq', 401);
    cy.location('pathname').should('eq', routePaths.login);
    assertRedirectTargetPreserved(protectedRoute);

    submitLoginForm();
    cy.wait('@loginRequest');
    cy.wait('@bootstrapRequest');
    cy.wait('@currentUserRequest').its('response.statusCode').should('eq', 200);
    assertProtectedPageLoaded();
  });

  it('登出后跳转首页并切回未登录路由状态，受保护页面不可再访问', () => {
    cy.visit(routePaths.login);
    cy.wait('@bootstrapRequest');

    submitLoginForm();
    cy.wait('@loginRequest');
    cy.wait('@bootstrapRequest');

    cy.location('pathname').should('eq', routePaths.home);
    cy.get('header').contains('Report').should('be.visible');

    cy.get('header').contains(/^Log in$/).click();
    cy.wait('@logoutRequest');
    cy.wait('@bootstrapRequest');

    cy.location('pathname').should('eq', routePaths.home);
    cy.get('header').should('not.contain', 'Report');

    cy.visit(protectedRoute);
    cy.wait('@bootstrapRequest');
    cy.wait('@currentUserRequest').its('response.statusCode').should('eq', 401);
    cy.location('pathname').should('eq', routePaths.login);
  });

  it('模拟多标签页场景时，另一页面刷新后自动同步登录状态', () => {
    cy.visit(routePaths.login);
    cy.wait('@bootstrapRequest');

    submitLoginForm();
    cy.wait('@loginRequest');
    cy.wait('@bootstrapRequest');
    cy.location('pathname').should('eq', routePaths.home);

    captureLocalStorage().then((storageSnapshot: StorageSnapshot) => {
      visitWithStorageSnapshot(protectedRoute, storageSnapshot);
    });

    cy.wait('@bootstrapRequest');
    cy.wait('@currentUserRequest').its('response.statusCode').should('eq', 200);
    assertProtectedPageLoaded();
  });
});
