import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

const check = async (context, before, after) => {
  const root = await mkdtemp(join(tmpdir(), 'vibe-guard-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  const beforeDir = join(root, 'before');
  const afterDir = join(root, 'after');
  await Promise.all([mkdir(beforeDir), mkdir(afterDir)]);
  if (before !== null) await writeFile(join(beforeDir, 'login.spec.ts'), before);
  if (after !== null) await writeFile(join(afterDir, 'login.spec.ts'), after);
  const result = spawnSync(process.execPath, ['scripts/check-assertions.mjs', beforeDir, afterDir], {
    encoding: 'utf8',
  });
  assert.doesNotMatch(result.stderr, /MODULE_NOT_FOUND/);
  return result;
};

const spec = assertion => `test('login', async ({ page }) => { ${assertion} });`;
const original = spec("await expect(page.locator('#old')).toHaveText('Account locked');");

test('只更改 locator 时通过', async context => {
  const result = await check(context, original, original.replace('#old', '#new'));
  assert.equal(result.status, 0, result.stderr);
});

test('删除断言时报错', async context => {
  const result = await check(context, original, spec(''));
  assert.notEqual(result.status, 0);
});

test('更改 matcher 时拒绝', async context => {
  const result = await check(context, original, spec("await expect(page.locator('#old')).toBeVisible();"));
  assert.notEqual(result.status, 0);
});

test('更改期望值时拒绝', async context => {
  const result = await check(context, original, original.replace('Account locked', ''));
  assert.notEqual(result.status, 0);
});

test('支持嵌套 describe、多行和异步修饰符', async context => {
  const before = "test.describe('login', () => { test('lock', async ({page}) => { await expect(\npage.locator('#a')\n).resolves.not.toHaveText('unlocked'); }); });";
  const result = await check(context, before, before.replace('#a', '#b'));
  assert.equal(result.status, 0, result.stderr);
});

test('不同测试交换断言时拒绝', async context => {
  const before = "test('a', () => { expect(1).toBe(1); }); test('b', () => { expect(2).toBe(2); });";
  const after = "test('a', () => { expect(2).toBe(2); }); test('b', () => { expect(1).toBe(1); });";
  const result = await check(context, before, after);
  assert.notEqual(result.status, 0);
});

test('更改 not 修饰符时拒绝', async context => {
  const result = await check(context, original, original.replace('.toHaveText', '.not.toHaveText'));
  assert.notEqual(result.status, 0);
});

test('语法错误、重复名称、动态名称或文件缺失时拒绝', async context => {
  for (const invalid of [
    "test('broken', () => {",
    "test('a', () => {}); test('a', () => {});",
    "test(name, () => { expect(1).toBe(1); });",
    null,
  ]) {
    const result = await check(context, original, invalid);
    assert.notEqual(result.status, 0);
    assert.notEqual(result.stderr.trim(), '');
  }
});

test('拒绝变量、导入、调用和插值等动态期望参数', async context => {
  for (const value of ['expected', 'getExpected()', '`hello ${name}`', '{ ...options }', '{ [key]: 1 }']) {
    const dynamic = spec(`await expect(page.locator('#old')).toHaveText(${value});`);
    const result = await check(context, dynamic, dynamic);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /unsupported|dynamic/i);
  }
});

test('静态嵌套参数可以比较，测试禁用或外部断言则拒绝', async context => {
  const staticSpec = spec("expect(1).toEqual({ value: [1, true, null, 'x'] });");
  assert.equal((await check(context, staticSpec, staticSpec)).status, 0);
  for (const invalid of [
    "test.skip('login', () => { expect(1).toBe(1); });",
    "test.describe.only('login', () => { test('a', () => { expect(1).toBe(1); }); });",
    "test('a', () => { expect(1).toBe(1); }); test.each([1])('dynamic', () => {});",
    "import { test, expect as check } from '@playwright/test'; test('a', () => { check(1).toBe(1); });",
    "expect(1).toBe(1); test('login', () => { expect(1).toBe(1); });",
  ]) {
    assert.notEqual((await check(context, invalid, invalid)).status, 0);
  }
});
