import { expect, test } from '@playwright/test';

test('mutant 在第五次失败后而非第三次锁定', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Username').fill('demo');
  await page.getByLabel('Password').fill('wrong');
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.getByRole('button', { name: 'Log in' }).click();
  }
  await expect(page.getByRole('status')).toHaveText('Invalid credentials');
  for (let attempt = 0; attempt < 2; attempt++) {
    await page.getByRole('button', { name: 'Log in' }).click();
  }
  await expect(page.getByRole('status')).toHaveText('Account locked');
});
