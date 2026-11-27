# Vibe Testing Demo — CLAUDE.md

自然语言意图 → GitHub Copilot CLI + Playwright MCP → Playwright（TypeScript）E2E 用例。

## 约定

- v1 生成用例放 `tests/generated/v1/`，自愈副本放 `tests/generated/v2/`；文件头注明来源意图、生成工具与版本、日期、复核人
- 不允许为了让测试通过而修改或删除断言；改版修复只改选择器和等待
- 不通过修改页面状态、禁用测试或改变测试控制流使测试通过
- Node.js 依赖安装在项目目录；需要 Python 依赖时使用项目 `venv`
- 实际 MCP 隔离未验证及批准前，禁止运行自动生成或自愈；手写冒烟测试不证明 MCP 隔离
- CI 只运行已提交的用例，不调用 AI
- 5 阶段流程，每阶段结束暂停评审（见根目录 `docs/dev-process-checklist.md`）
