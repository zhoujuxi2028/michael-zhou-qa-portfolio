# AUTH-11: 认证性能对比报告 (Auth Performance Comparison Report)

**Branch:** `feature/performance-testing` | **Phase:** 3 ([#56](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/56))
**测试日期:** 2026-04-05

---

## 1. 测试目的

对比带认证 (JWT) 与不带认证场景的性能差异，量化认证层对延迟、吞吐量和错误率的影响。

## 2. 测试环境

| 项目 | 值 |
|------|-----|
| 硬件 | MacBook Pro Intel i5-1038NG7, 4C8T, 16GB RAM |
| 运行模式 | Express Cluster (8 Workers) |
| 数据库 | SQLite WAL 模式 |
| 认证方式 | JWT (HS256) + bcryptjs (10 rounds) |
| 测试工具 | k6 v1.7.0 + JMeter |
| SLA | p95 < 500ms, error rate < 1% |

---

## 3. k6 对比数据

### 3.1 低负载基准 (Smoke: 5 VUs, 60s)

| 指标 | 无认证 | 结论 |
|------|--------|------|
| p95 | 1.55ms | 基准线 — 系统空载延迟 |
| 吞吐量 | 14.9 req/s | 5 VUs 低负载 |
| 错误率 | 0.00% | — |

### 3.2 中等负载 (Load: 50 VUs vs Journey: 500 VUs)

| 指标 | 无认证 (Load, 50 VUs) | 带认证 (Journey, 500 VUs) | 差异 |
|------|----------------------|--------------------------|------|
| **p95** | **53.41ms** | **54.58ms** | **+2.2%** |
| p99 | 55.76ms | 68.34ms | +22.6% |
| max | 140.81ms | 159.89ms | +13.5% |
| avg | 18.12ms | 10.00ms | -44.8% (VU 密度低) |
| 吞吐量 | 150.3 req/s | 737.5 req/s | +390% (10x VUs) |
| 错误率 | 0.00% | 0.00% | 无差异 |
| SLA | ✅ PASS | ✅ PASS | — |

> **分析:** 带认证场景在 **10 倍 VUs (500 vs 50)** 下 p95 仅增长 2.2%，表明 JWT 验证中间件 (`jsonwebtoken.verify`) 开销极低。认证旅程中 login 仅执行一次 (每 VU 初始化时)，后续请求只需 token 验证。

### 3.3 高负载 (Stress: 200 VUs)

| 指标 | 无认证 (Stress, 200 VUs) | 对照 |
|------|--------------------------|------|
| p95 | 54.38ms | 与 Load 50 VUs 几乎相同 |
| 吞吐量 | 726.0 req/s | 线性扩展良好 |
| 错误率 | 0.00% | — |
| SLA | ✅ PASS | — |

### 3.4 认证专项测试

| 测试 | VUs | p95 | 吞吐量 | 错误率 | SLA | 瓶颈 |
|------|-----|-----|--------|--------|-----|------|
| **Auth-Login** | 100 | **2,200ms** | 35.3 req/s | 0.00% | **❌ FAIL** (阈值 2000ms) | bcrypt CPU-bound |
| **Auth-Refresh** | 200 | **2.82ms** | 144.4 req/s | 0.00% | **✅ PASS** (阈值 200ms) | 无瓶颈 |
| **Auth-Journey** | 500 | **54.58ms** | 737.5 req/s | 0.00% | **✅ PASS** (阈值 500ms) | 无瓶颈 |

---

## 4. JMeter 对比数据

### 4.1 无认证基准 (Load Test: 50 threads)

| 接口 | 请求数 | avg | p95 | p99 | 错误率 |
|------|--------|-----|-----|-----|--------|
| GET /api/products | 708 | 1ms | 3ms | 6ms | 0.0% |
| GET /api/products/:id | 692 | 1ms | 3ms | 7ms | 0.0% |
| POST /api/orders | 674 | 52ms | 54ms | 67ms | 0.0% |

### 4.2 带认证 (Auth-Load: 3 threads)

| 接口 | 请求数 | avg | p95 | p99 | 错误率 |
|------|--------|-----|-----|-----|--------|
| POST /api/auth/register | 3 | 161ms | 301ms | 301ms | 0.0% |
| POST /api/auth/login | 3 | 143ms | 149ms | 149ms | 0.0% |
| GET /api/products | 54 | 2ms | 3ms | 14ms | 0.0% |
| GET /api/products/:id | 52 | 3ms | 5ms | 73ms | 0.0% |
| POST /api/orders | 51 | 54ms | 57ms | 59ms | 0.0% |

> **分析:** 相同业务接口 (products/orders) 在认证前后延迟无显著差异。`register`/`login` 延迟 (~150ms) 完全由 bcrypt 哈希计算决定。

---

## 5. 关键发现

### 5.1 认证开销分类

| 操作 | 开销来源 | 单次延迟 | 对吞吐量影响 |
|------|---------|---------|-------------|
| **Register** | bcrypt hash (10 rounds) | ~160ms | 高 — CPU 密集型 |
| **Login** | bcrypt compare (10 rounds) | ~150ms | 高 — CPU 密集型 |
| **Token Refresh** | JWT verify + sign | ~1.5ms | 极低 |
| **Token 验证中间件** | JWT verify | <1ms | 可忽略 |

### 5.2 bcrypt 是唯一显著瓶颈

| 证据 | 数据 |
|------|------|
| Login p95 (100 VUs) = 2.2s | bcrypt 串行阻塞 event loop (每次 ~100ms) |
| Refresh p95 (200 VUs) = 2.82ms | 无 bcrypt → 延迟极低 |
| Journey p95 (500 VUs) = 54.58ms | Login 仅初始化 1 次，不影响稳态性能 |
| 理论极限: 8 Workers × 10 login/s = ~80 login/s | 实测 35.3 req/s (含 ramp-up/cool-down 稀释) |

### 5.3 业务接口 (products/orders) 认证前后无差异

| 接口 | 无认证 p95 | 带认证 p95 | 差异 |
|------|-----------|-----------|------|
| GET /api/products | 3ms | 3ms | 0% |
| GET /api/products/:id | 3ms | 5ms | +2ms (噪声范围) |
| POST /api/orders | 54ms | 57ms | +3ms (SQLite 写入抖动) |

---

## 6. 结论与建议

| 结论 | 详情 |
|------|------|
| **JWT 验证中间件开销可忽略** | token verify <1ms，对业务接口 p95 无影响 |
| **bcrypt 是认证链路唯一瓶颈** | 100 VUs 并发 login 即超阈值 (p95=2.2s > 2000ms) |
| **Token 刷新性能优异** | 200 VUs p95=2.82ms，远低于 200ms 阈值 |
| **认证旅程整体达标** | 500 VUs p95=54.58ms，认证不影响稳态性能 |

### 生产建议

| 场景 | 建议 |
|------|------|
| 高并发登录 (>50 VUs) | 降低 bcrypt rounds (10→8) 或改用 argon2 (async) |
| 认证接口限流 | login/register 添加 rate limiter (如 50 req/s/IP) |
| Token 策略 | 延长 access token 有效期 (15min→30min) 减少 refresh 频率 |

---

## 7. 测试执行记录

| 测试 | 工具 | VUs | 时长 | 日期 | 结果 |
|------|------|-----|------|------|------|
| Smoke (无认证) | k6 | 5 | 60s | 2026-04-05 | ✅ PASS |
| Load (无认证) | k6 | 50 | 5m | 2026-04-05 | ✅ PASS |
| Stress (无认证) | k6 | 200 | 3.5m | 2026-04-05 | ✅ PASS |
| Auth-Login | k6 | 100 | 3m | 2026-04-05 | ❌ FAIL (p95=2.2s) |
| Auth-Refresh | k6 | 200 | 3m | 2026-04-05 | ✅ PASS |
| Auth-Journey | k6 | 500 | 4m | 2026-04-05 | ✅ PASS |
| Load (无认证) | JMeter | 50 | — | 历史数据 | ✅ PASS |
| Auth-Load | JMeter | 3 | — | 历史数据 | ✅ PASS |
