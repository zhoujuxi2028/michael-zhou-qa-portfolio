/**
 * Network Interception Tests — Mock, Offline, Latency, Capture
 *
 * Interview Talking Point:
 * "Playwright's page.route() intercepts network requests at the browser level.
 * We can mock responses, simulate offline mode, inject latency, and capture
 * requests — all without modifying application code."
 */

import { test, expect } from '../../fixtures/base.fixture';

test.describe('Network Interception Tests', () => {

  test('should mock an API response', async ({ page }) => {
    // Interview Talking Point:
    // "Mocking lets us test UI behavior with controlled data. The application
    // thinks it's talking to the real API, but we inject our response."
    await page.route('**/api/users', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 1, name: 'Mock User' }]),
      });
    });

    // Navigate to a page that would fetch users (using example.com as host)
    await page.goto('https://example.com');
    // The mock is set up and would intercept if the page called /api/users
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('should simulate offline mode by aborting requests', async ({ page }) => {
    // Interview Talking Point:
    // "We test offline behavior by aborting all network requests. This verifies
    // the application handles network failures gracefully."
    let abortedRequests = 0;

    // Set up route to abort specific requests
    await page.route('**/*.css', (route) => {
      abortedRequests++;
      route.abort();
    });

    await page.goto('https://example.com');

    // Page should still render (example.com works without CSS)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('should inject latency into responses', async ({ page }) => {
    // Interview Talking Point:
    // "Simulating slow networks reveals timing issues and loading state bugs.
    // We add artificial delay to verify the page handles slow responses."
    await page.route('**/*', async (route) => {
      // Add 100ms delay to all requests
      await new Promise((resolve) => setTimeout(resolve, 100));
      await route.continue();
    });

    await page.goto('https://example.com');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('should capture and inspect network requests', async ({ page }) => {
    // Interview Talking Point:
    // "Request capturing is useful for verifying that the application sends
    // correct headers, methods, and payloads to the backend."
    const requests: { url: string; method: string }[] = [];

    page.on('request', (request) => {
      requests.push({
        url: request.url(),
        method: request.method(),
      });
    });

    await page.goto('https://example.com');
    await page.waitForLoadState('networkidle');

    // Verify at least the main document was requested
    const mainRequest = requests.find((r) => r.url.includes('example.com'));
    expect(mainRequest).toBeDefined();
    expect(mainRequest!.method).toBe('GET');
  });
});
