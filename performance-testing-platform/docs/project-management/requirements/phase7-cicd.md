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

## 7.2 用户故事

| ID    | 用户故事                                                                                                 | 关联需求      |
| ----- | -------------------------------------------------------------------------------------------------------- | ------------- |
| US-26 | 作为性能工程师，我想在 CI 中自动对比当前 p95 与历史基线并查看最近 N 次运行趋势，以便在性能退化时阻断合并 | ENT-BASELINE  |
| US-31 | 作为性能工程师，我想在 CI 中强制覆盖率门禁，以便防止测试覆盖率退化                                       | ENT-COVERAGE  |
| US-32 | 作为性能工程师，我想在 Grafana 中查看错误分布、延迟热力图，并在告警触发时收到 webhook 通知               | ENT-DASHBOARD |
| US-33 | 作为性能工程师，我想设置定时调度自动运行 nightly soak 和 weekly capacity test，以便持续监控系统稳定性    | ENT-SCHEDULE  |

## 7.3 需求列表

### 7.3.1 性能基线回归 + 历史趋势（ENT-BASELINE）

| ID              | 需求                                                                                                  | 优先级 | 工作量 |
| --------------- | ----------------------------------------------------------------------------------------------------- | ------ | ------ |
| ENT-BASELINE-01 | CI 性能基线存储: smoke gate 运行后将 p95 / error rate / throughput 存为 JSON artifact                 | P1     | 中     |
| ENT-BASELINE-02 | 基线回归检测: CI 下载上次 baseline artifact，对比当前 p95，退化 >20% 则 warning，>50% 则 fail         | P1     | 中     |
| ENT-BASELINE-03 | 趋势数据收集: 每次 CI 运行提取 p95/throughput/error rate 追加到 `reports/trend.json`                  | P2     | 中     |
| ENT-BASELINE-04 | 趋势可视化: `scripts/generate-trend.sh` 从 trend.json 生成 Markdown 趋势表（最近 N 次运行的指标对比） | P2     | 中     |
| ENT-BASELINE-05 | Grafana 趋势面板: 历史 p95 / throughput 折线图（从 InfluxDB 聚合）                                    | P3     | 小     |

### 7.3.2 CI 覆盖率门禁（ENT-COVERAGE）

| ID              | 需求                                                                                                           | 优先级 | 工作量 |
| --------------- | -------------------------------------------------------------------------------------------------------------- | ------ | ------ |
| ENT-COVERAGE-01 | `performance-ci.yml` unit-test job 添加 `--coverage` 参数，生成覆盖率报告                                      | P1     | 小     |
| ENT-COVERAGE-02 | 上传 coverage 报告为 CI artifact (`actions/upload-artifact`)                                                   | P1     | 小     |
| ENT-COVERAGE-03 | Jest 覆盖率阈值 (statements ≥80%, branches ≥70%, functions ≥80%, lines ≥80%) 在 CI 中强制执行，低于阈值则 fail | P1     | 小     |

### 7.3.3 Grafana 面板 + 告警（ENT-DASHBOARD）

| ID               | 需求                                                                                              | 优先级 | 工作量 |
| ---------------- | ------------------------------------------------------------------------------------------------- | ------ | ------ |
| ENT-DASHBOARD-01 | 新增「错误分布」面板：按 endpoint 分组的 error rate 时序图                                        | P2     | 小     |
| ENT-DASHBOARD-02 | 新增「延迟热力图」面板：请求延迟分布的 heatmap 可视化                                             | P2     | 小     |
| ENT-DASHBOARD-03 | 新增「自定义指标聚合」面板：soak_heap_used_mb、soak_event_loop_lag、soak_order_success 趋势       | P2     | 小     |
| ENT-DASHBOARD-04 | Grafana webhook 告警: `docker-compose.yml` 增加 webhook notifier 配置，告警触发时 POST 到指定 URL | P2     | 小     |

### 7.3.4 定时调度测试（ENT-SCHEDULE）

> ⚠️ **可行性风险**: CI cron 需要目标服务器持续运行，Portfolio 项目无持久基础设施。降级为 P3，作为示范性 workflow 文件，不保证实际调度效果。

