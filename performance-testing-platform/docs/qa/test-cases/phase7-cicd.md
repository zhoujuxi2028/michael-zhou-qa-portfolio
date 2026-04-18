# Phase 7 测试用例 — CI/CD + 可观测性

## 基线回归单元测试 (`tests/unit/utils/baseline.test.js`)

| 用例 ID  | 需求 ID       | 测试                            | 预期                              | 标签 |
| -------- | ------------- | ------------------------------- | --------------------------------- | ---- |
| UT-BL-01 | PERF-BL-FR-002 | 当前 p95 与 baseline 偏差 < 20% | 结果: pass                        | UT P1 regression |
| UT-BL-02 | PERF-BL-FR-002 | 当前 p95 退化 > 20%             | 结果: warning                     | UT P1 regression |
| UT-BL-03 | PERF-BL-FR-002 | 当前 p95 退化 > 50%             | 结果: fail                        | UT P1 regression |
| UT-BL-04 | PERF-BL-FR-006 | 首次运行无 baseline 文件        | 跳过对比，结果: pass (首次建基线) | UT P1 regression |
| UT-BL-05 | PERF-BL-FR-006 | baseline JSON 格式异常          | 报错提示，不 crash                | UT P1 regression |
| UT-BL-06 | PERF-BL-FR-003 | 趋势数据追加                    | trend.json 新增一行，保留历史     | UT P1 regression |

## CI 覆盖率门禁

| 用例 ID   | 需求 ID        | 验证项                                  | 预期                             | 标签 |
| --------- | --------------- | --------------------------------------- | -------------------------------- | ---- |
| CI-COV-01 | PERF-COV-FR-001 | `npm test -- --coverage` 生成覆盖率报告 | `coverage/` 目录生成 lcov + HTML | CI P1 regression |
| CI-COV-02 | PERF-COV-FR-003 | statements ≥ 80% 通过                   | CI job pass                      | CI P1 regression |
| CI-COV-03 | PERF-COV-FR-003 | statements < 80% 失败                   | CI job fail (故意删测试验证)     | CI P1 regression |
| CI-COV-04 | PERF-COV-FR-002 | coverage 报告上传为 artifact            | Actions Artifacts 可下载         | CI P1 regression |

## CI 基线回归

| 用例 ID  | 需求 ID        | 验证项                                   | 预期                                    | 标签 |
| -------- | --------------- | ---------------------------------------- | --------------------------------------- | ---- |
| CI-BL-01 | PERF-BL-FR-001  | smoke gate 后存储 baseline JSON artifact | artifact 包含 p95/error_rate/throughput | CI P2 regression |
| CI-BL-02 | PERF-BL-FR-002  | 下次 CI 运行下载上次 baseline 并对比     | 对比结果输出到 CI log                   | CI P2 regression |
| CI-BL-03 | PERF-BL-FR-002  | p95 退化 > 50% 时 CI fail                | job 失败，日志含退化百分比              | CI P2 regression |
| CI-BL-04 | PERF-BL-FR-006  | 首次运行无 baseline 时正常通过           | 不报错，存储当前为基线                  | CI P2 regression |

## 趋势报告

| 用例 ID  | 需求 ID        | 验证项                                 | 预期                               | 标签 |
| -------- | --------------- | -------------------------------------- | ---------------------------------- | ---- |
| TREND-01 | PERF-BL-FR-004  | `scripts/generate-trend.sh` 生成趋势表 | reports/trend.md 包含最近 N 次指标 | CI P2 regression |
| TREND-02 | PERF-BL-FR-003  | trend.json 累积多次运行数据            | JSON 数组长度递增                  | CI P2 regression |
| TREND-03 | PERF-BL-FR-003  | 空 trend.json 时不 crash               | 输出 "No trend data" 提示          | CI P2 regression |

## Grafana 面板验证

| 用例 ID       | 需求 ID         | 验证项                                         | 方法                                           | 标签 |
| ------------- | --------------- | ---------------------------------------------- | ---------------------------------------------- | ---- |
| GRF-ERR-01    | PERF-OBS-FR-001 | 错误分布面板渲染                               | `docker compose up` + 浏览器，按 endpoint 分组 | CI P3 full |
| GRF-HEAT-01   | PERF-OBS-FR-002 | 延迟热力图面板渲染                             | heatmap panel，颜色梯度正确                    | CI P3 full |
| GRF-CUSTOM-01 | PERF-OBS-FR-003 | 自定义指标面板 (heap/event_loop/order_success) | 3 个指标时序图均有数据                         | CI P3 full |
| GRF-ALERT-01  | PERF-OBS-FR-004 | webhook 告警触发                               | 注入高延迟 → Grafana POST webhook URL          | CI P3 full |

