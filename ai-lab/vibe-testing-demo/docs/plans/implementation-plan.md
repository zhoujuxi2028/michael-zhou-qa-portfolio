# Vibe Testing Demo — 实施计划（阶段 3 / 4）

## 前置条件

| 工具 | 版本 | 验证命令 |
|------|------|---------|
| Node.js | ≥ 20（本机 v26） | `node --version` |
| GitHub Copilot CLI | PoC 使用 1.0.114 | `copilot --version` |
| `@playwright/mcp` | 0.0.86（devDependency） | `npx playwright-mcp --version` |
| `@playwright/test` | 与 `playwright-demo` 一致（稳定版） | `npx playwright --version` |
| Chromium | 随 `npx playwright install chromium` | `ls ~/Library/Caches/ms-playwright` |

## 任务拆分（每个任务独立 commit）

| # | 任务 | 产出 | TDD / 验证 |
|---|------|------|-----------|
| T1 | 项目骨架 | `package.json`、`tsconfig.json`、`playwright.config.ts`、`.mcp.json`、`.gitignore` | `npm ci` 成功 |
| T2 | 静态服务 + 被测应用 v1 | `scripts/serve.mjs`、`app/v1/index.html` | 手写冒烟用例 `tests/smoke/app.spec.ts`（先失败后通过），之后保留为基线 |
| T3 | 断言守卫 | `scripts/check-assertions.mjs` + `tests/unit/check-assertions.test.mjs`（`node --test`）；TypeScript AST 按测试比较 matcher、修饰符与期望值 | TC-AG-01 ~ 09 先失败后通过 |
| T4 | 意图与提示词 | `intents/VT-INT-01..07.md`、`prompts/generate.md`、`prompts/heal.md` | 文档评审 |
| T5 | 生成脚本 + 生成用例 | `scripts/generate.sh`；Copilot 生成 7 个 v1 用例；`docs/runs/` 记录 | 失败路径集成测试；人工复核；v1 上 7 / 7 通过 |
| T6 | 变异版 | `app/mutant/index.html` | 机器可读结果确认只有 TC-VT-03 因预期断言失败，其余通过 |
| T7 | 改版 + 自愈 | `app/v2/index.html`、`scripts/heal.sh`；保留 v1 用例，在 v2 副本记录失败 → 修复 → 通过 | 失败路径集成测试；AST 守卫和人工复核通过；v2 上 7 / 7 通过 |
| T8 | CI | `.github/workflows/vibe-testing-ci.yml`：v1 全过、精确验证 mutant、断言守卫和集成测试；不调用 AI | workflow 文档同步；后续 PR 上 CI 绿 |
| T9 | 文档 | `docs/qa/ai-code-review-checklist.md`、`docs/guides/vibe-testing-playbook.md`、README | 阶段 5 评审 |

## 关键设计约束

### Agent 方案差异

| 文档 | 原设计 | Copilot 设计 |
|------|--------|--------------|
| `docs/project-management/requirements.md` | Claude Code 执行意图 | Copilot CLI 执行意图；保留七个意图和人工复核 |
| `docs/architecture/architecture.md` | `claude -p` 与断言文本比对 | `copilot -p`、项目 MCP 配置与 TypeScript AST 比对 |
| `docs/qa/test-plan.md` | 基础断言守卫用例 | 增加不支持语法、集成失败路径和精确变异验证 |
| `docs/project-management/risks.md` | 将工具白名单作为越权缓解措施 | 单独评估 MCP 进程隔离及数据进入模型上下文的风险 |
| `CLAUDE.md`、`README.md` | Claude Code 为项目 Agent | Copilot CLI 为项目 Agent；保留历史 Claude PoC |

PoC-02 验证了一个意图，并补充了自定义 MCP 子进程的文件隔离探针：项目本地 `deniedPaths` 未按预期生效，独立用户级配置可阻止访问测试标记。尚未验证 Playwright MCP 的隔离、自愈或完整七个用例，不能作为这些项目的验收证据。

`playwright.config.ts`（片段）

```ts
const version = process.env.APP_VERSION ?? 'v1';
if (!['v1', 'v2', 'mutant'].includes(version)) {
  throw new Error(`Unsupported APP_VERSION: ${version}`);
}
export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  webServer: { command: `node scripts/serve.mjs ${version}`, url: 'http://127.0.0.1:4173', reuseExistingServer: false },
  use: { baseURL: 'http://127.0.0.1:4173' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
```

- 生成和自愈使用 `copilot -p` 与项目 MCP 配置；在项目目录安装 Node.js 依赖，不在仓库根目录安装子项目依赖。
- Copilot 工具权限只放行必要操作；权限规则不限制 MCP 进程本身。验证进程隔离、检查文件差异并使用演示数据；隔离不足时暂停有风险的自动执行。
- 断言守卫输入为修复前快照目录和修复后目录；无法解析或不支持的断言返回非零，人工检查禁用测试、控制流和页面状态。
- `npm test` 只运行 `tests/generated/v1/`；v2、冒烟、Node 单测各用独立命令，Playwright `testMatch` 只匹配 `*.spec.ts`。v1/mutant 使用 v1 目录，v2 使用副本；用 `--list` 核对发现数量。
- 独立设计评审提出 v1/v2 兼容、静态断言参数、测试发现、隔离放行及覆盖率五项问题；本设计分别给出约束，待人工复核。实际 MCP 隔离验证未完成，仍阻塞自动生成及自愈，不阻塞评审通过后的基础开发。
- T2、T5、T6、T7 的集成用例在阶段 3 完成；阶段 4 只运行并评估已有测试。
- 每阶段完成后按 `docs/dev-process-checklist.md` 报告状态并等待人工确认。

## 不做

- CI 中调用 AI；移动端；视觉回归；自研 Agent 框架
