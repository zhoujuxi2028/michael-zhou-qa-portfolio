# Vibe Testing Demo — 需求文档

## REQ-VT-001：自然语言意图驱动 AI Agent 生成、执行、维护 E2E 用例

| 属性 | 内容 |
|------|------|
| **ID** | REQ-VT-001 |
| **优先级** | High |
| **状态** | 需求评审中 |
| **提出日期** | 2026-11-26 |
| **关联 Issue** | #946 |

### 背景

作品集已有 Playwright 自动化（`projects/functional/playwright-demo`）和 AI 测试平台（`ai-lab/ai-testing-platform`），但缺少 **Vibe Testing** 演示：测试人员用自然语言描述测试意图，AI Agent（Claude Code + Playwright MCP）操作浏览器、生成用例、执行并在页面改版后维护用例；人负责复核。

### 用户故事

- **作为**测试工程师，**我希望**只写"登录失败 3 次后账号锁定"这样的意图，由 Agent 探索页面并生成 Playwright 用例，**以便**减少手写脚本的时间。
- **作为**测试工程师，**我希望**页面改版导致用例失败时，Agent 能根据失败信息修复选择器，**以便**降低维护成本。
- **作为**测试负责人，**我希望**有 AI 生成代码的复核清单和团队落地规范，**以便**在团队里安全地推广。

### 详细需求

| 需求 ID | 描述 | 验收标准 |
|---------|------|---------|
| VT-01 | 被测应用 | 本地静态 Web 应用（登录 + 待办），零外部依赖；有 v1 / v2 两个版本，v2 改动选择器和文案，用于演示改版 |
| VT-02 | 意图文件 | `intents/` 下至少 5 个自然语言意图（Markdown），每个写明目标、前置条件、预期结果 |
| VT-03 | MCP 配置 | 项目级 `.mcp.json` 注册 `@playwright/mcp`（锁定版本），Claude Code 在本目录启动即可使用 |
| VT-04 | 用例生成 | Agent 根据意图生成 Playwright（TypeScript）用例，放在 `tests/generated/`；每个文件头注明来源意图、生成工具与版本、生成日期、复核人 |
| VT-05 | 生成记录 | 每次生成保存提示词与过程摘要到 `docs/runs/`，可追溯 |
| VT-06 | 执行与报告 | `npm test` 对 v1 应用运行全部生成用例并输出 HTML 报告；CI 只运行已提交的用例，不在 CI 中调用 AI |
| VT-07 | 改版自愈 | 切换到 v2 → 用例失败（保存失败输出）→ Agent 修复 → 通过；记录修复前后 diff，且断言未被削弱 |
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
| Claude Code CLI | 2.1.322 | 生成与修复用例（本机，不进 CI） |

### 可行性

| 项 | 结论 |
|----|------|
| 本机工具 | `claude`、`node`、`npx` 已安装；`@playwright/mcp` 可从 npm 获取 |
| 主要不确定性 | Agent 生成结果不稳定、MCP 版本仍是 0.0.x → 设计阶段先做 PoC（见 `risks.md`） |
