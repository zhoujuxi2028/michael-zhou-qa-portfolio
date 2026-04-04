# Performance Testing Platform — Requirements（需求文档）

**Branch:** `feature/performance-testing`

| Issue                                                                      | 描述                                | 日期         |
| -------------------------------------------------------------------------- | --------------------------------- | ---------- |
| [#17](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/17) | 性能测试平台 (k6 + JMeter 双引擎)          | 2026-03-24 |
| [#54](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/54) | 系统指标采集 + 容量测试 (瓶颈定位)              | 2026-03-31 |
| [#56](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/56) | JWT 认证场景性能测试                      | 2026-04-02 |
| [#65](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/65) | Soak Test + 可观测性增强                | 2026-04-02 |
| [#85](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/85) | 基础设施升级 (多环境/数据参数化/负载配置/DX)         | 2026-04-04 |
| Phase 6                                                                    | 测试能力扩展 (k6 一致性/崩溃测试/限流熔断/报告)        | 2026-04-04 |
| Phase 7                                                                    | CI/CD + 可观测性 (基线回归/覆盖率/Grafana/调度)  | 2026-04-04 |

---

## Phase 总览

| Phase | 主题 | Issue | 状态 | 需求条数 | 详细文档 |
|-------|------|-------|------|---------|---------|
| 1 | 双引擎性能测试 | [#17](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/17) | ✅ Done | US-01~13, UC-01~05 | [phase1-dual-engine.md](requirements/phase1-dual-engine.md) |
| 2 | 系统指标采集 + 容量测试 | [#54](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/54) | ✅ Done | SM-01~11, TQ-01~04 | [phase2-metrics.md](requirements/phase2-metrics.md) |
| 3 | JWT 认证场景性能测试 | [#56](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/56) | ✅ Done | AUTH-01~11 | [phase3-auth.md](requirements/phase3-auth.md) |
| 4 | Soak Test + 可观测性增强 | [#65](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/65) | ✅ Done | SOAK-01~10 | [phase4-soak.md](requirements/phase4-soak.md) |
| 5 | 基础设施升级 | [#85](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/85) | 📋 Planned | 5 组 13 条 (ENT-ENV/DATA/PROFILE/DX/TEST) | [phase5-infra.md](requirements/phase5-infra.md) |
| 6 | 测试能力扩展 | — | 📋 Planned | 5 组 12 条 (ENT-CONSISTENCY/BREAKPOINT/RESILIENCE/REPORT/TEST) | [phase6-testing.md](requirements/phase6-testing.md) |
| 7 | CI/CD + 可观测性 | — | 📋 Planned | 4 组 14 条 (ENT-BASELINE/COVERAGE/DASHBOARD/SCHEDULE) | [phase7-cicd.md](requirements/phase7-cicd.md) |

## Phase 依赖关系

```
Phase 1~4 (已完成) → Phase 5 (基础设施) → Phase 6 (测��能力) → Phase 7 (CI/CD)
```

- **Phase 5 → 6**: Phase 6 的 k6 一致性重构依赖 Phase 5 的 helpers/profiles/env 基础设施
- **Phase 6 → 7**: Phase 7 的 CI 基线回归依赖 Phase 6 的测试产出 (k6 JSON output、摘要报告)

## SLA 定义

| 指标 | 阈值 | 含义 |
|------|------|------|
| p95 | < 500ms | 95% 请求延迟在可接受范围 |
| error rate | < 1% | 几乎无错误 |

## 功能边界

| 包含 | 不包含 |
|------|--------|
| k6 脚本 (4 种模式) + HTML 报告 | 真实外部 API |
| JMeter 测试计划 (4 种模式) + HTML Report | 持久化数据库 (PostgreSQL) |
| Express Cluster 模式 (多核) | 云端部署 |
| SQLite 文件模式 + WAL (真实磁盘 I/O) | 其他 CI 平台 |
| 系统指标采集 (CPU/mem/disk/net → CSV) | Prometheus 集成 |
| 容量测试 (二分法逼近) | 分布式 k6 / JMeter |
| JWT 认证 API + 认证压测 | OAuth2 / SSO / 第三方登录 |
| Soak Test (1~4h 内存泄漏检测) | CI 中跑 soak (太耗时) |
| Grafana + InfluxDB 可视化 + 告警 | PagerDuty / Slack 告警集成 |
| GitHub Actions CI (k6 + JMeter smoke gate) | Redis session store |
