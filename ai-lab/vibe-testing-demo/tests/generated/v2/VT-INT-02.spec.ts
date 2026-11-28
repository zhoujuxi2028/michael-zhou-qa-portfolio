// intent: VT-INT-02
// generated-by: GitHub Copilot CLI 1.0.116 + @playwright/mcp 0.0.86
// generated-at: 2026-11-27T23:30:12Z
// reviewed-by: pending

import { expect, test } from '@playwright/test';

test('VT-INT-02: rejects an incorrect password', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Username').fill('demo');
  await page.getByLabel('Password').fill('wrong-password');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByRole('status')).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Invalid credentials');
});
