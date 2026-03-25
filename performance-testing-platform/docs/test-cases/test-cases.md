# 测试策略与用例表 (Test Strategy & Cases)

## 目录

- [1. 测试策略](#1-测试策略)
- [2. 覆盖目标](#2-覆盖目标)
- [3. 单元测试用例表](#3-单元测试用例表)
- [4. 性能测试用例表](#4-性能测试用例表)
- [5. 性能阈值定义](#5-性能阈值定义)
- [English Version](#english-version)

---

## 1. 测试策略

本项目采用两层测试：

| 层 | 工具 | 数量 | 目的 |
|----|------|------|------|
| 单元测试 | Jest + Supertest | 19 | 验证 API 功能正确性 |
| 性能测试 | k6 | 4 脚本 | 验证非功能性指标 (延迟、吞吐、错误率) |

### 测试金字塔

```
        ┌──────────┐
        │ 性能测试  │  4 k6 脚本 (smoke/load/stress/spike)
        │  (k6)    │
        ├──────────┤
        │ 单元测试  │  19 Jest tests (routes/middleware/utils/db)
        │  (Jest)  │
        └──────────┘
```

### 原则

- **TDD**：先写失败测试，再写实现
- **隔离**：每个测试用例独立，`afterEach` 重置数据库
- **CI 门禁**：k6 smoke test 作为性能门禁，阈值不通过则 CI 失败

## 2. 覆盖目标

| 指标 | 目标 | 工具 |
|------|------|------|
| 语句覆盖率 (statements) | >= 80% | Jest --coverage |
| 分支覆盖率 (branches) | >= 70% | Jest --coverage |
| 函数覆盖率 (functions) | >= 80% | Jest --coverage |
| 行覆盖率 (lines) | >= 80% | Jest --coverage |
| 性能 p95 延迟 (smoke) | < 500ms | k6 thresholds |
| 错误率 (smoke) | < 1% | k6 thresholds |

## 3. 单元测试用例表

### 3.1 工具模块 (`tests/unit/utils/`)

| ID | 测试用例 | 预期结果 |
|----|----------|----------|
| UT-DELAY-01 | simulateDelay(50) 等待约 50ms | elapsed >= 45ms 且 < 200ms |
| UT-DELAY-02 | simulateDelay(0) 立即返回 | elapsed < 50ms |

### 3.2 数据库模块 (`tests/unit/db/`)

| ID | 测试用例 | 预期结果 |
|----|----------|----------|
| UT-DB-01 | getDatabase() 返回数据库实例 | db 有 prepare 方法 |
| UT-DB-02 | getDatabase() 种子数据包含 5 个商品 | COUNT(*) = 5 |
| UT-DB-03 | resetDatabase() 重置单例 | 重新调用 getDatabase() 返回新实例，仍有 5 个商品 |

### 3.3 健康检查路由 (`tests/unit/routes/health.test.js`)

| ID | 测试用例 | 预期结果 |
|----|----------|----------|
| UT-HEALTH-01 | GET /health | 200, `{status: "ok"}` |
| UT-HEALTH-02 | GET /ready | 200, `{ready: true}` |

### 3.4 商品路由 (`tests/unit/routes/products.test.js`)

| ID | 测试用例 | 预期结果 |
|----|----------|----------|
| UT-PROD-01 | GET /api/products 返回分页列表 | 200, data.length = 5, total = 5 |
| UT-PROD-02 | GET /api/products?page=1&limit=2 | 200, data.length = 2 |
| UT-PROD-03 | GET /api/products/1 | 200, name = "Laptop" |
| UT-PROD-04 | GET /api/products/999 (不存在) | 404 |
| UT-PROD-05 | POST /api/products 创建商品 | 201, name = "Monitor" |
| UT-PROD-06 | POST /api/products 缺少 name | 400 |

### 3.5 订单路由 (`tests/unit/routes/orders.test.js`)

| ID | 测试用例 | 预期结果 |
|----|----------|----------|
| UT-ORDER-01 | GET /api/orders 初始为空 | 200, data.length = 0 |
| UT-ORDER-02 | POST /api/orders 创建订单并扣减库存 | 201, status = "confirmed", total = 1999.98 |
| UT-ORDER-03 | POST /api/orders 商品不存在 | 404 |
| UT-ORDER-04 | POST /api/orders 库存不足 (quantity: 200000) | 409 |
| UT-ORDER-05 | POST /api/orders 缺少字段 | 400 |

### 3.6 指标中间件 (`tests/unit/middleware/metrics.test.js`)

| ID | 测试用例 | 预期结果 |
|----|----------|----------|
| UT-METRICS-01 | 发送 3 次请求后查询 /metrics | requestCount = 3 |
| UT-METRICS-02 | 发送请求后查询 avgDuration | avgDuration >= 0 |

## 4. 性能测试用例表

### 4.1 冒烟测试 (`smoke.k6.js`)

| ID | 测试场景 | 负载模式 | 阈值 |
|----|----------|----------|------|
| PT-SMOKE-01 | GET /health 可用性 | 2 VUs, 30s | status 200, duration < 200ms |
| PT-SMOKE-02 | GET /api/products 列表 | 2 VUs, 30s | status 200 |
| PT-SMOKE-03 | GET /api/products/:id 详情 | 2 VUs, 30s | status 200 |
| PT-SMOKE-04 | 全局阈值 | 2 VUs, 30s | p95 < 500ms, error rate < 1% |

### 4.2 负载测试 (`load.k6.js`)

| ID | 测试场景 | 负载模式 | 阈值 |
|----|----------|----------|------|
| PT-LOAD-01 | 商品列表 + 详情 + 下单混合流量 | ramp 20→50→0, 5m | p95 < 500ms, p99 < 1s |
| PT-LOAD-02 | 请求吞吐量 | 50 VUs 持续 | rate > 10 req/s |
| PT-LOAD-03 | 全局错误率 | 50 VUs, 5m | error rate < 1% |

### 4.3 压力测试 (`stress.k6.js`)

| ID | 测试场景 | 负载模式 | 阈值 |
|----|----------|----------|------|
| PT-STRESS-01 | 商品 + 下单混合流量 | ramp 50→200→0, 3.5m | p95 < 1000ms |
| PT-STRESS-02 | 高并发错误率 | 200 VUs 峰值 | error rate < 5% |
| PT-STRESS-03 | 观察降级点 | 逐步增加 VUs | 记录性能拐点 |

### 4.4 尖峰测试 (`spike.k6.js`)

| ID | 测试场景 | 负载模式 | 阈值 |
|----|----------|----------|------|
| PT-SPIKE-01 | 突增到 100 VUs | 5→100 (5s 内) | p95 < 2000ms |
| PT-SPIKE-02 | 保持尖峰 | 100 VUs, 30s | error rate < 10% |
| PT-SPIKE-03 | 恢复到基线 | 100→5, 观察 30s | 性能恢复到尖峰前水平 |

## 5. 性能阈值定义

| 脚本 | p95 延迟 | p99 延迟 | 错误率 | VUs | 时长 |
|------|----------|----------|--------|-----|------|
| Smoke | < 500ms | — | < 1% | 2 | 30s |
| Load | < 500ms | < 1000ms | < 1% | 50 | 5m |
| Stress | < 1000ms | — | < 5% | 200 | 3.5m |
| Spike | < 2000ms | — | < 10% | 100 | 1.5m |

---

# English Version

## 1. Test Strategy

Two-layer testing approach:

| Layer | Tool | Count | Purpose |
|-------|------|-------|---------|
| Unit Tests | Jest + Supertest | 19 | Verify API functional correctness |
| Performance Tests | k6 | 4 scripts | Verify non-functional metrics (latency, throughput, error rate) |

Principles: TDD, test isolation (afterEach database reset), k6 smoke as CI performance gate.

## 2. Coverage Targets

| Metric | Target | Tool |
|--------|--------|------|
| Statement coverage | >= 80% | Jest --coverage |
| Branch coverage | >= 70% | Jest --coverage |
| Function coverage | >= 80% | Jest --coverage |
| Line coverage | >= 80% | Jest --coverage |
| p95 latency (smoke) | < 500ms | k6 thresholds |
| Error rate (smoke) | < 1% | k6 thresholds |

## 3. Unit Test Cases (19 tests)

| ID | Module | Test Case | Expected |
|----|--------|-----------|----------|
| UT-DELAY-01 | utils/delay | simulateDelay(50) waits ~50ms | elapsed >= 45ms, < 200ms |
| UT-DELAY-02 | utils/delay | simulateDelay(0) returns immediately | elapsed < 50ms |
| UT-DB-01 | db/database | getDatabase() returns instance | has prepare method |
| UT-DB-02 | db/database | Seeds 5 products | COUNT(*) = 5 |
| UT-DB-03 | db/database | resetDatabase() resets singleton | New instance, still 5 products |
| UT-HEALTH-01 | routes/health | GET /health | 200, status "ok" |
| UT-HEALTH-02 | routes/health | GET /ready | 200, ready true |
| UT-PROD-01 | routes/products | GET /api/products | 200, 5 items |
| UT-PROD-02 | routes/products | Pagination ?page=1&limit=2 | 200, 2 items |
| UT-PROD-03 | routes/products | GET /api/products/1 | 200, "Laptop" |
| UT-PROD-04 | routes/products | GET /api/products/999 | 404 |
| UT-PROD-05 | routes/products | POST create product | 201 |
| UT-PROD-06 | routes/products | POST missing name | 400 |
| UT-ORDER-01 | routes/orders | GET /api/orders empty | 200, 0 items |
| UT-ORDER-02 | routes/orders | POST create order | 201, confirmed |
| UT-ORDER-03 | routes/orders | POST invalid product | 404 |
| UT-ORDER-04 | routes/orders | POST insufficient stock | 409 |
| UT-ORDER-05 | routes/orders | POST missing fields | 400 |
| UT-METRICS-01 | middleware/metrics | 3 requests → count = 3 | requestCount = 3 |
| UT-METRICS-02 | middleware/metrics | avgDuration tracked | >= 0 |

## 4. Performance Test Cases (4 scripts)

| ID | Script | Scenario | VUs | Duration | Threshold |
|----|--------|----------|-----|----------|-----------|
| PT-SMOKE-01~04 | smoke.k6.js | Health + products + detail | 2 | 30s | p95 < 500ms, err < 1% |
| PT-LOAD-01~03 | load.k6.js | Mixed CRUD traffic | 50 | 5m | p95 < 500ms, p99 < 1s, err < 1% |
| PT-STRESS-01~03 | stress.k6.js | Ramp to 200 VUs | 200 | 3.5m | p95 < 1s, err < 5% |
| PT-SPIKE-01~03 | spike.k6.js | Sudden burst + recovery | 100 | 1.5m | p95 < 2s, err < 10% |

## 5. Performance Thresholds

| Script | p95      | p99      | Error Rate | VUs | Duration |
| ------ | -------- | -------- | ---------- | --- | -------- |
| Smoke  | < 500ms  | —        | < 1%       | 2   | 30s      |
| Load   | < 500ms  | < 1000ms | < 1%       | 50  | 5m       |
| Stress | < 1000ms | —        | < 5%       | 200 | 3.5m     |
| Spike  | < 2000ms | —        | < 10%      | 100 | 1.5m     |
|        |          |          |            |     |          |
