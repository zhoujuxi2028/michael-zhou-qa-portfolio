# Vibe Testing Demo

## 项目说明

用自然语言描述测试意图，由 AI Agent（GitHub Copilot CLI + Playwright MCP）生成、执行、维护 Playwright E2E 用例；人负责复核。个人演示项目（#946）。

## Phase 规划

| 阶段 | 内容 | 状态 |
|------|------|------|
| 1 需求 | 需求、可行性、风险 | ✅ Done |
| 2 设计 | 架构、测试计划、PoC | 已评审；MCP 进程隔离不属于本 demo 范围 |
| 3 开发 | 被测应用、意图、生成用例、自愈 | ✅ Done（#955） |
| 4 测试 | 执行、变异验证、CI、报红验证 | ✅ Done |
| 5 收尾 | 落地规范、root 注册、Wiki | ✅ Done |

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
npm test                                   # 生成用例 v1（7）
npm run test:mutant                        # 精确变异门禁：仅 VT-INT-03 失败
node scripts/check-assertions.mjs tests/generated/v1 tests/generated/v2
APP_VERSION=v2 npx playwright test tests/generated/v2 --project=chromium
```

复现生成或自愈需要 Copilot 账号（RSK-VT-004）：`bash scripts/generate.sh VT-INT-NN`、`bash scripts/heal.sh docs/runs/<日期>-heal-before.txt`；两者都要求工作区干净，不覆盖已有文件。

Node.js 依赖只安装在本项目的 `node_modules`；Python `venv` 不隔离 Node.js 或 MCP 进程。

`tests/generated/` 中的 14 个用例由 Copilot 生成或自愈，经 AI 复核（用户授权代签，见 [复核记录](docs/runs/2026-11-28-review.md)）；结果见 [阶段 3 结果](docs/runs/2026-11-28-stage3-results.md)。

用户已接受 [RSK-VT-009](docs/project-management/risks.md) 残余风险：正常环境只使用本地演示应用和演示账号；限制必要工具权限，执行前后检查 Git 状态并人工复核 diff。这些措施无法限制 MCP 进程或检查仓库外访问。组织若要求 sandbox，必须遵守其策略。

CI 运行手写基线、生成用例 v1、精确 mutant 门禁、断言守卫和 v2 自愈用例，不调用 AI；报红验证见 [CI 报红记录](docs/runs/2026-11-28-ci-red-check.md)。

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
| 阶段 3 归档 | [docs/runs/2026-11-27-stage3-handoff.md](docs/runs/2026-11-27-stage3-handoff.md) |
| 阶段 3 结果 | [docs/runs/2026-11-28-stage3-results.md](docs/runs/2026-11-28-stage3-results.md) |
| 用例复核 | [docs/runs/2026-11-28-review.md](docs/runs/2026-11-28-review.md) |
| CI 报红验证 | [docs/runs/2026-11-28-ci-red-check.md](docs/runs/2026-11-28-ci-red-check.md) |
| 落地规范 | [docs/guides/vibe-testing-playbook.md](docs/guides/vibe-testing-playbook.md) |
| 复核清单 | [docs/qa/ai-code-review-checklist.md](docs/qa/ai-code-review-checklist.md) |
