# 需求追溯矩阵 (Requirements Traceability Matrix)

**Branch:** `feature/performance-testing` | **更新日期:** 2026-04-17 (Phase 1 需求 ID 规范化 — ROUTE 拆分为 6 条)

**用途:** 确保每条需求都有对应的测试用例覆盖，快速定位未覆盖需求。

---

## Phase 1 — 双引擎性能测试 ([#17](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/17))

### PERF-API — 被测系统

| 需求 ID                | 需求                                                                                            | 实现文件                    | 测试用例 ID      | 状态 |
| ---------------------- | ----------------------------------------------------------------------------------------------- | --------------------------- | ---------------- | ---- |
| PERF-API-ROUTE-FR-001  | `GET /api/health`：返回 `{ status: "ok", timestamp }`                                          | `src/routes/health.js`      | UT-HEALTH-01~02  | ✅   |
| PERF-API-ROUTE-FR-002  | `GET /api/products`：分页商品列表（`?page=&limit=`，默认 limit=10）                             | `src/routes/products.js`    | UT-PROD-01~02    | ✅   |
| PERF-API-ROUTE-FR-003  | `GET /api/products/:id`：单商品详情，不存在返回 404                                             | `src/routes/products.js`    | UT-PROD-03~04    | ✅   |
| PERF-API-ROUTE-FR-004  | `POST /api/products`：创建商品（name + price 必填，stock 默认 0）                               | `src/routes/products.js`    | UT-PROD-05~06    | ✅   |
| PERF-API-ROUTE-FR-005  | `GET /api/orders`：分页订单列表（按 created_at DESC）                                           | `src/routes/orders.js`      | UT-ORDER-01      | ✅   |
| PERF-API-ROUTE-FR-006  | `POST /api/orders`：库存不足返回 409，事务扣减，调用 simulateDelay，AUTH_ENABLED 开关           | `src/routes/orders.js`      | UT-ORDER-02~05   | ✅   |
| PERF-API-MW-FR-001     | metrics 中间件：requestCount、avgDuration(ms)、CPU、Memory、eventLoopLag(ms)                   | `src/middleware/metrics.js` | UT-METRICS-01~02 | ✅   |
| PERF-API-DB-FR-001     | SQLite（test: `:memory:`，prod: `data/perf.db` + WAL），5 种商品种子数据，每种 stock=100,000    | `src/db/database.js`        | UT-DB-01~03      | ✅   |
| PERF-API-UTIL-FR-001   | `simulateDelay(ms)`：`POST /api/orders` 延迟注入，由 `ORDER_DELAY_MS` 控制（默认 50ms）         | `src/utils/delay.js`        | UT-DELAY-01~02   | ✅   |

### PERF-ENGINE-K6 — k6 脚本

| 需求 ID                | 需求                                           | 实现文件       | 测试用例 ID  | 状态 |
| ---------------------- | ---------------------------------------------- | -------------- | ------------ | ---- |
| PERF-ENGINE-K6-FR-001  | smoke test (5 VUs, 60s, p95<500ms)             | `smoke.k6.js`  | SMOKE-01~04  | ✅   |
| PERF-ENGINE-K6-FR-002  | load test (50 VUs ramp, 5min, p95<2000ms)      | `load.k6.js`   | LOAD-01~03   | ✅   |
| PERF-ENGINE-K6-FR-003  | stress test (200 VUs ramp, p95<3000ms)         | `stress.k6.js` | STRESS-01~03 | ✅   |
| PERF-ENGINE-K6-FR-004  | spike test (100 VUs 突增, 验证恢复基线)        | `spike.k6.js`  | SPIKE-01~03  | ✅   |
| PERF-ENGINE-K6-FR-005  | HTML 报告输出 (`--out web-dashboard`)          | `npm run k6:smoke` | K6-RPT-01~07 | ✅ |

### PERF-ENGINE-JM — JMeter 脚本

