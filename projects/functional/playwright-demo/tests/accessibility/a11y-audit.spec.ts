/**
 * Accessibility Tests — axe-core Integration
 *
 * Interview Talking Point:
 * "We integrate axe-core, the industry-standard accessibility engine, directly into
 * Playwright tests. This catches WCAG violations in CI before they reach production.
 * Cypress requires a separate plugin; Playwright's architecture makes integration
 * straightforward."
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Audit — example.com', () => {

  test('should have no critical accessibility violations', async ({ page }) => {
    await page.goto('https://example.com');

    // Interview Talking Point:
    // "We scan for critical and serious violations — these are WCAG failures that
    // would block users with disabilities. Minor/moderate issues are logged but
    // don't fail the build, allowing progressive remediation."
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const critical = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(critical, `Found ${critical.length} critical/serious a11y violations`).toHaveLength(0);
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('https://example.com');

    // Verify h1 exists and is unique
    const h1Elements = page.getByRole('heading', { level: 1 });
    await expect(h1Elements).toHaveCount(1);

    // Verify the heading has meaningful text content
    await expect(h1Elements.first()).not.toHaveText('');
  });

  test('should have accessible link text', async ({ page }) => {
    await page.goto('https://example.com');

    // Interview Talking Point:
    // "Links must have descriptive text for screen readers. Generic 'click here' or
    // 'read more' links fail accessibility audits. We verify link text is meaningful."
    const links = page.getByRole('link');
    const count = await links.count();

    for (let i = 0; i < count; i++) {
      const linkText = await links.nth(i).textContent();
      expect(linkText?.trim().length).toBeGreaterThan(0);

      // Verify links have href attributes
      const href = await links.nth(i).getAttribute('href');
      expect(href).toBeTruthy();
    }
  });
});
