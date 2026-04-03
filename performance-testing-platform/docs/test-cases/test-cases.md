# 测试策略与用例表 (Test Strategy & Cases)

## 目录

- [1. 测试策略](#1-测试策略)
- [2. 覆盖目标](#2-覆盖目标)
- [3. 单元测试用例表](#3-单元测试用例表)
- [4. k6 性能测试用例表](#4-k6-性能测试用例表)
- [5. JMeter 性能测试用例表](#5-jmeter-性能测试用例表)
- [6. 性能阈值定义](#6-性能阈值定义)
- [7. 容量测试用例表 (#54)](#7-容量测试用例表-54)
- [8. 认证场景测试用例表 (#56)](#8-认证场景测试用例表-56)
- [9. Soak Test 用例表 (#65)](#9-soak-test-用例表-65)
- [English Version](#english-version)

---

## 1. 测试策略

本项目采用三层测试，双引擎性能测试：

| 层 | 工具 | 数量 | 目的 |
|----|------|------|------|
| 单元测试 | Jest + Supertest | 23 | 验证 API 功能正确性 |
| 性能测试 (轻量级) | k6 | 4 脚本 | 延迟、吞吐、错误率 → HTML 报告 |
| 性能测试 (企业级) | JMeter | 4 测试计划 | 负载测试 + HTML 报告 + Grafana 可视化 |
| 系统指标采集 | Node.js 采集器 | SM-01~09 | CPU / 内存 / 磁盘 I/O / 网络 I/O → CSV |
| 容量测试 | k6 阶梯递增 | 二分法 | 最大并发承载量 + 瓶颈定位 |

### 测试金字塔

```
        ┌──────────────────────────┐
        │      性能测试（双引擎）      │
        │  k6: 4 脚本 (轻量级)       │
        │  JMeter: 4 测试计划 (企业级) │
        ├──────────────────────────┤
        │        单元测试             │
        │  23 Jest tests             │
        └──────────────────────────┘
```

### 原则

- **TDD**：先写失败测试，再写实现
- **隔离**：每个测试用例独立，`afterEach` 重置数据库
- **双引擎 CI 门禁**：k6 + JMeter smoke test 并行作为性能门禁
- **参数外置**：JMeter 测试参数通过 .properties 文件配置，.jmx 保持最小化

## 2. 覆盖目标

| 指标                        | 目标    | 工具            |
| --------------------------- | ------- | --------------- |
| 语句覆盖率 (statements)     | >= 80%  | Jest --coverage |
| 分支覆盖率 (branches)       | >= 70%  | Jest --coverage |
| 函数覆盖率 (functions)      | >= 80%  | Jest --coverage |
| 行覆盖率 (lines)            | >= 80%  | Jest --coverage |
| 性能 p95 延迟 (k6 smoke)    | < 500ms | k6 thresholds   |
| 错误率 (k6 smoke)           | < 1%    | k6 thresholds   |
| p95 响应时间 (JMeter smoke) | < 500ms | .jtl 解析       |
| 错误率 (JMeter smoke)       | < 1%    | .jtl 解析       |

## 3. 单元测试用例表

### 3.1 工具模块 (`tests/unit/utils/`)

| ID          | 测试用例                      | 预期结果                   |
| ----------- | ----------------------------- | -------------------------- |
| UT-DELAY-01 | simulateDelay(50) 等待约 50ms | elapsed >= 45ms 且 < 200ms |
| UT-DELAY-02 | simulateDelay(0) 立即返回     | elapsed < 50ms             |

### 3.2 数据库模块 (`tests/unit/db/`)

| ID       | 测试用例                            | 预期结果                                         |
| -------- | ----------------------------------- | ------------------------------------------------ |
| UT-DB-01 | getDatabase() 返回数据库实例        | db 有 prepare 方法                               |
| UT-DB-02 | getDatabase() 种子数据包含 5 个商品 | COUNT(\*) = 5                                    |
| UT-DB-03 | resetDatabase() 重置单例            | 重新调用 getDatabase() 返回新实例，仍有 5 个商品 |

### 3.3 健康检查路由 (`tests/unit/routes/health.test.js`)

| ID           | 测试用例    | 预期结果              |
| ------------ | ----------- | --------------------- |
| UT-HEALTH-01 | GET /health | 200, `{status: "ok"}` |
| UT-HEALTH-02 | GET /ready  | 200, `{ready: true}`  |

### 3.4 商品路由 (`tests/unit/routes/products.test.js`)

| ID         | 测试用例                         | 预期结果                        |
| ---------- | -------------------------------- | ------------------------------- |
| UT-PROD-01 | GET /api/products 返回分页列表   | 200, data.length = 5, total = 5 |
| UT-PROD-02 | GET /api/products?page=1&limit=2 | 200, data.length = 2            |
| UT-PROD-03 | GET /api/products/1              | 200, name = "Laptop"            |
| UT-PROD-04 | GET /api/products/999 (不存在)   | 404                             |
| UT-PROD-05 | POST /api/products 创建商品      | 201, name = "Monitor"           |
| UT-PROD-06 | POST /api/products 缺少 name     | 400                             |

### 3.5 订单路由 (`tests/unit/routes/orders.test.js`)

| ID          | 测试用例                                     | 预期结果                                   |
| ----------- | -------------------------------------------- | ------------------------------------------ |
| UT-ORDER-01 | GET /api/orders 初始为空                     | 200, data.length = 0                       |
| UT-ORDER-02 | POST /api/orders 创建订单并扣减库存          | 201, status = "confirmed", total = 1999.98 |
| UT-ORDER-03 | POST /api/orders 商品不存在                  | 404                                        |
| UT-ORDER-04 | POST /api/orders 库存不足 (quantity: 200000) | 409                                        |
| UT-ORDER-05 | POST /api/orders 缺少字段                    | 400                                        |

### 3.6 指标中间件 (`tests/unit/middleware/metrics.test.js`)

| ID            | 测试用例                     | 预期结果         |
| ------------- | ---------------------------- | ---------------- |
| UT-METRICS-01 | 发送 3 次请求后查询 /metrics | requestCount = 3 |
| UT-METRICS-02 | 发送请求后查询 avgDuration   | avgDuration >= 0 |

## 4. k6 性能测试用例表

### 4.1 冒烟测试 (`smoke.k6.js`)

| ID          | 测试场景                   | 负载模式   | 阈值                         |
| ----------- | -------------------------- | ---------- | ---------------------------- |
| PT-SMOKE-01 | GET /health 可用性         | 2 VUs, 30s | status 200, duration < 200ms |
| PT-SMOKE-02 | GET /api/products 列表     | 2 VUs, 30s | status 200                   |
| PT-SMOKE-03 | GET /api/products/:id 详情 | 2 VUs, 30s | status 200                   |
| PT-SMOKE-04 | 全局阈值                   | 2 VUs, 30s | p95 < 500ms, error rate < 1% |

### 4.2 负载测试 (`load.k6.js`)

| ID         | 测试场景                       | 负载模式         | 阈值                  |
| ---------- | ------------------------------ | ---------------- | --------------------- |
| PT-LOAD-01 | 商品列表 + 详情 + 下单混合流量 | ramp 20→50→0, 5m | p95 < 500ms, p99 < 1s |
| PT-LOAD-02 | 请求吞吐量                     | 50 VUs 持续      | rate > 8 req/s        |
| PT-LOAD-03 | 全局错误率                     | 50 VUs, 5m       | error rate < 1%       |

### 4.3 压力测试 (`stress.k6.js`)

| ID           | 测试场景            | 负载模式            | 阈值            |
| ------------ | ------------------- | ------------------- | --------------- |
| PT-STRESS-01 | 商品 + 下单混合流量 | ramp 50→200→0, 3.5m | p95 < 1000ms    |
| PT-STRESS-02 | 高并发错误率        | 200 VUs 峰值        | error rate < 5% |
| PT-STRESS-03 | 观察降级点          | 逐步增加 VUs        | 记录性能拐点    |

### 4.4 尖峰测试 (`spike.k6.js`)

| ID          | 测试场景       | 负载模式        | 阈值                 |
| ----------- | -------------- | --------------- | -------------------- |
| PT-SPIKE-01 | 突增到 100 VUs | 5→100 (5s 内)   | p95 < 2000ms         |
| PT-SPIKE-02 | 保持尖峰       | 100 VUs, 30s    | error rate < 10%     |
| PT-SPIKE-03 | 恢复到基线     | 100→5, 观察 30s | 性能恢复到尖峰前水平 |

## 5. JMeter 性能测试用例表

### 5.1 冒烟测试 (`smoke.jmx`)

| ID          | 测试场景                   | 负载模式       | 阈值                         | 报告        |
| ----------- | -------------------------- | -------------- | ---------------------------- | ----------- |
| JM-SMOKE-01 | GET /health 可用性         | 2 threads, 30s | status 200, duration < 500ms | .jtl        |
| JM-SMOKE-02 | GET /api/products 列表     | 2 threads, 30s | status 200                   | .jtl        |
| JM-SMOKE-03 | GET /api/products/:id 详情 | 2 threads, 30s | status 200                   | .jtl        |
| JM-SMOKE-04 | 全局验证                   | 2 threads, 30s | error rate < 1%              | HTML Report |

### 5.2 负载测试 (`load.jmx`)

| ID         | 测试场景                       | 负载模式        | 阈值             | 报告        |
| ---------- | ------------------------------ | --------------- | ---------------- | ----------- |
| JM-LOAD-01 | 商品列表 + 详情 + 下单混合流量 | ramp 0→50, 5m   | duration < 500ms | .jtl        |
| JM-LOAD-02 | 请求吞吐量                     | 50 threads 持续 | 吞吐量 > 8 req/s | HTML Report |
| JM-LOAD-03 | 全局错误率                     | 50 threads, 5m  | error rate < 1%  | HTML Report |

### 5.3 压力测试 (`stress.jmx`)

| ID           | 测试场景            | 负载模式         | 阈值              | 报告        |
| ------------ | ------------------- | ---------------- | ----------------- | ----------- |
| JM-STRESS-01 | 商品 + 下单混合流量 | ramp 0→200, 3.5m | duration < 1000ms | .jtl        |
| JM-STRESS-02 | 高并发错误率        | 200 threads 峰值 | error rate < 5%   | HTML Report |
| JM-STRESS-03 | 观察降级点          | 逐步增加 threads | 记录性能拐点      | HTML Report |

### 5.4 尖峰测试 (`spike.jmx`)

| ID          | 测试场景           | 负载模式         | 阈值                 | 报告        |
| ----------- | ------------------ | ---------------- | -------------------- | ----------- |
| JM-SPIKE-01 | 突增到 100 threads | 5→100 (5s ramp)  | duration < 2000ms    | .jtl        |
| JM-SPIKE-02 | 保持尖峰           | 100 threads, 30s | error rate < 10%     | HTML Report |
| JM-SPIKE-03 | 恢复到基线         | 100→5, 观察 30s  | 性能恢复到尖峰前水平 | HTML Report |

### 5.5 HTML 报告验证

| ID        | 验证项                                            | 预期结果                                 |
| --------- | ------------------------------------------------- | ---------------------------------------- |
| JM-RPT-01 | `jmeter -g results.jtl -o reports/` 生成完整 HTML | reports/ 目录包含 index.html             |
| JM-RPT-02 | 报告包含 Summary 统计                             | 显示 total requests, error %, throughput |
| JM-RPT-03 | 报告包含 Response Time 图表                       | 折线图可渲染                             |

### 5.6 Grafana 可视化验证

| ID        | 验证项                        | 预期结果              |
| --------- | ----------------------------- | --------------------- |
| JM-GRF-01 | Backend Listener → InfluxDB   | jmeter DB 有数据写入  |
| JM-GRF-02 | Grafana JMeter dashboard 加载 | 6 个面板渲染正常      |
| JM-GRF-03 | Active Threads 面板           | 显示线程数变化曲线    |
| JM-GRF-04 | Response Time 面板            | 显示 avg/p90/p95 延迟 |

### 5.7 CI 门禁验证

| ID       | 验证项                         | 预期结果                |
| -------- | ------------------------------ | ----------------------- |
| JM-CI-01 | JMeter smoke test 在 CI 中运行 | GitHub Actions job 成功 |
| JM-CI-02 | 错误率 > 1% 时 CI 失败         | exit code 非 0          |
| JM-CI-03 | .jtl 结果上传为 artifact       | 可在 Actions 中下载     |

---

## 6. 性能阈值定义

### k6 阈值

| 脚本   | p95 延迟 | p99 延迟 | 错误率 | VUs | 时长 |
| ------ | -------- | -------- | ------ | --- | ---- |
| Smoke  | < 500ms  | —        | < 1%   | 2   | 30s  |
| Load   | < 500ms  | < 1000ms | < 1%   | 50  | 5m   |
| Stress | < 1000ms | —        | < 5%   | 200 | 3.5m |
| Spike  | < 2000ms | —        | < 10%  | 100 | 1.5m |

### JMeter 阈值（与 k6 一致，通过 .jtl 解析验证）

| 测试计划 | p95 响应时间 | 错误率 | Threads | 时长 |
| -------- | ------------ | ------ | ------- | ---- |
| Smoke    | < 500ms      | < 1%   | 2       | 30s  |
| Load     | < 500ms      | < 1%   | 50      | 5m   |
| Stress   | < 1000ms     | < 5%   | 200     | 3.5m |
| Spike    | < 2000ms     | < 10%  | 100     | 1.5m |

---

## 7. 容量测试用例表 (#54)

### 测试对象 — 漏斗模型

| 操作 | API | 权重 | 特征 |
|------|-----|------|------|
| 浏览商品列表 | `GET /api/products` | 60% | 读操作 |
| 查看商品详情 | `GET /api/products/:id` | 30% | 读操作 |
| 下单购买 | `POST /api/orders` | 10% | 写操作 (事务锁 + 50ms delay) |

### 系统指标采集用例

| 用例 ID | 测试项 | 验收标准 |
|---------|--------|---------|
| SM-UT-01 | `/metrics` 返回 CPU 指标 | `cpu.user >= 0`, `cpu.loadavg` 长度 3 |
| SM-UT-02 | `/metrics` 返回内存指标 | `memory.rss > 0`, `memory.heapUsed > 0` |
| SM-UT-03 | `/metrics` 返回事件循环延迟 | `eventLoop.lag >= 0` |
| SM-IT-01 | 采集器生成 CSV | `reports/system-metrics-*.csv` 包含 CPU/mem/disk/net 列 |
| SM-IT-02 | 采集器每秒记录 | CSV 行间 timestamp 差 ≈ 1s |
| SM-IT-03 | 采集器优雅退出 | SIGTERM 后 CSV 文件完整，无截断 |

### Cluster 模式用例 (SM-10~11)

| 用例 ID | 测试项 | 验收标准 |
|---------|--------|---------|
| CLU-01 | Cluster 模式启动 | `npm start` 输出 Master + 4 Worker PID |
| CLU-02 | 多 Worker 处理请求 | 并发请求由不同 Worker 处理 |
| CLU-03 | Worker 崩溃自动重启 | kill Worker → Master 自动 fork 新 Worker |

### 容量测试用例

| 用例 ID | 测试项 | 验收标准 |
|---------|--------|---------|
| CAP-01 | 容量测试脚本可运行 | `npm run capacity:test` 正常完成 |
| CAP-02 | 系统指标 CSV 生成 | `reports/system-metrics.csv` 数据完整 |
| CAP-03 | k6 HTML 报告生成 | `reports/k6-capacity.html` 可打开查看 |
| CAP-04 | 漏斗模型流量分布 | 实际比例接近 60:30:10 |
| CAP-05 | 二分法找到最大并发 (Cluster 模式) | 确定满足 SLA (p95<500ms, error<1%) 的最大 VUs (4 核) |
| CAP-06 | 瓶颈层定位 | 根据系统指标判断 CPU / Memory / I/O / Network |

### 测试质量保障用例 (TQ-01~04)

| 用例 ID | 测试项 | 验收标准 |
|---------|--------|---------|
| TQ-IT-01 | 数据膨胀控制 | 每轮测试前重启服务，DB 文件大小重置 |
| TQ-IT-02 | 预热不影响 SLA | 前 30s warm-up 数据不纳入 SLA 判定 |
| TQ-IT-03 | 测试隔离 | 两轮测试间重启服务，结果无上一轮残留影响 |
| TQ-IT-04 | 结果可重复性 | 拐点附近关键轮次跑 3 次，p95 中值偏差 < 20% |

### SLA 定义

| 指标 | 阈值 | 违反含义 |
|------|------|---------|
| p95 | < 500ms | 系统达到上限 |
| error rate | < 1% | 系统达到上限 |
| throughput | 持续增长 | 饱和时 throughput 不再增长 |

## 8. 认证场景测试用例表 (#56)

### 单元测试用例

#### 认证路由 (`tests/unit/routes/auth.test.js`)

| 用例 ID | 测试 | 预期 |
|---------|------|------|
| UT-AUTH-01 | register 成功 | 201, 返回 id + username |
| UT-AUTH-02 | register 缺少字段 | 400 |
| UT-AUTH-03 | register 重复 username | 409 |
| UT-AUTH-04 | login 成功 | 200, 返回 accessToken + refreshToken |
| UT-AUTH-05 | login 错误密码 | 401 |
| UT-AUTH-06 | login 不存在用户 | 401 |
| UT-AUTH-07 | refresh 成功 | 200, 返回新 accessToken |
| UT-AUTH-08 | refresh 无效 token | 401 |
| UT-AUTH-09 | logout 成功 | 200 |
| UT-AUTH-10 | logout 后 refresh 失败 | 401 (jti 在黑名单) |

#### 认证中间件 (`tests/unit/middleware/authenticate.test.js`)

| 用例 ID | 测试 | 预期 |
|---------|------|------|
| UT-MW-01 | 有效 token 放行 | next(), req.user 已注入 |
| UT-MW-02 | 缺少 Authorization header | 401 |
| UT-MW-03 | 无效 token | 401 |
| UT-MW-04 | 过期 token | 401 |
| UT-MW-05 | 黑名单 token | 401 |
| UT-MW-06 | AUTH_ENABLED=false 时 orders 不需认证 | 201 |
| UT-MW-07 | AUTH_ENABLED=true 时 orders 需认证 | 401 (无 token), 201 (有 token) |

### 认证性能测试用例

| 用例 ID | 场景 | 脚本 | VUs | 阈值 | 关注点 |
|---------|------|------|-----|------|--------|
| AUTH-PERF-01 | 高并发登录 | auth-login.k6.js | 100 | p95 < 2000ms, error < 1% | bcrypt ~100ms 同步阻塞, 8 Workers 理论上限 ~80 login/s |
| AUTH-PERF-02 | Token 刷新 | auth-refresh.k6.js | 200 | p95 < 200ms | JWT verify + sign, 无 bcrypt |
| AUTH-PERF-03 | 完整用户旅程 | auth-journey.k6.js | 500 | p95 < 500ms, error < 1% | login 仅首次, 后续 token-only |
| AUTH-PERF-04 | 无效 Token | auth-journey.k6.js (辅助) | ~10% 流量 | 100% 返回 401, 无 5xx | 错误处理不降级 |

> AUTH-PERF-01 VUs 从 500 调整为 100: bcrypt 10 rounds 理论上限 ~80 login/s (8 Workers),
> 500 VUs 全部重复 login 排队 > 5s, 无法产出有意义数据。

### 性能对比测试

| 对比项 | 无认证 (Phase 1/2 基准) | 有认证 (Phase 3) |
|--------|------------------------|------------------|
| 500 VUs p95 | 待测 | 待测 |
| 500 VUs throughput | 待测 | 待测 |
| 主要差异来源 | — | bcrypt ~100ms/login (首次) + JWT verify ~0.1ms/req (后续) |

---

# English Version

## 1. Test Strategy

Three-layer testing with dual-engine performance testing:

| Layer                     | Tool             | Count        | Purpose                                                  |
| ------------------------- | ---------------- | ------------ | -------------------------------------------------------- |
| Unit Tests                | Jest + Supertest | 19           | Verify API functional correctness                        |
| Performance (Lightweight) | k6               | 4 scripts    | Non-functional metrics (latency, throughput, error rate) |
| Performance (Enterprise)  | JMeter           | 4 test plans | Enterprise load testing + HTML reports + Grafana         |

Principles: TDD, test isolation (afterEach database reset), dual-engine smoke as CI performance gate, JMeter params externalized to .properties.

## 2. Coverage Targets

| Metric                           | Target  | Tool            |
| -------------------------------- | ------- | --------------- |
| Statement coverage               | >= 80%  | Jest --coverage |
| Branch coverage                  | >= 70%  | Jest --coverage |
| Function coverage                | >= 80%  | Jest --coverage |
| Line coverage                    | >= 80%  | Jest --coverage |
| p95 latency (k6 smoke)           | < 500ms | k6 thresholds   |
| Error rate (k6 smoke)            | < 1%    | k6 thresholds   |
| p95 response time (JMeter smoke) | < 500ms | .jtl parsing    |
| Error rate (JMeter smoke)        | < 1%    | .jtl parsing    |

## 3. Unit Test Cases (23 tests)

| ID            | Module             | Test Case                            | Expected                       |
| ------------- | ------------------ | ------------------------------------ | ------------------------------ |
| UT-DELAY-01   | utils/delay        | simulateDelay(50) waits ~50ms        | elapsed >= 45ms, < 200ms       |
| UT-DELAY-02   | utils/delay        | simulateDelay(0) returns immediately | elapsed < 50ms                 |
| UT-DB-01      | db/database        | getDatabase() returns instance       | has prepare method             |
| UT-DB-02      | db/database        | Seeds 5 products                     | COUNT(\*) = 5                  |
| UT-DB-03      | db/database        | resetDatabase() resets singleton     | New instance, still 5 products |
| UT-HEALTH-01  | routes/health      | GET /health                          | 200, status "ok"               |
| UT-HEALTH-02  | routes/health      | GET /ready                           | 200, ready true                |
| UT-PROD-01    | routes/products    | GET /api/products                    | 200, 5 items                   |
| UT-PROD-02    | routes/products    | Pagination ?page=1&limit=2           | 200, 2 items                   |
| UT-PROD-03    | routes/products    | GET /api/products/1                  | 200, "Laptop"                  |
| UT-PROD-04    | routes/products    | GET /api/products/999                | 404                            |
| UT-PROD-05    | routes/products    | POST create product                  | 201                            |
| UT-PROD-06    | routes/products    | POST missing name                    | 400                            |
| UT-ORDER-01   | routes/orders      | GET /api/orders empty                | 200, 0 items                   |
| UT-ORDER-02   | routes/orders      | POST create order                    | 201, confirmed                 |
| UT-ORDER-03   | routes/orders      | POST invalid product                 | 404                            |
| UT-ORDER-04   | routes/orders      | POST insufficient stock              | 409                            |
| UT-ORDER-05   | routes/orders      | POST missing fields                  | 400                            |
| UT-METRICS-01 | middleware/metrics | 3 requests → count = 3               | requestCount = 3               |
| UT-METRICS-02 | middleware/metrics | avgDuration tracked                  | >= 0                           |

## 4. k6 Performance Test Cases (4 scripts)

| ID              | Script       | Scenario                   | VUs | Duration | Threshold                       |
| --------------- | ------------ | -------------------------- | --- | -------- | ------------------------------- |
| PT-SMOKE-01~04  | smoke.k6.js  | Health + products + detail | 2   | 30s      | p95 < 500ms, err < 1%           |
| PT-LOAD-01~03   | load.k6.js   | Mixed CRUD traffic         | 50  | 5m       | p95 < 500ms, p99 < 1s, err < 1% |
| PT-STRESS-01~03 | stress.k6.js | Ramp to 200 VUs            | 200 | 3.5m     | p95 < 1s, err < 5%              |
| PT-SPIKE-01~03  | spike.k6.js  | Sudden burst + recovery    | 100 | 1.5m     | p95 < 2s, err < 10%             |

## 5. JMeter Performance Test Cases (4 test plans)

| ID              | Test Plan  | Scenario                   | Threads | Duration | Threshold                   |
| --------------- | ---------- | -------------------------- | ------- | -------- | --------------------------- |
| JM-SMOKE-01~04  | smoke.jmx  | Health + products + detail | 2       | 30s      | duration < 500ms, err < 1%  |
| JM-LOAD-01~03   | load.jmx   | Mixed CRUD traffic         | 50      | 5m       | duration < 500ms, err < 1%  |
| JM-STRESS-01~03 | stress.jmx | Ramp to 200 threads        | 200     | 3.5m     | duration < 1s, err < 5%     |
| JM-SPIKE-01~03  | spike.jmx  | Sudden burst + recovery    | 100     | 1.5m     | duration < 2s, err < 10%    |
| JM-RPT-01~03    | —          | HTML report generation     | —       | —        | index.html + charts         |
| JM-GRF-01~04    | —          | Grafana dashboard          | —       | —        | 6 panels render             |
| JM-CI-01~03     | —          | CI smoke gate              | —       | —        | error rate check + artifact |

## 6. Performance Thresholds

### k6

| Script | p95      | p99      | Error Rate | VUs | Duration |
| ------ | -------- | -------- | ---------- | --- | -------- |
| Smoke  | < 500ms  | —        | < 1%       | 2   | 30s      |
| Load   | < 500ms  | < 1000ms | < 1%       | 50  | 5m       |
| Stress | < 1000ms | —        | < 5%       | 200 | 3.5m     |
| Spike  | < 2000ms | —        | < 10%      | 100 | 1.5m     |

### JMeter (aligned with k6)

| Test Plan | p95 Response Time | Error Rate | Threads | Duration |
| --------- | ----------------- | ---------- | ------- | -------- |
| Smoke     | < 500ms           | < 1%       | 2       | 30s      |
| Load      | < 500ms           | < 1%       | 50      | 5m       |
| Stress    | < 1000ms          | < 5%       | 200     | 3.5m     |
| Spike     | < 2000ms          | < 10%      | 100     | 1.5m     |

---

## 9. Soak Test 用例表 (#65)

### 单元测试

| ID | 描述 | 验证 |
|----|------|------|
| UT-SOAK-01 | stable heap (10% growth) → ok | Jest |
| UT-SOAK-02 | warning (30% growth) → warning | Jest |
| UT-SOAK-03 | critical leak (60% growth) → leaked | Jest |
| UT-SOAK-04 | zero baseline → no crash | Jest |
| UT-SOAK-05 | negative growth (heap shrunk) → ok | Jest |
| UT-SOAK-06 | LEAK_THRESHOLD = 0.50 | Jest |
| UT-SOAK-07 | WARN_THRESHOLD = 0.25 | Jest |

### 性能测试

| ID | Test Case | VUs | Duration | Pass Criteria |
|----|-----------|-----|----------|---------------|
| SOAK-TC-01 | Short soak (validation) | 10 | 5min | p95 < 500ms, error < 1% |
| SOAK-TC-02 | Default soak (1h) | 200 | 1h | p95 < 500ms, error < 1%, heap < 50% |
| SOAK-TC-03 | Full soak (4h) | 500 | 4h | p95 < 500ms, error < 1%, heap < 50% |

### Grafana 验证

| ID | 验证项 | 方法 |
|----|--------|------|
| SOAK-TC-04 | Dashboard panels render | `docker compose up` + browser |
| SOAK-TC-05 | Alert rules fire on breach | Inject artificial load |
