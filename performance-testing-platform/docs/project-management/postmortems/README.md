# Performance Testing Platform — Postmortem 归档

> 本目录收录 **performance-testing-platform** 项目内发生的事件复盘、根因分析与问题闭环文档。
> Portfolio 级复盘请见：[../../../../docs/project-management/postmortems/](../../../../docs/project-management/postmortems/)

## 1. 命名约定

| 前缀 | 含义 | 适用场景 | 命名格式 |
|------|------|----------|----------|
| `RCA-` | Root Cause Analysis | 单点故障的技术根因追溯，聚焦因果链与修复 | `RCA-YYYY-MM-DD-<slug>.md` |
| `INC-` | Incident | 事件型记录，侧重时间线、影响范围、响应过程 | `INC-YYYY-MM-DD-<slug>.md` |
| `POSTMORTEM-` | Postmortem | 综合复盘，含根因、时间线、改进项、遗留风险 | `POSTMORTEM-YYYY-MM-DD-<slug>.md` |

### 选用建议

- **只需根因分析** → `RCA-`
- **只需事件记录** → `INC-`
- **需完整复盘 + 行动项跟踪** → `POSTMORTEM-`
- 同一事件原则上**只保留一份文档**，按深度需求选择前缀；避免 RCA + Postmortem 双份并存。

## 2. 当前归档

| 文档 | 类型 | 说明 |
|------|------|------|
| [POSTMORTEM-2026-04-18-stage5-rate-limiter-integration-test.md](POSTMORTEM-2026-04-18-stage5-rate-limiter-integration-test.md) | Postmortem | Stage5 rate limiter 集成测试综合复盘 |
| [INC-2026-04-21-jest-parallel-test-cpu-contention.md](INC-2026-04-21-jest-parallel-test-cpu-contention.md) | Incident | Jest 并行测试 CPU 争用假阳性 |
| [INC-2026-04-21-preflight-script-manual-intervention.md](INC-2026-04-21-preflight-script-manual-intervention.md) | Incident | Preflight 脚本需人工介入 |
| [RCA-2026-04-21-reports-dir-latent-bug.md](RCA-2026-04-21-reports-dir-latent-bug.md) | RCA | `reports/` 目录潜伏 Bug |
| [RCA-2026-04-22-phase7-soak-delegation-regression.md](RCA-2026-04-22-phase7-soak-delegation-regression.md) | RCA | Phase 7 soak 委托缺失 |
| [RCA-2026-04-23-merge-only-format-scope-test-failure.md](RCA-2026-04-23-merge-only-format-scope-test-failure.md) | RCA | merge ref 下 `format-scope` 测试脆弱 |
| [RCA-2026-04-23-prettier-scope-drift.md](RCA-2026-04-23-prettier-scope-drift.md) | RCA | Prettier 检查范围漂移 |
| [RCA-2026-04-24-bats-ci-detached-head-merge-commit.md](RCA-2026-04-24-bats-ci-detached-head-merge-commit.md) | RCA | BATS 在 CI detached HEAD + merge commit 下失败 |
| [RCA-2026-04-24-broken-markdown-links-commit-15a3398.md](RCA-2026-04-24-broken-markdown-links-commit-15a3398.md) | RCA | scripts 重构引入 Markdown 断链 |
| [RCA-2026-04-24-issue-192-193-grafana-readiness.md](RCA-2026-04-24-issue-192-193-grafana-readiness.md) | RCA | Grafana readiness 超时 + docker-compose `version` 字段过时（#192/#193） |
| [POSTMORTEM-2026-04-25-stage4-integration-test-cluster.md](POSTMORTEM-2026-04-25-stage4-integration-test-cluster.md) | Postmortem | Stage 4 集成测试 #192–#195 集群事件复盘（断言层错配 + 依赖升级缺 preflight 体检） |

## 3. 维护规则

| 规则 | 说明 |
|------|------|
| 单事件单文档 | 同一事件原则上只保留一份，避免 RCA-/POSTMORTEM- 双份重复 |
| 新增必更新 README | 每次新增文档须同步追加到第 2 节列表，保持可导航 |
| 引用使用相对路径 | 跨文档引用统一使用相对路径，避免绝对链接失效 |
| 关闭前明确状态 | 每份文档必须标注 `已完成 / 待执行 / 待评估`，避免悬空 TODO |

## 4. 历史遗留

- 2026-04-24 归档治理：合并 `postmortem-2026-04-23-*.md`（小写前缀）与 `RCA-2026-04-23-*.md` 重复文档，保留 `RCA-` 版本。
- 2026-04-25 归档治理：删除小写前缀 `postmortem-2026-04-24-issue-192-193-grafana-readiness.md`（与同事件 `RCA-2026-04-24-issue-192-193-grafana-readiness.md` 重复，违反"单事件单文档"规则）；新增 `POSTMORTEM-2026-04-25-stage4-integration-test-cluster.md` 作为 #192–#195 集群事件的综合复盘。