## 定时调度 (示范性)

| 用例 ID  | 需求 ID         | 验证项                     | 预期                   | 标签 |
| -------- | --------------- | -------------------------- | ---------------------- | ---- |
| SCHED-01 | PERF-SCHED-FR-001 | cron workflow 文件语法正确 | `actionlint` 通过      | CI P2 regression |
| SCHED-02 | PERF-SCHED-FR-001 | nightly soak-short 配置    | cron: 每天 03:00 UTC   | CI P2 regression |
| SCHED-03 | PERF-SCHED-FR-001 | weekly capacity 配置       | cron: 每周日 06:00 UTC | CI P2 regression |
| SCHED-04 | PERF-SCHED-FR-002 | artifact 归档保留 30 天    | retention-days: 30     | CI P2 regression |

## k6 脚本能力 (Phase 6→7 补完)

| 用例 ID       | 需求 ID         | 验证项                           | 预期                           | 标签 |
| ------------- | --------------- | -------------------------------- | ------------------------------ | ---- |
| K6-FUNNEL-01  | PERF-K6-FR-001  | stress.js funnel 迁移            | 无 require helpers，内联替换 ✅ | UT P1 regression |
| K6-FUNNEL-02  | PERF-K6-FR-002  | capacity.js funnel 迁移          | 无 require helpers，内联替换 ✅ | UT P1 regression |
| K6-FUNNEL-03  | PERF-K6-FR-003  | soak.js funnel 迁移              | 无 require helpers，内联替换 ✅ | UT P1 regression |
| K6-CLASS-01   | PERF-K6-FR-004  | breakpoint graceful 分类         | handleSummary 输出 graceful 标记 | UT P1 regression |
| K6-CLASS-02   | PERF-K6-FR-004  | breakpoint catastrophic 分类     | handleSummary 输出 catastrophic 标记 | UT P1 regression |
| K6-RECOVERY-01 | PERF-K6-FR-005  | 熔断恢复时间 ≤ 60s               | soak.js 故障注入 → 10s 连续恢复 | IT P2 regression |
| K6-SOAK-INT-01 | PERF-K6-FR-006  | Grafana Dashboard 实时展示（#108） | ✓ k6 soak 持续运行 ✓ InfluxDB 数据增长 ✓ Dashboard 更新 ✓ 内存/CPU 趋势 | IT P3 full |
| K6-SOAK-INT-02 | PERF-K6-FR-007  | Grafana 告警规则触发（#108）   | ✓ 规则加载正常 ✓ p95>500ms 触发 ✓ error>1% 触发 ✓ UI 状态改变 | IT P3 full |

## observer 采样设计门禁（#133，待实现）

> 以下用例用于约束 `#133` 的设计与后续实现方向，**当前不计入 Phase 7 已落地 33 条统计**；待脚本实现并验证后，再转入正式回归/集成统计。

| 用例 ID | 需求 ID | 验证项 | 预期 | 标签 |
| ------- | ------- | ------ | ---- | ---- |
| K6-OBS-DESIGN-01 | PERF-K6-FR-002 / PERF-K6-FR-006 | observer scenario 启动成功 | `load` 与 `observer` 两个 scenario 均可运行，`observeMetrics` 被调用 | Design Gate |
| K6-OBS-DESIGN-02 | PERF-K6-FR-002 / PERF-K6-FR-006 | `/metrics` 改为固定间隔采样 | 不再由业务 VU 随机比例轮询，observer 以固定间隔采样 `/metrics` | Design Gate |
| K6-OBS-DESIGN-03 | PERF-K6-FR-002 / PERF-K6-FR-006 | threshold 仅统计 `scenario:load` | observer 请求不进入业务 SLA 统计，`http_req_duration` / `http_req_failed` 只看 `scenario:load` | Design Gate |
| K6-OBS-DESIGN-04 | PERF-K6-FR-006 / PERF-K6-FR-007 | setup/teardown 与 observer 共存 | `soak` / `soak-short` 的 baseline/final heap 快照保留，且不与 observer 周期采样冲突 | Design Gate |