| 需求 ID                | 需求                                           | 实现文件                           | 测试用例 ID        | 状态 |
| ---------------------- | ---------------------------------------------- | ---------------------------------- | ------------------ | ---- |
| PERF-ENGINE-JM-FR-001  | smoke test（参数与 k6 一致）                   | `smoke.jmx` + `smoke.properties`   | SMOKE-01~04        | ✅   |
| PERF-ENGINE-JM-FR-002  | load test（参数与 k6 一致）                    | `load.jmx` + `load.properties`     | LOAD-01~03         | ✅   |
| PERF-ENGINE-JM-FR-003  | stress test（参数与 k6 一致）                  | `stress.jmx` + `stress.properties` | STRESS-01~03       | ✅   |
| PERF-ENGINE-JM-FR-004  | spike test（参数与 k6 一致）                   | `spike.jmx` + `spike.properties`   | SPIKE-01~03        | ✅   |
| PERF-ENGINE-JM-FR-005  | HTML 报告 (`jmeter -g results.jtl -o reports/`)| `*.jmx` → `-e -o reports/`         | JM-RPT-01~03       | ✅   |

### 测试基础设施（过程文档，不编功能需求号）

| 内容                          | 关联 US | 实现文件                    | 测试用例 ID  | 状态 |
| ----------------------------- | ------- | --------------------------- | ------------ | ---- |
| Grafana Dashboard (k6+JMeter) | US-06/09| `grafana/dashboards/*.json` | JM-GRF-01~04 | ✅   |
| CI 性能门禁 (双引擎 smoke)    | US-05   | `performance-ci.yml`        | JM-CI-01~03  | ✅   |

---

## Phase 2 — 系统指标采集 + 容量测试 ([#54](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/54))

### 系统指标采集

| 需求 ID  | 需求                      | 实现文件                     | 测试用例 ID | 状态 |
| -------- | ------------------------- | ---------------------------- | ----------- | ---- |
| SM-01    | 进程级 CPU                | `src/middleware/metrics.js`  | SM-UT-01    | ✅   |
| SM-02    | 进程级内存                | `src/middleware/metrics.js`  | SM-UT-02    | ✅   |
| SM-03    | 事件循环延迟              | `src/middleware/metrics.js`  | SM-UT-03    | ✅   |
| SM-04~07 | 系统级 CPU/内存/磁盘/网络 | `scripts/collect-metrics.js` | SM-IT-01    | ✅   |
| SM-08    | CSV 输出归档              | `scripts/collect-metrics.js` | SM-IT-02~03 | ✅   |
| SM-09    | npm scripts 集成          | `package.json`               | CAP-01      | ✅   |

### Cluster 模式

| 需求 ID | 需求                  | 实现文件             | 测试用例 ID | 状态 |
| ------- | --------------------- | -------------------- | ----------- | ---- |
| SM-10   | Express Cluster 模式  | `src/cluster.js`     | CLU-01~03   | ✅   |
| SM-11   | SQLite 文件模式 + WAL | `src/db/database.js` | CLU-01      | ✅   |

### 容量测试

| 需求 ID | 需求                    | 实现文件         | 测试用例 ID | 状态 |
| ------- | ----------------------- | ---------------- | ----------- | ---- |
| US-12   | 最大并发承载量 (二分法) | `capacity.k6.js` | CAP-04~06   | ✅   |
| US-13   | 一条命令采集+测试+归档  | `package.json`   | CAP-01~03   | ✅   |

### 测试质量保障

| 需求 ID | 需求           | 实现文件                 | 测试用例 ID | 状态 |
| ------- | -------------- | ------------------------ | ----------- | ---- |
| TQ-01   | 数据膨胀控制   | `npm run restart:clean`  | TQ-IT-01    | ✅   |
| TQ-02   | 预热 (Warm-up) | capacity.k6.js 30s ramp  | TQ-IT-02    | ✅   |
| TQ-03   | 测试隔离       | `restart:clean` 每轮清理 | TQ-IT-03    | ✅   |
| TQ-04   | 结果可重复性   | 连续两轮对比             | TQ-IT-04    | ✅   |

---

## Phase 3 — JWT 认证场景 ([#56](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/56))

### 后端认证

