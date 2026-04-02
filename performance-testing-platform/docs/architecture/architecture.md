# 架构设计文档 (Architecture Design)

## 目录

- [1. 系统概述](#1-系统概述)
- [2. 数据流](#2-数据流)
- [3. 模块职责](#3-模块职责)
- [4. 接口定义](#4-接口定义)
- [5. 被测对象设计约束](#5-被测对象设计约束intentional-design-constraints)
- [6. 基础设施](#6-基础设施)
- [English Version](#english-version)

---

## 1. 系统概述

性能测试平台由 4 层组成，支持 k6 + JMeter 双引擎 + 系统指标采集：

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          性能测试层（双引擎）                              │
│  ┌─────────────────────────────┐  ┌─────────────────────────────────┐   │
│  │ k6 (轻量级)                  │  │ JMeter (企业级)                   │   │
│  │ smoke/load/stress/spike.k6  │  │ smoke/load/stress/spike.jmx     │   │
│  └──────────┬──────────────────┘  └──────────┬──────────────────────┘   │
└─────────────┼────────────────────────────────┼──────────────────────────┘
              │ HTTP 请求                       │ HTTP 请求
              ▼                                ▼
┌─────────────────────────┐  ┌────────────────────────────────────────────┐
│     目标 API 层          │  │              可观测层                       │
│  Express + SQLite        │  │  InfluxDB (k6 db + jmeter db)             │
│  :3000                   │  │  :8086                                    │
│                          │  │  Grafana (k6 dashboard + JMeter dashboard)│
│                          │  │  :3010                                    │
└─────────────────────────┘  └────────────────────────────────────────────┘
```

| 层 | 组件 | 职责 |
|----|------|------|
| 测试层 | k6 脚本 (4 种模式 + 容量测试) | 轻量级负载生成、阈值验证、HTML 报告 |
| 测试层 | JMeter 测试计划 (4 种模式) | 企业级负载生成、HTML 报告、Backend Listener |
| API 层 | Express Cluster (4 Worker) + SQLite WAL | 被测系统 (SUT)，多核并行，`/metrics` 暴露进程指标 |
| 可观测层 | InfluxDB + Grafana | 存储双引擎指标、可视化 |
| 采集层 | collect-metrics.js | 系统级指标 (CPU/mem/disk/net) → CSV |

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

| 模块     | 文件                    | 职责                                      |
| -------- | ----------------------- | ----------------------------------------- |
| 入口     | `app.js`                | Express 应用组装 (无 listen，可测试)      |
| Cluster  | `cluster.js`            | Master + N Worker，多核并行 (Phase 2)     |
| 启动     | `server.js`             | 监听端口，单 Worker 入口                  |
| 健康检查 | `routes/health.js`      | `/health`, `/ready`, `/metrics` (含系统指标) |
| 商品     | `routes/products.js`    | CRUD `/api/products` (分页、查询、创建)   |
| 订单     | `routes/orders.js`      | `/api/orders` (下单含库存校验 + 延迟模拟) |
| 指标     | `middleware/metrics.js` | 请求计数、平均耗时 + CPU/内存/事件循环延迟 |
| 数据库   | `db/database.js`        | SQLite (Phase 1 内存, Phase 2 文件+WAL)   |
| 工具     | `utils/delay.js`        | 可配置延迟模拟                            |

### 3.2 k6 测试 (`tests/performance/`)

| 脚本               | 目的                           | VUs       | 时长 |
| ------------------ | ------------------------------ | --------- | ---- |
| `smoke.k6.js`      | 冒烟测试：验证 API 可用性      | 5         | 60s  |
| `load.k6.js`       | 负载测试：正常流量下性能       | 20→50→0   | 5m   |
| `stress.k6.js`     | 压力测试：找到系统极限         | 50→200→0  | 3.5m |
| `spike.k6.js`      | 尖峰测试：突发流量恢复能力     | 5→100→5→0 | 1.5m |
| `capacity.k6.js`   | 容量测试：二分法逼近最大并发   | 10→200 阶梯 | 5.5m |
| `helpers/utils.js` | 共享工具：BASE_URL、check 封装 | —         | —    |

### 3.3 JMeter 测试 (`tests/jmeter/`)

| 测试计划              | 目的                       | Threads | 时长 | 报告        |
| --------------------- | -------------------------- | ------- | ---- | ----------- |
| `smoke.jmx`           | 冒烟测试：验证 API 可用性  | 5       | 60s  | .jtl + HTML |
| `load.jmx`            | 负载测试：正常流量下性能   | 50      | 5m   | .jtl + HTML |
| `stress.jmx`          | 压力测试：找到系统极限     | 200     | 3.5m | .jtl + HTML |
| `spike.jmx`           | 尖峰测试：突发流量恢复能力 | 100     | 1.5m | .jtl + HTML |
| `config/*.properties` | 外置参数化配置             | —       | —    | —           |

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

### 4.1 健康检查

| 端点       | 方法 | 响应                                    |
| ---------- | ---- | --------------------------------------- |
| `/health`  | GET  | `{"status": "ok", "timestamp": "..."}`  |
| `/ready`   | GET  | `{"ready": true}`                       |
| `/metrics` | GET  | `{"requestCount": N, "avgDuration": N, "cpu": {...}, "memory": {...}, "eventLoop": {...}}` |

### 4.2 商品 API

| 端点                | 方法 | 参数                         | 响应                                                            |
| ------------------- | ---- | ---------------------------- | --------------------------------------------------------------- |
| `/api/products`     | GET  | `?page=1&limit=10`           | `{"data": [...], "page": 1, "limit": 10, "total": 5}`           |
| `/api/products/:id` | GET  | path: id                     | `{"id": 1, "name": "Laptop", "price": 999.99, "stock": 100000}` |
| `/api/products`     | POST | body: `{name, price, stock}` | `201` + 创建的产品对象                                          |

**错误响应：**

- `404` — 产品不存在
- `400` — 缺少 name 或 price

### 4.3 订单 API

| 端点          | 方法 | 参数                           | 响应                                                  |
| ------------- | ---- | ------------------------------ | ----------------------------------------------------- |
| `/api/orders` | GET  | `?page=1&limit=10`             | `{"data": [...], "page": 1, "limit": 10, "total": N}` |
| `/api/orders` | POST | body: `{product_id, quantity}` | `201` + 创建的订单对象                                |

**错误响应：**

- `400` — 缺少 product_id 或 quantity
- `404` — 产品不存在
- `409` — 库存不足

## 5. 被测对象设计约束（Intentional Design Constraints）

被测 API 作为性能测试平台的目标系统，**刻意保留了若干性能瓶颈点**，使测试能产出有意义的数据。

| # | 约束 | 代码位置 | 刻意保留的原因 | 生产系统中的做法 |
|---|------|---------|---------------|----------------|
| C-01 | **无数据库索引** | `src/db/database.js` — orders 表仅有主键，无 `product_id` 索引 | 当前 5 条商品 + 每轮重建 DB，全表扫描与索引差异微秒级，不影响测试目标；保留此约束作为"优化前基线" | 根据查询模式建索引 |
| C-02 | **无缓存层** | 全局 — 无 Redis / 无应用层缓存 / 无 HTTP Cache-Control | 每次请求直达 DB，测量最差情况基线；`GET /api/products` (60% 流量) 重复查相同数据，吞吐量天花板可测 | Redis / Memcached / CDN |
| C-03 | **同步阻塞 DB 驱动** | `better-sqlite3` — 所有查询同步执行，阻塞事件循环 | 使 event loop lag 可被 SM-03 采集到，验证瓶颈定位决策树的 CPU-bound 分支 | 异步驱动 (pg, mysql2) 或连接池 |
| C-04 | **人工延迟注入** | `src/routes/orders.js` — `simulateDelay(ORDER_DELAY_MS)` 默认 50ms | 模拟真实业务处理耗时（支付、风控），使 POST 路径 p95 可测地高于 GET | 真实业务逻辑耗时 |
| C-05 | **SQLite 写锁串行** | WAL 模式下并发读可行，但写操作串行 | Cluster 多 Worker 竞争写锁，正是 Phase 2 容量测试要观测的 I/O 瓶颈 | PostgreSQL / MySQL (行级锁) |

### 哪些约束能被现有测试暴露？

| 约束 | 暴露方式 | 需求追溯 |
|------|---------|---------|
| C-01 无索引 | ⚠️ **难以暴露** — 数据量太小 (5 商品) 且每轮重建 DB (TQ-01)，全表扫描耗时 < 1ms | 无对应需求 |
| C-02 无缓存 | ✅ stress/capacity 测试中 `GET /api/products` 吞吐量天花板低于有缓存场景 | 间接反映在 SLA 吞吐量指标 |
| C-03 同步 DB | ✅ capacity 测试中 event loop lag 升高 → 瓶颈决策树 CPU-bound 分支 | SM-03 事件循环延迟 |
| C-04 人工延迟 | ✅ POST `/api/orders` 的 p95 始终 ≥ 50ms，明显高于 GET 路径 | 需求已记录 (implementation-plan-phase2) |
| C-05 写锁串行 | ✅ Cluster 模式下高并发写 → disk write bytes/s 升高 → I/O-bound 分支 | SM-06 + SM-11 |

> **C-01 (无索引) 是当前唯一无法被测试暴露的约束**，因为数据量刻意保持在极小规模。如需演示索引影响，可在未来 Phase 中增加大数据量场景 (10 万+ 商品)。

## 6. 基础设施

### Docker Compose 服务

| 服务     | 镜像                   | 端口 | 用途                         |
| -------- | ---------------------- | ---- | ---------------------------- |
| api      | 自建 (node:18-alpine)  | 3000 | 目标 API                     |
| influxdb | influxdb:1.8           | 8086 | k6 + JMeter 指标存储 (双 DB) |
| grafana  | grafana/grafana:10.2.0 | 3010 | 可视化 Dashboard (双引擎)    |

### 环境变量

| 变量             | 默认值                | 说明                      |
| ---------------- | --------------------- | ------------------------- |
| `PORT`           | 3000                  | API 端口                  |
| `ORDER_DELAY_MS` | 50                    | 订单处理模拟延迟 (ms)     |
| `BASE_URL`       | http://localhost:3000 | k6 目标地址               |
| `INFLUXDB_DB`    | k6                    | InfluxDB 数据库名 (k6 用) |

### CI Pipeline 架构

```
lint → unit-test → ┬─ k6 smoke gate      (grafana/setup-k6-action)
                   └─ jmeter smoke gate   (apt-get install + wget)
```

两个 smoke gate 并行运行，均通过才算 CI 绿灯。

---

# English Version

## 1. System Overview

The platform has 4 layers: test scripts (load generation + capacity test), Target API with Cluster mode (system under test), Observability (InfluxDB + Grafana), and System Metrics Collection.

| Engine | Type | Scripts | Report | Observability |
|--------|------|---------|--------|---------------|
| k6 | Lightweight | 4 .k6.js + capacity.k6.js | HTML reports | --out influxdb → Grafana |
| JMeter | Enterprise | 4 .jmx plans + .properties | HTML Dashboard + .jtl | Backend Listener → InfluxDB → Grafana |
| Collector | System metrics | collect-metrics.js | CSV (CPU/mem/disk/net) | — |

## 2. Data Flow

### k6 Flow

1. k6 sends HTTP requests → Target API
2. Target API processes requests → SQLite read/write
3. Target API returns responses → k6 validates (checks + thresholds)
4. k6 outputs metrics → InfluxDB db=k6 (`--out influxdb=...`)
5. Grafana queries InfluxDB → renders k6 dashboard
6. CI pipeline reads k6 exit code → pass/fail decision

### JMeter Flow

1. JMeter sends HTTP requests → Target API (CLI non-GUI: `jmeter -n -t ...`)
2. Target API processes requests → SQLite read/write
3. Target API returns responses → JMeter validates (ResponseAssertion for status codes)
   4a. JMeter writes results → .jtl file → HTML Dashboard Report (`-e -o reports/`)
   4b. JMeter Backend Listener → InfluxDB db=jmeter (独立数据库，通过 init.iql 创建)
4. Grafana queries InfluxDB → renders JMeter dashboard
5. CI pipeline parses .jtl error rate → pass/fail decision

## 3. Module Responsibilities

### Target API (`src/`)

| Module    | File                    | Responsibility                                      |
| --------- | ----------------------- | --------------------------------------------------- |
| Entry     | `app.js`                | Express app assembly (no listen, testable)          |
| Cluster   | `cluster.js`            | Master + N Workers, multi-core parallel (Phase 2)   |
| Startup   | `server.js`             | Listen on port, single Worker entry                 |
| Health    | `routes/health.js`      | `/health`, `/ready`, `/metrics` (with system metrics) |
| Products  | `routes/products.js`    | CRUD `/api/products` (pagination, query, create)    |
| Orders    | `routes/orders.js`      | `/api/orders` (stock validation + delay simulation) |
| Metrics   | `middleware/metrics.js` | Request count, avg duration + CPU/memory/event loop |
| Database  | `db/database.js`        | SQLite (Phase 1 in-memory, Phase 2 file+WAL)       |
| Utilities | `utils/delay.js`        | Configurable delay simulation                       |

### k6 Tests (`tests/performance/`)

| Script         | Purpose                                     | VUs       | Duration |
| -------------- | ------------------------------------------- | --------- | -------- |
| `smoke.k6.js`  | Sanity check: verify API availability       | 5         | 60s      |
| `load.k6.js`   | Load test: performance under normal traffic | 20→50→0   | 5m       |
| `stress.k6.js` | Stress test: find system limits             | 50→200→0  | 3.5m     |
| `spike.k6.js`    | Spike test: sudden burst recovery           | 5→100→5→0   | 1.5m     |
| `capacity.k6.js` | Capacity test: binary search max concurrency | 10→200 step | 5.5m     |

### JMeter Tests (`tests/jmeter/`)

| Test Plan             | Purpose                                     | Threads | Duration | Report      |
| --------------------- | ------------------------------------------- | ------- | -------- | ----------- |
| `smoke.jmx`           | Sanity check: verify API availability       | 5       | 60s      | .jtl + HTML |
| `load.jmx`            | Load test: performance under normal traffic | 50      | 5m       | .jtl + HTML |
| `stress.jmx`          | Stress test: find system limits             | 200     | 3.5m     | .jtl + HTML |
| `spike.jmx`           | Spike test: sudden burst recovery           | 100     | 1.5m     | .jtl + HTML |
| `config/*.properties` | Externalized parameters                     | —       | —        | —           |

## 4. API Interface Definitions

### Health Endpoints

| Endpoint   | Method | Response                                |
| ---------- | ------ | --------------------------------------- |
| `/health`  | GET    | `{"status": "ok", "timestamp": "..."}`  |
| `/ready`   | GET    | `{"ready": true}`                       |
| `/metrics` | GET    | `{"requestCount": N, "avgDuration": N, "cpu": {...}, "memory": {...}, "eventLoop": {...}}` |

### Products API

| Endpoint            | Method | Params                       | Response                                    |
| ------------------- | ------ | ---------------------------- | ------------------------------------------- |
| `/api/products`     | GET    | `?page=1&limit=10`           | `{"data": [...], "page", "limit", "total"}` |
| `/api/products/:id` | GET    | path: id                     | Product object or `404`                     |
| `/api/products`     | POST   | body: `{name, price, stock}` | `201` + created product                     |

### Orders API

| Endpoint      | Method | Params                         | Response                                    |
| ------------- | ------ | ------------------------------ | ------------------------------------------- |
| `/api/orders` | GET    | `?page=1&limit=10`             | `{"data": [...], "page", "limit", "total"}` |
| `/api/orders` | POST   | body: `{product_id, quantity}` | `201` + created order                       |

Error codes: `400` (missing fields), `404` (product not found), `409` (insufficient stock)

## 5. Intentional Design Constraints (SUT)

The target API deliberately retains performance bottleneck points so that tests produce meaningful data.

| # | Constraint | Location | Why Kept | Production Alternative |
|---|-----------|----------|----------|----------------------|
| C-01 | No DB indexes | `db/database.js` — orders table has PK only | 5 products + DB rebuild per round → full scan ≈ indexed; serves as "pre-optimization baseline" | Add indexes per query pattern |
| C-02 | No cache layer | Global — no Redis, no HTTP Cache-Control | Every request hits DB; measures worst-case baseline | Redis / Memcached / CDN |
| C-03 | Synchronous DB driver | `better-sqlite3` blocks event loop | Makes event loop lag observable (SM-03) for bottleneck decision tree | Async driver (pg, mysql2) |
| C-04 | Artificial delay | `orders.js` — `simulateDelay(50ms)` | Simulates real business processing (payment, risk check) | Actual business logic latency |
| C-05 | SQLite write lock | WAL: concurrent reads OK, writes serialize | Cluster Workers competing for write lock = the I/O bottleneck Phase 2 measures | PostgreSQL / MySQL (row-level locks) |

### Test Exposure

| Constraint | Exposed by Tests? | Requirement Trace |
|-----------|-------------------|------------------|
| C-01 No indexes | ⚠️ Hard to expose — data too small, DB rebuilt each round | None |
| C-02 No cache | ✅ Throughput ceiling visible in stress/capacity | SLA throughput metric |
| C-03 Sync DB | ✅ Event loop lag rises in capacity test | SM-03 |
| C-04 Delay | ✅ POST p95 ≥ 50ms, visibly higher than GET | Documented in impl plan |
| C-05 Write lock | ✅ High concurrent writes → disk I/O spike | SM-06 + SM-11 |

## 6. Infrastructure

### Docker Compose Services

| Service  | Image                   | Port | Purpose                                |
| -------- | ----------------------- | ---- | -------------------------------------- |
| api      | Custom (node:18-alpine) | 3000 | Target API                             |
| influxdb | influxdb:1.8            | 8086 | k6 + JMeter metrics storage (dual DB)  |
| grafana  | grafana/grafana:10.2.0  | 3010 | Visualization dashboards (dual engine) |

### Environment Variables

| Variable         | Default               | Description                 |
| ---------------- | --------------------- | --------------------------- |
| `PORT`           | 3000                  | API port                    |
| `ORDER_DELAY_MS` | 50                    | Order processing delay (ms) |
| `BASE_URL`       | http://localhost:3000 | k6 target URL               |

### CI Pipeline Architecture

```
lint → unit-test → ┬─ k6 smoke gate      (grafana/setup-k6-action)
                   └─ jmeter smoke gate   (apt-get install + wget)
```

Both smoke gates run in parallel; CI passes only when both succeed.
