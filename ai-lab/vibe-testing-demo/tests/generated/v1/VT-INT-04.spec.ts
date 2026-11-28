// intent: VT-INT-04
// generated-by: GitHub Copilot CLI 1.0.116 + @playwright/mcp 0.0.86
// generated-at: 2026-11-28T04:55:16Z
// reviewed-by: Claude Code (AI review, authorized by Michael Zhou) 2026-11-28

import { expect, test } from '@playwright/test';

test('VT-INT-04: add a todo', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('listitem')).toHaveCount(0);
  await page.getByRole('textbox', { name: 'New todo' }).fill('Write tests');
  await page.getByRole('button', { name: 'Add todo' }).click();

  await expect(
    page.getByRole('listitem').filter({ hasText: 'Write tests' })
      .getByRole('checkbox', { name: 'Write tests', exact: true }),
  ).toBeVisible();
});
