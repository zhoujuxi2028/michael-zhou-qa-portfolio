# Phase 4 — Soak Test + 可观测性增强 (#65) ✅ Done

## 4.1 目标

长时间低负载运行 (1~4h)，检测**内存泄漏、连接泄漏、DB 膨胀**等稳定性问题，并通过 Custom Metrics + Grafana AlertManager 增强可观测性。

| 维度         | 说明                                                                                |
| ------------ | ----------------------------------------------------------------------------------- |
| **定位**     | Phase 4 — 稳定性验证 + 可观测性增强                                                 |
| **核心能力** | Soak Test (长时间低负载) + 内存泄漏检测 + 业务指标可视化 + 告警                     |
| **验收标准** | soak 4h 运行完成，heapUsed 无持续增长；Grafana 可视化趋势；告警规则在阈值突破时触发 |

## 4.2 用户故事

| ID    | 用户故事                                                                                           |
| ----- | -------------------------------------------------------------------------------------------------- |
| US-19 | 作为性能工程师，我想执行 1~4 小时 soak test，以便发现长时间运行才暴露的内存泄漏                    |
| US-20 | 作为性能工程师，我想在 k6 中采集 heapUsed 趋势，以便判断是否存在内存持续增长                       |
| US-21 | 作为性能工程师，我想将业务指标 (订单成功率、认证延迟 p99) 导入 InfluxDB，以便在 Grafana 统一查看   |
| US-22 | 作为性能工程师，我想设置 Grafana 告警规则，以便 p95 > 500ms / error > 1% / heap 持续增长时自动告警 |

## 4.3 需求列表

| ID      | 需求                                                                                         | 优先级 |
| ------- | -------------------------------------------------------------------------------------------- | ------ |
| SOAK-01 | 新增 `/api/metrics` 端点，返回 `process.memoryUsage()` (heapUsed, heapTotal, rss, external)  | P0     |
| SOAK-02 | k6 soak test 脚本: 100~500 VUs, ramp-up → steady (1~4h) → ramp-down, 定期采集 `/api/metrics` | P0     |
| SOAK-03 | 内存泄漏检测逻辑: 对比 soak 开始/结束 heapUsed，增长超阈值 (>50%) 则标记 FAIL                | P0     |
| SOAK-04 | Custom k6 metrics: 订单成功率 (Counter)、认证延迟 p99 (Trend)                                | P1     |
| SOAK-05 | InfluxDB 输出: k6 `--out influxdb` 将 custom metrics 写入 InfluxDB                           | P1     |
| SOAK-06 | Grafana Dashboard 扩展: heapUsed 趋势面板、业务指标面板                                      | P1     |
| SOAK-07 | Grafana 告警规则: p95 > 500ms, error rate > 1%, heapUsed 持续增长                            | P2     |
| SOAK-08 | npm script: `npm run k6:soak` (短时 soak) + `npm run k6:soak:full` (完整 4h)                 | P0     |
| SOAK-09 | 单元测试: metrics 端点、泄漏检测逻辑的单元测试                                               | P0     |
| SOAK-10 | soak test 报告: 生成 HTML/JSON 报告到 `reports/` 目录                                        | P2     |

## 4.4 Scope 确认

| 模块               | In Scope                                             | Out of Scope             |
| ------------------ | ---------------------------------------------------- | ------------------------ |
| **Soak Test**      | k6 脚本 (100~500 VUs, 1~4h), heapUsed 采集, 泄漏检测 | 分布式 k6 (多节点)       |
| **Custom Metrics** | 业务指标 (订单成功率, auth latency p99) → InfluxDB   | Prometheus 集成          |
| **AlertManager**   | Grafana 告警规则 (p95, error rate, heap)             | PagerDuty/Slack 告警集成 |
| **单元测试**       | 新模块的单元测试                                     | CI 中跑 soak (太耗时)    |

## 4.5 可行性评估

| 维度          | 评估                                                   | 结论                            |
| ------------- | ------------------------------------------------------ | ------------------------------- |
| 本机环境      | 8 CPU, 16 GB RAM, 59 GB 磁盘                           | ✅ 满足 soak test 需求          |
| 工具链        | Node.js v25.8.1, k6 v1.7.0, JMeter                     | ✅ 全部就绪                     |
| InfluxDB      | Phase 1 已配置 (port 8086)                             | ✅ 可复用                       |
| Grafana       | Phase 1 已配置 (port 3010)                             | ✅ 可复用                       |
| heapUsed 采集 | 需新增 `/api/metrics` 端点暴露 `process.memoryUsage()` | ✅ 简单实现                     |
| 时间风险      | soak test 本身耗时 1~4h, CI 中不可行                   | ⚠️ CI 仅跑 smoke, soak 本地手动 |
| DB 膨胀风险   | 长时间 orders 写入会膨胀 perf.db                       | ⚠️ 需内置清理或限速策略         |

## 4.6 依赖识别

| 依赖                     | 说明                         | 状态        |
| ------------------------ | ---------------------------- | ----------- |
| Express API (src/app.js) | `/api/metrics` 端点          | ✅ 已完成   |
| InfluxDB                 | 写入 custom metrics          | ✅ 已有     |
| Grafana                  | Dashboard + Alert rules      | ✅ 已扩展   |
| k6                       | soak test 脚本               | ✅ 已完成   |
| scripts/server.sh        | soak 模式复用现有 start/stop | ✅ 无需改动 |

## 4.7 需求 Checklist

| #   | 检查项                         | 状态                                    |
| --- | ------------------------------ | --------------------------------------- |
| 1   | Issue 已读取，目标明确         | ✅ Issue #65                            |
| 2   | 完整用户故事                   | ✅ US-19~22                             |
| 3   | Scope 已确认                   | ✅ Soak + Custom Metrics + AlertManager |
| 4   | 可行性评估                     | ✅ 7 项评估, DB 膨胀 + CI 时间为中风险  |
| 5   | 依赖已识别                     | ✅ 5 项依赖                             |
| 6   | 需求已编号                     | ✅ SOAK-01~10                           |
| 7   | 需求描述已写入 requirements.md | ✅ 本文档 §4.1~4.6                      |
