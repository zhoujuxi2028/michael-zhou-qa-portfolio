# Stage 4 文档治理重构设计

## 问题说明

当前 `performance-testing-platform` 的 Stage 4 验收文档存在 4 个核心问题：

| 问题 | 表现 | 影响 |
|---|---|---|
| 命令失真 | 文档中存在与 `package.json` / 实际脚本不一致的命令 | 验收不可直接执行 |
| 历史文档混用 | 模板、执行记录、历史复盘混在同一文档 | 职责不清，难以审计 |
| issue 阻塞无集中登记 | `#192~#195` 等问题未纳入统一 gate 决策 | 容易误判是否可放行 |
| 结果矛盾 | 同一用例可能出现“先失败后成功”的冲突输出 | 最终结论不可信 |

目标是把 Stage 4 文档体系重构为 **企业级 release gate 模型**，同时保持 `docs/qa/test-plan.md` 与当前真实状态一致。

## 设计目标

| 目标 | 说明 |
|---|---|
| 单一来源 | `test-plan.md` 继续作为 Stage 4 标准与入口的 SSOT |
| 职责拆分 | 模板、执行记录、缺陷/waiver、历史报告彻底分离 |
| 可审计 | 每次 Stage 4 都能落地分支、commit、环境、日志、CI run、最终结论 |
| 可执行 | 所有命令必须引用真实可执行脚本 |
| 可裁决 | blocker、waiver、结果矛盾有统一规则 |

## 信息架构

| 文档 | 路径 | 定位 | 生命周期 |
|---|---|---|---|
| Stage 4 门禁模板 | `performance-testing-platform/docs/qa/stage4-gate-template.md` | 固定模板，定义 Entry/Exit、执行矩阵、证据要求、Gate Decision | 长期保留 |
| Stage 4 缺陷与豁免登记 | `performance-testing-platform/docs/qa/stage4-defect-waiver-register.md` | 集中登记 blocker、waiver、issue、责任人与放行条件 | 长期保留 |
| Stage 4 执行记录 | `performance-testing-platform/docs/qa/reports/stage4-execution-2026-04-23.md` | 本次验收的真实执行结果、日志、环境与结论 | 按日期归档 |
| Phase 6 历史验收报告 | `performance-testing-platform/docs/qa/reports/phase6-stage4-verification-report.md` | 迁移 `docs/qa/stage4-validation.md` 的历史内容 | 长期归档 |

## 文档职责边界

| 文档 | 放什么 | 不放什么 |
|---|---|---|
| `stage4-gate-template.md` | 验收项、真实命令、通过标准、证据要求、裁决规则 | 历史 issue 诊断、已执行结果 |
| `stage4-defect-waiver-register.md` | issue、严重级别、是否 blocking、是否 waiver、责任人、目标修复阶段 | 长篇日志、详细测试输出 |
| `reports/stage4-execution-2026-04-23.md` | 本次运行事实、日志路径、artifact、结果矩阵、最终结论 | 长期模板规则 |
| `reports/phase6-stage4-verification-report.md` | Phase 6 历史结果、修复过程、复盘内容 | 当前 Stage 4 门禁职责 |

## 三份新文档结构

### 1. `stage4-gate-template.md`

| 区块 | 内容 |
|---|---|
| Metadata | 适用项目、版本、文档状态、最后更新时间 |
| Gate Scope | Stage 4 包含 / 不包含范围 |
| Entry Criteria | 前置条件、环境检查、依赖版本 |
| Execution Matrix | P0 / P1 / P2 命令、通过标准、证据要求 |
| Evidence Requirements | 日志、coverage、reports、CI run、issue 链接 |
| Gate Decision Rules | PASS / BLOCKED / PENDING / WAIVED |
| Escalation Rules | 环境问题、结果矛盾、open blocker 的处理规则 |

### 2. `stage4-defect-waiver-register.md`

| 字段 | 说明 |
|---|---|
| Issue | GitHub issue 编号与链接 |
| Severity | P0 / P1 / P2 |
| Category | env / infra / CI / test / tooling |
| Symptom | 问题摘要 |
| Affected Gate Item | 受影响验收项 |
| Blocking Decision | Blocking / Non-blocking |
| Waiver | Yes / No |
| Waiver Reason | 放行理由 |
| Owner | 责任人 |
| Target Fix Phase | 计划修复阶段 |
| Status | Open / Mitigated / Closed |

