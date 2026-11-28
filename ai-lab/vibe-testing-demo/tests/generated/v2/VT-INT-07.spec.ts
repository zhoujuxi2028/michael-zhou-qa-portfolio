// intent: VT-INT-07
// generated-by: GitHub Copilot CLI 1.0.116 + @playwright/mcp 0.0.86
// generated-at: 2026-11-28T06:05:36Z
// reviewed-by: Claude Code (AI review, authorized by Michael Zhou) 2026-11-28

import { expect, test } from '@playwright/test';

test('rejects a whitespace-only todo', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('list').getByRole('listitem')).toHaveCount(0);
  await page.getByRole('textbox', { name: 'New todo' }).fill('   ');
  await page.getByRole('button', { name: 'Add task' }).click();

  await expect(page.getByRole('list').getByRole('listitem')).toHaveCount(0);
  await expect(page.getByRole('alert')).toHaveText('Todo cannot be empty');
  await expect(page.getByRole('alert')).toBeVisible();
});
