# 生成缺陷：VT-INT-07 首次生成在 v1 上失败

| 项目 | 内容 |
|------|------|
| 日期 | 2026-11-28 |
| 生成 | GitHub Copilot CLI 1.0.116 + @playwright/mcp 0.0.86 |
| 现象 | 对空列表断言 `toBeVisible()`；空 `<ul>` 高度为 0，Playwright 判定不可见 |
| 根因 | Agent 在快照中看到 `list` 节点，将“存在”等同于“可见” |
| 处理 | 未手改生成代码；补充提示词后丢弃本次结果并重新生成 |
| 发现方式 | 生成后在 v1 上执行（人工复核前的自动验证） |

## 生成的用例

```ts
// intent: VT-INT-07
// generated-by: GitHub Copilot CLI 1.0.116 + @playwright/mcp 0.0.86
// generated-at: 2026-11-28T04:59:21Z
// reviewed-by: pending

import { expect, test } from '@playwright/test';

test('rejects a whitespace-only todo', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('list')).toBeVisible();
  await expect(page.getByRole('list').getByRole('listitem')).toHaveCount(0);

  await page.getByRole('textbox', { name: 'New todo' }).fill('   ');
  await page.getByRole('button', { name: 'Add todo' }).click();

  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveText('Todo cannot be empty');
  await expect(page.getByRole('list').getByRole('listitem')).toHaveCount(0);
});
```

## 执行输出

```text
Running 1 test using 1 worker
[1/1] [chromium] › tests/generated/v1/VT-INT-07.spec.ts:8:1 › rejects a whitespace-only todo
  1) [chromium] › tests/generated/v1/VT-INT-07.spec.ts:8:1 › rejects a whitespace-only todo ────────
    Error: expect(locator).toBeVisible() failed
    Locator:  getByRole('list')
    Expected: visible
    Received: hidden
    Timeout:  5000ms
    Call log:
      - Expect "toBeVisible" getByRole('list') with timeout 5000ms
      - waiting for getByRole('list')
        14 × locator resolved to <ul id="todo-list"></ul>
           - unexpected value "hidden"
       9 |   await page.goto('/');
      10 |
    > 11 |   await expect(page.getByRole('list')).toBeVisible();
         |                                        ^
      12 |   await expect(page.getByRole('list').getByRole('listitem')).toHaveCount(0);
      13 |
      14 |   await page.getByRole('textbox', { name: 'New todo' }).fill('   ');
        at tests/generated/v1/VT-INT-07.spec.ts:11:40
    Error Context: test-results/generated-v1-VT-INT-07-rejects-a-whitespace-only-todo-chromium/error-context.md
  1 failed
    [chromium] › tests/generated/v1/VT-INT-07.spec.ts:8:1 › rejects a whitespace-only todo ─────────
```
