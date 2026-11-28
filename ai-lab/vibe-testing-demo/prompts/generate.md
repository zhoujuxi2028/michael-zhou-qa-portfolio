# 生成 Playwright 用例

针对指定的 `VT-INT-NN` 意图，使用 Playwright MCP 观察公开页面并生成一个 Playwright TypeScript 测试，保存到 `tests/generated/v1/VT-INT-NN.spec.ts`。

- 只使用演示数据及页面公开交互；不读取应用实现、真实凭据或无关文件。
- 禁止通过 `page.evaluate` 或其他方式修改页面、业务状态或断言元素。
- 使用 Playwright 默认的 `page` fixture（每个测试已是独立上下文）；用 `page.goto('/')` 等相对路径，由配置的 `baseURL` 决定应用版本，不写死主机和端口。
- 断言必须验证意图中每项可观察结果。
- 元素含子控件（如复选框、按钮）时，不对整个容器做精确文本断言；用 `filter({ hasText })` 定位后断言其可见性，或断言具体子元素。
- 空容器可能尺寸为 0 而被判定不可见；断言为空时用 `toHaveCount(0)` 或 `toBeEmpty()`，不对空容器断言 `toBeVisible()`。
- matcher 参数使用静态字面量，避免守卫无法验证的间接值。
- 文件头注明 `intent`、`generated-by`、`generated-at`、`reviewed-by`；前三项使用下方提供的值，`reviewed-by` 写 `pending`，由实际复核者填写。
- 仅使用本地演示应用和演示账号。工具权限、执行前后的 Git 检查和人工复核由调用脚本及复核者完成，你无需读取其他文件或运行 shell。