| 需求 ID | 需求              | 实现文件                         | 测试用例 ID   | 状态 |
| ------- | ----------------- | -------------------------------- | ------------- | ---- |
| AUTH-01 | 用户注册          | `src/routes/auth.js`             | UT-AUTH-01~03 | ✅   |
| AUTH-02 | 用户登录          | `src/routes/auth.js`             | UT-AUTH-04~06 | ✅   |
| AUTH-03 | Token 刷新        | `src/routes/auth.js`             | UT-AUTH-07~08 | ✅   |
| AUTH-04 | 用户登出          | `src/routes/auth.js`             | UT-AUTH-09~10 | ✅   |
| AUTH-05 | JWT 验证中间件    | `src/middleware/authenticate.js` | UT-MW-01~05   | ✅   |
| AUTH-06 | AUTH_ENABLED 开关 | `src/routes/orders.js`           | UT-MW-06~07   | ✅   |

### 认证集成测试

| 需求 ID | 需求                          | 实现文件                           | 测试用例 ID     | 状态 |
| ------- | ----------------------------- | ---------------------------------- | --------------- | ---- |
| AUTH-01 | 注册→登录→Token 完整流程      | `scripts/integration-test.sh`      | AUTH-INT-01     | ✅   |
| AUTH-03 | Bearer Token 保护端点访问     | `scripts/integration-test.sh`      | AUTH-INT-02     | ✅   |
| AUTH-05 | 无 Token 访问受保护端点被拒   | `scripts/integration-test.sh`      | AUTH-INT-03     | ✅   |

### 认证性能测试

| 需求 ID | 需求                   | 实现文件                                                               | 测试用例 ID  | 状态 |
| ------- | ---------------------- | ---------------------------------------------------------------------- | ------------ | ---- |
| AUTH-07 | 高并发登录 (100 VUs)   | `auth-login.k6.js`                                                     | AUTH-PERF-01 | ✅   |
| AUTH-08 | Token 刷新 (200 VUs)   | `auth-refresh.k6.js`                                                   | AUTH-PERF-02 | ✅   |
| AUTH-09 | 完整用户旅程 (500 VUs) | `auth-journey.k6.js`                                                   | AUTH-PERF-03 | ✅   |
| AUTH-10 | JMeter 认证压测        | `auth-load.jmx`                                                        | AUTH-PERF-04 | ✅   |
| AUTH-11 | 性能对比报告           | [`auth-comparison-report.md`](../test-cases/auth-comparison-report.md) | —            | ✅   |

---

## Phase 4 — Soak Test + 可观测性增强 ([#65](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/65))

| 需求 ID | 需求                                      | 实现文件                               | 测试用例 ID                  | 状态 |
| ------- | ----------------------------------------- | -------------------------------------- | ---------------------------- | ---- |
| SOAK-01 | `/api/metrics` 端点                       | `src/routes/health.js`                 | SM-UT-01~03 (Phase 2 已实现) | ✅   |
| SOAK-02 | k6 soak 脚本 (100~500 VUs, 1~4h)          | `soak.k6.js`, `soak-short.k6.js`       | SOAK-TC-01~03                | ✅   |
| SOAK-03 | 内存泄漏检测逻辑                          | `src/utils/leak-detection.js`          | UT-SOAK-01~07                | ✅   |
| SOAK-04 | Custom Metrics (订单成功率, auth latency) | `soak.k6.js`                           | SOAK-TC-02~03                | ✅   |
| SOAK-05 | InfluxDB 输出 (`--out influxdb`)          | `npm run k6:soak:influx`               | SOAK-TC-04                   | ✅   |
| SOAK-06 | Grafana soak Dashboard                    | `grafana/dashboards/soak-results.json` | SOAK-TC-04                   | ✅   |
| SOAK-07 | Grafana 告警规则                          | soak dashboard 内嵌                    | SOAK-TC-05                   | ✅   |
| SOAK-08 | npm scripts (soak/soak:full)              | `package.json`                         | SOAK-TC-01~03                | ✅   |
| SOAK-09 | 泄漏检测单元测试                          | `soak-leak-detection.test.js`          | UT-SOAK-01~07                | ✅   |
| SOAK-10 | soak HTML/JSON 报告                       | k6 `--out web-dashboard`               | SOAK-TC-01~03                | ✅   |

