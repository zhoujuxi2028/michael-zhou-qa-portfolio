/**
 * Visual Regression Tests — Built-in Screenshot Comparison
 *
 * Interview Talking Point:
 * "Playwright's toHaveScreenshot() is built-in — no plugins needed. Cypress requires
 * third-party plugins like cypress-image-snapshot. Playwright generates baseline
 * screenshots on first run and diffs against them on subsequent runs."
 */

import { test, expect } from '@playwright/test';

test.describe('Visual Regression — example.com', () => {

  test('full page should match baseline screenshot', async ({ page }) => {
    await page.goto('https://example.com');
    await page.waitForLoadState('networkidle');

    // Interview Talking Point:
    // "toHaveScreenshot() auto-creates baselines on first run. On subsequent runs,
    // it pixel-diffs against the baseline. maxDiffPixelRatio handles minor rendering
    // differences across CI environments."
    await expect(page).toHaveScreenshot('full-page.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });

  test('heading element should match baseline', async ({ page }) => {
    await page.goto('https://example.com');

    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();

    await expect(heading).toHaveScreenshot('heading.png', {
      maxDiffPixelRatio: 0.05,
    });
  });

  test('page should match across viewport sizes', async ({ page }) => {
    // Interview Talking Point:
    // "Cross-viewport visual testing catches responsive CSS regressions. We set
    // the viewport, take a screenshot, and compare against a device-specific baseline."
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('https://example.com');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('mobile-view.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });
});
