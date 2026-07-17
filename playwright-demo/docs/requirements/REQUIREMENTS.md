# Playwright Demo — Requirements

## 功能需求

| ID | 描述 | 优先级 |
|----|------|--------|
| FR-PW-001 | 跨浏览器测试（Chromium, Firefox, WebKit） | P0 |
| FR-PW-002 | API CRUD 测试（12 测试） | P0 |
| FR-PW-003 | UI 页面加载测试（标题/编码/性能预算） | P0 |
| FR-PW-004 | UI 导航测试（外部链接/多标签页） | P1 |
| FR-PW-005 | UI 网络测试（模拟/离线/延迟注入） | P1 |
| FR-PW-006 | UI 响应式测试（3 视口 × 3 断言） | P1 |
| FR-PW-007 | 视觉回归测试（toHaveScreenshot） | P1 |
| FR-PW-008 | 无障碍审计（axe-core, WCAG 2.0 AA） | P1 |
| FR-PW-009 | Page Object Model 模式 | P1 |
| FR-PW-010 | 依赖注入 Fixture 系统 | P2 |
| FR-PW-011 | 数据驱动测试（视口循环） | P2 |
| FR-PW-012 | Trace Viewer 集成 | P2 |

## 非功能需求

| ID | 类别 | 要求 |
|----|------|------|
| NFR-PW-001 | 浏览器 | 3 引擎并行执行 |
| NFR-PW-002 | 性能 | 页面加载 < 5000ms |
| NFR-PW-003 | 报告 | 内置 Trace Viewer + Screenshot |
