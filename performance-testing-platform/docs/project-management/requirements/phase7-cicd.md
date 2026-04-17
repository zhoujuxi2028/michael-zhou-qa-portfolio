# Phase 7 — CI/CD + 可观测性 📋 Planned ([#88](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/88))

> 依赖 Phase 6 的测试产出，构建 CI 门禁、可视化和自动调度

## 7.1 目标

将测试结果接入 CI/CD 流水线和可观测性平台，实现性能基线回归检测、覆盖率门禁、Grafana 增强面板和定时调度。

| 维度                | 当前状态                  | 目标状态                                          |
| ------------------- | ------------------------- | ------------------------------------------------- |
| 基线回归 + 历史趋势 | CI 仅 pass/fail，单次对比 | 基线回归检测 + 多次运行趋势可视化 + 渐进退化预警  |
| CI 覆盖率           | 覆盖率仅本地查看          | CI 强制门禁 + artifact 归档                       |
| Grafana 面板 + 告警 | 基础面板，无通知渠道      | 错误分布 + 延迟热力图 + 自定义指标 + webhook 告警 |
| 定时调度            | 仅手动触发测试            | CI cron nightly soak + weekly capacity，自动归档  |

## 需求编号规范

```
PERF-[子系统]-FR-[序号]

子系统：
  BL    = Baseline      基线回归 + 趋势
  COV   = Coverage      覆盖率门禁
  OBS   = Observability Grafana 面板 + 告警
  SCHED = Schedule      定时调度
  K6    = k6 Scripts    k6 脚本能力
```

## 7.2 用户故事

| ID    | 用户故事                                                                                                 | 关联需求         |
| ----- | -------------------------------------------------------------------------------------------------------- | ---------------- |
| US-26 | 作为性能工程师，我想在 CI 中自动对比当前 p95 与历史基线并查看最近 N 次运行趋势，以便在性能退化时阻断合并 | PERF-BL-FR       |
| US-31 | 作为性能工程师，我想在 CI 中强制覆盖率门禁，以便防止测试覆盖率退化                                       | PERF-COV-FR      |
| US-32 | 作为性能工程师，我想在 Grafana 中查看错误分布、延迟热力图，并在告警触发时收到 webhook 通知               | PERF-OBS-FR      |
| US-33 | 作为性能工程师，我想设置定时调度自动运行 nightly soak 和 weekly capacity test，以便持续监控系统稳定性    | PERF-SCHED-FR    |
| US-34 | 作为性能工程师，我想确保所有 k6 脚本统一使用 funnel helper，以便维护一致的流量漏斗模型且无重复内联逻辑   | PERF-K6-FR       |
| US-35 | 作为性能工程师，我想在 breakpoint 报告中看到 graceful/catastrophic 崩溃分类，以便区分系统降级方式         | PERF-K6-FR       |
| US-36 | 作为性能工程师，我想验证系统在持续超载后的熔断恢复行为，以便评估弹性工程能力                             | PERF-K6-FR       |

## 7.3 需求列表

### 7.3.1 性能基线回归 + 历史趋势（PERF-BL-FR）

| ID               | 需求                                                                                                  | 优先级 | 工作量 |
| ---------------- | ----------------------------------------------------------------------------------------------------- | ------ | ------ |
| PERF-BL-FR-001   | CI 性能基线存储: smoke gate 运行后将 p95 / error rate / throughput 存为 JSON artifact                 | P1     | 中     |
| PERF-BL-FR-002   | 基线回归检测: CI 下载上次 baseline artifact，对比当前 p95，退化 >20% 则 warning，>50% 则 fail         | P1     | 中     |
| PERF-BL-FR-003   | 趋势数据收集: 每次 CI 运行提取 p95/throughput/error rate 追加到 `reports/trend.json`                  | P2     | 中     |
| PERF-BL-FR-004   | 趋势可视化: `scripts/generate-trend.sh` 从 trend.json 生成 Markdown 趋势表（最近 N 次运行的指标对比） | P2     | 中     |
| PERF-BL-FR-005   | Grafana 趋势面板: 历史 p95 / throughput 折线图（从 InfluxDB 聚合）                                    | P3     | 小     |
| PERF-BL-FR-006   | 基线对比单元测试: 回归检测阈值判定、首次运行无 baseline 兜底                                          | P1     | 小     |

