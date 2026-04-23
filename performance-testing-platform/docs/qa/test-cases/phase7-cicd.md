# Phase 7 测试用例 — CI/CD + 可观测性

> **范围说明：**
> - **Stage 3（开发阶段）**：只执行 **SUT 单元测试** 与 **SUT 集成测试**
> - **Stage 4（验收阶段）**：再执行 **SUT 性能测试**，包括 `smoke / load / stress / spike / soak`
> - 因此，**soak 不属于 Stage 3 集成测试范围**

## 基线回归单元测试 (`tests/unit/utils/baseline.test.js`)

| 用例 ID  | 需求 ID       | 测试                            | 预期                              | 标签 |
| -------- | ------------- | ------------------------------- | --------------------------------- | ---- |
| UT-BL-01 | PERF-CI-BL-FR-002 | 当前 p95 与 baseline 偏差 < 20% | 结果: pass                        | UT P1 regression |
| UT-BL-02 | PERF-CI-BL-FR-002 | 当前 p95 退化 > 20%             | 结果: warning                     | UT P1 regression |
| UT-BL-03 | PERF-CI-BL-FR-002 | 当前 p95 退化 > 50%             | 结果: fail                        | UT P1 regression |
| UT-BL-04 | PERF-CI-BL-FR-006 | 首次运行无 baseline 文件        | 跳过对比，结果: pass (首次建基线) | UT P1 regression |
| UT-BL-05 | PERF-CI-BL-FR-006 | baseline JSON 格式异常          | 报错提示，不 crash                | UT P1 regression |
| UT-BL-06 | PERF-CI-BL-FR-003 | 趋势数据追加                    | trend.json 新增一行，保留历史     | UT P1 regression |

## CI 覆盖率门禁

| 用例 ID   | 需求 ID        | 验证项                                  | 预期                             | 标签 |
| --------- | --------------- | --------------------------------------- | -------------------------------- | ---- |
| CI-COV-01 | PERF-CI-COV-FR-001 | `npm run test:coverage` 生成覆盖率报告 | `coverage/` 目录生成 lcov + HTML | CI P1 regression |
| CI-COV-02 | PERF-CI-COV-FR-003 | statements ≥ 80% 通过                   | CI job pass                      | CI P1 regression |
| CI-COV-03 | PERF-CI-COV-FR-003 | statements < 80% 失败                   | CI job fail (故意删测试验证)     | CI P1 regression |
| CI-COV-04 | PERF-CI-COV-FR-002 | coverage 报告上传为 artifact            | Actions Artifacts 可下载         | CI P1 regression |

## CI 基线回归

| 用例 ID  | 需求 ID        | 验证项                                   | 预期                                    | 标签 |
| -------- | --------------- | ---------------------------------------- | --------------------------------------- | ---- |
| CI-BL-01 | PERF-CI-BL-FR-001  | smoke gate 后存储 baseline JSON artifact | artifact 包含 p95/error_rate/throughput | CI P2 regression |
| CI-BL-02 | PERF-CI-BL-FR-002  | 下次 CI 运行下载上次 baseline 并对比     | 对比结果输出到 CI log                   | CI P2 regression |
| CI-BL-03 | PERF-CI-BL-FR-002  | p95 退化 > 50% 时 CI fail                | job 失败，日志含退化百分比              | CI P2 regression |
| CI-BL-04 | PERF-CI-BL-FR-006  | 首次运行无 baseline 时正常通过           | 不报错，存储当前为基线                  | CI P2 regression |

## 趋势报告

| 用例 ID  | 需求 ID        | 验证项                                 | 预期                               | 标签 |
| -------- | --------------- | -------------------------------------- | ---------------------------------- | ---- |
| TREND-01 | PERF-CI-BL-FR-004  | `scripts/generate-trend.sh` 生成趋势表 | reports/trend.md 包含最近 N 次指标 | CI P2 regression |
| TREND-02 | PERF-CI-BL-FR-003  | trend.json 累积多次运行数据            | JSON 数组长度递增                  | CI P2 regression |
| TREND-03 | PERF-CI-BL-FR-003  | 空 trend.json 时不 crash               | 输出 "No trend data" 提示          | CI P2 regression |
| TREND-04 | PERF-CI-BL-FR-004  | trend.json 缺失时仍可生成趋势报告      | 输出 "No trend data" 提示          | UT P1 regression |
| TREND-05 | PERF-CI-BL-FR-004  | trend.json 为非数组 JSON               | 自动降级为空数据，不 crash         | UT P1 regression |
| TREND-06 | PERF-CI-BL-FR-004  | trend.json 为无效 JSON 且输出目录缺失  | 自动创建目录并输出空报告           | UT P1 regression |

## Grafana 面板验证

| 用例 ID       | 需求 ID         | 验证项                                         | 方法                                           | 标签 |
| ------------- | --------------- | ---------------------------------------------- | ---------------------------------------------- | ---- |
| GRF-ERR-01    | PERF-OBS-DASH-FR-001 | 错误分布面板渲染                               | `docker compose up` + 浏览器，按 endpoint 分组 | CI P3 full |
| GRF-HEAT-01   | PERF-OBS-DASH-FR-002 | 延迟热力图面板渲染                             | heatmap panel，颜色梯度正确                    | CI P3 full |
| GRF-CUSTOM-01 | PERF-OBS-DASH-FR-003 | 自定义指标面板 (heap/event_loop/order_success) | 3 个指标时序图均有数据                         | CI P3 full |
| GRF-ALERT-01  | PERF-OBS-ALERT-FR-001 | webhook 告警触发                               | 注入高延迟 → Grafana POST webhook URL          | CI P3 full |

