# 架构设计文档 (Architecture Design)

## 目录

- [1. 系统概述](#1-系统概述)
- [2. 数据流](#2-数据流)
- [3. 模块职责](#3-模块职责)
- [4. 接口定义](#4-接口定义)
- [5. 被测对象设计约束](#5-被测对象设计约束intentional-design-constraints)
- [6. Phase 5 — 基础设施层](#6-phase-5--基础设施层-infrastructure-layer)
- [7. Phase 6 — 测试能力扩展](#7-phase-6--测试能力扩展)
- [8. Phase 7 — CI/CD + 可观测性](#8-phase-7--cicd-可观测性)
- [9. 基础设施](#9-基础设施)

---

## 1. 系统概述

性能测试平台由 4 层组成，支持 k6 + JMeter 双引擎 + JWT 认证 + 系统指标采集：

```
┌───────────────────────────────────────────────────────────────────┐
│                       测试层（双引擎）                              │
│  ┌────────────────────────────┐  ┌────────────────────────────┐  │
│  │ k6 (轻量级, 10 脚本)        │  │ JMeter (企业级, 5 测试计划)  │  │
│  │ smoke/load/stress/spike    │  │ smoke/load/stress/spike    │  │
│  │ capacity/soak/auth×3       │  │ auth-load                  │  │
│  └─────────────┬──────────────┘  └─────────────┬──────────────┘  │
└────────────────┼───────────────────────────────┼─────────────────┘
                 │ HTTP 请求                      │ HTTP 请求
                 ▼                               ▼
┌───────────────────────────────────────────────────────────────────┐
│                   目标 API 层 (:3000)                              │
│  Express Cluster (4 Worker) + SQLite WAL                          │
│  ┌─────────────┐ ┌────────────┐ ┌──────────────────────────────┐ │
│  │ products API │ │ orders API │ │ auth API (JWT+bcrypt)        │ │
│  └─────────────┘ └────────────┘ └──────────────────────────────┘ │
│  /health  /ready  /metrics (CPU/mem/eventloop)                    │
└──────────────────────┬────────────────────────────────────────────┘
             ┌─────────┼──────────┐
             ▼                    ▼
┌────────────────────┐ ┌────────────────────────────────────────────┐
│     采集层          │ │              可观测层                        │
│ collect-metrics.js │ │ InfluxDB :8086 (db=k6 + db=jmeter)        │
│ CPU/mem/disk/net   │ │ Grafana  :3010 (双引擎 + soak + heap 面板) │
│ → CSV 归档         │ │ AlertManager (p95/error/heap 告警)          │
└────────────────────┘ └────────────────────────────────────────────┘
```

| 层       | 组件                                               | 职责                                                                   |
| -------- | -------------------------------------------------- | ---------------------------------------------------------------------- |
| 测试层   | k6 (10 脚本) + JMeter (5 测试计划)                 | 双引擎负载生成、阈值验证、HTML 报告                                    |
| API 层   | Express Cluster (4 Worker) + SQLite WAL + JWT 认证 | 被测系统 (SUT)，多核并行，`/metrics` 暴露进程指标，`AUTH_ENABLED` 开关 |
| 采集层   | collect-metrics.js                                 | 系统级指标 (CPU/mem/disk/net) → CSV                                    |
| 可观测层 | InfluxDB + Grafana + AlertManager                  | 存储双引擎指标、可视化、告警                                           |

## 2. 数据流

### k6 数据流

```
1. k6 脚本发送 HTTP 请求 → 目标 API
2. 目标 API 处理请求 → SQLite 读写
3. 目标 API 返回响应 → k6 校验 (checks + thresholds)
4. k6 输出指标 → InfluxDB db=k6 (--out influxdb=...)
5. Grafana 查询 InfluxDB → 渲染 k6 Dashboard
6. CI pipeline 读取 k6 退出码 → 决定通过/失败
```

### JMeter 数据流

```
1. JMeter 测试计划发送 HTTP 请求 → 目标 API (CLI non-GUI: jmeter -n -t ...)
2. 目标 API 处理请求 → SQLite 读写
3. 目标 API 返回响应 → JMeter ResponseAssertion 校验 (状态码验证)
4a. JMeter 记录结果 → .jtl 文件 → HTML Dashboard Report (-e -o reports/)
4b. JMeter Backend Listener → InfluxDB db=jmeter (InfluxdbBackendListenerClient)
5. Grafana 查询 InfluxDB → 渲染 JMeter Dashboard
6. CI pipeline 解析 .jtl 错误率 → 决定通过/失败
```

### 认证数据流 (Phase 3)

```
1. k6 setup() 批量注册用户 → POST /api/auth/register → bcrypt hash → SQLite users 表
2. k6 VU 登录 → POST /api/auth/login → bcrypt verify → 签发 JWT (accessToken + refreshToken)
3. k6 VU 带 Bearer token 请求 → GET/POST → authenticate 中间件验证 JWT → 检查黑名单 → 放行
4. k6 VU 刷新 → POST /api/auth/refresh → 验证 refreshToken → 签发新 accessToken
5. k6 VU 登出 → POST /api/auth/logout → 将 token jti 写入 token_blacklist 表
```

### Soak 数据流 (Phase 4)

```
1. k6 soak 脚本低负载长时间运行 (100~500 VUs, 1~4h)
2. 定期采集 GET /api/metrics → heapUsed / heapTotal / rss / eventLoop lag
3. k6 Custom Metrics (Trend/Counter) → --out influxdb → InfluxDB
4. Grafana heapUsed 趋势面板 + 业务指标面板实时显示
5. Grafana AlertManager: heapUsed 持续增长 / p95 > 500ms / error > 1% → 告警
6. k6 soak 结束 → 对比起止 heapUsed，增长 > 50% 则标记 FAIL (泄漏检测)
```

### 请求流（单次迭代）

```
k6 VU
  ├── GET  /health              → 200 {status: "ok"}
  ├── GET  /api/products        → 200 {data: [...], total: 5}
  ├── GET  /api/products/:id    → 200 {id, name, price, stock}
  └── POST /api/orders          → 201 {id, product_id, quantity, total, status}
                                     │
                                     ├── 校验库存 (stock >= quantity)
                                     ├── 扣减库存 (UPDATE products)
                                     ├── 模拟延迟 (ORDER_DELAY_MS)
                                     └── 创建订单 (INSERT orders)
```

## 3. 模块职责

### 3.1 目标 API (`src/`)

| 模块     | 文件                    | 职责                                         |
| -------- | ----------------------- | -------------------------------------------- |
| 入口     | `app.js`                | Express 应用组装 (无 listen，可测试)         |
| Cluster  | `cluster.js`            | Master + N Worker，多核并行 (Phase 2)        |
| 启动     | `server.js`             | 监听端口，单 Worker 入口                     |
| 健康检查 | `routes/health.js`      | `/health`, `/ready`, `/metrics` (含系统指标) |
| 商品     | `routes/products.js`    | CRUD `/api/products` (分页、查询、创建)      |
| 订单     | `routes/orders.js`      | `/api/orders` (下单含库存校验 + 延迟模拟)    |
| 指标     | `middleware/metrics.js` | 请求计数、平均耗时 + CPU/内存/事件循环延迟   |
| 数据库   | `db/database.js`        | SQLite (Phase 1 内存, Phase 2 文件+WAL)      |
| 工具     | `utils/delay.js`        | 可配置延迟模拟                               |

### 3.2 k6 测试 (`tests/performance/`)

| 脚本                 | 目的                           | VUs         | 时长 | Phase |
| -------------------- | ------------------------------ | ----------- | ---- | ----- |
| `smoke.k6.js`        | 冒烟测试：验证 API 可用性      | 5           | 60s  | 1     |
| `load.k6.js`         | 负载测试：正常流量下性能       | 20→50→0     | 5m   | 1     |
| `stress.k6.js`       | 压力测试：找到系统极限         | 50→200→0    | 3.5m | 1     |
| `spike.k6.js`        | 尖峰测试：突发流量恢复能力     | 5→100→5→0   | 1.5m | 1     |
| `capacity.k6.js`     | 容量测试：二分法逼近最大并发   | 10→200 阶梯 | 5.5m | 2     |
| `auth-login.k6.js`   | 高并发登录压测                 | 100         | 2m   | 3     |
| `auth-refresh.k6.js` | Token 刷新压测                 | 200         | 2m   | 3     |
| `auth-journey.k6.js` | 完整认证用户旅程               | 500         | 5m   | 3     |
| `soak.k6.js`         | Soak 默认 (内存泄漏检测)       | 200         | 1h   | 4     |
| `soak-short.k6.js`   | Soak 短时验证                  | 100         | 10m  | 4     |
| `helpers/utils.js`   | 共享工具：BASE_URL、check 封装 | —           | —    | 1     |

### 3.3 JMeter 测试 (`tests/jmeter/`)

| 测试计划              | 目的                           | Threads | 时长 | 报告        | Phase |
| --------------------- | ------------------------------ | ------- | ---- | ----------- | ----- |
| `smoke.jmx`           | 冒烟测试：验证 API 可用性      | 5       | 60s  | .jtl + HTML | 1     |
| `load.jmx`            | 负载测试：正常流量下性能       | 50      | 5m   | .jtl + HTML | 1     |
| `stress.jmx`          | 压力测试：找到系统极限         | 200     | 3.5m | .jtl + HTML | 1     |
| `spike.jmx`           | 尖峰测试：突发流量恢复能力     | 100     | 1.5m | .jtl + HTML | 1     |
| `auth-load.jmx`       | 高并发登录 + Bearer token 请求 | 50      | 2m   | .jtl + HTML | 3     |
| `config/*.properties` | 外置参数化配置                 | —       | —    | —           | 1     |

**JMX 结构（每个测试计划）:**

```
TestPlan
├── ThreadGroup (参数化: ${threads}, ${duration}, ${rampup})
│   ├── HTTPSamplerProxy — GET /health
│   ├── HTTPSamplerProxy — GET /api/products
│   ├── HTTPSamplerProxy — GET /api/products/${productId}
│   ├── HTTPSamplerProxy — POST /api/orders (load/stress only)
│   ├── ResponseAssertion — status = 200/201
│   ├── (阈值验证通过 CI .jtl 解析，不使用 DurationAssertion)
│   ├── ConstantTimer — think time
│   └── BackendListener — InfluxDB (可选, influx 模式启用)
└── ResultCollector — .jtl 输出
```

### 3.4 可观测层 (`grafana/`)

| 组件                     | 配置文件                                       | 职责                                     |
| ------------------------ | ---------------------------------------------- | ---------------------------------------- |
| InfluxDB 数据源 (k6)     | `provisioning/datasources/influxdb.yml`        | k6 数据库连接 (db=k6)                    |
| InfluxDB 数据源 (JMeter) | `provisioning/datasources/influxdb-jmeter.yml` | JMeter 数据库连接 (db=jmeter)            |
| Dashboard 加载           | `provisioning/dashboards/dashboard.yml`        | 自动加载 JSON 面板                       |
| k6 结果面板              | `dashboards/k6-results.json`                   | k6 VUs、延迟、错误率、通过率             |
| JMeter 结果面板          | `dashboards/jmeter-results.json`               | JMeter Threads、响应时间、吞吐量、错误率 |

## 4. 接口定义

> **源码引用规范：** 每个端点标注实现文件，便于 Review 时对照验证。

### 4.1 健康检查 — `src/routes/health.js:6-18`

| 端点       | 方法 | 响应                                                                                       | 行号 |
| ---------- | ---- | ------------------------------------------------------------------------------------------ | ---- |
| `/health`  | GET  | `{"status": "ok", "timestamp": "..."}`                                                     | 6    |
| `/ready`   | GET  | `{"ready": true}`                                                                          | 10   |
| `/metrics` | GET  | `{"requestCount": N, "avgDuration": N, "cpu": {...}, "memory": {...}, "eventLoop": {...}}` | 14   |

### 4.2 商品 API — `src/routes/products.js:6-34`

| 端点                | 方法 | 参数                         | 响应                                                            | 行号 |
| ------------------- | ---- | ---------------------------- | --------------------------------------------------------------- | ---- |
| `/api/products`     | GET  | `?page=1&limit=10`           | `{"data": [...], "page": 1, "limit": 10, "total": 5}`           | 6    |
| `/api/products/:id` | GET  | path: id                     | `{"id": 1, "name": "Laptop", "price": 999.99, "stock": 100000}` | 16   |
| `/api/products`     | POST | body: `{name, price, stock}` | `201` + 创建的产品对象                                          | 23   |

**错误响应：** `404` 产品不存在 · `400` 缺少 name 或 price

### 4.3 订单 API — `src/routes/orders.js:9-54`

| 端点          | 方法 | 参数                           | 响应                                                  | 行号 |
| ------------- | ---- | ------------------------------ | ----------------------------------------------------- | ---- |
| `/api/orders` | GET  | `?page=1&limit=10`             | `{"data": [...], "page": 1, "limit": 10, "total": N}` | 9    |
| `/api/orders` | POST | body: `{product_id, quantity}` | `201` + 创建的订单对象                                | 21   |

**关键实现细节：**

- 字段名是 **snake_case** `product_id`，非驼峰 `productId`
- 延迟注入：`simulateDelay(ORDER_DELAY_MS)`（默认 50ms）
- 库存扣减：`UPDATE products SET stock = stock - ? WHERE id = ?`
- 认证保护：`AUTH_ENABLED=true` 时需 Bearer token（`authenticate` 中间件）

**错误响应：** `400` 缺少 product_id/quantity · `404` 产品不存在 · `409` 库存不足 · `401` 未认证 (AUTH_ENABLED 开启时)

### 4.4 认证 API — `src/routes/auth.js:17-107`

| 端点                 | 方法 | 参数                                | 响应                          | 行号 |
| -------------------- | ---- | ----------------------------------- | ----------------------------- | ---- |
| `/api/auth/register` | POST | body: `{username, email, password}` | `201` + 用户对象（无密码）    | 17   |
| `/api/auth/login`    | POST | body: `{email, password}`           | `{accessToken, refreshToken}` | 36   |
| `/api/auth/refresh`  | POST | body: `{refreshToken}`              | `{accessToken, refreshToken}` | 54   |
| `/api/auth/logout`   | POST | body: `{refreshToken}`              | `{message: "Logged out"}`     | 75   |

**关键实现细节：**

- bcrypt hash: `bcrypt.hashSync(password, 10)`（~100ms/hash，高并发 CPU 瓶颈点）
- bcrypt verify: `bcrypt.compareSync(password, user.password_hash)`
- JWT 签名：`jwt.sign({...payload, jti: randomUUID()}, JWT_SECRET, {expiresIn})`
- Token 黑名单：logout 将 jti 写入 `token_blacklist` 表，authenticate 中间件检查

### 4.5 数据库 Schema — `src/db/database.js:26-52`

| 表                | 关键约束                                         | Phase | 行号 |
| ----------------- | ------------------------------------------------ | ----- | ---- |
| `products`        | 主键 id，无额外索引（C-01 约束）                 | 1     | 26   |
| `orders`          | `product_id INTEGER NOT NULL`，外键引用 products | 1     | 32   |
| `users`           | email UNIQUE                                     | 3     | 41   |
| `token_blacklist` | jti + expires_at                                 | 3     | 47   |

## 5. 被测对象设计约束（Intentional Design Constraints）

被测 API 作为性能测试平台的目标系统，**刻意保留了若干性能瓶颈点**，使测试能产出有意义的数据。

| #    | 约束                 | 代码位置                                                           | 刻意保留的原因                                                                                     | 生产系统中的做法               |
| ---- | -------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- | ------------------------------ |
| C-01 | **无数据库索引**     | `src/db/database.js` — orders 表仅有主键，无 `product_id` 索引     | 当前 5 条商品 + 每轮重建 DB，全表扫描与索引差异微秒级，不影响测试目标；保留此约束作为"优化前基线"  | 根据查询模式建索引             |
| C-02 | **无缓存层**         | 全局 — 无 Redis / 无应用层缓存 / 无 HTTP Cache-Control             | 每次请求直达 DB，测量最差情况基线；`GET /api/products` (60% 流量) 重复查相同数据，吞吐量天花板可测 | Redis / Memcached / CDN        |
| C-03 | **同步阻塞 DB 驱动** | `better-sqlite3` — 所有查询同步执行，阻塞事件循环                  | 使 event loop lag 可被 SM-03 采集到，验证瓶颈定位决策树的 CPU-bound 分支                           | 异步驱动 (pg, mysql2) 或连接池 |
| C-04 | **人工延迟注入**     | `src/routes/orders.js` — `simulateDelay(ORDER_DELAY_MS)` 默认 50ms | 模拟真实业务处理耗时（支付、风控），使 POST 路径 p95 可测地高于 GET                                | 真实业务逻辑耗时               |
| C-05 | **SQLite 写锁串行**  | WAL 模式下并发读可行，但写操作串行                                 | Cluster 多 Worker 竞争写锁，正是 Phase 2 容量测试要观测的 I/O 瓶颈                                 | PostgreSQL / MySQL (行级锁)    |

### 哪些约束能被现有测试暴露？

| 约束          | 暴露方式                                                                        | 需求追溯                                |
| ------------- | ------------------------------------------------------------------------------- | --------------------------------------- |
| C-01 无索引   | ⚠️ **难以暴露** — 数据量太小 (5 商品) 且每轮重建 DB (TQ-01)，全表扫描耗时 < 1ms | 无对应需求                              |
| C-02 无缓存   | ✅ stress/capacity 测试中 `GET /api/products` 吞吐量天花板低于有缓存场景        | 间接反映在 SLA 吞吐量指标               |
| C-03 同步 DB  | ✅ capacity 测试中 event loop lag 升高 → 瓶颈决策树 CPU-bound 分支              | SM-03 事件循环延迟                      |
| C-04 人工延迟 | ✅ POST `/api/orders` 的 p95 始终 ≥ 50ms，明显高于 GET 路径                     | 需求已记录 (implementation-plan-phase2) |
| C-05 写锁串行 | ✅ Cluster 模式下高并发写 → disk write bytes/s 升高 → I/O-bound 分支            | SM-06 + SM-11                           |

> **C-01 (无索引) 是当前唯一无法被测试暴露的约束**，因为数据量刻意保持在极小规模。如需演示索引影响，可在未来 Phase 中增加大数据量场景 (10 万+ 商品)。

## 6. Phase 5 — 基础设施层 (Infrastructure Layer)

### 6.1 三层配置架构

```
┌─────────────────────────────────────────────────────────────┐
│                    配置层 (Phase 5 新增)                      │
│                                                              │
│  env/              profiles/           data/                 │
│  ├─ local.env      ├─ smoke.json       ├─ users.csv          │
│  ├─ staging.env    ├─ load.json        └─ products.csv       │
│  └─ production.env ├─ stress.json                            │
│                    ├─ spike.json                              │
│                    └─ peak.json                               │
└────────┬──────────────────┬──────────────────┬───────────────┘
         │                  │                  │
         ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│              k6 Helpers (tests/performance/helpers/)          │
│  env.js ──── BASE_URL, ENV config                            │
│  data.js ─── SharedArray (users, products, randomProduct())  │
│  profile.js ─ loadProfile('smoke') → {stages, thresholds}   │
│  utils.js ── checkStatus, checkDuration (re-exports BASE_URL)│
└─────────────────────────────────────────────────────────────┘
```

### 6.2 双模块策略

k6 不是 Node.js，无法直接用 Jest 测试。采用 `leak-detection.js` 已验证的模式：

| 层           | 位置                                                            | 运行时         | 用途                                                                  |
| ------------ | --------------------------------------------------------------- | -------------- | --------------------------------------------------------------------- |
| Node.js 模块 | `src/utils/env-loader.js`, `csv-loader.js`, `profile-parser.js` | Jest (Node.js) | 纯解析逻辑，单元测试                                                  |
| k6 helpers   | `tests/performance/helpers/env.js`, `data.js`, `profile.js`     | k6 runtime     | 内联重新实现解析逻辑 + k6 原生 API (`open()`, `SharedArray`, `__ENV`) |

### 6.3 环境切换数据流

```
k6 run --env ENV=staging smoke.k6.js
  │
  ▼
helpers/env.js
  ├── 读取 __ENV.ENV → "staging"
  ├── open('../../../env/staging.env')
  ├── parseEnvFile() → {BASE_URL: "http://staging:3000", ...}
  └── export BASE_URL
         │
         ▼
helpers/utils.js (re-export BASE_URL from env.js)
         │
         ▼
smoke.k6.js: http.get(`${BASE_URL}/api/products`)
```

### 6.4 Profile 双模式支持

| 模式             | 适用场景                    | JSON 结构                                      | 示例         |
| ---------------- | --------------------------- | ---------------------------------------------- | ------------ |
| `vus + duration` | 恒定 VU (smoke)             | `{vus: 5, duration: "60s", thresholds: {...}}` | `smoke.json` |
| `stages`         | 渐变 VU (load/stress/spike) | `{stages: [...], thresholds: {...}}`           | `load.json`  |

### 6.5 CSV 数据流 (无 CDN 依赖)

```
data/products.csv
  │
  ▼ open() + split() (不依赖 papaparse CDN)
  │
  ▼ SharedArray('products', fn)
  │
  ▼ randomProduct() → {id, name, price, category}
  │
  ▼ http.get(`${BASE_URL}/api/products/${p.id}`)
```

## 7. Phase 6 — 测试能力扩展

### 7.1 k6 Helpers 重构架构

```
tests/performance/helpers/
├── utils.js          ← 已有: checkStatus(), checkDuration(), pollMetrics()
├── env.js            ← Phase 5: 环境配置
├── data.js           ← Phase 5: CSV 数据
├── profile.js        ← Phase 5: 负载 profile
├── thinkTime.js      ← Phase 6 新增: thinkTime(min,max) + randomIntBetween (去 CDN)
├── funnel.js         ← Phase 6 新增: executeFunnel(baseUrl) — 嵌套漏斗 + onOrder hook
└── healthCheck.js    ← Phase 6 新增: verifyHealth(baseUrl) — setup() 前置验证
```

**迁移矩阵：** 现有脚本 → 统一 import helpers

| 脚本               | funnel  | thinkTime        | checkStatus                   | healthCheck |
| ------------------ | ------- | ---------------- | ----------------------------- | ----------- |
| load.k6.js         | ✅ 迁移 | ✅ 迁移          | ✅ 已有                       | —           |
| stress.k6.js       | ✅ 迁移 | ✅ 迁移          | ✅ 已有                       | —           |
| capacity.k6.js     | ✅ 迁移 | ✅ 迁移          | ✅ 已有                       | —           |
| soak.k6.js         | ✅ 迁移 | ✅ 迁移          | ✅ 已有                       | —           |
| smoke.k6.js        | —       | —                | ✅ 已有                       | ✅ 迁移     |
| spike.k6.js        | —       | —                | ✅ 已有                       | ✅ 迁移     |
| auth-login.k6.js   | —       | ✅ 迁移 (去 CDN) | ⚠️ 需迁移 (check→checkStatus) | —           |
| auth-refresh.k6.js | —       | ✅ 迁移 (去 CDN) | ⚠️ 需迁移                     | —           |
| auth-journey.k6.js | ✅ 已有 | ✅ 迁移 (去 CDN) | ⚠️ 需迁移                     | —           |

**关键设计决策：**

- **funnel 嵌套模型**: 100% browse → 50% detail → 33% order（与现有脚本行为一致）
- **onOrder 回调 hook**: soak 脚本通过 `onOrder` 参数记录自定义 metrics，避免 funnel 耦合业务指标
- **去 CDN**: thinkTime.js 内联 `randomIntBetween`，替代所有 `jslib.k6.io` CDN import
- **data.js 复用**: funnel.js import `randomProduct()` from data.js，复用 Phase 5 CSV 参数化

### 7.2 Rate Limiter 中间件

```
Express Middleware Chain:
  express.json()
  → rateLimiter (RATE_LIMIT_ENABLED=true 时启用)
  → metricsMiddleware
  → routes (health / products / auth / orders)
```

**Cluster 模式注意：** MemoryStore 是 per-worker，4 Worker = 4 份独立计数器。测试时使用单进程模式 (`npm run start:single`) 确保行为可预测。

### 7.3 Breakpoint Test 递增策略

```
executor: ramping-arrival-rate
  50 req/s ──→ 150 ──→ 250 ──→ 350 ──→ ... ──→ 崩溃点
  │ 30s  │ 30s │ 30s │ 30s │         │
  └──────┴─────┴─────┴─────┴─────────┘

  abortOnFail: http_req_failed > 50%
  maxDuration: 10min (安全阀)

  崩溃类型判定:
  ├── Graceful: p95 渐进增长, error rate 缓慢上升 (线性)
  └── Catastrophic: error rate 从 <1% 突跳 >50% (阶跃)
```

---

## 8. 基础设施

### 7.1 Docker Compose 服务

| 服务     | 镜像                   | 端口 | 用途                             |
| -------- | ---------------------- | ---- | -------------------------------- |
| api      | 自建 (node:18)         | 3000 | 目标 API (Cluster 模式)          |
| influxdb | influxdb:1.8           | 8086 | k6 + JMeter 指标存储 (双 DB)     |
| grafana  | grafana/grafana:10.2.0 | 3010 | 可视化 Dashboard (双引擎 + soak) |

### 7.2 环境变量

| 变量                   | 默认值                | 说明                                       | Phase |
| ---------------------- | --------------------- | ------------------------------------------ | ----- |
| `PORT`                 | 3000                  | API 端口                                   | 1     |
| `ORDER_DELAY_MS`       | 50                    | 订单处理模拟延迟 (ms)                      | 1     |
| `NODE_ENV`             | —                     | `test` 时 SQLite 使用 `:memory:`           | 1     |
| `BASE_URL`             | http://localhost:3000 | k6 目标地址                                | 1     |
| `INFLUXDB_DB`          | k6                    | InfluxDB 数据库名 (k6 用)                  | 1     |
| `AUTH_ENABLED`         | false                 | `true` 时 POST /api/orders 需 Bearer token | 3     |
| `JWT_SECRET`           | perf-test-secret-key  | JWT 签名密钥                               | 3     |
| `JWT_ACCESS_EXPIRES`   | 15m                   | Access Token 过期时间                      | 3     |
| `JWT_REFRESH_EXPIRES`  | 7d                    | Refresh Token 过期时间                     | 3     |
| `RATE_LIMIT_ENABLED`   | false                 | `true` 时启用 rate limiter 中间件          | 6     |
| `RATE_LIMIT_WINDOW_MS` | 60000                 | Rate limit 时间窗口 (ms)                   | 6     |
| `RATE_LIMIT_MAX`       | 100                   | 时间窗口内最大请求数                       | 6     |

### 7.3 CI Pipeline 架构

```
performance-lint → unit-tests → ┬─ smoke-test         (grafana/setup-k6-action)
                                └─ jmeter-smoke-test  (apt-get install + wget)
```

两个 smoke gate 并行运行，均通过才算 CI 绿灯。lint 阶段包含 ESLint、Prettier 和 ShellCheck 三个独立检查。

## 8. Phase 7 — CI/CD + 可观测性

### 8.1 CI Pipeline 架构

```
performance-lint → ┬─ unit-tests (coverage ≥80%) → ┬─ smoke-test       (k6 smoke gate)
                   │                                ├─ jmeter-smoke-test
                   │                                ├─ baseline-compare (regression detection)
                   │                                └─ trend-collect    (historical analysis)
                   └─ shell-tests (BATS)            → ┬─ smoke-test
                                                      └─ jmeter-smoke-test
```

**CI 流程特点：**

- **代码质量门禁**: ESLint（语法/逻辑）+ Prettier（格式）+ ShellCheck（shell 脚本静态分析）独立执行，任一失败即阻断
- **Shell 测试**: BATS (`stage4-selftest.bats`) 25 个 shell 自测用例与 unit-tests 并行运行
- **覆盖率门禁**: Jest coverage threshold enforced (minimum 80%)
- **并行执行**: k6 和 JMeter smoke test 同时运行，提高 CI 效率
- **基线对比**: 自动对比历史性能数据，检测回归
- **趋势收集**: 持续收集性能趋势，支持长期分析
- **失败策略**: 禁用 `|| true`，任何失败直接导致 CI fail
- **命名规范**: GitHub Checks 使用 `Performance Testing / <Stage>` 显示名，避免 monorepo 内多个 `Unit Tests` 混淆

**Prettier 检查范围** (ISS-015 后扩展):

- `src/**/*.js` — 源代码
- `tests/**/*.js` — 所有测试文件（unit + integration + performance）
- `scripts/**/*.js` — 脚本文件

**本地质量门禁** (pre-commit hook):

- husky v9 + lint-staged：git commit 前自动执行 ESLint + Prettier
- 覆盖范围与 CI 一致：`src/`, `tests/`, `scripts/` 下所有 `.js` 文件

**分支保护建议** (ISS-015 RCA):

- 建议在 `main` 和 `feature/performance-testing` 分支启用 branch protection rules
- 要求 `Performance Testing / Code Quality` 和 `Performance Testing / Unit Tests` status checks 通过后才能合并
- 需要 repo admin 在 GitHub Settings → Branches → Branch protection rules 手动配置

### 8.2 CI 工作流程组件

| 组件                 | 文件                                   | 作用                   | 验证方式                           |
| -------------------- | -------------------------------------- | ---------------------- | ---------------------------------- |
| **Workflow**         | `.github/workflows/performance-ci.yml` | 主 CI 流程定义         | GitHub Actions                     |
| **Baseline Export**  | `scripts/baseline-export.js`           | 导出当前性能基线       | `node scripts/baseline-export.js`  |
| **Baseline Compare** | `scripts/baseline-compare.js`          | 对比性能基线，检测回归 | `node scripts/baseline-compare.js` |
| **Trend Collect**    | `scripts/trend-collect.js`             | 收集历史趋势数据       | `node scripts/trend-collect.js`    |
| **Summary Report**   | `scripts/generate-summary.sh`          | 生成 Markdown 执行摘要 | `bash scripts/generate-summary.sh` |

### 8.3 基线管理策略

```
每次 CI 执行：
1. 运行 k6 smoke test → 输出 k6-smoke-summary.json
2. 调用 baseline-export.js → 保存当前指标到 baseline.json
3. 下载上次成功运行的 baseline-artifact
4. 调用 baseline-compare.js → 计算回归/提升
5. 调用 trend-collect.js → 更新趋势数据
6. 调用 generate-summary.sh → 生成报告
7. 上传 artifacts (baseline, trend, reports)
```

**回归检测逻辑：**

- **p95 延迟**: 如果新值 > 旧值 × 1.1 (10% 上升)，标记为 REGRESSION
- **错误率**: 如果新值 > 旧值 + 0.5%，标记为 REGRESSION
- **吞吐量**: 如果新值 < 旧值 × 0.9 (10% 下降)，标记 as REGRESSION

### 8.4 趋势分析

**存储结构：**

```
reports/
├── trend.json              # 每次 CI 追加的性能数据
├── k6-summary.md           # Markdown 摘要报告
└── trend-analysis/         # 趋势分析结果
    ├── latency-trend.png   # p95 延迟趋势图
    ├── error-rate-trend.png # 错误率趋势图
    └── throughput-trend.png # 吞吐量趋势图
```

**数据保留策略：**

- `trend.json`: 保留最近 90 天数据（Issue #128）
- 每日执行追加新数据，自动清理旧数据
- 支持 Grafana 查询历史趋势

### 8.5 可观测性增强

#### 8.5.1 Grafana 面板升级

**新增面板：**

1. **CI 状态面板**: 显示最近 CI 运行状态，通过/失败率
2. **基线对比面板**: 显示当前 vs 基线的性能对比
3. **趋势分析面板**: 显示 p95/error rate/throughput 的长期趋势
4. **业务指标面板**: 订单创建成功率、认证成功率等业务级指标

**面板数据源：**

- InfluxDB (k6 + JMeter)：原始性能数据
- trend.json：趋势分析数据（通过 Grafana JSON API）

#### 8.5.2 告警规则增强

**新增告警规则：**

```yaml
# CI 失败告警
- alert: CIFailed
  expr: ci_job_result == 1
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: 'CI Pipeline Failed'

# 性能回归告警
- alert: PerformanceRegression
  expr: |
    (
      rate(k6_http_req_duration_p95[5m]) > 
      rate(k6_http_req_duration_p5m[5m]) * 1.1
    ) and (
      rate(k6_http_req_failed[5m]) > 0.01
    )
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: 'Performance Regression Detected'
```

### 8.6 定时测试

**夜间回归测试：**

```yaml
name: Nightly Regression
on:
  schedule:
    - cron: '0 2 * * *' # 每天凌晨2点
jobs:
  regression:
    runs-on: ubuntu-latest
    steps:
      -  # 执行完整性能回归测试
      -  # 结果存储在带时间戳的目录
      -  # 生成回归报告并邮件通知
```

**测试范围：**

- 所有 k6 脚本（smoke, load, stress, spike, capacity, soak）
- 所有 JMeter 测试计划
- 基线回归检测
- 趋势更新

### 8.7 PR 集成

**PR 评论功能：**

- 自动在 PR 中添加测试结果摘要
- 显示基线对比结果
- 提供趋势分析链接
- 标注是否存在性能回归

**评论格式：**

```markdown
📊 Performance Test Results

| Test         | Status  | p95  | Error Rate | Baseline Change |
| ------------ | ------- | ---- | ---------- | --------------- |
| k6-smoke     | ✅ PASS | 45ms | 0.0%       | +2%             |
| jmeter-smoke | ✅ PASS | 52ms | 0.0%       | -1%             |

📈 Trend Analysis: Dashboard link（运行时生成）
📄 Baseline Comparison: comparison-result.json artifact

⚠️ No regressions detected
```

### 8.8 脚本命令扩展

**新增 npm scripts：**

```json
{
  "generate-summary": "bash scripts/generate-summary.sh",
  "k6:rate-limit": "mkdir -p reports && k6 run --out 'web-dashboard=export=reports/k6-rate-limit.html' tests/performance/rate-limit.k6.js",
  "k6:breakpoint": "npm run preflight && npm run restart:clean && mkdir -p reports && k6 run --out 'web-dashboard=export=reports/k6-breakpoint.html' tests/performance/breakpoint.k6.js"
}
```

**脚本功能：**

- `generate-summary`: 生成 Markdown 格式的执行摘要
- `k6:rate-limit`: 测试 API 限流功能
- `k6:breakpoint`: 寻找系统崩溃点的递增测试

### 8.9 测试统计

**Phase 7 新增测试类型：**
| 测试类型 | 数量 | 累计总数 | 工具 |
|---------|------|----------|------|
| CI 流程测试 | 12 | 212 | GitHub Actions |
| 趋势分析测试 | 3 | 215 | Bash + Node.js |
| 基线管理测试 | 5 | 220 | Bash + Node.js |
| **总计** | **20** | **220** | |

**测试覆盖范围：**

- CI 流程完整性验证
- 性能回归检测
- 趋势数据分析
- 基线管理自动化
- 可观测性集成
