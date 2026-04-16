# 性能测试用例统一目录

**范围:** `performance-testing-platform` Phase 1~7 中所有性能测试（k6 + JMeter）用例

> 详细参数和阈值见各 `phase*.md` 文件。本文件仅作全量索引。

---

## 汇总

| 分类                  | 用例数 | 覆盖 Phase |
| --------------------- | ------ | ---------- |
| k6 标准压测           | 13     | 1          |
| JMeter 标准压测       | 13     | 1          |
| k6 容量测试           | 3      | 2          |
| 认证性能              | 4      | 3          |
| 浸泡测试              | 5      | 4          |
| k6 限流测试           | 4      | 6          |
| k6 Breakpoint 测试    | 3      | 6          |
| k6 Helpers 迁移验证   | 4      | 6          |
| k6 执行摘要报告       | 4      | 6          |
| **合计**              | **53** | **1~6**    |

---

## Phase 1 — k6 标准压测

| 用例 ID   | 场景         | 负载                 | 阈值                         |
| --------- | ------------ | -------------------- | ---------------------------- |
| SMOKE-01  | 健康检查     | 2 VUs, 30s           | status 200, duration < 200ms |
| SMOKE-02  | 商品列表     | 2 VUs, 30s           | status 200                   |
| SMOKE-03  | 商品详情     | 2 VUs, 30s           | status 200                   |
| SMOKE-04  | 全局阈值     | 2 VUs, 30s           | p95 < 500ms, error < 1%      |
| LOAD-01   | 混合流量     | ramp 20→50→0, 5m     | p95 < 500ms, p99 < 1s        |
| LOAD-02   | 吞吐量       | 50 VUs, 持续         | rate > 8 req/s               |
| LOAD-03   | 错误率       | 50 VUs, 5m           | error < 1%                   |
| STRESS-01 | 混合流量     | ramp 50→200→0, 3.5m  | p95 < 1000ms                 |
| STRESS-02 | 高并发错误率 | 200 VUs 峰值         | error < 5%                   |
| STRESS-03 | 降级观察     | 逐步增加 VUs         | 记录性能拐点                 |
| SPIKE-01  | 突增         | 5→100 (5s 内)        | p95 < 2000ms                 |
| SPIKE-02  | 保持尖峰     | 100 VUs, 30s         | error < 10%                  |
| SPIKE-03  | 恢复         | 100→5, 观察 30s      | 性能恢复到尖峰前水平         |

## Phase 1 — JMeter 标准压测

| 用例 ID   | 场景         | 负载                    | 阈值                         |
| --------- | ------------ | ----------------------- | ---------------------------- |
| SMOKE-01  | 健康检查     | 2 threads, 30s          | status 200, duration < 200ms |
| SMOKE-02  | 商品列表     | 2 threads, 30s          | status 200                   |
| SMOKE-03  | 商品详情     | 2 threads, 30s          | status 200                   |
| SMOKE-04  | 全局阈值     | 2 threads, 30s          | p95 < 500ms, error < 1%      |
| LOAD-01   | 混合流量     | ramp 20→50→0, 5m        | p95 < 500ms, p99 < 1s        |
| LOAD-02   | 吞吐量       | 50 threads, 持续        | rate > 8 req/s               |
| LOAD-03   | 错误率       | 50 threads, 5m          | error < 1%                   |
| STRESS-01 | 混合流量     | ramp 50→200→0, 3.5m     | p95 < 1000ms                 |
| STRESS-02 | 高并发错误率 | 200 threads 峰值        | error < 5%                   |
| STRESS-03 | 降级观察     | 逐步增加 threads        | 记录性能拐点                 |
| SPIKE-01  | 突增         | 5→100 threads (5s 内)   | p95 < 2000ms                 |
| SPIKE-02  | 保持尖峰     | 100 threads, 30s        | error < 10%                  |
| SPIKE-03  | 恢复         | 100→5 threads, 观察 30s | 性能恢复到尖峰前水平         |

## Phase 2 — k6 容量测试

| 用例 ID | 场景           | 负载              | 阈值                    |
| ------- | -------------- | ----------------- | ----------------------- |
| CAP-01  | 单次采集+测试  | 一条命令          | 结果文件生成            |
| CAP-04  | 最大并发 (低)  | 二分法递增        | 找到 p95 < 500ms 上限   |
| CAP-05  | 最大并发 (中)  | 二分法递增        | error rate 拐点         |
| CAP-06  | 最大并发 (高)  | 二分法递增        | 系统能力基线记录        |

