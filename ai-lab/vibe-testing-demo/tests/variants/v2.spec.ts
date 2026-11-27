import { expect, test } from '@playwright/test';

test('v2 保持登录和待办行为', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Username').fill('demo');
  await page.getByLabel('Password').fill('password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('status')).toHaveText('Welcome, demo');
  await page.getByLabel('New todo').fill('Write tests');
  await page.getByRole('button', { name: 'Add task' }).click();
  const item = page.getByRole('listitem').filter({ hasText: 'Write tests' });
  await expect(item).toBeVisible();
  await item.getByRole('checkbox').check();
  await expect(item.getByRole('checkbox')).toBeChecked();
  await item.getByRole('button', { name: 'Delete' }).click();
  await expect(item).toHaveCount(0);
});
