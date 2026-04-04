# 测试策略与用例表 (Test Strategy & Cases)

## 目录

- [1. 测试策略](#1-测试策略)
- [2. 覆盖目标](#2-覆盖目标)
- [3. 单元测试用例表](#3-单元测试用例表)
- [4. 性能测试用例表 (k6 + JMeter)](#4-性能测试用例表-k6--jmeter)
- [5. 容量测试用例表 (#54)](#5-容量测试用例表-54)
- [6. 认证场景测试用例表 (#56)](#6-认证场景测试用例表-56)
- [7. Soak Test 用例表 (#65)](#7-soak-test-用例表-65)
- [8. Phase 5 基础设施 Helper 用例表 (#85)](#8-phase-5-基础设施-helper-用例表-85)
- [9. Phase 6 测试能力扩展用例表 (#86)](#9-phase-6-测试能力扩展用例表-86)

---

## 1. 测试策略

本项目采用三层测试，双引擎性能测试：

| 层 | 工具 | 目的 |
|----|------|------|
| 单元测试 | Jest + Supertest | 验证 API 功能正确性 + 基础设施 helpers |
| 性能测试 (轻量级) | k6 | 延迟、吞吐、错误率 → HTML 报告 |
| 性能测试 (企业级) | JMeter | 负载测试 + HTML 报告 + Grafana 可视化 |
| 系统指标采集 | Node.js 采集器 | CPU / 内存 / 磁盘 I/O / 网络 I/O → CSV |
| 容量测试 | k6 阶梯递增 | 最大并发承载量 + 瓶颈定位 (二分法) |

### 原则

- **TDD**：先写失败测试，再写实现
- **隔离**：每个测试用例独立，`afterEach` 重置数据库
- **双引擎 CI 门禁**：k6 + JMeter smoke test 并行作为性能门禁
- **参数外置**：JMeter 测试参数通过 .properties 文件配置，.jmx 保持最小化

## 2. 覆盖目标

| 指标 | 目标 | 工具 |
|------|------|------|
| 语句覆盖率 (statements) | >= 80% | Jest --coverage |
| 分支覆盖率 (branches) | >= 70% | Jest --coverage |
| 函数覆盖率 (functions) | >= 80% | Jest --coverage |
| 行覆盖率 (lines) | >= 80% | Jest --coverage |
| 性能 SLA | p95 < 500ms, error < 1% | 详见 CLAUDE.md SLA 定义 |

## 3. 单元测试用例表

### 3.1 工具模块 (`tests/unit/utils/`)

| ID | 测试用例 | 预期结果 |
|----|---------|---------|
| UT-DELAY-01 | simulateDelay(50) 等待约 50ms | elapsed >= 45ms 且 < 200ms |
| UT-DELAY-02 | simulateDelay(0) 立即返回 | elapsed < 50ms |

### 3.2 数据库模块 (`tests/unit/db/`)

| ID | 测试用例 | 预期结果 |
|----|---------|---------|
| UT-DB-01 | getDatabase() 返回数据库实例 | db 有 prepare 方法 |
| UT-DB-02 | getDatabase() 种子数据包含 5 个商品 | COUNT(\*) = 5 |
| UT-DB-03 | resetDatabase() 重置单例 | 重新调用 getDatabase() 返回新实例，仍有 5 个商品 |

### 3.3 健康检查路由 (`tests/unit/routes/health.test.js`)

| ID | 测试用例 | 预期结果 |
|----|---------|---------|
| UT-HEALTH-01 | GET /health | 200, `{status: "ok"}` |
| UT-HEALTH-02 | GET /ready | 200, `{ready: true}` |

### 3.4 商品路由 (`tests/unit/routes/products.test.js`)

| ID | 测试用例 | 预期结果 |
|----|---------|---------|
| UT-PROD-01 | GET /api/products 返回分页列表 | 200, data.length = 5, total = 5 |
| UT-PROD-02 | GET /api/products?page=1&limit=2 | 200, data.length = 2 |
| UT-PROD-03 | GET /api/products/1 | 200, name = "Laptop" |
| UT-PROD-04 | GET /api/products/999 (不存在) | 404 |
| UT-PROD-05 | POST /api/products 创建商品 | 201, name = "Monitor" |
| UT-PROD-06 | POST /api/products 缺少 name | 400 |

### 3.5 订单路由 (`tests/unit/routes/orders.test.js`)

| ID | 测试用例 | 预期结果 |
|----|---------|---------|
| UT-ORDER-01 | GET /api/orders 初始为空 | 200, data.length = 0 |
| UT-ORDER-02 | POST /api/orders 创建订单并扣减库存 | 201, status = "confirmed", total = 1999.98 |
| UT-ORDER-03 | POST /api/orders 商品不存在 | 404 |
| UT-ORDER-04 | POST /api/orders 库存不足 (quantity: 200000) | 409 |
| UT-ORDER-05 | POST /api/orders 缺少字段 | 400 |

### 3.6 指标中间件 (`tests/unit/middleware/metrics.test.js`)

| ID | 测试用例 | 预期结果 |
|----|---------|---------|
| UT-METRICS-01 | 发送 3 次请求后查询 /metrics | requestCount = 3 |
| UT-METRICS-02 | 发送请求后查询 avgDuration | avgDuration >= 0 |

## 4. 性能测试用例表 (k6 + JMeter)

> k6 脚本: `tests/performance/*.k6.js` | JMeter 测试计划: `tests/performance/jmeter/*.jmx`
>
> 两引擎场景镜像，阈值一致。JMeter 额外输出 HTML Report + Grafana 可视化。

### 4.1 冒烟测试 (Smoke)

| ID | 引擎 | 测试场景 | 负载 | 阈值 |
|----|------|---------|------|------|
| SMOKE-01 | k6 + JMeter | GET /health 可用性 | 2 VUs/threads, 30s | status 200, duration < 200ms |
| SMOKE-02 | k6 + JMeter | GET /api/products 列表 | 2 VUs/threads, 30s | status 200 |
| SMOKE-03 | k6 + JMeter | GET /api/products/:id 详情 | 2 VUs/threads, 30s | status 200 |
| SMOKE-04 | k6 + JMeter | 全局阈值 | 2 VUs/threads, 30s | p95 < 500ms, error < 1% |

### 4.2 负载测试 (Load)

| ID | 引擎 | 测试场景 | 负载 | 阈值 |
|----|------|---------|------|------|
| LOAD-01 | k6 + JMeter | 商品列表 + 详情 + 下单混合流量 | ramp 20→50→0, 5m | p95 < 500ms, p99 < 1s |
| LOAD-02 | k6 + JMeter | 请求吞吐量 | 50 VUs/threads 持续 | rate > 8 req/s |
| LOAD-03 | k6 + JMeter | 全局错误率 | 50 VUs/threads, 5m | error < 1% |

### 4.3 压力测试 (Stress)

| ID | 引擎 | 测试场景 | 负载 | 阈值 |
|----|------|---------|------|------|
| STRESS-01 | k6 + JMeter | 商品 + 下单混合流量 | ramp 50→200→0, 3.5m | p95 < 1000ms |
| STRESS-02 | k6 + JMeter | 高并发错误率 | 200 VUs/threads 峰值 | error < 5% |
| STRESS-03 | k6 + JMeter | 观察降级点 | 逐步增加 VUs/threads | 记录性能拐点 |

### 4.4 尖峰测试 (Spike)

| ID | 引擎 | 测试场景 | 负载 | 阈值 |
|----|------|---------|------|------|
| SPIKE-01 | k6 + JMeter | 突增到 100 VUs/threads | 5→100 (5s 内) | p95 < 2000ms |
| SPIKE-02 | k6 + JMeter | 保持尖峰 | 100 VUs/threads, 30s | error < 10% |
| SPIKE-03 | k6 + JMeter | 恢复到基线 | 100→5, 观察 30s | 性能恢复到尖峰前水平 |

### 4.5 JMeter 报告与可视化

| ID | 验证项 | 预期结果 |
|----|--------|---------|
| JM-RPT-01 | `jmeter -g results.jtl -o reports/` 生成完整 HTML | reports/ 目录包含 index.html |
| JM-RPT-02 | 报告包含 Summary 统计 | 显示 total requests, error %, throughput |
| JM-RPT-03 | 报告包含 Response Time 图表 | 折线图可渲染 |
| JM-GRF-01 | Backend Listener → InfluxDB | jmeter DB 有数据写入 |
| JM-GRF-02 | Grafana JMeter dashboard 加载 | 6 个面板渲染正常 |
| JM-GRF-03 | Active Threads 面板 | 显示线程数变化曲线 |
| JM-GRF-04 | Response Time 面板 | 显示 avg/p90/p95 延迟 |

### 4.6 CI 门禁

| ID | 验证项 | 预期结果 |
|----|--------|---------|
| JM-CI-01 | JMeter smoke test 在 CI 中运行 | GitHub Actions job 成功 |
| JM-CI-02 | 错误率 > 1% 时 CI 失败 | exit code 非 0 |
| JM-CI-03 | .jtl 结果上传为 artifact | 可在 Actions 中下载 |

---

## 5. 容量测试用例表 (#54)

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

### Cluster 模式用例

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
| CAP-05 | 二分法找到最大并发 (Cluster 模式) | 确定满足 SLA 的最大 VUs (4 核) |
| CAP-06 | 瓶颈层定位 | 根据系统指标判断 CPU / Memory / I/O / Network |

### 测试质量保障用例

| 用例 ID | 测试项 | 验收标准 |
|---------|--------|---------|
| TQ-IT-01 | 数据膨胀控制 | 每轮测试前重启服务，DB 文件大小重置 |
| TQ-IT-02 | 预热不影响 SLA | 前 30s warm-up 数据不纳入 SLA 判定 |
| TQ-IT-03 | 测试隔离 | 两轮测试间重启服务，结果无上一轮残留影响 |
| TQ-IT-04 | 结果可重复性 | 拐点附近关键轮次跑 3 次，p95 中值偏差 < 20% |

## 6. 认证场景测试用例表 (#56)

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

## 7. Soak Test 用例表 (#65)

### 单元测试

| ID | 描述 | 验证 |
|----|------|------|
| UT-SOAK-01 | 稳定 heap (10% 增长) → ok | Jest |
| UT-SOAK-02 | 警告 (30% 增长) → warning | Jest |
| UT-SOAK-03 | 严重泄漏 (60% 增长) → leaked | Jest |
| UT-SOAK-04 | baseline 为零 → 不崩溃 | Jest |
| UT-SOAK-05 | 负增长 (heap 缩小) → ok | Jest |
| UT-SOAK-06 | LEAK_THRESHOLD = 0.50 | Jest |
| UT-SOAK-07 | WARN_THRESHOLD = 0.25 | Jest |

### 性能测试

| ID | 测试场景 | VUs | 时长 | 通过标准 |
|----|---------|-----|------|---------|
| SOAK-TC-01 | 短时验证 | 10 | 5min | p95 < 500ms, error < 1% |
| SOAK-TC-02 | 默认 soak (1h) | 200 | 1h | p95 < 500ms, error < 1%, heap 增长 < 50% |
| SOAK-TC-03 | 完整 soak (4h) | 500 | 4h | p95 < 500ms, error < 1%, heap 增长 < 50% |

### Grafana 验证

| ID | 验证项 | 方法 |
|----|--------|------|
| SOAK-TC-04 | Dashboard 面板渲染 | `docker compose up` + 浏览器 |
| SOAK-TC-05 | 告警规则触发 | 注入人工负载 |

## 8. Phase 5 基础设施 Helper 用例表 (#85)

### 8.1 测试策略

Phase 5 新增 3 个 helper 模块（env loader、CSV loader、profile parser），采用双模块策略：
- **Node.js 模块** (`src/utils/`) — 纯解析逻辑，Jest 单元测试覆盖
- **k6 helpers** (`tests/performance/helpers/`) — 内联重新实现，通过 k6 smoke run 手动验证

### 8.2 Env Loader (`tests/unit/helpers/env.test.js`)

| ID | 测试用例 | 预期结果 |
|----|---------|---------|
| UT-ENV-01 | 解析含 BASE_URL, AUTH_ENABLED, PORT 的 env 文件 | 返回 3 个 key-value 对 |
| UT-ENV-02 | 跳过 `#` 开头的注释行 | 注释不出现在结果中 |
| UT-ENV-03 | 跳过空行和纯空白行 | 空行不产生 key |
| UT-ENV-04 | 输入 null/undefined 返回空对象 | `{}` |
| UT-ENV-05 | 值中包含 `=` (如 `DB_URL=postgres://host?opt=1`) | 仅按第一个 `=` 分割 |
| UT-ENV-06 | key/value 前后有空白 | 自动 trim |
| UT-ENV-07 | `getEnvConfig()` 文件不存在时返回 DEFAULTS | 包含默认 BASE_URL, AUTH_ENABLED, PORT |

### 8.3 CSV Loader (`tests/unit/helpers/data.test.js`)

| ID | 测试用例 | 预期结果 |
|----|---------|---------|
| UT-DATA-01 | 解析含 header 行的 CSV 为对象数组 | `[{col1: val1, col2: val2}, ...]` |
| UT-DATA-02 | 空字符串输入 | 返回 `[]` |
| UT-DATA-03 | null/undefined 输入 | 抛出描述性错误 |
| UT-DATA-04 | 仅 header 行无数据行 | 返回 `[]` |
| UT-DATA-05 | `validateColumns` 全部必需列存在 | 不抛错 |
| UT-DATA-06 | `validateColumns` 缺少必需列 | 抛出含缺失列名的错误 |
| UT-DATA-07 | 解析 products.csv 格式 (id, name, price, category) | 正确解析 4 列 |
| UT-DATA-08 | 解析 users.csv 格式 (username, password, role) | 正确解析 3 列 |

### 8.4 Profile Parser (`tests/unit/helpers/profile.test.js`)

| ID | 测试用例 | 预期结果 |
|----|---------|---------|
| UT-PROF-01 | 解析含 stages + thresholds 的有效 profile | 返回完整 profile 对象 |
| UT-PROF-02 | 无效 JSON 字符串 | 抛出 "Invalid profile JSON" 错误 |
| UT-PROF-03 | 缺少 stages 且缺少 vus | 抛出错误 |
| UT-PROF-04 | stages 为空数组 `[]` | 抛出 "must not be empty" 错误 |
| UT-PROF-05 | stage 缺少 duration 或 target | 抛出含 stage index 的错误 |
| UT-PROF-06 | 缺少 thresholds 对象 | 抛出错误 |
| UT-PROF-07 | 返回完整 options 对象 (stages + thresholds) | 可直接赋值给 `export const options` |
| UT-PROF-08 | 保留可选字段 (如 `setupTimeout`) | 不丢失额外字段 |
| UT-PROF-09 | `vus + duration` 模式 (无 stages) | 返回 `{vus, duration, thresholds}`，不报错 |

### 8.5 k6 集成验证 (手动)

| ID | 验证项 | 命令 | 预期 |
|----|--------|------|------|
| K6-INT-01 | env loader 默认 | `k6 run tests/performance/smoke.k6.js` | localhost 正常运行 |
| K6-INT-02 | env loader staging | `k6 run --env ENV=staging tests/performance/smoke.k6.js` | 加载 staging.env 的 BASE_URL |
| K6-INT-03 | CSV 数据加载 | `k6 run tests/performance/load.k6.js` | 商品 ID 从 CSV 随机选取 |
| K6-INT-04 | Profile 加载 | `k6 run tests/performance/smoke.k6.js` | stages/thresholds 匹配 smoke.json |
| K6-INT-05 | CSV 缺失报错 | 移走 products.csv 后运行 | 明确的初始化错误 |

---

## 9. Phase 6 测试能力扩展用例表 (#86)

### 9.1 Rate Limiter 单元测试 (`tests/unit/middleware/rateLimiter.test.js`)

| 用例 ID | 测试 | 预期 |
|---------|------|------|
| UT-RL-01 | 正常请求 (未超限) | 200, 响应正常 |
| UT-RL-02 | 超过 max 请求数后 | 429, `{ error: "Too many requests..." }` |
| UT-RL-03 | 窗口过后恢复 | 200, 计数重置 |
| UT-RL-04 | RATE_LIMIT_ENABLED=false | 中间件不加载，无 429 |
| UT-RL-05 | 自定义 windowMs + max | 环境变量覆盖默认值 |
| UT-RL-06 | 返回标准 RateLimit headers | `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset` |

### 9.2 k6 限流测试 (`tests/performance/rate-limit.k6.js`)

| 用例 ID | 场景 | VUs | 预期 |
|---------|------|-----|------|
| K6-RL-01 | 正常流量 (低于限额) | 5 | 全部 200, 0 个 429 |
| K6-RL-02 | 超限 burst | 200 | 部分 429, error message 正确 |
| K6-RL-03 | 窗口恢复 | 5 | burst 后等待窗口过期，恢复 200 |
| K6-RL-04 | 熔断恢复 | 500→0→10 | 持续超载 → 停止 → 测量恢复时间 |

### 9.3 Breakpoint 测试 (`tests/performance/breakpoint.k6.js`)

| 用例 ID | 场景 | 预期 |
|---------|------|------|
| K6-BP-01 | 递增到崩溃 | 输出崩溃点 RPS + 当时 p95/error rate |
| K6-BP-02 | 崩溃类型分类 | handleSummary 输出 graceful/catastrophic |
| K6-BP-03 | maxDuration 安全阀 | 10min 内未崩溃则正常结束 |

### 9.4 k6 Helpers 迁移验证

| 用例 ID | 验证项 | 命令 | 预期 |
|---------|--------|------|------|
| K6-MIG-01 | load.k6.js 使用 funnel helper | `npm run k6:smoke` | p95/error 与迁移前一致 (偏差 <10%) |
| K6-MIG-02 | stress.k6.js 使用 funnel helper | 检查 import 语句 | 无内联漏斗代码 |
| K6-MIG-03 | auth 脚本统一 checkStatus | `grep 'check(' tests/performance/auth-*.k6.js` | 无直接 check() 调用 |
| K6-MIG-04 | 全脚本 thinkTime 统一 | `grep 'sleep(' tests/performance/*.k6.js` | 仅在 thinkTime.js 中有 sleep() |

### 9.5 执行摘要报告

| 用例 ID | 验证项 | 命令 | 预期 |
|---------|--------|------|------|
| K6-RPT-01 | 生成 Markdown 摘要 | `npm run generate-summary` | reports/k6-summary.md 存在 |
| K6-RPT-02 | SLA 判定正确 | 检查输出 | p95 < 500ms → ✅, error < 1% → ✅ |
| K6-RPT-03 | Top 5 慢接口 | 检查输出 | 按 p95 排序，含 endpoint 名 |
| K6-RPT-04 | 无 JSON 输入时报错 | 不传参数 | 输出 usage 提示，exit 1 |
