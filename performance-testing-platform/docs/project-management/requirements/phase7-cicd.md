# Phase 7 — CI/CD + 可观测性 📋 Planned ([#88](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/88))

> 依赖 Phase 6 的测试产出，构建 CI 门禁、可视化和自动调度

---

## 7.1 目标

将测试结果接入 CI/CD 流水线和可观测性平台，实现：
1. **性能基线回归检测** - 自动对比当前与历史性能
2. **覆盖率门禁系统** - 强制执行，防止覆盖率退化
3. **Grafana面板增强** - 错误分布、延迟热力图、自定义指标
4. **定时调度系统** - nightly soak 和 weekly capacity test，自动归档结果
5. **趋势分析** - 多次运行数据的可视化

| 维度                | 当前状态                  | 目标状态                                          |
| ------------------- | ------------------------- | ------------------------------------------------- |
| 基线回归 + 历史趋势 | CI 仅 pass/fail，单次对比 | 基线回归检测 + 多次运行趋势可视化 + 渐进退化预警  |
| CI 覆盖率           | 覆盖率仅本地查看          | CI 强制门禁 + artifact 归档                       |
| Grafana 面板 + 告警 | 基础面板，无通知渠道      | 错误分布 + 延迟热力图 + 自定义指标 + webhook 告警 |
| 定时调度            | 仅手动触发测试            | CI cron nightly soak + weekly capacity，自动归档  |

---

## 7.2 需求编号规范

```
PERF-[子系统]-[子模块]-FR-[序号]
```

| 子系统    | 子模块   | 说明 |
| --------- | -------- | ---- |
| `CI`      | `BL`     | Baseline：基线回归 + 趋势 |
| `CI`      | `COV`    | Coverage：覆盖率门禁 |
| `CI`      | `SCHED`  | Schedule：定时调度 |
| `OBS`     | `DASH`   | Dashboard：Grafana 面板 |
| `OBS`     | `ALERT`  | Alert：Grafana 告警 |
| `ENGINE`  | `K6`     | k6 Scripts：k6 脚本能力 |

---

## 7.2 用户故事

| ID    | 用户故事                                                                                                 | 关联需求         |
| ----- | -------------------------------------------------------------------------------------------------------- | ---------------- |
| US-26 | 作为性能工程师，我想在 CI 中自动对比当前 p95 与历史基线并查看最近 N 次运行趋势，以便在性能退化时阻断合并 | `PERF-CI-BL-FR`                    |
| US-31 | 作为性能工程师，我想在 CI 中强制覆盖率门禁，以便防止测试覆盖率退化                                       | `PERF-CI-COV-FR`                   |
| US-32 | 作为性能工程师，我想在 Grafana 中查看错误分布、延迟热力图，并在告警触发时收到 webhook 通知               | `PERF-OBS-DASH-FR` / `PERF-OBS-ALERT-FR` |
| US-33 | 作为性能工程师，我想设置定时调度自动运行 nightly soak 和 weekly capacity test，以便持续监控系统稳定性    | `PERF-CI-SCHED-FR`                 |
| US-34 | 作为性能工程师，我想确保所有 k6 脚本统一使用 funnel helper，以便维护一致的流量漏斗模型且无重复内联逻辑   | `PERF-ENGINE-K6-FR`                |
| US-35 | 作为性能工程师，我想在 breakpoint 报告中看到 graceful/catastrophic 崩溃分类，以便区分系统降级方式         | `PERF-ENGINE-K6-FR`                |
| US-36 | 作为性能工程师，我想验证系统在持续超载后的熔断恢复行为，以便评估弹性工程能力                             | `PERF-ENGINE-K6-FR`                |

---

## 7.3 需求列表

### 7.3.1 性能基线回归 + 历史趋势（PERF-CI-BL-FR）