### 7.3.2 CI 覆盖率门禁（PERF-COV-FR）

| ID               | 需求                                                                                                           | 优先级 | 工作量 |
| ---------------- | -------------------------------------------------------------------------------------------------------------- | ------ | ------ |
| PERF-COV-FR-001  | `performance-ci.yml` unit-test job 添加 `--coverage` 参数，生成覆盖率报告                                      | P1     | 小     |
| PERF-COV-FR-002  | 上传 coverage 报告为 CI artifact (`actions/upload-artifact`)                                                   | P1     | 小     |
| PERF-COV-FR-003  | Jest 覆盖率阈值 (statements ≥80%, branches ≥70%, functions ≥80%, lines ≥80%) 在 CI 中强制执行，低于阈值则 fail | P1     | 小     |

### 7.3.3 Grafana 面板 + 告警（PERF-OBS-FR）

| ID               | 需求                                                                                              | 优先级 | 工作量 |
| ---------------- | ------------------------------------------------------------------------------------------------- | ------ | ------ |
| PERF-OBS-FR-001  | 新增「错误分布」面板：按 endpoint 分组的 error rate 时序图                                        | P2     | 小     |
| PERF-OBS-FR-002  | 新增「延迟热力图」面板：请求延迟分布的 heatmap 可视化                                             | P2     | 小     |
| PERF-OBS-FR-003  | 新增「自定义指标聚合」面板：soak_heap_used_mb、soak_event_loop_lag、soak_order_success 趋势       | P2     | 小     |
| PERF-OBS-FR-004  | Grafana webhook 告警: `docker-compose.yml` 增加 webhook notifier 配置，告警触发时 POST 到指定 URL | P2     | 小     |

### 7.3.4 定时调度测试（PERF-SCHED-FR）

> ⚠️ **可行性风险**: CI cron 需要目标服务器持续运行，Portfolio 项目无持久基础设施。降级为 P3，作为示范性 workflow 文件，不保证实际调度效果。

| ID                | 需求                                                                                        | 优先级 | 工作量 |
| ----------------- | ------------------------------------------------------------------------------------------- | ------ | ------ |
| PERF-SCHED-FR-001 | GitHub Actions cron workflow: nightly soak-short (10m) + weekly capacity test，自动归档结果 | P3     | 中     |
| PERF-SCHED-FR-002 | 测试结果自动归档: 每次调度运行的 k6 JSON output 存为 CI artifact，保留 30 天                | P3     | 小     |

### 7.3.5 k6 脚本能力（PERF-K6-FR）

> 来源: Issue #114、#116、#108 — Phase 6 有意推迟、Phase 7 补完的未实现需求

| ID               | 需求                                                                                                                                     | 优先级 | 工作量 | 来源 Issue |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------ | ---------- |
| PERF-K6-FR-001   | funnel helper 迁移: `stress.k6.js` 替换内联漏斗逻辑为 `executeFunnel()`                                                                 | P1     | 小     | #116       |
| PERF-K6-FR-002   | funnel helper 迁移: `capacity.k6.js` 替换内联漏斗逻辑为 `executeFunnel()`                                                               | P1     | 小     | #116       |
| PERF-K6-FR-003   | funnel helper 迁移: `soak.k6.js` 替换内联漏斗逻辑为 `executeFunnel(baseUrl, { onOrder: cb })`，保留 soakOrderSuccess/Failure metrics     | P1     | 中     | #116       |
| PERF-K6-FR-004   | breakpoint handleSummary 增强: 输出 graceful/catastrophic 崩溃类型分类（graceful = p95 超限先于 error rate；catastrophic = 反之）        | P2     | 小     | #114       |
| PERF-K6-FR-005   | 熔断恢复行为测试: k6 脚本验证系统在持续超载后的恢复时间（graceful degradation vs cascading failure），补充 UT-RL-07 单元测试             | P2     | 中     | #116       |
| PERF-K6-FR-006   | SOAK-TC-04 集成验证: 启动 InfluxDB + Grafana，运行 k6 soak-short（10min），确认 Dashboard 实时展示数据且内存/CPU 趋势正常               | P1     | 小     | #108       |
| PERF-K6-FR-007   | SOAK-TC-05 集成验证: 主动触发 p95 > 500ms 及 error rate > 1% 条件，确认 Grafana 告警规则正确触发、UI 告警状态变更                      | P1     | 小     | #108       |

