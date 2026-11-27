# 修复 Playwright 用例

根据指定的失败记录，使用 Playwright MCP 探索 v2 页面，仅修复 `tests/generated/v2/` 副本中的选择器和必要等待。

- 不修改 v1 用例、被测应用、matcher、修饰符、期望参数、测试名称或测试发现方式。
- 不绕过断言，不改变测试控制流，不直接修改页面或业务状态。
- 保留失败前快照和修复 diff；运行 AST 守卫，并由人工逐项复核。
- 仅使用本地演示应用和演示账号；限制必要工具权限并检查执行前后的 Git 状态及 diff，详见 `docs/project-management/risks.md`。