## 定时调度 (示范性)

| 用例 ID  | 需求 ID         | 验证项                     | 预期                   | 标签 |
| -------- | --------------- | -------------------------- | ---------------------- | ---- |
| SCHED-01 | PERF-CI-SCHED-FR-001 | cron workflow 文件语法正确 | `actionlint` 通过      | CI P2 regression |
| SCHED-02 | PERF-CI-SCHED-FR-001 | nightly soak-short 配置    | cron: 每天 03:00 UTC   | CI P2 regression |
| SCHED-03 | PERF-CI-SCHED-FR-001 | weekly capacity 配置       | cron: 每周日 06:00 UTC | CI P2 regression |
| SCHED-04 | PERF-CI-SCHED-FR-002 | artifact 归档保留 30 天    | retention-days: 30     | CI P2 regression |

## k6 脚本能力（Stage 3：开发阶段）

| 用例 ID       | 需求 ID         | 验证项                           | 预期                           | 标签 |
| ------------- | --------------- | -------------------------------- | ------------------------------ | ---- |
| K6-FUNNEL-01  | PERF-ENGINE-K6-FR-011  | stress.js funnel 迁移            | 无 require helpers，内联替换 ✅ | UT P1 regression |
| K6-FUNNEL-02  | PERF-ENGINE-K6-FR-012  | capacity.js funnel 迁移          | 无 require helpers，内联替换 ✅ | UT P1 regression |
| K6-FUNNEL-03  | PERF-ENGINE-K6-FR-013  | soak.js funnel 迁移              | 无 require helpers，内联替换 ✅ | UT P1 regression |
| K6-CLASS-01   | PERF-ENGINE-K6-FR-014  | breakpoint graceful 分类         | handleSummary 输出 graceful 标记 | UT P1 regression |
| K6-CLASS-02   | PERF-ENGINE-K6-FR-014  | breakpoint catastrophic 分类     | handleSummary 输出 catastrophic 标记 | UT P1 regression |
| K6-RECOVERY-01 | PERF-ENGINE-K6-FR-015  | 熔断恢复时间 ≤ 60s               | soak.js 故障注入 → 10s 连续恢复 | IT P2 regression |

## 业务指标单元测试 (`tests/unit/middleware/metrics.test.js` — BM-01, Issue #137)

| 用例 ID   | 需求 ID                 | 验证项                                    | 预期                                  | 标签 |
| --------- | ----------------------- | ----------------------------------------- | ------------------------------------- | ---- |
| BM-UT-01  | PERF-BUSINESS-METRICS-001 | `orderSuccess` 计数正确                   | 连续调用 3 次后计数为 3               | UT P1 regression |
| BM-UT-02  | PERF-BUSINESS-METRICS-001 | `orderConflict` 计数与 `orderConflictRate` 计算 | 3 成功 + 1 冲突 → rate = 25.00%      | UT P1 regression |
| BM-UT-03  | PERF-BUSINESS-METRICS-001 | `orderConflictRate` 无订单时为 0%         | 初始化状态返回 '0.00%'               | UT P1 regression |
| BM-UT-04  | PERF-BUSINESS-METRICS-001 | `authLatencyMs` 平均值计算               | (100+200+300)/3 = 200                 | UT P1 regression |
| BM-UT-05  | PERF-BUSINESS-METRICS-001 | `resetMetrics()` 清空业务指标             | 重置后所有业务指标归零                | UT P1 regression |
| BM-UT-06  | PERF-BUSINESS-METRICS-001 | `authLatencyMs` 仅保留最近 100 条样本    | 写入 105 条后平均值 = (6+105)/2 ≈ 56 | UT P1 regression |

## Soak 验收支撑（Stage 4：验收阶段）

| 用例 ID       | 需求 ID         | 验证项                           | 预期                           | 标签 |
| ------------- | --------------- | -------------------------------- | ------------------------------ | ---- |
| K6-SOAK-INT-01 | PERF-ENGINE-K6-FR-016  | Grafana Dashboard 实时展示（#108） | `bash scripts/integration-test-phase7-soak.sh`：✓ InfluxDB 数据增长 ✓ soak 自定义指标存在 ✓ `soak-results` dashboard 可查询 | PT P3 acceptance |
| K6-SOAK-INT-02 | PERF-ENGINE-K6-FR-017  | Grafana 告警规则触发（#108）   | `bash scripts/integration-test-phase7-soak.sh`：✓ 告警资产存在（embedded alert / provisioning）✓ p95 阈值数据可观测 ✓ dashboard alert 已加载 | PT P3 acceptance |

> **说明：** `K6-SOAK-INT-01/02` 继续复用集成脚本执行，但它们服务于 **Stage 4 性能验收**，不计入 **Stage 3 集成测试范围**。
