# IVI Integration & Continuous Validation Lab — 实施计划

**关联 Issue：** [#837](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/837)  
**状态：** 设计稿，等待 Plan Reviewer 与用户评审；未开始开发。  
**前置：** 需求/架构/测试策略评审通过；具体依赖版本经安全检查。

## 目标与验收

实现模拟 IVI/Cluster 包从构建、校验、部署到分层回归、证据报告和质量门禁的闭环。完成标准：

- `make ci` 在本地返回准确状态并生成可追溯测试证据。
- virtual 与 bench-sim 可执行；部署失败能够回滚，回滚失败会阻断门禁。
- smoke、integration、regression 测试可独立选择。
- HTML 报告和日志与 run ID 关联；报告失败不能假绿。
- defect-to-regression 关联可验证；定义的四类指标有可复算数据。
- Docker 可复现运行；GitHub Actions 展示正常路径及隔离的故障注入验证。

## 任务拆分

### Task 1 — 项目骨架与包模型

- 建立 Python/pytest 配置、`Makefile`、依赖清单和固定输入。
- 实现可重复的合成包构建、manifest/hash 校验，覆盖合法、缺字段和校验失败。
- 验收：校验失败不进入部署；基础 lint/test 可通过。

### Task 2 — 部署状态机与回滚

- 实现按目标 ID 管理的 `PENDING → VALIDATING → STAGING → VERIFYING → COMMITTED` 状态流程和每目标快照。
- 实现部署失败、成功回滚、回滚失败的确定性故障注入。
- 验收：只回滚指定目标且旧版本恢复可断言；失败证据保留；所有失败路径门禁非零。

### Task 3 — 执行目标与测试分层

- 定义目标协议并实现 virtual、bench-sim 两个纯模拟适配器。
- 建立 smoke、integration、regression 测试选择和 defect registry。
- 验收：同一契约两目标可运行；已修复缺陷可以关联并运行回归用例。

### Task 4 — 运行证据、报告和质量门禁

- 为每次运行创建 run ID，收集结构化日志、JUnit XML 和 HTML 汇总。
- 实现综合门禁和非零退出语义。
- 验收：报告缺失/无法解析失败；测试或部署失败在报告中可追溯；门禁没有失败掩盖逻辑。

### Task 5 — 指标、Docker 与 CI 示例

- 先采集串行基线，再增加并行比较；实现 flaky、报告成功率和故障识别统计。
- 增加可选 Docker 环境和根仓库 workflow，明确子项目工作目录。
- 更新项目 README，包含架构图、测试分层和指标说明。
- 验收：指标保留原始分子/分母和配置；隔离 job 能验证注入故障被门禁拒绝，同时正常 CI 语义清晰；README 包含架构、测试层级和指标。

## 建议文件结构

见 [架构设计](../ARCHITECTURE.md)。测试按 `tests/unit/`、`tests/smoke/`、`tests/integration/`、`tests/regression/` 分层；报告和运行日志仅作运行产物，不提交到 Git。

## 架构审查记录

- **现有项目是否已有同职责实现？** 仓库包含多个独立测试平台，但没有 IVI 包部署/回滚模拟链路；新项目使用独立 Python 环境，不引入 monorepo/workspace。
- **新增模块职责：** 本项目仅负责合成包、模拟目标和持续验证闭环；不复制通用测试框架或接入实际设备。
- **边界选择：** 首期自建简单 HTML 汇总或选择轻量 reporter；Allure 和 xdist 在依赖审查后决定，不在设计阶段锁定版本。
- **文档职责：** `REQUIREMENTS.md` 维护需求，`ARCHITECTURE.md` 维护模块/数据流，`qa/test-plan.md` 维护测试与指标，`risks.md` 维护风险；本计划只拆任务和验收。

## Plan Reviewer 检查清单

- [ ] 需求、范围和验收标准明确
- [ ] 状态机异常路径完整，目标边界严格模拟
- [ ] 任务依赖顺序合理，测试先于对应实现
- [ ] CI 故障注入能验证失败识别且不会掩盖失败
- [ ] 依赖选择与安全检查在实现前完成
- [ ] reviewer 反馈已记录并关闭

## 首轮独立评审记录

| 问题 | 处理 |
|---|---|
| Issue 提及构建，但原计划只校验固定包 | 增加合成包构建需求、`package_builder`、确定性验收用例和 Task 1 |
| 部署与目标关联及版本隔离未定义 | 部署请求指定 `target_id`，每目标维护版本/快照，失败仅回滚同一目标 |
| README 缺少测试分层和指标 | 补充 README 对应章节，并将其纳入 Task 5 验收 |
| flaky rate 判定和聚合口径不充分 | 定义固定配置至少 3 次运行，按用例比较通过/失败状态并计算用例比例 |

**评审状态：** 首轮问题已修订；修订后仍需复审和用户批准，本计划不是开发授权。  
**日期：** 2026-11-05
