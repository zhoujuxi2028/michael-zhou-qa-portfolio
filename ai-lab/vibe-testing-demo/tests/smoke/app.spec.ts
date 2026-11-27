import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('正确账号登录后显示欢迎语', async ({ page }) => {
  await page.getByLabel('Username').fill('demo');
  await page.getByLabel('Password').fill('password');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByRole('status')).toHaveText('Welcome, demo');
});

test('错误密码显示错误提示', async ({ page }) => {
  await page.getByLabel('Username').fill('demo');
  await page.getByLabel('Password').fill('wrong');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByRole('status')).toHaveText('Invalid credentials');
});

test('连续三次登录失败后锁定账号', async ({ page }) => {
  await page.getByLabel('Username').fill('demo');
  await page.getByLabel('Password').fill('wrong');
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.getByRole('button', { name: 'Log in' }).click();
  }
  await expect(page.getByRole('status')).toHaveText('Account locked');
  await page.getByLabel('Password').fill('password');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByRole('status')).toHaveText('Account locked');
});

test('新增、完成及删除待办', async ({ page }) => {
  await page.getByLabel('New todo').fill('Write tests');
  await page.getByRole('button', { name: 'Add todo' }).click();
  const item = page.getByRole('listitem').filter({ hasText: 'Write tests' });
  await expect(item).toBeVisible();
  await item.getByRole('checkbox').check();
  await expect(item.getByRole('checkbox')).toBeChecked();
  await item.getByRole('button', { name: 'Delete' }).click();
  await expect(item).toHaveCount(0);
});

test('拒绝空白待办', async ({ page }) => {
  await page.getByLabel('New todo').fill('   ');
  await page.getByRole('button', { name: 'Add todo' }).click();
  await expect(page.getByRole('listitem')).toHaveCount(0);
  await expect(page.getByRole('alert')).toHaveText('Todo cannot be empty');
});
