// intent: VT-INT-03
// generated-by: GitHub Copilot CLI 1.0.116 + @playwright/mcp 0.0.86
// generated-at: 2026-11-27T23:33:38Z
// reviewed-by: Claude Code (AI review, authorized by Michael Zhou) 2026-11-28

import { expect, test } from '@playwright/test';

test('locks the account after three failed attempts and rejects the correct password', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('textbox', { name: 'Username' }).fill('demo');
  await page.getByRole('textbox', { name: 'Password' }).fill('wrong');
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.getByRole('button', { name: 'Log in' }).click();

  await expect(page.getByRole('status')).toHaveText('Account locked');

  await page.getByRole('textbox', { name: 'Password' }).fill('password');
  await page.getByRole('button', { name: 'Log in' }).click();

  await expect(page.getByRole('status')).toHaveText('Account locked');
});
