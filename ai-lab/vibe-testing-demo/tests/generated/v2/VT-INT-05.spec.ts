// intent: VT-INT-05
// generated-by: GitHub Copilot CLI 1.0.116 + @playwright/mcp 0.0.86
// generated-at: 2026-11-28T04:56:24Z
// reviewed-by: pending

import { expect, test } from '@playwright/test';

test('VT-INT-05: complete a todo', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('textbox', { name: 'New todo' }).fill('Write tests');
  await page.getByRole('button', { name: 'Add task' }).click();

  const checkbox = page.getByRole('checkbox', { name: 'Write tests' });
  await checkbox.check();
  await expect(checkbox).toBeChecked();
});
