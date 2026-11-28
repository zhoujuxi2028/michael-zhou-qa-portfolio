# Vibe Testing Demo — CLAUDE.md

自然语言意图 → GitHub Copilot CLI + Playwright MCP → Playwright（TypeScript）E2E 用例。

## 约定

- v1 生成用例放 `tests/generated/v1/`，自愈副本放 `tests/generated/v2/`；文件头注明来源意图、生成工具与版本、日期、复核人
- 不允许为了让测试通过而修改或删除断言；改版修复只改选择器和等待
- 不通过修改页面状态、禁用测试或改变测试控制流使测试通过
- Node.js 依赖安装在项目目录；需要 Python 依赖时使用项目 `venv`
- MCP 进程隔离不属于本 demo 范围；仅使用本地演示应用和演示账号，限制必要工具权限并检查执行前后的 Git 状态与 diff，详见 `docs/project-management/risks.md`
- 工具授权和 Git 检查不限制 MCP 进程或仓库外访问；组织若要求 sandbox，必须遵守其策略
- CI 只运行已提交的用例，不调用 AI
- 5 阶段流程，每阶段结束暂停评审（见根目录 `docs/dev-process-checklist.md`）

## 快速命令

```bash
npm ci && npx playwright install chromium
npm run lint && npm run typecheck && npm run test:coverage
npm test                     # 生成用例 v1（7）
npm run test:mutant          # 精确变异门禁
node scripts/check-assertions.mjs tests/generated/v1 tests/generated/v2
APP_VERSION=v2 npx playwright test tests/generated/v2 --project=chromium
bash scripts/generate.sh VT-INT-NN   # 需 Copilot 账号，工作区须干净
```
