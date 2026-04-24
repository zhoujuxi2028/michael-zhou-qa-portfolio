# Performance Testing Platform — Requirements（需求文档）

**Branch:** `feature/performance-testing`

| Issue                                                                      | 描述                                            | 日期       |
| -------------------------------------------------------------------------- | ----------------------------------------------- | ---------- |
| [#17](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/17) | 性能测试平台 (k6 + JMeter 双引擎)               | 2026-03-24 |
| [#54](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/54) | 系统指标采集 + 容量测试 (瓶颈定位)              | 2026-03-31 |
| [#56](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/56) | JWT 认证场景性能测试                            | 2026-04-02 |
| [#65](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/65) | Soak Test + 可观测性增强                        | 2026-04-02 |
| [#85](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/85) | 基础设施升级 (多环境/数据参数化/负载配置/DX)    | 2026-04-04 |
| [#86](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/86) | 测试能力扩展 (k6 一致性/崩溃测试/限流熔断/报告) | 2026-04-04 |
| [#88](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/88) | CI/CD + 可观测性 (基线回归/覆盖率/Grafana/调度) | 2026-04-05 |

---

## Phase 总览

| Phase | 主题                     | Issue                                                                      | 状态       | 需求条数                                                  | 详细文档                                                    |
| ----- | ------------------------ | -------------------------------------------------------------------------- | ---------- | --------------------------------------------------------- | ----------------------------------------------------------- |
| 1     | 双引擎性能测试           | [#17](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/17) | ✅ Done    | US-01~13, UC-01~05                                        | [phase1-dual-engine.md](requirements/phase1-dual-engine.md) |
| 2     | 系统指标采集 + 容量测试  | [#54](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/54) | ✅ Done    | SM-01~11, TQ-01~04                                        | [phase2-metrics.md](requirements/phase2-metrics.md)         |
| 3     | JWT 认证场景性能测试     | [#56](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/56) | ✅ Done    | AUTH-01~11                                                | [phase3-auth.md](requirements/phase3-auth.md)               |
| 4     | Soak Test + 可观测性增强 | [#65](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/65) | ✅ Done    | SOAK-01~10                                                | [phase4-soak.md](requirements/phase4-soak.md)               |
| 5     | 基础设施升级             | [#85](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/85) | ✅ Done    | 5 组 13 条 (ENT-ENV/DATA/PROFILE/DX/TEST)                 | [phase5-infra.md](requirements/phase5-infra.md)             |
| 6     | 测试能力扩展             | [#86](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/86) | 📋 Planned | 4 组 11 条 (ENT-CONSISTENCY/BREAKPOINT/RESILIENCE/REPORT) | [phase6-testing.md](requirements/phase6-testing.md)         |
| 7     | CI/CD + 可观测性         | [#88](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/88) | 📋 Planned | 5 组 22 条 (PERF-BL/COV/OBS/SCHED/K6-FR)                  | [phase7-cicd.md](requirements/phase7-cicd.md)               |

## Phase 依赖关系

```
Phase 1~4 (已完成) → Phase 5 (基础设施) → Phase 6 (测试能力) → Phase 7 (CI/CD)
```

- **Phase 5 → 6**: Phase 6 的 k6 一致性重构依赖 Phase 5 的 helpers/profiles/env 基础设施
- **Phase 6 → 7**: Phase 7 的 CI 基线回归依赖 Phase 6 的测试产出 (k6 JSON output、摘要报告)

## Phase 7 需求摘要

> **主口径:** Phase 7 的正式需求来源是 Issue `#88` 和本文件；`rtm.md`、测试用例与设计稿需引用该口径，不反向定义 Phase 7 范围。

| 模块          | 正式编号                                             | 说明                                                     |
| ------------- | ---------------------------------------------------- | -------------------------------------------------------- |
| Baseline      | `PERF-CI-BL-FR-001~006`                              | 基线回归、趋势数据、趋势报告、单元测试                   |
| Coverage      | `PERF-CI-COV-FR-001~003`                             | CI 覆盖率报告、artifact、阈值门禁                        |
| Observability | `PERF-OBS-DASH-FR-001~003` / `PERF-OBS-ALERT-FR-001` | Grafana 错误分布、热力图、自定义指标、webhook 告警       |
| Schedule      | `PERF-CI-SCHED-FR-001~002`                           | nightly soak / weekly capacity 调度与归档                |
| k6            | `PERF-ENGINE-K6-FR-011~017`                          | funnel 迁移、breakpoint 分类、恢复验证、Grafana 集成验证 |

## SLA 定义

> **权威来源**：所有测试计划、RTM、设计文档的 SLA 引用应以本表为准。

| 指标              | 阈值     | 适用场景                          | 来源 Phase |
| ----------------- | -------- | --------------------------------- | ---------- |
| p95 latency       | < 500ms  | 所有 API 端点 (smoke/load/stress) | Phase 1    |
| p99 latency       | < 2000ms | 认证相关端点 (bcrypt 开销)        | Phase 3    |
| Error rate        | < 1%     | 所有场景                          | Phase 1    |
| Throughput        | ≥ 30 rps | smoke 场景 (5 VUs)                | Phase 7    |
| Heap growth       | < 50%    | Soak test (1h+)                   | Phase 4    |
| Coverage (stmt)   | ≥ 80%    | Jest 单元测试                     | Phase 7    |
| Coverage (branch) | ≥ 70%    | Jest 单元测试                     | Phase 7    |

### 容量目标（非功能需求）

> **目标环境:** MacBook Pro Intel i5-1038NG7 (4C8T, 16GB)；本项目为 Demo 演示项目，容量目标以本机硬件为基准。

| 指标            | 阈值     | 说明                                             |
| --------------- | -------- | ------------------------------------------------ |
| Smoke 并发用户  | 5 VUs    | 验证基本可用性                                   |
| Load 并发用户   | 20 VUs   | 本机正常负载上限（满足 p95 < 500ms, error < 1%） |
| Breakpoint 最低 | ≥ 20 VUs | 系统崩溃点不得低于 Load 目标                     |

## 功能边界

| 包含                                       | 不包含                                                          |
| ------------------------------------------ | --------------------------------------------------------------- |
| k6 脚本 (4 种模式) + HTML 报告             | 真实外部 API                                                    |
| JMeter 测试计划 (4 种模式) + HTML Report   | 持久化数据库 (PostgreSQL)                                       |
| Express Cluster 模式 (多核)                | 云端部署                                                        |
| SQLite 文件模式 + WAL (真实磁盘 I/O)       | 其他 CI 平台                                                    |
| 系统指标采集 (CPU/mem/disk/net → CSV)      | Prometheus 集成                                                 |
| 容量测试 (二分法逼近)                      | 分布式 k6 / JMeter                                              |
| JWT 认证 API + 认证压测                    | OAuth2 / SSO / 第三方登录                                       |
| Soak Test (1~4h 内存泄漏检测)              | CI PR 门禁中跑 soak (太耗时；定时调度的 soak-short 在 Scope 内) |
| Grafana + InfluxDB 可视化 + 告警           | PagerDuty / Slack 告警集成                                      |
| GitHub Actions CI (k6 + JMeter smoke gate) | Redis session store                                             |
