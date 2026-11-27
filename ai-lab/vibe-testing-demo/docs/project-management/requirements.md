# Vibe Testing Demo — 需求文档

## REQ-VT-001：自然语言意图驱动 AI Agent 生成、执行、维护 E2E 用例

| 属性 | 内容 |
|------|------|
| **ID** | REQ-VT-001 |
| **优先级** | High |
| **状态** | 设计评审中 |
| **提出日期** | 2026-11-26 |
| **关联 Issue** | #946 |

### 背景

作品集已有 Playwright 自动化（`projects/functional/playwright-demo`）和 AI 测试平台（`ai-lab/ai-testing-platform`），但缺少 **Vibe Testing** 演示：测试人员用自然语言描述测试意图，AI Agent（GitHub Copilot CLI + Playwright MCP）操作浏览器、生成用例、执行并在页面改版后维护用例；人负责复核。

### 用户故事

- **作为**测试工程师，**我希望**只写"登录失败 3 次后账号锁定"这样的意图，由 Agent 探索页面并生成 Playwright 用例，**以便**减少手写脚本的时间。
- **作为**测试工程师，**我希望**页面改版导致用例失败时，Agent 能根据失败信息修复选择器，**以便**降低维护成本。
- **作为**测试负责人，**我希望**有 AI 生成代码的复核清单和团队落地规范，**以便**在团队里安全地推广。

### 详细需求

| 需求 ID | 描述 | 验收标准 |
|---------|------|---------|
| VT-01 | 被测应用 | 本地静态 Web 应用（登录 + 待办），零外部依赖；有 v1 / v2 两个版本，v2 改动选择器和非断言文案，被断言文案及业务行为不变 |
| VT-02 | 意图文件 | `intents/` 下至少 5 个（设计阶段定为 7 个，见 `docs/qa/test-plan.md`）自然语言意图（Markdown），每个写明目标、前置条件、预期结果 |
| VT-03 | MCP 配置 | 项目级 `.mcp.json` 注册本地 `@playwright/mcp`（锁定版本），Copilot CLI 在受信任项目目录启动即可使用 |
| VT-04 | 用例生成 | Agent 根据意图生成 Playwright（TypeScript）用例，放在 `tests/generated/v1/`；每个文件头注明来源意图、生成工具与版本、生成日期、复核人 |
| VT-05 | 生成记录 | 每次生成保存提示词与过程摘要到 `docs/runs/`，可追溯 |
| VT-06 | 执行与报告 | `npm test` 对 v1 应用运行全部生成用例并输出 HTML 报告；CI 只运行已提交的用例，不在 CI 中调用 AI |
| VT-07 | 改版自愈 | 保留 v1 用例并复制到 `tests/generated/v2/` → 在 v2 失败（保存输出）→ Agent 修复副本 → 通过；记录修复前后 diff，AST 守卫及人工复核确认断言未被削弱 |
| VT-08 | 复核清单 | `docs/qa/ai-code-review-checklist.md`：断言有效性、先确认能失败、禁止改断言让测试变绿、选择器策略、等待策略 |
| VT-09 | 团队落地规范 | `docs/guides/vibe-testing-playbook.md`：提示词模板、适用 / 不适用场景、路线图（试点 → 规范 → 推广 → 度量）、度量指标 |
| VT-10 | 变异验证 | 对 v1 应用注入至少 1 个缺陷（如锁定次数改为 5），生成的用例应当失败，证明断言有效 |

### Scope

- ✅ 新目录 `ai-lab/vibe-testing-demo/`、CI workflow
- ❌ 移动端、视觉回归、在 CI 中调用 AI、自研 Agent 框架

### 依赖

| 依赖 | 版本 | 说明 |
|------|------|------|
| Node.js | 本机 v26（CI 用 LTS） | 运行 Playwright |
| `@playwright/test` | 与 `playwright-demo` 一致 | 执行用例 |
| `@playwright/mcp` | 0.0.86（锁定） | Agent 操作浏览器 |
| GitHub Copilot CLI | PoC 使用 1.0.114 | 生成与修复用例（本机，不进 CI）；执行前确认本机版本和账号可用 |

### 可行性

| 项 | 结论 |
|----|------|
| 本机工具 | PoC 时 `copilot`、`node`、`npm` 已安装；项目依赖安装到项目自己的 `node_modules` |
| 主要不确定性 | Copilot PoC 仅验证一个意图；自愈和完整用例尚未验证。MCP 进程隔离不属于本 demo 范围，残余风险已接受（见 `risks.md`） |
