# IVI Integration & Continuous Validation Lab

项目目前处于需求与设计阶段，参见 [Issue #837](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/837)。所有设备、包和刷写行为均为模拟，不连接真实车辆或 ECU。

## 文档

- [需求](docs/REQUIREMENTS.md)
- [可行性](docs/FEASIBILITY.md)
- [架构](docs/ARCHITECTURE.md)
- [测试计划](docs/qa/test-plan.md)
- [风险](docs/project-management/risks.md)
- [实施计划](docs/project-management/implementation-plan.md)

## 开发约定（实现阶段）

- Python + pytest；按 smoke、integration、regression 分层。
- CI 与本地使用同一质量门禁入口，目标命令为 `make ci`。
- 优先使用 Python 标准库；新增依赖及版本须在依赖清单和计划中说明。
- 每个失败场景须保留可追溯日志/测试证据；修复后的缺陷须关联回归用例。
- 不得将模拟结果描述为真实 ECU、实车或量产验证结果。
