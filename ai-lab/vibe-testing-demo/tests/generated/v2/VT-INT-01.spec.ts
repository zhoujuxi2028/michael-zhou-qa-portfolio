// intent: VT-INT-01
// generated-by: GitHub Copilot CLI 1.0.116 + @playwright/mcp 0.0.86
// generated-at: 2026-11-27T23:27:54Z
// reviewed-by: Claude Code (AI review, authorized by Michael Zhou) 2026-11-28

import { expect, test } from '@playwright/test';

test('VT-INT-01: successful login', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Username' }).fill('demo');
  await page.getByRole('textbox', { name: 'Password' }).fill('password');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByRole('status')).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Welcome, demo');
});
