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
│              Router Layer (12 Endpoints)                 │
├──────────────────┬──────────────────┬──────────────────┤
│  Health Routes   │  Auth Routes     │  Product Routes  │
│  ├─ /health      │  ├─ /api/auth/register │ ├─ GET /api/products     │
│  ├─ /ready       │  ├─ /api/auth/login    │ ├─ GET /api/products/:id │
│  └─ /metrics     │  ├─ /api/auth/refresh  │ └─ POST /api/products    │
│                  │  └─ /api/auth/logout   │
│                  │                         │   Order Routes
│                  │                         │   ├─ GET /api/orders     │
│                  │                         │   └─ POST /api/orders    │
└──────────────────┴──────────────────┴──────────────────┘
           ↓
┌─────────────────────────────────────────────────────────┐
│         SQLite Database (File Mode + WAL)                │
│         data/perf.db (4 tables)                          │
└─────────────────────────────────────────────────────────┘
```

## 2. 模式支持

### 默认模式：Cluster
```
npm start → scripts/server.sh start cluster → src/cluster.js
```

### 单进程模式：调试 / 集成测试
```
npm run start:single → scripts/server.sh start single → src/server.js
```

### Cluster 运行模式
```
npm start (default)
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
| 3 | rateLimiter | 限流（始终挂载，仅 `RATE_LIMIT_ENABLED=true` 时生效） |
| 4 | metricsMiddleware | 采集请求计数、延迟、CPU、内存、eventLoopLag |
| 5 | 路由 | 业务逻辑处理 |

**认证中间件**（可选）：`POST /api/orders` 在 `AUTH_ENABLED=true` 时使用。

## 4. 性能指标采集

### 进程级指标（实时，/metrics 端点）
- CPU: userPercent/systemPercent/loadavg
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