### 3. `reports/stage4-execution-2026-04-23.md`

| 区块 | 内容 |
|---|---|
| Execution Metadata | 日期、执行人、branch、commit SHA、Node/npm/k6/JMeter/Docker 版本 |
| Environment Snapshot | preflight、Docker、端口、服务状态 |
| Command Run Log | 实际执行命令、开始/结束时间、exit code |
| Result Matrix | 每个 gate item 的 PASS / FAIL / BLOCKED / WAIVED |
| Evidence Links | `coverage/`、`reports/`、`tests/integration/logs/...`、GitHub Actions URL |
| Defect Summary | 当前 blocker / waiver 的 issue 摘要 |
| Final Gate Decision | 最终是否允许进入 Stage 5 |

## Gate Decision Rules

| 条件 | 结论 |
|---|---|
| 所有 P0 通过，且无 open blocker | PASS |
| 任一 P0 失败 | BLOCKED |
| 任一 P1 issue 被标记为 Blocking | BLOCKED |
| 同一用例输出相互矛盾 | BLOCKED |
| 环境异常导致结果无效 | PENDING |
| 非阻塞问题有书面 waiver | WAIVED |

> **⚠️ 规则：** 同一用例如果出现“先失败后成功”“主指标失败但附加指标成功”等冲突输出，默认视为 **BLOCKED**，必须建 issue 并登记到 defect/waiver register。

## 当前问题的落档方式

| Issue | 问题 | 建议分类 | 建议结论 |
|---|---|---|---|
| `#192` | Grafana readiness 超时 | env / infra | Blocking（若复现） |
| `#193` | Docker Compose `version` 过时警告 | tooling | Non-blocking |
| `#194` | `JM-GRF-01 failed` | test / infra | Blocking |
| `#195` | `K6-SOAK-INT-01` 结果矛盾 | test | Blocking |

## `test-plan.md` 更新要求

`performance-testing-platform/docs/qa/test-plan.md` 需要同步做 4 类更新：

| 区域 | 更新要求 |
|---|---|
| 文档入口 | 引用新的模板、缺陷登记、执行记录 |
| Stage 4 命令 | 统一为真实可执行命令，如 `npm run test:unit`、`npm run test:coverage`、`bash scripts/integration-test.sh`、`bash scripts/integration-test-phase7-soak.sh` |
| Exit Criteria | 增加 blocker / waiver 规则 |
| 当前状态 | 反映 `#192~#195` 对 Stage 4 的阻塞与非阻塞状态 |

## 旧文档收敛策略

| 旧文档 | 处理方式 | 原因 |
|---|---|---|
| `docs/qa/stage4-validation.md` | 迁移为 `docs/qa/reports/phase6-stage4-verification-report.md` | 保留 Phase 6 历史记录 |
| `docs/qa/phase7-stage4-validation.md` | 拆分有效内容后删除 | 避免模板、执行记录、issue 占位继续混用 |

## 迁移步骤

1. 新建 3 份企业级文档。
2. 迁移 `stage4-validation.md` 到 `reports/` 并改名为历史报告。
3. 从 `phase7-stage4-validation.md` 提取仍有效的 gate 条目与结构，重写到新模板。
4. 用当前真实日志与 `#192~#195` 生成新的执行记录与 defect/waiver register。
5. 更新 `test-plan.md` 的 Stage 4 入口、命令、Exit Criteria 与当前阻塞状态。
6. 删除 `phase7-stage4-validation.md`。
7. 扫描并修复所有旧路径引用。

## 非目标

| 不在本次范围内的事项 |
|---|
| 直接修复 `#192~#195` 对应代码或脚本问题 |
| 重写 `integration-test.sh` 逻辑 |
| 修改非 Stage 4 主题的 QA 文档 |

## 验收标准

| 项目 | 通过标准 |
|---|---|
| 文档结构 | 三份新文档职责清晰、无重叠 |
| 历史归档 | Phase 6 历史文档迁入 `reports/` |
| 命令准确性 | 新文档与 `package.json` / 脚本一致 |
| Gate 可裁决性 | `#192~#195` 可在 register 中被明确判定 |
| 旧文档清理 | `phase7-stage4-validation.md` 删除，旧引用已修复 |

