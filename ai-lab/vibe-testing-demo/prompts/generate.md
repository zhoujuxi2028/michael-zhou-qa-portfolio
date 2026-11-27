# 生成 Playwright 用例

针对指定的 `VT-INT-NN` 意图，使用 Playwright MCP 观察公开页面并生成一个 Playwright TypeScript 测试，保存到 `tests/generated/v1/VT-INT-NN.spec.ts`。

- 只使用演示数据及页面公开交互；不读取应用实现、真实凭据或无关文件。
- 禁止通过 `page.evaluate` 或其他方式修改页面、业务状态或断言元素。
- 使用隔离的浏览器上下文；断言必须验证意图中每项可观察结果。
- matcher 参数使用静态字面量，避免守卫无法验证的间接值。
- 文件头注明 `intent`、`generated-by`（Copilot CLI 和 MCP 版本）、`generated-at`、`reviewed-by`；复核人由实际复核者填写。
- 未获得隔离验证及用户批准前，不运行此提示词或 MCP 自动生成。