## Phase 3 — 认证性能测试

| 用例 ID      | 场景                    | 负载              | 阈值                    |
| ------------ | ----------------------- | ----------------- | ----------------------- |
| AUTH-PERF-01 | 高并发登录              | 100 VUs           | p95 < 500ms, error < 1% |
| AUTH-PERF-02 | Token 刷新              | 200 VUs           | p95 < 500ms             |
| AUTH-PERF-03 | 完整用户旅程            | 500 VUs           | p95 < 1000ms            |
| AUTH-PERF-04 | JMeter 认证压测         | 100 threads, 5m   | p95 < 500ms, error < 1% |

## Phase 4 — 浸泡测试

| 用例 ID    | 场景                | 负载                    | 阈值                    |
| ---------- | ------------------- | ----------------------- | ----------------------- |
| SOAK-TC-01 | 基础浸泡            | 100 VUs, 1h             | p95 < 500ms, error < 1% |
| SOAK-TC-02 | 自定义指标浸泡      | 200 VUs, 2h             | 订单成功率 > 95%        |
| SOAK-TC-03 | 高负载浸泡          | 500 VUs, 4h             | auth latency < 200ms    |
| SOAK-TC-04 | InfluxDB 输出验证   | `--out influxdb`        | 数据写入 Grafana 可见   |
| SOAK-TC-05 | 告警触发验证        | 注入高延迟              | Grafana 告警触发        |

## Phase 6 — k6 限流测试

| 用例 ID  | 场景            | VUs        | 预期                           |
| -------- | --------------- | ---------- | ------------------------------ |
| K6-RL-01 | 正常流量        | 5          | 全部 200, 0 个 429             |
| K6-RL-02 | 超限 burst      | 200        | 部分 429, error message 正确   |
| K6-RL-03 | 窗口恢复        | 5          | burst 后等待窗口过期，恢复 200 |
| K6-RL-04 | 熔断恢复        | 500→0→10   | 持续超载 → 停止 → 测量恢复时间 |

## Phase 6 — k6 Breakpoint 测试

| 用例 ID   | 场景               | 预期                                     |
| --------- | ------------------ | ---------------------------------------- |
| K6-BRK-01 | 递增到崩溃         | 输出崩溃点 RPS + 当时 p95/error rate     |
| K6-BRK-02 | 崩溃类型分类       | handleSummary 输出 graceful/catastrophic |
| K6-BRK-03 | maxDuration 安全阀 | 10min 内未崩溃则正常结束                 |

## Phase 6 — k6 Helpers 迁移验证

| 用例 ID   | 验证项                       | 预期                               |
| --------- | ---------------------------- | ---------------------------------- |
| K6-MIG-01 | load.k6.js 使用 funnel helper  | p95/error 与迁移前一致 (偏差 <10%) |
| K6-MIG-02 | stress.k6.js 使用 funnel helper | 无内联漏斗代码                    |
| K6-MIG-03 | auth 脚本统一 checkStatus    | 无直接 check() 调用                |
| K6-MIG-04 | 全脚本 thinkTime 统一        | 仅在 thinkTime.js 中有 sleep()     |

## Phase 6 — k6 执行摘要报告

| 用例 ID   | 验证项             | 命令                       | 预期                              |
| --------- | ------------------ | -------------------------- | --------------------------------- |
| K6-SUM-01 | 生成 Markdown 摘要 | `npm run generate-summary` | reports/k6-summary.md 存在        |
| K6-SUM-02 | SLA 判定正确       | 检查输出                   | p95 < 500ms → ✅, error < 1% → ✅ |
| K6-SUM-03 | Top 5 慢接口       | 检查输出                   | 按 p95 排序，含 endpoint 名       |
| K6-SUM-04 | 无 JSON 输入时报错 | 不传参数                   | 输出 usage 提示，exit 1           |

---

> **说明:** Phase 1 k6 和 JMeter 共用场景 ID（SMOKE/LOAD/STRESS/SPIKE），为双引擎镜像测试，阈值一致。
> Phase 6 `K6-RL-04`（熔断恢复）在 Phase 7 (#116) 中追踪实现状态。