---

## Phase 5 — 基础设施升级 ([#85](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/85))

| 需求 ID        | 需求                             | 实现文件                                             | 测试用例 ID                 | 状态 |
| -------------- | -------------------------------- | ---------------------------------------------------- | --------------------------- | ---- |
| ENT-ENV-01     | 多环境配置文件                   | `env/local.env`, `staging.env`, `production.env`     | UT-ENV-07, K6-INT-01~02     | ✅   |
| ENT-ENV-02     | k6 环境加载器                    | `helpers/env.js`, `src/utils/env-loader.js`          | UT-ENV-01~06                | ✅   |
| ENT-ENV-03     | JMeter 环境适配                  | `config/staging.properties`, `production.properties` | — (手动验证)                | ✅   |
| ENT-DATA-01    | CSV 测试数据                     | `data/users.csv`, `data/products.csv`                | UT-DATA-07~08               | ✅   |
| ENT-DATA-02    | k6 数据驱动改造                  | `helpers/data.js`, `src/utils/csv-loader.js`         | UT-DATA-01~06, K6-INT-03~05 | ✅   |
| ENT-PROFILE-01 | 负载 profile JSON                | `profiles/smoke.json` ~ `peak.json`                  | UT-PROF-07~09               | ✅   |
| ENT-PROFILE-02 | k6 脚本 import profile           | `helpers/profile.js`, `src/utils/profile-parser.js`  | UT-PROF-01~06, K6-INT-04    | ✅   |
| ENT-DX-01      | `.env.example`                   | `.env.example`                                       | — (文件存在性)              | ✅   |
| ENT-DX-02      | npm scripts (setup/clean/health) | `package.json`                                       | — (手动验证)                | ✅   |
| ENT-DX-03      | npm run dev (watch mode)         | `package.json`                                       | — (手动验证)                | ✅   |
| ENT-TEST-01    | env-loader 单元测试              | `tests/unit/helpers/env.test.js`                     | UT-ENV-01~07                | ✅   |
| ENT-TEST-02    | csv-loader 单元测试              | `tests/unit/helpers/data.test.js`                    | UT-DATA-01~08               | ✅   |
| ENT-TEST-03    | profile-parser 单元测试          | `tests/unit/helpers/profile.test.js`                 | UT-PROF-01~09               | ✅   |

---

## Phase 6 — 测试能力扩展 ([#86](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/86))

