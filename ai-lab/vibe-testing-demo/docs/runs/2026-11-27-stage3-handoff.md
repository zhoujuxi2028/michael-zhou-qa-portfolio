# 阶段 3 开发归档

> 后续决定：用户已接受本地演示的 MCP 残余风险，进程级隔离不再是生成或自愈的验收门禁；现行边界见 [风险登记册](../project-management/risks.md)。下文保留归档当时的状态、放行条件及验证事实，不代表当前门禁。

## 范围与状态

- 项目：`ai-lab/vibe-testing-demo`；关联 #946。#952 已合并，包含此前的设计与 PoC。
- 开发分支：`feature/vibe-testing-copilot`；归档前基线提交为 `f38d8181`。本记录及后续提交以实际 Git 历史为准；本地分支尚未推送。
- 阶段 2 已完成独立设计评审及修订，用户批准先开展基础开发。阶段 3 **未完成**，未进入阶段 4。
- 使用项目本地 `node_modules`；Python `venv` 和 Node.js 依赖隔离都不等同于 MCP 进程的安全隔离。
- 代码、需求、设计、PoC、测试计划和实施计划已在本分支提交，分别见项目 README 的文档索引。归档不包含依赖目录、凭据、用户私有文件或不必要的模型上下文。

## Todo 快照

| 事项 | 状态与证据 |
|---|---|
| 设计变更评审 | 已完成：独立评审发现的问题已修订；基础开发获批准 |
| 项目骨架 | 已完成：本地依赖、配置、锁文件及命令 |
| v1 应用与服务 | 已完成：登录、待办、回环静态服务和手写测试 |
| AST 断言守卫 | 已完成：按文件及完整测试名称比较 matcher、修饰符和静态参数 |
| 七个意图与复核 | 已完成：`intents/`、`prompts/`、`docs/qa/ai-code-review-checklist.md` |
| Copilot 生成 | 阻塞：真实 MCP 隔离尚未验证及批准；生成脚本、正式生成用例和运行记录未完成 |
| 变异与自愈 | 部分完成：v2 和 mutant 已实现；生成用例的精确变异验证及真实自愈阻塞 |
| CI 与文档 | 部分完成：基线 workflow 已提交；正式生成用例与精确 mutant 门禁待补齐 |
| 阶段 3 评审 | 待完成全部交付和自测后人工评审 |
| MCP 隔离 | 阻塞：实际浏览器未在 sandbox 内就绪，文件、网络及凭据边界待验证 |

## 已实现内容

- `package.json`、`package-lock.json`、`playwright.config.ts`、`.mcp.json`、`tsconfig.json`、`eslint.config.mjs`：本地依赖和测试配置。
- `app/v1/`、`app/v2/`、`app/mutant/`：基线、选择器改版、锁定阈值变异；mutant 仅将阈值从 3 改为 5。
- `scripts/serve.mjs`：仅监听回环地址的本地静态服务；拒绝未知版本及路径穿越。
- `scripts/check-assertions.mjs`：静态比较断言；拒绝动态期望参数、测试别名及不支持的测试语法。`tests/unit/` 含负零及正负无穷回归。
- `tests/smoke/`、`tests/variants/`、`tests/integration/`：手写浏览器基线、版本行为和服务测试，**不是 AI 生成用例**。
- `.github/workflows/vibe-testing-ci.yml`：只运行已实现的基线，CI 不调用 AI；根 README 和 CLAUDE 已登记。

## 本地验证记录

以下命令在 feature worktree 的项目目录运行；结果仅代表本机，不代表 GitHub CI 或 MCP 隔离已通过。

