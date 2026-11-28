# 生成缺陷：VT-INT-04 首次生成在 v1 上失败

| 项目 | 内容 |
|------|------|
| 日期 | 2026-11-28 |
| 生成 | GitHub Copilot CLI 1.0.116 + @playwright/mcp 0.0.86 |
| 现象 | `toHaveText('Write tests')` 精确匹配整个 `<li>`，实际文本含删除按钮：`Write testsDelete` |
| 根因 | 提示词未说明含子控件元素的断言方式；Agent 不能运行测试，无法自行发现 |
| 处理 | 未手改生成代码；补充提示词后丢弃本次结果并重新生成 |
| 发现方式 | 生成后在 v1 上执行（人工复核前的自动验证） |

## 生成的用例

```ts
// intent: VT-INT-04
// generated-by: GitHub Copilot CLI 1.0.116 + @playwright/mcp 0.0.86
// generated-at: 2026-11-27T23:34:44Z
// reviewed-by: pending

import { expect, test } from '@playwright/test';

test('adds a todo', async ({ page }) => {
  await page.goto('/');

  const todoList = page.getByRole('list');
  await expect(todoList).toBeEmpty();

  await page.getByRole('textbox', { name: 'New todo' }).fill('Write tests');
  await page.getByRole('button', { name: 'Add todo' }).click();

  await expect(page.getByRole('listitem')).toHaveText('Write tests');
});
```

## 执行输出

```text
Running 1 test using 1 worker
[1/1] [chromium] › tests/generated/v1/VT-INT-04.spec.ts:8:1 › adds a todo
  1) [chromium] › tests/generated/v1/VT-INT-04.spec.ts:8:1 › adds a todo ───────────────────────────
    Error: expect(locator).toHaveText(expected) failed
    Locator:  getByRole('listitem')
    Expected: "Write tests"
    Received: "Write testsDelete"
    Timeout:  5000ms
    Call log:
      - Expect "toHaveText" getByRole('listitem') with timeout 5000ms
      - waiting for getByRole('listitem')
        14 × locator resolved to <li>…</li>
           - unexpected value "Write testsDelete"
      15 |   await page.getByRole('button', { name: 'Add todo' }).click();
      16 |
    > 17 |   await expect(page.getByRole('listitem')).toHaveText('Write tests');
         |                                            ^
      18 | });
      19 |
        at tests/generated/v1/VT-INT-04.spec.ts:17:44
    Error Context: test-results/generated-v1-VT-INT-04-adds-a-todo-chromium/error-context.md
  1 failed
    [chromium] › tests/generated/v1/VT-INT-04.spec.ts:8:1 › adds a todo ────────────────────────────
```