| 需求 ID            | 需求                                                                                                                | 实现文件                                                                              | 测试用例 ID                                   | 状态        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------- | ----------- |
| ENT-CONSISTENCY-01 | 统一所有 k6 脚本的 HTTP 断言方式：全部使用 checkStatus() helper，替代直接 check() 调用                              | `helpers/utils.js`                                                                    | K6-MIG-03, K6-HLP-INT-01~02                   | ✅          |
| ENT-CONSISTENCY-02 | 统一 sleep/think time 模式：提取 helpers/thinkTime.js，标准化 sleep(randomIntBetween(0.5, 1))                        | `helpers/thinkTime.js`                                                                | K6-MIG-04                                     | ✅          |
| ENT-CONSISTENCY-03 | 提取漏斗逻辑到 helpers/funnel.js：60% browse → 30% detail → 10% order，消除重复代码                                 | `helpers/funnel.js`                                                                   | K6-MIG-01, K6-MIG-02                          | ✅          |
| ENT-CONSISTENCY-04 | 所有标准测试脚本 (smoke/load/stress/spike) 添加 health check 前置验证                                               | `helpers/healthCheck.js`                                                              | K6-HLP-INT-01~02                              | ✅          |
| ENT-CONSISTENCY-05 | 现有脚本迁移：load/stress/capacity/soak 统一 import helpers（funnel/checkStatus/thinkTime），移除内联重复代码        | `load.k6.js`, `stress.k6.js`, `capacity.k6.js`, `soak.k6.js`, `soak-short.k6.js`     | K6-MIG-01, K6-MIG-02, K6-HLP-INT-01           | ✅          |
| ENT-BREAKPOINT-01  | 新增 breakpoint.k6.js：持续递增 VUs 直到系统崩溃（error rate > 50% 或完全不响应），记录崩溃点 VUs 和崩溃行为         | `tests/performance/breakpoint.k6.js`                                                  | K6-BRK-01, K6-BRK-03                          | ✅          |
| ENT-BREAKPOINT-02  | 崩溃行为分类：区分 graceful degradation（渐进退化）vs catastrophic failure（级联崩溃）                               | `tests/performance/breakpoint.k6.js`                                                  | K6-BRK-02                                     | ✅          |
| ENT-RESILIENCE-01  | Rate Limiter 中间件 (enable/disable toggle)                                                                          | `src/middleware/rateLimiter.js`                                                       | UT-RL-01~06                                   | ✅          |
| ENT-RESILIENCE-02  | k6 限流测试：验证超限返回 429、窗口过后恢复正常                                                                      | `tests/performance/rate-limit.k6.js`                                                 | RL-INT-01, RL-INT-03, K6-RL-01~03             | ✅          |
| ENT-RESILIENCE-03  | 熔断行为测试：验证系统在持续超载后的恢复时间（graceful degradation vs cascading failure）                            | `tests/performance/rate-limit.k6.js`                                                 | K6-RL-04                                      | ⏭️ Phase 7 |
| ENT-REPORT-01      | scripts/generate-summary.sh 解析 k6 JSON output，生成 Markdown 摘要（SLA 达标率、Top 5 慢接口）                      | `scripts/generate-summary.sh`                                                        | GEN-INT-01~03, K6-SUM-01~04                   | ✅          |

---

## Phase 7 — CI/CD + 可观测性增强 ([#88](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/88))

| 需求 ID                | 需求                                              | 实现文件                                              | 测试用例 ID                                           | 状态       |
| ---------------------- | ------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------- | ---------- |
| PERF-CI-COV-FR-001~003    | CI 覆盖率门禁 (statements ≥ 80%)                  | `.github/workflows/performance-ci.yml`                | CI-COV-01~04                                          | ⏳         |
| PERF-CI-BL-FR-001~002,006 | 基线回归：单元测试 + CI 自动对比                  | `src/utils/baseline.js`, `performance-ci.yml`         | UT-BL-01~06, CI-BL-01~04                             | ⏳         |
| PERF-CI-BL-FR-003~004     | 趋势报告：`generate-trend.sh` + trend.json 累积   | `scripts/generate-trend.sh`                           | TREND-01~03                                           | ⏳         |
| PERF-CI-BL-FR-005         | Grafana 趋势面板：历史 p95 / throughput 折线图    | `grafana/dashboards/`                                 | GRF-TREND-01                                          | ⏳         |
| PERF-OBS-DASH-FR-001~003 / PERF-OBS-ALERT-FR-001    | Grafana 面板增强 (错误分布/热力图/自定义/告警)    | `grafana/dashboards/`                                 | GRF-ERR-01, GRF-HEAT-01, GRF-CUSTOM-01, GRF-ALERT-01 | ⏳         |
| PERF-BUSINESS-METRICS-001 | `/metrics` 业务指标：订单成功/冲突统计、冲突率、认证延迟 | `src/middleware/metrics.js`, `src/routes/orders.js`, `src/routes/auth.js` | UT-METRICS-03~07 | ✅ |
| PERF-CI-SCHED-FR-001~002  | 定时调度：nightly soak + weekly capacity workflow | `.github/workflows/nightly-soak.yml`                  | SCHED-01~04                                           | ⏳         |
| PERF-ENGINE-K6-FR-011~013     | funnel helper 迁移：stress / capacity / soak      | `stress.k6.js`, `capacity.k6.js`, `soak.k6.js`       | K6-FUNNEL-01~03                                       | ⏳         |
| PERF-ENGINE-K6-FR-014         | breakpoint handleSummary graceful/catastrophic 分类 | `tests/performance/breakpoint.k6.js`                | K6-CLASS-01~02                                        | ⏳         |
| PERF-ENGINE-K6-FR-015         | 熔断恢复行为测试                                  | `tests/performance/rate-limit.k6.js`                  | K6-RECOVERY-01                                        | ⏳         |
| PERF-ENGINE-K6-FR-016         | SOAK-TC-04 集成验证：Grafana Dashboard 实时展示   | `npm run k6:soak:short` + Docker Compose              | K6-SOAK-INT-01                                        | ⏳         |
| PERF-ENGINE-K6-FR-017         | SOAK-TC-05 集成验证：Grafana 告警规则触发         | `soak.k6.js` 超限场景                                 | K6-SOAK-INT-02                                        | ⏳         |