## 7.4 Scope 确认

| 模块                                      | In Scope                                                                                  | Out of Scope                              |
| ----------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------- |
| **PERF-BL-FR 基线回归 + 历史趋势**        | CI artifact 存储 + JSON 对比 + 阈值判定 + trend.json + Markdown 趋势表 + Grafana 趋势面板 | 数据库存储、Web UI 仪表板                 |
| **PERF-COV-FR CI 覆盖率**                 | coverage gate + artifact upload                                                           | Codecov/Coveralls 集成                    |
| **PERF-OBS-FR Grafana 面板 + 告警**       | 错误分布 + 延迟热力图 + 自定义指标聚合 + webhook 告警                                     | 自定义 Grafana 插件、Slack/PagerDuty 集成 |
| **PERF-SCHED-FR 定时调度** ⚠️             | CI cron nightly soak + weekly capacity + artifact 归档（示范性，P3）                      | 外部调度平台 (Jenkins/Airflow)            |
| **PERF-K6-FR k6 脚本能力**               | funnel 迁移(stress/capacity/soak) + breakpoint graceful/catastrophic + 熔断恢复测试 + SOAK-TC-04/05 集成验证 | 重构原有 Phase 6 测试逻辑    |

## 7.5 可行性评估

| 维度                      | 评估                                                             | 结论                  |
| ------------------------- | ---------------------------------------------------------------- | --------------------- |
| CI baseline 对比 + 趋势   | GitHub Actions artifact 可跨 run 下载；trend.json 追加式收集     | ✅ 可行               |
| CI coverage gate          | Jest --coverage 内置阈值检查，CI 中直接 fail on threshold breach | ✅ 可行               |
| Grafana webhook + heatmap | alerting 原生支持 webhook；原生 heatmap panel，无需插件          | ✅ 可行               |
| CI cron 定时调度          | GitHub Actions schedule 支持 cron，但 Portfolio 无持久目标服务   | ⚠️ 有限可行（示范性） |

## 7.6 依赖识别

| 依赖                      | 说明                                              | 关联需求         | 状态                  |
| ------------------------- | ------------------------------------------------- | ---------------- | --------------------- |
| Phase 6 测试产出          | k6 JSON output、摘要报告                          | PERF-BL-FR       | Phase 6 交付          |
| actions/download-artifact | CI baseline 对比 + 趋势数据需跨 run 下载 artifact | PERF-BL-FR       | ✅ 已有 @v7           |
| Grafana webhook           | Docker Compose 中配置 contact point               | PERF-OBS-FR      | ✅ 已有 Grafana       |
| jq                        | CI 中解析 JSON baseline + trend                   | PERF-BL-FR       | ✅ GitHub runner 预装 |
| GitHub Actions schedule   | cron trigger，无需额外工具                        | PERF-SCHED-FR    | ✅ 已有               |

## 7.7 需求 Checklist

| #   | 检查项         | 状态                                                                                                                              |
| --- | -------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 目标明确       | ✅ CI/CD + 可观测性，4 个维度                                                                                                     |
| 2   | 完整用户故事   | ✅ US-26/31/32/33/34/35/36                                                                                                        |
| 3   | Scope 已确认   | ✅ 5 个模块，明确 In/Out                                                                                                          |
| 4   | 可行性评估     | ✅ 4 项评估，1 项有限可行（PERF-SCHED-FR）                                                                                        |
| 5   | 依赖已识别     | ✅ 5 项依赖（含 Phase 6 前置）                                                                                                    |
| 6   | 需求已编号     | ✅ 5 组 22 条: PERF-BL-FR(6) + PERF-COV-FR(3) + PERF-OBS-FR(4) + PERF-SCHED-FR(2) + PERF-K6-FR(7)                              |
| 7   | 需求描述已写入 | ✅ 本文档 §7.1~7.6                                                                                                                |
