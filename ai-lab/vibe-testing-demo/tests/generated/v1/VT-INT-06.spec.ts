// intent: VT-INT-06
// generated-by: GitHub Copilot CLI 1.0.116 + @playwright/mcp 0.0.86
// generated-at: 2026-11-28T04:58:01Z
// reviewed-by: pending

import { expect, test } from '@playwright/test';

test('deletes a todo', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('textbox', { name: 'New todo' }).fill('Write tests');
  await page.getByRole('button', { name: 'Add todo' }).click();

  const todo = page.getByRole('listitem').filter({ hasText: 'Write tests' });
  await expect(todo).toBeVisible();
  await todo.getByRole('button', { name: 'Delete' }).click();
  await expect(todo).toHaveCount(0);
});