| ID               | 需求                                                                                                  | 优先级 | 工作量 |
| ---------------- | ----------------------------------------------------------------------------------------------------- | ------ | ------ |
| PERF-CI-BL-FR-001   | CI 性能基线存储: smoke gate 运行后将 p95 / error rate / throughput 存为 JSON artifact                 | P1     | 中     |
| PERF-CI-BL-FR-002   | 基线回归检测: CI 下载上次 baseline artifact，对比当前 p95，退化 >20% 则 warning，>50% 则 fail         | P1     | 中     |
| PERF-CI-BL-FR-003   | 趋势数据收集: 每次 CI 运行提取 p95/throughput/error rate 追加到 `reports/trend.json`                  | P2     | 中     |
| PERF-CI-BL-FR-004   | 趋势可视化: `scripts/generate-trend.sh` 从 trend.json 生成 Markdown 趋势表（最近 N 次运行的指标对比） | P2     | 中     |
| PERF-CI-BL-FR-005   | Grafana 趋势面板: 历史 p95 / throughput 折线图（从 InfluxDB 聚合）                                    | P3     | 小     |
| PERF-CI-BL-FR-006   | 基线对比单元测试: 回归检测阈值判定、首次运行无 baseline 兜底                                          | P1     | 小     |

### 7.3.2 CI 覆盖率门禁（PERF-CI-COV-FR）

| ID               | 需求                                                                                                  | 优先级 | 工作量 |
| ---------------- | ----------------------------------------------------------------------------------------------------- | ------ | ------ |
| PERF-CI-COV-FR-001   | `performance-ci.yml` unit-test job 添加 `--coverage` 参数，生成覆盖率报告                                      | P1     | 小     |
| PERF-CI-COV-FR-002   | 上传 coverage 报告为 CI artifact (`actions/upload-artifact`)                                                   | P1     | 小     |
| PERF-CI-COV-FR-003   | Jest 覆盖率阈值 (statements ≥80%, branches ≥70%, functions ≥80%, lines ≥80%) 在 CI 中强制执行，低于阈值则 fail | P1     | 小     |

### 7.3.3 Grafana 面板 + 告警（PERF-OBS-DASH-FR / PERF-OBS-ALERT-FR）

| ID               | 需求                                                                                                  | 优先级 | 工作量 |
| ---------------- | ----------------------------------------------------------------------------------------------------- | ------ | ------ |
| PERF-OBS-DASH-FR-001   | 新增「错误分布」面板：按 endpoint 分组的 error rate 时序图                                        | P2     | 小     |
| PERF-OBS-DASH-FR-002   | 新增「延迟热力图」面板：请求延迟分布的 heatmap 可视化                                             | P2     | 小     |
| PERF-OBS-DASH-FR-003   | 新增「自定义指标聚合」面板：soak_heap_used_mb、soak_event_loop_lag、soak_order_success 趋势       | P2     | 小     |
| PERF-OBS-ALERT-FR-001   | Grafana webhook 告警: `docker-compose.yml` 增加 webhook notifier 配置，告警触发时 POST 到指定 URL | P2     | 小     |

### 7.3.4 定时调度测试（PERF-CI-SCHED-FR）

| ID               | 需求                                                                                                  | 优先级 | 工作量 |
| ---------------- | ----------------------------------------------------------------------------------------------------- | ------ | ------ |
| PERF-CI-SCHED-FR-001   | GitHub Actions cron workflow: nightly soak-short (10m) + weekly capacity test，自动归档结果 | P2     | 中     |
| PERF-CI-SCHED-FR-002   | 测试结果自动归档: 每次调度运行的 k6 JSON output 存为 CI artifact，保留 30 天                | P2     | 小     |

### 7.3.5 k6 脚本能力（PERF-ENGINE-K6-FR）

下表显示 Phase 7 补完的需求与 Phase 6 来源的对应关系：

