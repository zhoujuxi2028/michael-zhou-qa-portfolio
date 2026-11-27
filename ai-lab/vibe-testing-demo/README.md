# Vibe Testing Demo

## 项目说明

用自然语言描述测试意图，由 AI Agent（GitHub Copilot CLI + Playwright MCP）生成、执行、维护 Playwright E2E 用例；人负责复核。个人演示项目（#946）。

## Phase 规划

| 阶段 | 内容 | 状态 |
|------|------|------|
| 1 需求 | 需求、可行性、风险 | ✅ Done |
| 2 设计 | 架构、测试计划、PoC | 基础开发已获批准；MCP 隔离待验证 |
| 3 开发 | 被测应用、意图、生成用例、自愈 | 进行中 |
| 4 测试 | 执行、变异验证、CI | Planned |
| 5 收尾 | 规范文档、复盘 | Planned |

## 本地验证

在本项目目录使用 Node.js `^20.19.0 || ^22.13.0 || >=24`：

```bash
npm ci
npx playwright install chromium
npm run lint
npm run typecheck
npm run test:unit
npm run test:integration
npm run test:coverage
npm run test:smoke
APP_VERSION=v2 npx playwright test tests/variants/v2.spec.ts --project=chromium
APP_VERSION=mutant npx playwright test tests/variants/mutant.spec.ts --project=chromium
```

Node.js 依赖只安装在本项目的 `node_modules`；Python `venv` 不隔离 Node.js 或 MCP 进程。`npm test` 面向未来经复核的 v1 生成用例，当前尚无生成用例，不能作为已完成验收的证据。

Copilot 和 Playwright MCP 的真实隔离尚未验证；生成与自愈尚未实现或执行。上述测试均为手写基线，不代表生成用例或 MCP 隔离通过。`APP_VERSION=mutant npm run test:smoke` 的锁定测试预期失败，不能替代后续生成用例的精确变异验证。不要在验证及人工批准前运行 MCP 自动生成或自愈。

当前 CI 仅运行手写基线及应用版本测试，不调用 AI；生成用例和精确 mutant 门禁仍待补齐，不能视为完整项目验收。

## 文档

| 文档 | 路径 |
|------|------|
| 需求 | `docs/project-management/requirements.md` |
| 风险 | `docs/project-management/risks.md` |
| Claude Code PoC | `docs/poc/poc-01-playwright-mcp.md` |
| Copilot CLI PoC | [docs/poc/poc-02-copilot-playwright-mcp.md](docs/poc/poc-02-copilot-playwright-mcp.md) |
| 架构 | `docs/architecture/architecture.md` |
| 测试计划 | `docs/qa/test-plan.md` |
| 实施计划 | `docs/plans/implementation-plan.md` |