| 命令 | 结果 |
|---|---|
| `npm ci` | 通过；审计显示 0 vulnerabilities，依赖树包含已弃用的 `glob@7` 和 `inflight` 警告 |
| `npm run lint`、`npm run typecheck` | 通过 |
| `npm run test:coverage` | 18/18 通过；statements 89.33%、branches 86%、functions 100%，两个目标文件均在报告中 |
| `npm run test:smoke` | v1 上 5/5 通过 |
| `APP_VERSION=v2 npx playwright test tests/variants/v2.spec.ts --project=chromium` | 1/1 通过 |
| `APP_VERSION=mutant npx playwright test tests/variants/mutant.spec.ts --project=chromium` | 1/1 通过 |
| `APP_VERSION=mutant npm run test:smoke` | 按预期退出 1：仅手写三次锁定测试失败，实际 `Invalid credentials`、期望 `Account locked`；其余 4 条通过 |
| `actionlint .github/workflows/vibe-testing-ci.yml` | 通过 |
| `bash scripts/check-markdown-links.sh`、`bash scripts/check-workflow-doc-sync.sh <变更文件清单>` | 通过 |

基线 CI 的项目检查步骤已在 macOS 本地执行；Linux 浏览器依赖安装、GitHub Actions 运行、远端 CI 绿灯及故意失败报红尚未验证。`npm test` 面向未来的生成用例，当前尚无这些用例。

## 评审与风险

- 独立设计评审提出 v1/v2 测试兼容、静态断言参数、测试发现、隔离放行判据和覆盖率问题，已在设计中修订。
- 独立代码复核发现 `-0` 与 `0` 被 JSON 序列化为相同值，可能漏检；通过先失败的回归测试修复，并经独立复核。正负无穷也有回归测试。
- AST 守卫不能证明断言实际执行、locator 等价或业务语义不变；条件绕过、helper 和页面状态修改仍需人工复核及变异验证。
- Copilot PoC 曾在未启用外层 sandbox 时生成一个测试，并检测到锁定阈值变异；生成测试曾修改页面状态，不能直接作为正式用例。详见 [PoC-02](../poc/poc-02-copilot-playwright-mcp.md)。
- 自定义 MCP 的合成文件探针在独立用户级配置下观察到 `EPERM`；项目本地配置未按预期生效。这不代表实际 Playwright MCP 已隔离。
- 实际 Playwright MCP 在 sandbox 内无法启动浏览器：系统 Chrome 的 Crashpad 操作被拒，独立 Chromium headless 随后以 `SIGTRAP` 退出；现有日志不足以确定后者的根因。文件、网络和凭据隔离未验证。已确认本机有 Linux Docker，但 Docker 方案尚未验证或获批准。
- `RSK-VT-009` 的放行条件详见 [风险登记册](../project-management/risks.md)。隔离验证不足时不得运行真实自动生成或自愈，不得把普通 Chromium 冒烟测试当作隔离证据。

## 后续工作及验收

1. 在经批准、使用合成数据的环境中定位浏览器启动失败；验证实际 Copilot + Playwright MCP + 浏览器链路的文件、网络和凭据边界，记录版本、配置、正反例及结果；用户批准证据后才放行自动执行。
2. 以 TDD 实现 `scripts/generate.sh` 的输入、依赖和失败路径；为七个意图执行真实生成，人工复核后提交 `tests/generated/v1/`、版本和运行记录。不用手写用例冒充 AI 生成。
3. 确认 v1 七个生成用例通过；mutant 机器可读结果必须仅 `TC-VT-03` 因目标锁定断言失败，其余六个通过。
4. 复制 v1 用例到不存在的 `tests/generated/v2/`；保留失败输出，由 Copilot 只修复副本的选择器或等待，执行 AST 守卫和人工 diff 复核，记录 v2 7/7 通过。已有目录不得覆盖。
5. 补全不调用 AI 的完整 CI 和运行手册，验证 lint、typecheck、单元、集成、覆盖率、v1、精确 mutant、文档登记和真实失败报红。
6. 阶段 3 全部交付后对照 `docs/dev-process-checklist.md` 报告并等待人工评审；阶段 4 和 PR/合并属于后续阶段，不自动推进。
