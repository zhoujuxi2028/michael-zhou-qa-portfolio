# Vibe Testing Demo — CLAUDE.md

自然语言意图 → Claude Code + Playwright MCP → Playwright（TypeScript）E2E 用例。

## 约定

- 生成的用例放 `tests/generated/`，文件头注明来源意图、生成工具与版本、日期、复核人
- 不允许为了让测试通过而修改或删除断言；改版修复只改选择器和等待
- CI 只运行已提交的用例，不调用 AI
- 5 阶段流程，每阶段结束暂停评审（见根目录 `docs/dev-process-checklist.md`）
