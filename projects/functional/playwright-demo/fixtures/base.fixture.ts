/**
 * Custom Test Fixtures — Dependency Injection for Page Objects & API Context
 *
 * Interview Talking Point:
 * "Playwright fixtures are dependency injection. Each test declares what it needs
 * (examplePage, apiContext) and the framework provides fresh instances. This
 * eliminates beforeEach boilerplate and guarantees test isolation — something
 * Cypress handles with beforeEach hooks instead."
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { test as base, type APIRequestContext } from '@playwright/test';
import { ExamplePage } from '../pages/example.page';
import { TEST_DATA } from './test-data';

// Declare custom fixture types
type Fixtures = {
  examplePage: ExamplePage;
  apiContext: APIRequestContext;
  stubExampleDomain: void;
};

/**
 * Local snapshot of example.com (2025 version, matches the visual baselines).
 * The live page was redesigned (no <h1>, no link) and asks not to be used for
 * testing, so UI tests are served this fixed copy instead of the network.
 */
const EXAMPLE_DOMAIN_HTML = readFileSync(join(__dirname, 'example-domain.html'), 'utf-8');

/**
 * Extended test with custom fixtures.
 * Usage: import { test, expect } from '../fixtures/base.fixture';
 */
export const test = base.extend<Fixtures>({
  // Auto fixture: every test that opens example.com gets the local snapshot
  stubExampleDomain: [
    async ({ context }, use) => {
      await context.route('https://example.com/**', (route) =>
        new URL(route.request().url()).pathname === '/'
          ? route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: EXAMPLE_DOMAIN_HTML })
          : route.fulfill({ status: 404, body: '' })
      );
      await use();
    },
    { auto: true },
  ],

  // Page object fixture — automatically creates ExamplePage with the test's page
  examplePage: async ({ page }, use) => {
    const examplePage = new ExamplePage(page);
    await use(examplePage);
  },

  // API context fixture — standalone HTTP client, no browser needed
  // Interview Talking Point:
  // "The apiContext fixture creates a standalone HTTP client. API tests don't launch
  // a browser at all, making them faster than Cypress cy.request() which always
  // runs inside a browser context."
  apiContext: async ({ playwright }, use) => {
    const context = await playwright.request.newContext({
      baseURL: TEST_DATA.API_BASE_URL,
    });
    await use(context);
    await context.dispose();
  },
});

export { expect } from '@playwright/test';
