/**
 * Shared Test Data — Constants, Viewports, and Test Payloads
 *
 * Interview Talking Point:
 * "Centralizing test data in one file prevents magic strings scattered across tests.
 * When an API endpoint changes, we update one constant — not 12 test files."
 */

export const TEST_DATA = {
  /** JSONPlaceholder base URL (same public API used in cicd-demo) */
  API_BASE_URL: 'https://jsonplaceholder.typicode.com',

  /** Example.com URL for UI tests */
  EXAMPLE_URL: 'https://example.com',

  /** Viewport configurations for responsive testing */
  VIEWPORTS: {
    mobile: { width: 375, height: 667, label: 'Mobile (375×667)' },
    tablet: { width: 768, height: 1024, label: 'Tablet (768×1024)' },
    desktop: { width: 1920, height: 1080, label: 'Desktop (1920×1080)' },
  },

  /** Test post payload for CRUD operations */
  TEST_POST: {
    title: 'Test Post from Playwright',
    body: 'This post was created during automated Playwright testing',
    userId: 1,
  },

  /** Test user data for schema validation */
  USER_SCHEMA_KEYS: [
    'id', 'name', 'username', 'email', 'address', 'phone', 'website', 'company',
  ] as const,

  /** Post schema keys */
  POST_SCHEMA_KEYS: ['userId', 'id', 'title', 'body'] as const,

  /** Performance budget (ms) */
  PAGE_LOAD_BUDGET_MS: 5_000,
} as const;
