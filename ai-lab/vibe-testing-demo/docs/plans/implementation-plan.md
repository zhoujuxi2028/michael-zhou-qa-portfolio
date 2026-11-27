# Vibe Testing Demo — 实施计划（阶段 3 / 4）

## 前置条件

| 工具 | 版本 | 验证命令 |
|------|------|---------|
| Node.js | ≥ 20（本机 v26） | `node --version` |
| Claude Code | 2.1.322 | `claude --version` |
| `@playwright/mcp` | 0.0.86（devDependency） | `npx playwright-mcp --version` |
| `@playwright/test` | 与 `playwright-demo` 一致（稳定版） | `npx playwright --version` |
| Chromium | 随 `npx playwright install chromium` | `ls ~/Library/Caches/ms-playwright` |

## 任务拆分（每个任务独立 commit）

| # | 任务 | 产出 | TDD / 验证 |
|---|------|------|-----------|
| T1 | 项目骨架 | `package.json`、`tsconfig.json`、`playwright.config.ts`、`.mcp.json`、`.gitignore` | `npm ci` 成功 |
| T2 | 静态服务 + 被测应用 v1 | `scripts/serve.mjs`、`app/v1/index.html` | 手写冒烟用例 `tests/smoke/app.spec.ts`（先失败后通过），之后保留为基线 |
| T3 | 断言守卫 | `scripts/check-assertions.mjs` + `tests/unit/check-assertions.test.mjs`（`node --test`） | TC-AG-01 ~ 04 先失败后通过 |
| T4 | 意图与提示词 | `intents/VT-INT-01..07.md`、`prompts/generate.md`、`prompts/heal.md` | 文档评审 |
| T5 | 生成脚本 + 生成用例 | `scripts/generate.sh`；运行生成 7 个用例；`docs/runs/` 记录 | 人工按复核清单复核；v1 上 7 / 7 通过 |
| T6 | 变异版 | `app/mutant/index.html` | mutant 上 TC-VT-03 失败，其余通过 |
| T7 | 改版 + 自愈 | `app/v2/index.html`、`scripts/heal.sh`；记录失败 → 修复 → 通过 | `check-assertions` 通过；v2 上 7 / 7 通过 |
| T8 | CI | `.github/workflows/vibe-testing-ci.yml`：v1 全过、mutant 预期失败、断言守卫单测 | PR 上 CI 绿 |
| T9 | 文档 | `docs/qa/ai-code-review-checklist.md`、`docs/guides/vibe-testing-playbook.md`、README | 阶段 5 评审 |

## 关键代码示例

`playwright.config.ts`（片段）

```ts
const version = process.env.APP_VERSION ?? 'v1';
export default defineConfig({
  testDir: './tests',
  webServer: { command: `node scripts/serve.mjs ${version}`, url: 'http://localhost:4173', reuseExistingServer: !process.env.CI },
  use: { baseURL: 'http://localhost:4173' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
```

`scripts/generate.sh`（片段）

```bash
claude -p "$(cat prompts/generate.md intents/$1.md)" \
  --mcp-config .mcp.json --strict-mcp-config \
  --allowedTools "mcp__playwright__*" "Write(tests/generated/**)" \
  --max-turns 30 < /dev/null | tee "docs/runs/$(date +%F)-generate-$1.md"
```

## 不做

- CI 中调用 AI；移动端；视觉回归；自研 Agent 框架
