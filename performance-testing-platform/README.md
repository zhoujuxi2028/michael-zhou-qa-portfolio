# 性能测试平台 (Performance Testing Platform)

**分类: 性能测试 (Performance Testing)**

k6 + JMeter 双引擎性能测试平台：smoke / load / stress / spike 四种模式 + 系统指标采集 + 容量测试 + JWT 认证压测，Express 目标 API，JMeter HTML / k6 HTML 报告，Grafana + InfluxDB 可观测。

## 目录

- [架构](#架构)
- [测试对象](#测试对象)
- [测试概览](#测试概览)
- [运行环境要求](#运行环境要求)
- [快速开始](#快速开始)
- [配置说明](#配置说明)
- [文档](#文档)

---

## 架构

```
                        Cluster Master (port 3000)
                            ├─ Worker 1 ─┐
k6 (多核) ─────────────────→├─ Worker 2 ─┤
JMeter (多线程) ───────────→├─ Worker 3 ─┼─→ SQLite (WAL, 文件模式)
                            └─ Worker 4 ─┘
                                 │
                            GET /metrics (CPU/mem/event loop)
                                 │
    k6 HTML 报告           系统采集器 (CPU/mem/disk/net → CSV)
    JMeter HTML 报告             │
         │                reports/system-*.csv
         └──→ InfluxDB ──→ Grafana Dashboard
```

> **Cluster 模式:** 服务端自动 fork N 个 Worker (N = CPU 核数)，充分利用多核。
> k6 (Go) 和 JMeter (Java) 天然多核，无需额外配置。

## 测试对象

电商 API — 用户操作漏斗模型：

| 操作         | API                     | 流量权重 | 特征                        |
| ------------ | ----------------------- | -------- | --------------------------- |
| 浏览商品列表 | `GET /api/products`     | 60%      | 读操作，高频                |
| 查看商品详情 | `GET /api/products/:id` | 30%      | 读操作，高频                |
| 下单购买     | `POST /api/orders`      | 10%      | 写操作，库存扣减 + 订单创建 |

> `/health` 是运维心跳，不在性能测试范围。

### 认证接口 (Phase 3)

| API                  | 方法 | 说明                                   | 认证         |
| -------------------- | ---- | -------------------------------------- | ------------ |
| `/api/auth/register` | POST | 用户注册 (bcrypt 10 rounds)            | 无           |
| `/api/auth/login`    | POST | 登录，返回 accessToken + refreshToken  | 无           |
| `/api/auth/refresh`  | POST | 刷新 accessToken (JWT only, 无 bcrypt) | 无           |
| `/api/auth/logout`   | POST | 登出，token 加入黑名单                 | Bearer Token |

> `AUTH_ENABLED=true` 时 `POST /api/orders` 需要 Bearer Token，默认关闭保持向后兼容。

## 测试概览

| 层                | 工具                  | 目的                                                               |
| ----------------- | --------------------- | ------------------------------------------------------------------ |
| 单元测试          | Jest + Supertest      | API 功能正确性 + 认证测试 + 脚本测试 + 泄漏检测 + 基础设施 helpers |
| 集成测试          | Shell + curl + Docker | 端到端链路验证 (InfluxDB/Grafana/认证/k6 helpers)                  |
| 性能测试 (轻量级) | k6                    | 延迟、吞吐、错误率、认证压测、soak 测试 → HTML 报告                |
| 性能测试 (企业级) | JMeter                | 负载测试 + 认证压测 + HTML 报告 + Grafana 可视化                   |
| 系统指标采集      | server.sh collect     | CPU / 内存 / 磁盘 I/O / 网络 I/O → CSV                             |
| 容量测试          | k6 阶梯递增           | 最大并发承载量 + 瓶颈定位                                          |

📊 **详细统计（用例数、通过率、各 Phase 分类）见：** [docs/qa/test-cases/](docs/qa/test-cases/)

### 性能测试类型覆盖

| 类型           | 目的                      | 状态             |
| -------------- | ------------------------- | ---------------- |
| Smoke Test     | 最小负载验证系统可用      | ✅ k6 + JMeter   |
| Load Test      | 预期负载下的性能验证      | ✅ k6 + JMeter   |
| Stress Test    | 超载行为观察              | ✅ k6 + JMeter   |
| Spike Test     | 突发流量应对              | ✅ k6 + JMeter   |
| Capacity Test  | 阶梯递增找系统极限        | ✅ Phase 2       |
| Auth Load Test | JWT 登录/刷新/鉴权高并发  | ✅ Phase 3 (#56) |
| Soak Test      | 长时间运行找内存泄漏      | ✅ Phase 4 (#65) |
| Infra Helpers  | env/data/profile 三层抽象 | ✅ Phase 5 (#85) |
| Breakpoint Test| 系统绝对崩溃点测试        | ✅ Phase 6 (#86) |
| Rate Limiter   | API 限流/熔断行为测试    | ✅ Phase 6 (#86) |
| Summary Report | 执行摘要 Markdown 报告    | ✅ Phase 6 (#86) |

## 容量测试结论

**MacBook Pro Intel i5-1038NG7 (4C8T, 16GB) + Cluster 模式 (8 Workers)**

### 最终结论

| 指标         | 值                                     |
| ------------ | -------------------------------------- |
| 最大安全并发 | **~6000 VUs** (p95=490ms ✅, error=0%) |
| 拐点         | **6000~6125 VUs**                      |
| 吞吐量天花板 | **~6,800 req/s**                       |
| 主要瓶颈     | **Node.js event loop (CPU-bound)**     |

### 吞吐量趋势

| VUs      | p95 延迟  | 吞吐量       | 判定                   |
| -------- | --------- | ------------ | ---------------------- |
| 3000     | 214ms     | ~4,760/s     | ✅ PASS                |
| 4000     | 338ms     | ~5,290/s     | ✅ PASS                |
| 5000     | 351ms     | ~6,490/s     | ✅ PASS (高效区间)     |
| **6000** | **490ms** | **~6,796/s** | **✅ PASS (最大安全)** |
| 6125     | 631ms     | ~6,177/s     | ❌ FAIL                |
| 6500     | 628ms     | ~6,802/s     | ❌ FAIL                |
| 7000     | 659ms     | ~6,747/s     | ❌ FAIL                |

### 测试过程摘要

二分法共 28 轮 (R01~R28)，经历三个关键转折：

1. **R01~R10 数据作废** — DB 未清理导致 orders 跨轮累积 (24MB)，WAL checkpoint 阻塞引发 `SQLITE_BUSY`，错误率虚高，结论不可信。
2. **瓶颈假设排除 (R20 对照组)** — 6000 VUs 纯读 (0% POST)，p95=692ms 与混合流量相近，排除 SQLite 写锁为瓶颈；CPU 持续满载 (99.9~100%)，event loop lag 随 VUs 线性增长，确认为 CPU-bound。
3. **二分法收敛 (R22~R28)** — 5000 VUs 稳定 PASS (3轮复现)，6250/6125 均 FAIL 且结果有波动性，确认拐点为 6000~6125 VUs，系统在此区间不稳定。

### 瓶颈分析 — 为什么 event loop 是关键路径

```
                         k6 Client (Go 运行时)
                 ┌─────────────────────────────────┐
                 │  6000 VUs (Go 协程, 极轻量)       │
                 │  VU1 → GET /api/products          │
                 │  VU2 → GET /api/products/3        │
                 │  VU3 → POST /api/orders           │
                 └──────────────┬────────────────────┘
                                │ HTTP (localhost:3000)
                                ▼
                 ┌─────────────────────────────────┐
                 │    Cluster Master (port 3000)     │
                 │    Round-Robin 分发请求            │
                 └──┬───────┬───────┬───────┬──────┘
                    ▼       ▼       ▼       ▼
                Worker1  Worker2  Worker3 ... Worker8
                ┌──────┐ ┌──────┐ ┌──────┐  ┌──────┐
                │Event │ │Event │ │Event │  │Event │
                │Loop  │ │Loop  │ │Loop  │  │Loop  │
                │(单线程)│ │(单线程)│ │(单线程)│  │(单线程)│
                │      │ │      │ │      │  │      │
                │┌────┐│ │┌────┐│ │┌────┐│  │┌────┐│
                ││排队││ ││排队││ ││排队││  ││排队││
                ││ .. ││ ││ .. ││ ││ .. ││  ││ .. ││
                │└────┘│ │└────┘│ │└────┘│  │└────┘│
                └──┬───┘ └──┬───┘ └──┬───┘  └──┬───┘
                   └────────┴───┬────┴─────────┘
                                ▼
                 ┌─────────────────────────────────┐
                 │   SQLite (data/perf.db + WAL)    │
                 │   读: 并发 OK | 写: 串行 (<1ms)   │
                 └─────────────────────────────────┘
```

**每个 Worker 的 event loop 是单线程串行处理。** 8 Workers = 8 条"单车道"，但总 CPU 只有 4C8T。CPU 跑满后队列积压 → lag 线性增长 → 响应变慢。

| 资源        | 状态           | 是否瓶颈 | 证据                                                 |
| ----------- | -------------- | -------- | ---------------------------------------------------- |
| CPU         | 99.9~100% 满载 | **是**   | event loop lag: 197ms@3000 → 324ms@6000 → 433ms@6125 |
| 内存        | avg 61%        | 否       | ~6GB 可用                                            |
| 磁盘 I/O    | avg 9 MB/s     | 否       | SSD 上限 ~2,200 MB/s，仅占 0.4%                      |
| SQLite 写锁 | 0% error       | 否       | R20 纯读对照组 p95=692ms ≈ 混合流量                  |

> 如需超过 5000 并发，需水平扩展至多节点 + 替换 SQLite 为 PostgreSQL/MySQL。
>
> 完整逐轮数据见 [docs/qa/rtm.md](docs/qa/rtm.md)

## 运行环境要求

### 必备软件

| 软件           | 最低版本 | 验证命令                 | 安装方式                               |
| -------------- | -------- | ------------------------ | -------------------------------------- |
| Node.js        | 18+      | `node -v`                | nodejs.org                             |
| npm            | 9+       | `npm -v`                 | 随 Node.js                             |
| k6             | 0.49+    | `k6 version`             | `brew install k6` (macOS)              |
| JMeter         | 5.6+     | `jmeter --version`       | `brew install jmeter` (macOS, 可选)    |
| Docker         | 20+      | `docker -v`              | docker.com (Grafana 可视化需要)        |
| Docker Compose | v2+      | `docker compose version` | 随 Docker Desktop (Grafana 可视化需要) |

### 本机环境基线

| 项目    | 规格                                         |
| ------- | -------------------------------------------- |
| 硬件    | MacBook Pro (Intel)                          |
| CPU     | Intel Core i5-1038NG7 @ 2.00GHz, 4 核 8 线程 |
| 内存    | 16 GB                                        |
| 磁盘    | SSD                                          |
| OS      | macOS 26.3.1 (x86_64)                        |
| Runtime | Node.js v25.8.1                              |

### 硬件要求

**最小配置（运行 smoke/load/stress/soak 测试）**

| 资源 | 最小要求 | 说明 |
|------|---------|------|
| CPU | ≥ 4 核 | k6/JMeter 多核支持；单核将导致吞吐量严重受限 |
| 内存 | ≥ 8 GB | Node.js (1GB) + k6 (2GB) + JMeter (2GB) + Docker (2GB) + 系统预留 (1GB) |
| 磁盘 | ≥ 10 GB | SQLite WAL 模式 (~100MB/h)；Grafana 容器 (~2GB)；报告文件 |
| 磁盘类型 | SSD 推荐 | HDD 会显著延长测试执行时间 |

**容量测试与 Breakpoint 测试**

⚠️ **Breakpoint 阶梯递增测试（VU ≥ 50）需要充足硬件资源，仅在 ≥ 4核 8GB 机器上运行。** 硬件不足会导致：
- 测试执行时间 > 24 小时（不可用）
- 结果波动性大（容易误判）
- 瓶颈分析不准确

参考数据（MacBook Pro i5-1038NG7, 4C8T, 16GB）：
- Smoke Test (5 VUs, 60s): ~1 min
- Load Test (20→50 VUs, 5m): ~5 min
- Capacity Test (阶梯递增至极限): ~4-8 hours
- Breakpoint Test (VU ≥ 50, 二分法): ~4-8 hours

### 端口占用

| 端口 | 服务             | 使用场景                           |
| ---- | ---------------- | ---------------------------------- |
| 3000 | Express 目标 API | `npm start` 或 `docker compose up` |
| 3010 | Grafana 面板     | `docker compose up`                |
| 8086 | InfluxDB         | `docker compose up`                |

### 一键验证

```bash
node -v && npm -v && k6 version && docker -v && docker compose version
```

## 快速开始

```bash
cd performance-testing-platform
brew install k6              # 首次需安装
npm install
npm start &                  # 启动目标 API
npm run k6:smoke             # 运行 smoke test → reports/k6-smoke.html
```

### Grafana 可视化

```bash
docker compose up -d         # API + Grafana + InfluxDB
npm run k6:load:influx       # 运行 load test，输出到 InfluxDB
# 打开 http://localhost:3010  → k6 Results dashboard
```

## 项目结构

```
performance-testing-platform/
├── src/                     # 目标 API (Express + SQLite)
│   ├── routes/              # products, orders, health, auth
│   ├── middleware/           # metrics tracking, JWT authenticate
│   ├── db/                  # SQLite in-memory
│   └── utils/               # delay, env-loader, csv-loader, profile-parser
├── scripts/                 # server.sh (服务管理 + 指标采集) + integration-test.sh
├── env/                     # 多环境配置 (local/staging/production)
├── profiles/                # k6 负载 profile (smoke/load/stress/spike/peak)
├── tests/
│   ├── unit/                # Jest 单元测试 (148 tests)
│   ├── performance/         # k6 脚本 (smoke, load, stress, spike, auth, soak)
│   └── jmeter/              # JMeter 测试计划 + config/*.properties
├── grafana/                 # Dashboard (soak-results + provisioning) + alert rules
├── docker-compose.yml       # API + Grafana + InfluxDB
└── docs/                    # 标准文档结构
```

## 配置说明

### 环境变量

| 变量                  | 默认值                  | 说明                                | 使用位置                           |
| --------------------- | ----------------------- | ----------------------------------- | ---------------------------------- |
| `PORT`                | `3000`                  | 目标 API 监听端口                   | `src/server.js`                    |
| `ORDER_DELAY_MS`      | `50`                    | 订单接口模拟延迟 (ms)               | `docker-compose.yml`               |
| `BASE_URL`            | `http://localhost:3000` | k6 脚本目标地址                     | `tests/performance/helpers/env.js` |
| `ENV`                 | `local`                 | 环境切换 (local/staging/production) | `tests/performance/helpers/env.js` |
| `AUTH_ENABLED`        | `false`                 | 启用订单接口认证保护                | `src/routes/orders.js`             |
| `JWT_SECRET`          | `perf-test-secret-key`  | JWT 签名密钥                        | `src/routes/auth.js`               |
| `JWT_ACCESS_EXPIRES`  | `15m`                   | Access Token 有效期                 | `src/routes/auth.js`               |
| `JWT_REFRESH_EXPIRES` | `7d`                    | Refresh Token 有效期                | `src/routes/auth.js`               |

### k6 测试配置

| 模式         | VUs                | 持续时间 | 阈值                       |
| ------------ | ------------------ | -------- | -------------------------- |
| Smoke        | 5                  | 60s      | p95 < 500ms, 错误率 < 1%   |
| Load         | 渐进 20→50         | 5m       | p95 < 2000ms, 错误率 < 1%  |
| Stress       | 阶梯至 200         | 3.5m     | p95 < 3000ms, 错误率 < 5%  |
| Spike        | 5→100 突增         | 1.5m     | p95 < 2000ms, 错误率 < 10% |
| Auth Login   | 100 VUs 高并发登录 | 3m       | p95 < 2000ms, 错误率 < 1%  |
| Auth Refresh | 200 VUs Token 刷新 | 3m       | p95 < 200ms, 错误率 < 1%   |
| Auth Journey | 500 VUs 完整旅程   | 4m       | p95 < 500ms, 错误率 < 1%   |
| Soak Short   | 100 VUs 短时稳定性 | 10m      | p95 < 500ms, 错误率 < 1%   |
| Soak Default | 200 VUs 默认稳定性 | 1h       | p95 < 500ms, 错误率 < 1%   |
| Soak Full    | 500 VUs 完整稳定性 | 4h       | p95 < 500ms, 错误率 < 1%   |

### JMeter 测试配置

| 模式      | Threads             | 持续时间 | 配置文件                      |
| --------- | ------------------- | -------- | ----------------------------- |
| Smoke     | 5                   | 60s      | `config/smoke.properties`     |
| Load      | 20→50 (2 阶)        | 4m       | `config/load.properties`      |
| Stress    | 50→200 (4 阶)       | 3.5m     | `config/stress.properties`    |
| Spike     | 5→100 突增          | 2m       | `config/spike.properties`     |
| Auth Load | 50 threads 认证压测 | 3m       | `config/auth-load.properties` |

### npm 脚本

| 命令                       | 说明                                              |
| -------------------------- | ------------------------------------------------- |
| `npm start`                | 启动目标 API — Cluster 模式 (自动检测端口)        |
| `npm run start:single`     | 启动目标 API — 单进程模式                         |
| `npm stop`                 | 停止目标 API                                      |
| `npm restart`              | 重启目标 API — Cluster 模式                       |
| `npm run restart:single`   | 重启目标 API — 单进程模式                         |
| `npm test`                 | 运行 Jest 单元测试 (148 tests)                     |
| `npm run setup`            | 安装 + lint + 测试 (一键初始化)                   |
| `npm run clean`            | 清理 reports/results/coverage/db                  |
| `npm run health`           | preflight + 测试 (健康检查)                       |
| `npm run dev`              | Jest watch 模式                                   |
| `npm run test:coverage`    | 单元测试 + 覆盖率                                 |
| `npm run k6:smoke`         | k6 smoke 测试 → HTML 报告                         |
| `npm run k6:load`          | k6 load 测试 → HTML 报告                          |
| `npm run k6:stress`        | k6 stress 测试 → HTML 报告                        |
| `npm run k6:spike`         | k6 spike 测试 → HTML 报告                         |
| `npm run k6:smoke:influx`  | smoke 测试 → InfluxDB                             |
| `npm run k6:load:influx`   | load 测试 → InfluxDB                              |
| `npm run jmeter:smoke`     | JMeter smoke → .jtl + HTML 报告                   |
| `npm run jmeter:load`      | JMeter load 测试                                  |
| `npm run jmeter:stress`    | JMeter stress 测试                                |
| `npm run jmeter:spike`     | JMeter spike 测试                                 |
| `npm run k6:auth-login`    | k6 高并发登录压测 (100 VUs)                       |
| `npm run k6:auth-refresh`  | k6 Token 刷新压测 (200 VUs)                       |
| `npm run k6:auth-journey`  | k6 完整认证旅程 (500 VUs, 需 `AUTH_ENABLED=true`) |
| `npm run jmeter:auth-load` | JMeter 认证压测 (需 `AUTH_ENABLED=true`)          |
| `npm run k6:soak:short`    | k6 soak 短时测试 (10m, 100 VUs)                   |
| `npm run k6:soak`          | k6 soak 默认 (1h, 200 VUs)                        |
| `npm run k6:soak:full`     | k6 soak 完整 (4h, 500 VUs)                        |
| `npm run k6:soak:influx`   | k6 soak → InfluxDB + Grafana                      |
| `npm run capacity:test`    | 容量测试 (采集器 + k6 + 报告归档)                 |
| `npm run lint`             | ESLint 检查                                       |
| `npm run format:check`     | Prettier 格式检查                                 |
| `npm run docker:up`        | 启动所有 Docker 服务                              |
| `npm run docker:down`      | 停止所有 Docker 服务                              |

### 依赖说明

| 类型   | 包               | 版本     | 用途                                   |
| ------ | ---------------- | -------- | -------------------------------------- |
| 运行时 | `express`        | ^4.18.2  | Web 框架                               |
| 运行时 | `better-sqlite3` | ^11.0.0  | 内存 SQLite 数据库                     |
| 运行时 | `bcryptjs`       | ^3.0.3   | 密码哈希 (10 rounds)                   |
| 运行时 | `jsonwebtoken`   | ^9.0.3   | JWT 签发与验证                         |
| 开发   | `jest`           | ^29.7.0  | 单元测试                               |
| 开发   | `supertest`      | ^6.3.3   | HTTP 断言                              |
| 开发   | `eslint`         | ^8.56.0  | 代码检查                               |
| 开发   | `prettier`       | ^3.2.0   | 代码格式化                             |
| 外部   | `k6`             | 系统安装 | 性能测试引擎 (`brew install k6`)       |
| 外部   | `jmeter`         | 系统安装 | 企业级性能测试 (`brew install jmeter`) |

## 文档

| 文档             | 路径                                                                                           |
| ---------------- | ---------------------------------------------------------------------------------------------- |
| 架构设计         | [docs/architecture/](docs/architecture/)                                                       |
| 测试计划         | [docs/qa/test-plan.md](docs/qa/test-plan.md)                                                   |
| 质量保障 (QA)    | [docs/qa/](docs/qa/)                                                                           |
| RTM 追溯矩阵     | [docs/qa/rtm.md](docs/qa/rtm.md)                                                               |
| 项目管理         | [docs/project-management/](docs/project-management/)                                           |
| 需求文档         | [docs/project-management/requirements.md](docs/project-management/requirements.md)             |
| 性能测试参数指南 | [docs/guides/performance-testing-parameters.md](docs/guides/performance-testing-parameters.md) |

## Known Limitations

| 项目                        | 说明                                                                                                                                                                          | 影响                                                                                                 |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 无数据库索引测试            | 被测 API 的 orders 表仅有主键索引，无 `product_id` 索引，但因数据量极小 (5 条商品) 且每轮测试重建 DB，全表扫描与索引查询性能差异不可测                                        | 无法演示"缺少索引导致性能退化"的场景；如需覆盖，需引入 10 万+ 数据量                                 |
| SQLite 写锁争用 (DB 膨胀时) | Cluster 模式 (8 Workers) 共享同一 SQLite 文件，DB 累积膨胀后 WAL checkpoint 阻塞导致 `SQLITE_BUSY` 级联失败。**清洁环境 4000 VUs 写入 0% 失败**                               | 属架构 §5 C-01 设计约束；**每轮压测前必须清理 DB** 避免误判                                          |
| DB 数据累积影响性能         | 压测 orders 持续累积到 `data/perf.db`，DB 膨胀严重影响后续测试结果 (实测 24MB DB 导致 3000 VUs p95=969ms 远差于清洁环境 4000 VUs p95=360ms)                                   | **每轮压测前必须清理数据库**: `npm run restart:clean` 或 `npm stop && rm data/perf.db* && npm start` |
| JMeter 不适合高并发容量测试 | JMeter 每个线程占 ~1MB JVM 堆栈，4000 threads ≈ 4GB+ heap；本机 16GB RAM 下 JMeter 自身成为瓶颈，无法准确测量被测系统极限。k6 使用 Go 协程，单进程可跑数千 VUs 且资源占用极低 | 容量测试 (binary search 找拐点) 使用 k6；JMeter 仅用于 smoke/load/stress/spike 四种标准测试          |

> 被测对象的完整设计约束说明见 [架构文档 §5](docs/architecture/architecture.md#5-被测对象设计约束intentional-design-constraints)。

属于 [Michael Zhou's QA Portfolio](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio)。


## tips
先级 │ 提问方式                                                     │ 获取内容                    │ 时间投入   │
├────────┼──────────────────────────────────────────────────────────────┼─────────────────────────────┼────────────┤
│ 🥇     │ "给我看 performance-testing 设计阶段的所有关键文档"          │ 快速浏览设计质量 + 关键路径 │ 5 分钟内   │
├────────┼──────────────────────────────────────────────────────────────┼─────────────────────────────┼────────────┤
│ 🥈     │ "分析 Phase 2 设计输出件，指出质量问题和改进空间"            │ 深度审查 + 建议             │ 10-15 分钟 │
├────────┼──────────────────────────────────────────────────────────────┼─────────────────────────────┼────────────┤
│ 🥉     │ "performance-testing 设计阶段完成了什么？是否有遗漏或缺陷？" │ 状态总结 + 风险识别         │ 详细     