# 架构设计文档 (Architecture Design)

## 目录

- [1. 系统概述](#1-系统概述)
- [2. 数据流](#2-数据流)
- [3. 模块职责](#3-模块职责)
- [4. 接口定义](#4-接口定义)
- [5. 基础设施](#5-基础设施)
- [English Version](#english-version)

---

## 1. 系统概述

性能测试平台由 3 层组成：

```
┌─────────────────────────────────────────────────┐
│                   k6 测试层                      │
│  smoke.k6.js  load.k6.js  stress.k6.js  spike  │
└──────────┬──────────────────────┬────────────────┘
           │ HTTP 请求             │ metrics 输出
           ▼                      ▼
┌─────────────────────┐  ┌─────────────────────────┐
│   目标 API 层        │  │     可观测层              │
│  Express + SQLite    │  │  InfluxDB + Grafana      │
│  :3000               │  │  :8086      :3001        │
└─────────────────────┘  └─────────────────────────┘
```

| 层 | 组件 | 职责 |
|----|------|------|
| 测试层 | k6 脚本 (4 种模式) | 生成负载、验证阈值 |
| API 层 | Express + SQLite | 被测系统 (SUT) |
| 可观测层 | InfluxDB + Grafana | 存储指标、可视化 |

## 2. 数据流

```
1. k6 脚本发送 HTTP 请求 → 目标 API
2. 目标 API 处理请求 → SQLite 读写
3. 目标 API 返回响应 → k6 校验 (checks + thresholds)
4. k6 输出指标 → InfluxDB (--out influxdb=...)
5. Grafana 查询 InfluxDB → 渲染 Dashboard
6. CI pipeline 读取 k6 退出码 → 决定通过/失败
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

| 模块   | 文件                      | 职责                              |
| ---- | ----------------------- | ------------------------------- |
| 入口   | `app.js`                | Express 应用组装 (无 listen，可测试)     |
| 启动   | `server.js`             | 监听端口，生产入口                       |
| 健康检查 | `routes/health.js`      | `/health`, `/ready`, `/metrics` |
| 商品   | `routes/products.js`    | CRUD `/api/products` (分页、查询、创建) |
| 订单   | `routes/orders.js`      | `/api/orders` (下单含库存校验 + 延迟模拟)  |
| 指标   | `middleware/metrics.js` | 请求计数、平均耗时追踪                     |
| 数据库  | `db/database.js`        | SQLite 内存库，schema 初始化 + 种子数据    |
| 工具   | `utils/delay.js`        | 可配置延迟模拟                         |

### 3.2 k6 测试 (`tests/performance/`)

| 脚本 | 目的 | VUs | 时长 |
|------|------|-----|------|
| `smoke.k6.js` | 冒烟测试：验证 API 可用性 | 2 | 30s |
| `load.k6.js` | 负载测试：正常流量下性能 | 20→50→0 | 5m |
| `stress.k6.js` | 压力测试：找到系统极限 | 50→200→0 | 3.5m |
| `spike.k6.js` | 尖峰测试：突发流量恢复能力 | 5→100→5→0 | 1.5m |
| `helpers/utils.js` | 共享工具：BASE_URL、check 封装 | — | — |

### 3.3 可观测层 (`grafana/`)

| 组件 | 配置文件 | 职责 |
|------|----------|------|
| InfluxDB 数据源 | `provisioning/datasources/influxdb.yml` | 自动配置数据库连接 |
| Dashboard 加载 | `provisioning/dashboards/dashboard.yml` | 自动加载 JSON 面板 |
| k6 结果面板 | `dashboards/k6-results.json` | VUs、延迟、错误率、通过率可视化 |

## 4. 接口定义

### 4.1 健康检查

| 端点 | 方法 | 响应 |
|------|------|------|
| `/health` | GET | `{"status": "ok", "timestamp": "..."}` |
| `/ready` | GET | `{"ready": true}` |
| `/metrics` | GET | `{"requestCount": N, "avgDuration": N}` |

### 4.2 商品 API

| 端点 | 方法 | 参数 | 响应 |
|------|------|------|------|
| `/api/products` | GET | `?page=1&limit=10` | `{"data": [...], "page": 1, "limit": 10, "total": 5}` |
| `/api/products/:id` | GET | path: id | `{"id": 1, "name": "Laptop", "price": 999.99, "stock": 100000}` |
| `/api/products` | POST | body: `{name, price, stock}` | `201` + 创建的产品对象 |

**错误响应：**
- `404` — 产品不存在
- `400` — 缺少 name 或 price

### 4.3 订单 API

| 端点 | 方法 | 参数 | 响应 |
|------|------|------|------|
| `/api/orders` | GET | `?page=1&limit=10` | `{"data": [...], "page": 1, "limit": 10, "total": N}` |
| `/api/orders` | POST | body: `{product_id, quantity}` | `201` + 创建的订单对象 |

**错误响应：**
- `400` — 缺少 product_id 或 quantity
- `404` — 产品不存在
- `409` — 库存不足

## 5. 基础设施

### Docker Compose 服务

| 服务 | 镜像 | 端口 | 用途 |
|------|------|------|------|
| api | 自建 (node:18-alpine) | 3000 | 目标 API |
| influxdb | influxdb:1.8 | 8086 | k6 指标存储 |
| grafana | grafana/grafana:10.2.0 | 3001 | 可视化 Dashboard |

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | 3000 | API 端口 |
| `ORDER_DELAY_MS` | 50 | 订单处理模拟延迟 (ms) |
| `BASE_URL` | http://localhost:3000 | k6 目标地址 |

---

# English Version

## 1. System Overview

The platform has 3 layers: k6 test scripts (load generation), Target API (system under test), and Observability (InfluxDB + Grafana).

## 2. Data Flow

1. k6 sends HTTP requests → Target API
2. Target API processes requests → SQLite read/write
3. Target API returns responses → k6 validates (checks + thresholds)
4. k6 outputs metrics → InfluxDB (`--out influxdb=...`)
5. Grafana queries InfluxDB → renders dashboard
6. CI pipeline reads k6 exit code → pass/fail decision

## 3. Module Responsibilities

### Target API (`src/`)

| Module | File | Responsibility |
|--------|------|---------------|
| Entry | `app.js` | Express app assembly (no listen, testable) |
| Startup | `server.js` | Listen on port, production entry |
| Health | `routes/health.js` | `/health`, `/ready`, `/metrics` |
| Products | `routes/products.js` | CRUD `/api/products` (pagination, query, create) |
| Orders | `routes/orders.js` | `/api/orders` (stock validation + delay simulation) |
| Metrics | `middleware/metrics.js` | Request count, average duration tracking |
| Database | `db/database.js` | SQLite in-memory, schema init + seed data |
| Utilities | `utils/delay.js` | Configurable delay simulation |

### k6 Tests (`tests/performance/`)

| Script | Purpose | VUs | Duration |
|--------|---------|-----|----------|
| `smoke.k6.js` | Sanity check: verify API availability | 2 | 30s |
| `load.k6.js` | Load test: performance under normal traffic | 20→50→0 | 5m |
| `stress.k6.js` | Stress test: find system limits | 50→200→0 | 3.5m |
| `spike.k6.js` | Spike test: sudden burst recovery | 5→100→5→0 | 1.5m |

## 4. API Interface Definitions

### Health Endpoints

| Endpoint | Method | Response |
|----------|--------|----------|
| `/health` | GET | `{"status": "ok", "timestamp": "..."}` |
| `/ready` | GET | `{"ready": true}` |
| `/metrics` | GET | `{"requestCount": N, "avgDuration": N}` |

### Products API

| Endpoint | Method | Params | Response |
|----------|--------|--------|----------|
| `/api/products` | GET | `?page=1&limit=10` | `{"data": [...], "page", "limit", "total"}` |
| `/api/products/:id` | GET | path: id | Product object or `404` |
| `/api/products` | POST | body: `{name, price, stock}` | `201` + created product |

### Orders API

| Endpoint | Method | Params | Response |
|----------|--------|--------|----------|
| `/api/orders` | GET | `?page=1&limit=10` | `{"data": [...], "page", "limit", "total"}` |
| `/api/orders` | POST | body: `{product_id, quantity}` | `201` + created order |

Error codes: `400` (missing fields), `404` (product not found), `409` (insufficient stock)

## 5. Infrastructure

### Docker Compose Services

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| api | Custom (node:18-alpine) | 3000 | Target API |
| influxdb | influxdb:1.8 | 8086 | k6 metrics storage |
| grafana | grafana/grafana:10.2.0 | 3001 | Visualization dashboard |

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | API port |
| `ORDER_DELAY_MS` | 50 | Order processing delay (ms) |
| `BASE_URL` | http://localhost:3000 | k6 target URL |
