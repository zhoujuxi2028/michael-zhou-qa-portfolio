# Vibe Testing Demo — 架构设计

## 数据流

```text
intents/VT-INT-NN.md（自然语言意图）
        │
        ▼
scripts/generate.sh ──► GitHub Copilot CLI（copilot -p）
                            │  MCP
                            ▼
                     Playwright MCP ──► Chromium ──► app/v1（本地被测应用）
                            │
                            ▼
              tests/generated/v1/VT-INT-NN.spec.ts   +   docs/runs/<日期>-generate-NN.md
                            │
          人工复核（docs/qa/ai-code-review-checklist.md）后提交
                            │
                            ▼
npm test（v1）/ 分别指定 v2 或 mutant 命令 ──► 对应 app ──► HTML 报告
```

## 自愈流程（VT-07）

```text
复制 tests/generated/v1/ 到不存在的 tests/generated/v2/
        │
        ▼
APP_VERSION=v2 npx playwright test tests/generated/v2 --project=chromium
        │
        ▼
失败输出 docs/runs/<日期>-heal-before.txt
        │
        ▼
scripts/heal.sh ──► Copilot CLI + MCP 只修改已有副本的选择器 / 等待
        │
        ▼
scripts/check-assertions.mjs（AST 比对修复前后断言）──► 不一致或无法解析则退出码 1
        │
        ▼
APP_VERSION=v2 npx playwright test tests/generated/v2 --project=chromium 通过
        │
        ▼
diff 记录 docs/runs/<日期>-heal-diff.md
```

## 目录结构

| 路径 | 职责 |
|------|------|
| `app/v1/index.html` | 被测应用：登录（3 次失败锁定）+ 待办（新增、完成、删除、空输入校验） |
| `app/v2/index.html` | 改版：选择器和非断言文案变化，被断言文案及业务逻辑不变 |
| `app/mutant/index.html` | 变异版：锁定阈值 3 → 5（VT-10） |
| `scripts/serve.mjs` | Node 原生 `http` 静态服务，按 `APP_VERSION` 提供目录，零依赖 |
| `intents/` | 自然语言意图（VT-02） |
| `prompts/generate.md`、`prompts/heal.md` | 生成 / 修复提示词模板 |
| `scripts/generate.sh`、`scripts/heal.sh` | 调用 `copilot -p`；限制工具权限，并验证 MCP 进程隔离（RSK-VT-009） |
| `scripts/check-assertions.mjs` | 断言守卫（RSK-VT-002） |
| `tests/generated/` | AI 生成、人工复核后的用例 |
| `.mcp.json` | 项目级 MCP 配置，指向本地 `playwright-mcp`（RSK-VT-007） |
| `playwright.config.ts` | `webServer` 启动 `serve.mjs`；`APP_VERSION` 选择被测目录，`baseURL` 指向本地服务 |
| `docs/runs/` | 生成 / 修复记录（VT-05） |

## 接口

| 接口 | 定义 |
|------|------|
| `APP_VERSION` | `v1`（默认）/ `v2` / `mutant` |
| `scripts/generate.sh <VT-INT-NN>` | 读意图 → 调用 Copilot → 生成对应的 `tests/generated/v1/VT-INT-NN.spec.ts`；失败返回非零 |
| `scripts/heal.sh <failure-file>` | 保留 v1 用例，读取已有 v2 副本及失败输出；不覆盖副本，修复后执行守卫及人工复核；副本或失败记录缺失时报错 |
| `node scripts/check-assertions.mjs <before-dir> <after-dir>` | 按文件和测试完整名称比较 TypeScript AST 中的 matcher、修饰符、参数与数量；允许被测 locator 变化，不一致或不支持的语法返回非零 |
| 用例文件头 | `// intent: VT-INT-NN` / `// generated-by: GitHub Copilot CLI <版本> + @playwright/mcp <版本>` / `// generated-at` / `// reviewed-by` |

## 守卫与权限边界

- 守卫拒绝解析失败、缺失文件、动态或重复测试名以及无法识别的断言；不能证明断言实际执行，也无法替代对条件绕过、测试禁用和页面状态修改的人工复核。
- matcher 参数只接受可静态比较的字面量（字符串、数字、布尔、null、正则）、无插值模板字符串及其嵌套的数组和对象；变量、导入值、调用、展开、计算属性及其他表达式均报错，不能仅比较标识符文本。无参数 matcher 允许使用。修复前后逐项比较参数及其顺序。
- 工具权限规则限制 Copilot 的工具请求，不等同于 MCP 进程的操作系统隔离。自定义 MCP 的文件访问限制已有探针结果，Playwright MCP 及网络、凭据隔离仍待验证；验证不足时不执行有风险的自动操作。
- 本地服务仅绑定回环地址；未知 `APP_VERSION`、不存在的资源及越界路径返回错误，不回退到其他应用版本。
- v1 和 mutant 始终使用 `tests/generated/v1/`；v2 使用自愈后的 `tests/generated/v2/` 副本。v2 只改选择器和非断言文案，不改变被断言文案或业务行为；分别执行两套测试，避免重复发现。
- 创建 v2 副本时若目录已存在则报错，不覆盖已有文件；复核后再选择如何处理现有副本。

## 关键决策

| # | 决策 | 理由 |
|---|------|------|
| D1 | 被测应用自己写（静态 HTML） | 可控：能精确制造改版（v2）和缺陷（mutant）；零外部依赖 |
| D2 | CI 不调用 AI | 生成结果不确定且有成本；CI 只验证已提交、已复核的用例 |
| D3 | MCP 只用于生成 / 修复，执行用稳定版 `@playwright/test` | 隔离 MCP 的 alpha 依赖（RSK-VT-008） |
| D4 | 断言守卫脚本化 | 不依赖人工记忆，防止 Agent 削弱断言（RSK-VT-002） |
| D5 | 静态服务用 Node 原生 `http` | 不引入额外依赖，CI 与本地一致 |