| ID              | 需求                                                                                        | 优先级 | 工作量 |
| --------------- | ------------------------------------------------------------------------------------------- | ------ | ------ |
| ENT-SCHEDULE-01 | GitHub Actions cron workflow: nightly soak-short (10m) + weekly capacity test，自动归档结果 | P3     | 中     |
| ENT-SCHEDULE-02 | 测试结果自动归档: 每次调度运行的 k6 JSON output 存为 CI artifact，保留 30 天                | P3     | 小     |

### 7.3.5 单元测试（ENT-TEST — Phase 7 部分）

| ID          | 需求                                                         | 优先级 | 工作量 |
| ----------- | ------------------------------------------------------------ | ------ | ------ |
| ENT-TEST-04 | 基线对比单元测试: 回归检测阈值判定、首次运行无 baseline 兜底 | P1     | 小     |

## 7.4 Scope 确认

| 模块                                  | In Scope                                                                                  | Out of Scope                              |
| ------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------- |
| **ENT-BASELINE 基线回归 + 历史趋势**  | CI artifact 存储 + JSON 对比 + 阈值判定 + trend.json + Markdown 趋势表 + Grafana 趋势面板 | 数据库存储、Web UI 仪表板                 |
| **ENT-COVERAGE CI 覆盖率**            | coverage gate + artifact upload                                                           | Codecov/Coveralls 集成                    |
| **ENT-DASHBOARD Grafana 面板 + 告警** | 错误分布 + 延迟热力图 + 自定义指标聚合 + webhook 告警                                     | 自定义 Grafana 插件、Slack/PagerDuty 集成 |
| **ENT-SCHEDULE 定时调度** ⚠️          | CI cron nightly soak + weekly capacity + artifact 归档（示范性，P3）                      | 外部调度平台 (Jenkins/Airflow)            |

## 7.5 可行性评估

| 维度                      | 评估                                                             | 结论                  |
| ------------------------- | ---------------------------------------------------------------- | --------------------- |
| CI baseline 对比 + 趋势   | GitHub Actions artifact 可跨 run 下载；trend.json 追加式收集     | ✅ 可行               |
| CI coverage gate          | Jest --coverage 内置阈值检查，CI 中直接 fail on threshold breach | ✅ 可行               |
| Grafana webhook + heatmap | alerting 原生支持 webhook；原生 heatmap panel，无需插件          | ✅ 可行               |
| CI cron 定时调度          | GitHub Actions schedule 支持 cron，但 Portfolio 无持久目标服务   | ⚠️ 有限可行（示范性） |

## 7.6 依赖识别

| 依赖                      | 说明                                              | 关联需求      | 状态                  |
| ------------------------- | ------------------------------------------------- | ------------- | --------------------- |
| Phase 6 测试产出          | k6 JSON output、摘要报告                          | ENT-BASELINE  | Phase 6 交付          |
| actions/download-artifact | CI baseline 对比 + 趋势数据需跨 run 下载 artifact | ENT-BASELINE  | ✅ 已有 @v7           |
| Grafana webhook           | Docker Compose 中配置 contact point               | ENT-DASHBOARD | ✅ 已有 Grafana       |
| jq                        | CI 中解析 JSON baseline + trend                   | ENT-BASELINE  | ✅ GitHub runner 预装 |
| GitHub Actions schedule   | cron trigger，无需额外工具                        | ENT-SCHEDULE  | ✅ 已有               |

## 7.7 需求 Checklist

| #   | 检查项         | 状态                                                                                                |
| --- | -------------- | --------------------------------------------------------------------------------------------------- |
| 1   | 目标明确       | ✅ CI/CD + 可观测性，4 个维度                                                                       |
| 2   | 完整用户故事   | ✅ US-26/31/32/33                                                                                   |
| 3   | Scope 已确认   | ✅ 4 个模块，明确 In/Out                                                                            |
| 4   | 可行性评估     | ✅ 4 项评估，1 项有限可行（ENT-SCHEDULE）                                                           |
| 5   | 依赖已识别     | ✅ 5 项依赖（含 Phase 6 前置）                                                                      |
| 6   | 需求已编号     | ✅ 5 组 15 条: ENT-BASELINE(5) + ENT-COVERAGE(3) + ENT-DASHBOARD(4) + ENT-SCHEDULE(2) + ENT-TEST(1) |
| 7   | 需求描述已写入 | ✅ 本文档 §7.1~7.6                                                                                  |
