/**
 * Page Load Tests — Title, Content, Meta, Performance
 *
 * Interview Talking Point:
 * "Playwright auto-waits for elements to be actionable before interacting. Unlike
 * Cypress's should('be.visible') chains, Playwright's expect(locator).toBeVisible()
 * automatically retries until the assertion passes or times out."
 */

import { test, expect } from '../../fixtures/base.fixture';
import { TEST_DATA } from '../../fixtures/test-data';

test.describe('Page Load Tests — example.com', () => {

  test('should load the homepage with correct title', async ({ examplePage }) => {
    await examplePage.navigate();

    const title = await examplePage.getTitle();
    expect(title).toBe('Example Domain');
  });

  test('should display the main heading and description', async ({ examplePage }) => {
    await examplePage.navigate();

    // Interview Talking Point:
    // "We use role-based locators (getByRole('heading')) instead of CSS selectors.
    // This makes tests resilient to DOM restructuring and validates accessibility."
    await expect(examplePage.heading).toBeVisible();
    await expect(examplePage.heading).toHaveText('Example Domain');

    await expect(examplePage.description).toContainText(
      'This domain is for use in documentation examples'
    );
  });

  test('should have proper meta charset', async ({ page }) => {
    await page.goto('https://example.com');

    const charset = await page.evaluate(() => document.characterSet);
    // Accept both UTF-8 and Windows-1252 as valid charsets
    expect(['UTF-8', 'windows-1252']).toContain(charset);
  });

  test('should load within performance budget', async ({ page }) => {
    // Interview Talking Point:
    // "Performance budgets in CI catch regressions before users notice. We measure
    // actual navigation timing, not wall-clock time, for more accurate results."
    await page.goto('https://example.com');

    const loadTime = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return nav.loadEventEnd - nav.startTime;
    });

    expect(loadTime).toBeLessThan(TEST_DATA.PAGE_LOAD_BUDGET_MS);
  });
});
