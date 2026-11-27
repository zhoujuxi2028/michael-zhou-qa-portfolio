# Vibe Testing Demo — 架构设计

## 数据流

```text
intents/VT-INT-NN.md（自然语言意图）
        │
        ▼
scripts/generate.sh ──► Claude Code（claude -p）
                            │  MCP
                            ▼
                     Playwright MCP ──► Chromium ──► app/v1（本地被测应用）
                            │
                            ▼
              tests/generated/VT-INT-NN.spec.ts   +   docs/runs/<日期>-generate-NN.md
                            │
          人工复核（docs/qa/ai-code-review-checklist.md）后提交
                            │
                            ▼
npm test（@playwright/test 稳定版） ──► app/v1 / v2 / mutant ──► HTML 报告
```

## 自愈流程（VT-07）

```text
APP_VERSION=v2 npm test ──► 失败输出 docs/runs/<日期>-heal-before.txt
        │
        ▼
scripts/heal.sh ──► Claude Code + MCP 探索 v2 页面，只改选择器 / 等待
        │
        ▼
scripts/check-assertions.mjs（比对修复前后 expect 断言）──► 有削弱则退出码 1
        │
        ▼
APP_VERSION=v2 npm test 通过 ──► diff 记录 docs/runs/<日期>-heal-diff.md
```

## 目录结构

| 路径 | 职责 |
|------|------|
| `app/v1/index.html` | 被测应用：登录（3 次失败锁定）+ 待办（新增、完成、删除、空输入校验） |
| `app/v2/index.html` | 改版：按钮文案、`id`、占位符变化，业务逻辑不变 |
| `app/mutant/index.html` | 变异版：锁定阈值 3 → 5（VT-10） |
| `scripts/serve.mjs` | Node 原生 `http` 静态服务，按 `APP_VERSION` 提供目录，零依赖 |
| `intents/` | 自然语言意图（VT-02） |
| `prompts/generate.md`、`prompts/heal.md` | 生成 / 修复提示词模板 |
| `scripts/generate.sh`、`scripts/heal.sh` | 调用 `claude -p`，限制工具范围（RSK-VT-009） |
| `scripts/check-assertions.mjs` | 断言守卫（RSK-VT-002） |
| `tests/generated/` | AI 生成、人工复核后的用例 |
| `.mcp.json` | 项目级 MCP 配置，指向本地 `playwright-mcp`（RSK-VT-007） |
| `playwright.config.ts` | `webServer` 启动 `serve.mjs`；`baseURL` 由 `APP_VERSION` 决定 |
| `docs/runs/` | 生成 / 修复记录（VT-05） |

## 接口

| 接口 | 定义 |
|------|------|
| `APP_VERSION` | `v1`（默认）/ `v2` / `mutant` |
| `scripts/generate.sh <VT-INT-NN>` | 读意图 → 生成 `tests/generated/VT-INT-NN.spec.ts`；工具范围 `mcp__playwright__*`、`Write(tests/generated/**)` |
| `scripts/heal.sh <failure-file>` | 读失败输出 → 修复 `tests/generated/*.spec.ts`；同样的工具范围 |
| `node scripts/check-assertions.mjs <before-ref>` | 比对 `expect(...)` 数量与断言内容（matcher + 期望值），不一致退出码 1 |
| 用例文件头 | `// intent: VT-INT-NN` / `// generated-by: Claude Code <版本> + @playwright/mcp <版本>` / `// generated-at` / `// reviewed-by` |

## 关键决策

| # | 决策 | 理由 |
|---|------|------|
| D1 | 被测应用自己写（静态 HTML） | 可控：能精确制造改版（v2）和缺陷（mutant）；零外部依赖 |
| D2 | CI 不调用 AI | 生成结果不确定且有成本；CI 只验证已提交、已复核的用例 |
| D3 | MCP 只用于生成 / 修复，执行用稳定版 `@playwright/test` | 隔离 MCP 的 alpha 依赖（RSK-VT-008） |
| D4 | 断言守卫脚本化 | 不依赖人工记忆，防止 Agent 削弱断言（RSK-VT-002） |
| D5 | 静态服务用 Node 原生 `http` | 不引入额外依赖，CI 与本地一致 |
