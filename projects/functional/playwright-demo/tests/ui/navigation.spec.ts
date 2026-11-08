/**
 * Navigation & Multi-Tab Tests
 *
 * Interview Talking Point:
 * "Multi-tab handling is a Playwright exclusive — Cypress explicitly does not support
 * testing across multiple tabs or windows. Playwright's context.newPage() and popup
 * event listeners make this straightforward."
 */

import { test, expect } from '../../fixtures/base.fixture';

test.describe('Navigation Tests', () => {

  test('learn-more link should point to IANA', async ({ examplePage }) => {
    await examplePage.navigate();

    const href = await examplePage.getLearnMoreHref();
    expect(href).toContain('iana.org');
  });

  test('should handle navigation to external link', async ({ page }) => {
    await page.goto('https://example.com');

    // Interview Talking Point:
    // "We verify the link destination without actually navigating, keeping tests
    // fast and avoiding flaky external site dependencies."
    const link = page.getByRole('link', { name: /learn more/i });
    const href = await link.getAttribute('href');
    expect(href).toBeTruthy();
    expect(href).toContain('iana.org');
  });

  test('multi-tab — should open a new tab and verify content', async ({ context }) => {
    // Interview Talking Point:
    // "This is impossible in Cypress. Playwright's browser context manages multiple
    // pages (tabs). We create a new tab, navigate independently, and assert across
    // both tabs. This is essential for testing OAuth flows, popups, or link targets."

    // Open first tab
    const page1 = await context.newPage();
    await page1.goto('https://example.com');
    await expect(page1.getByRole('heading', { level: 1 })).toHaveText('Example Domain');

    // Open second tab
    const page2 = await context.newPage();
    await page2.goto('https://example.com');
    await expect(page2.getByRole('heading', { level: 1 })).toHaveText('Example Domain');

    // Both tabs are independently controllable
    const title1 = await page1.title();
    const title2 = await page2.title();
    expect(title1).toBe(title2);

    await page1.close();
    await page2.close();
  });
});