---

## 覆盖率统计

| Phase    | 需求数                                            | 已覆盖 | 未覆盖                            | 覆盖率   |
| -------- | ------------------------------------------------- | ------ | --------------------------------- | -------- |
| 1        | 19 (PERF-API-ROUTE×6 + MW/DB/UTIL×1 + K6×5 + JM×5) | 19   | 0                                 | 100%     |
| 2        | 15 (SM-01~11 + TQ-01~04)                          | 15     | 0                                 | 100%     |
| 3        | 11 (AUTH-01~11)                                   | 11     | 0                                 | 100%     |
| 4        | 10 (SOAK-01~10)                                   | 10     | 0                                 | 100%     |
| 5        | 13 (ENT-ENV/DATA/PROFILE/DX/TEST)                 | 13     | 0                                 | 100%     |
| 6        | 11 (ENT-CONSISTENCY/BREAKPOINT/RESILIENCE/REPORT) | 10     | 1 (ENT-RESILIENCE-03)              | 91%      |
| 7        | 23 (PERF-CI-BL/COV/SCHED + PERF-OBS-DASH/ALERT + PERF-BUSINESS + PERF-ENGINE-K6-FR)        | 18     | 5                                | 78%      |
| **合计** | **102**                                           | **96** | **6**                             | **94%**  |

### 未覆盖项说明

| 需求                           | 原因                        | 计划                    |
| ------------------------------ | --------------------------- | ----------------------- |
| ENT-RESILIENCE-03 (Phase 6)    | 熔断恢复行为测试未实现        | Phase 7 (#88) 实现       |
| PERF-CI-COV-FR-001~003 (Phase 7) | 已实现，需要验证覆盖率阈值检查 | 检查 CI 执行结果         |
| PERF-CI-BL-FR-001~006 (Phase 7)  | 基线导出/对比/趋势已实现     | 验证 CI 集成            |
| PERF-OBS-DASH-FR-001~003 / PERF-OBS-ALERT-FR-001 (Phase 7) | Grafana 面板未创建            | 需要配置面板            |
| PERF-CI-SCHED-FR-001~002 (Phase 7) | cron workflow 未创建         | 需要创建定时任务        |
| PERF-ENGINE-K6-FR-011~017 (Phase 7)  | 部分脚本已实现，部分需重构    | 完成脚本重构            |

---

## 发现的缺陷

| #   | 发现阶段     | 缺陷                                               | 影响                           | Issue | 状态  |
| --- | ------------ | -------------------------------------------------- | ------------------------------ | ----- | ----- |
| 1   | Phase 1 验收 | smoke.properties 参数过小 (threads=2, duration=30) | 报告数据不足                   | #45   | Fixed |
| 2   | Phase 1 验收 | 设计文档指定 smoke 参数过小                        | #45 根因                       | #47   | Fixed |
| 3   | Phase 1 验收 | load/stress/spike 未纳入验收 checklist             | 遗漏 3 个级别验证              | #48   | Fixed |
| 4   | Phase 1 验收 | load.jmx + stress.jmx: productId → product_id      | load test 32.5% 错误率         | —     | Fixed |
| 5   | Phase 1 验收 | JM-LOAD-02 阈值从 10 → 8 req/s                     | 50 threads 理论上限 ~8.5 req/s | #51   | Fixed |