| Phase 7 需求 ID | Phase 6 来源 | 补完类型 | 详细需求摘要 | Issue |
|---|---|---|---|
| **PERF-ENGINE-K6-FR-011～013** | ENT-CONSISTENCY-01～05 | helpers 迁移 | `stress.k6.js` / `capacity.k6.js` / `soak.k6.js` 中替换内联漏斗逻辑为 `executeFunnel()` helper | [#116](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/116) |
| **PERF-ENGINE-K6-FR-014** | ENT-BREAKPOINT-02 | 输出分类 | breakpoint.k6.js 的 handleSummary 增强：输出 graceful/catastrophic 崩溃类型分类 | [#114](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/114) |
| **PERF-ENGINE-K6-FR-015** | ENT-RESILIENCE-03 | 测试脚本 | k6 脚本验证系统在持续超载后的恢复时间（graceful degradation vs cascading failure） | [#116](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/116) |
| **PERF-ENGINE-K6-FR-016～017** | Phase 6 SOAK-TC-04/05 | 集成验证 | InfluxDB + Grafana 集成验证，确认实时展示和告警规则 | [#108](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/108) |

---

## 7.4 Scope 确认

| 模块                                      | In Scope                                                                                  | Out of Scope                              |
| ----------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------- |
| **PERF-CI-BL-FR 基线回归 + 历史趋势**        | CI artifact 存储 + JSON 对比 + 阈值判定 + trend.json + Markdown 趋势表 + Grafana 趋势面板 | 数据库存储、Web UI 仪表板                 |
| **PERF-CI-COV-FR CI 覆盖率**                 | coverage gate + artifact upload                                                           | Codecov/Coveralls 集成                    |
| **PERF-OBS-DASH-FR / PERF-OBS-ALERT-FR** Grafana 面板 + 告警       | 错误分布 + 延迟热力图 + 自定义指标聚合 + webhook 告警                                     | 自定义 Grafana 插件、Slack/PagerDuty 集成 |
| **PERF-CI-SCHED-FR 定时调度**                | CI cron nightly soak + weekly capacity + artifact 归档                                     | 外部调度平台 (Jenkins/Airflow)            |

---

## 7.5 需求 Checklist

| #   | 检查项         | 状态                                                                                                                              |
| --- | -------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 目标明确       | ✅ CI/CD + 可观测性，4 个维度                                                                                                     |
| 2   | 完整用户故事   | ✅ US-26/31/32/33/34/35/36                                                                                                        |
| 3   | Scope 已确认   | ✅ 5 个模块，明确 In/Out                                                                                                          |
| 4   | 可行性评估     | ✅ 4 项评估，全部可行                                                                                   |
| 5   | 依赖已识别     | ✅ 5 项依赖（含 Phase 6 前置）                                                                                                    |
| 6   | 需求已编号     | ✅ 6 组 22 条: PERF-CI-BL-FR(6) + PERF-CI-COV-FR(3) + PERF-OBS-DASH-FR(3) + PERF-OBS-ALERT-FR(1) + PERF-CI-SCHED-FR(2) + PERF-ENGINE-K6-FR(7) |
| 7   | 需求已写入   | ✅ 本文档 §7.1~7.3                                                                                                                |

---

## 7.6 依赖识别

| 依赖                      | 说明                                              | 关联需求         | 状态                        |
| ------------------------- | ------------------------------------------------- | ---------------- | --------------------------- |
| Phase 6 测试产出          | k6 JSON output、摘要报告                          | `PERF-CI-BL-FR`              | Phase 6 交付                     |
| actions/download-artifact | CI baseline 对比 + 趋势数据需跨 run 下载 artifact | `PERF-CI-BL-FR`              | 技术可行 (GitHub Actions)        |
| Grafana webhook           | Docker Compose 中配置 contact point               | `PERF-OBS-ALERT-FR`          | 技术可行 (Grafana 内置)          |
| jq                        | CI 中解析 JSON baseline + trend                   | `PERF-CI-BL-FR`              | 技术可行 (GitHub runner 预装)    |

---

## 7.7 Demo项目备注

> **Demo项目特点**: 简化实施，使用默认配置即可

- 使用默认配置（Jest、Grafana、k6）
- 手动验证测试结果
- 通过 Issue 跟踪需求完成状态

---

**最后更新**: 2026-04-18  
**维护者**: DevOps Team
