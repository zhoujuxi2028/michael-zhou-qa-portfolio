# SUT 架构设计（简要）

## 1. 系统架构概览

```
┌─────────────────────────────────────────────────────────┐
│                    Express.js App                        │
├──────────────────┬──────────────────┬──────────────────┤
│  Helmet          │   Metrics MW     │  Rate Limiter    │
│  (Security)      │   (Observability)│  (Protection)    │
└──────────────────┴──────────────────┴──────────────────┘
           ↓
┌─────────────────────────────────────────────────────────┐
│              Router Layer (8 Endpoints)                  │
├──────────────────┬──────────────────┬──────────────────┤
│  Health Routes   │  Auth Routes     │  Product Routes  │
│  ├─ /health     │  ├─ /auth/reg    │  ├─ GET /products│
│  ├─ /ready      │  ├─ /auth/login  │  ├─ GET /products/:id
│  └─ /metrics    │  ├─ /auth/refresh│  └─ POST /products
│                 │  └─ /auth/logout │
│                 │                  │   Order Routes
│                 │                  │   ├─ GET /orders
│                 │                  │   └─ POST /orders
└──────────────────┴──────────────────┴──────────────────┘
           ↓
┌─────────────────────────────────────────────────────────┐
│         SQLite Database (File Mode + WAL)                │
│         data/perf.db (5 tables)                          │
└─────────────────────────────────────────────────────────┘
```

## 2. 模式支持

### 开发模式：单进程
```
npm start → src/server.js
```

### 生产模式：多进程 Cluster
```
npm start (Cluster) → src/cluster.js
  ├─ Master (PID: 主)
  └─ Workers (PID: N 个，N = CPU 核数)
      ├─ Worker 1 → :3000 (负载均衡)
      ├─ Worker 2
      └─ ...
```

**WAL 模式保证**：多 Worker 共享 SQLite，WAL 支持并发读，写操作短期持有锁。

## 3. 中间件栈（顺序重要）

| 顺序 | 中间件 | 作用 |
|-----|--------|------|
| 1 | helmet | 安全头 (CSP, HSTS, X-Frame-Options, ...) |
| 2 | express.json() | 解析 JSON body |
| 3 | rateLimiter | 限流 (429 Too Many Requests) |
| 4 | metricsMiddleware | 采集请求计数、延迟、CPU、内存、eventLoopLag |
| 5 | 路由 | 业务逻辑处理 |

**认证中间件** (可选)：`POST /api/orders` 在 `AUTH_ENABLED=true` 时使用。

## 4. 性能指标采集

### 进程级指标（实时，/metrics 端点）
- CPU: user/system/loadavg
- Memory: rss/heapUsed/heapTotal/external
- Event Loop Lag: setImmediate 延迟 (ms)
- Request Count & Avg Duration

### 系统级指标（后台采集，CSV 输出）
- 脚本：`bash scripts/server.sh collect <duration> <output>`
- 采集项：CPU% / 内存% / 磁盘 I/O / 网络 I/O
- 频率：每秒一条
- 输出：`reports/system-metrics-*.csv`

## 5. 数据库设计

见 `02-database-schema.md`

## 6. API 端点概览

见 `03-api-overview.md`
