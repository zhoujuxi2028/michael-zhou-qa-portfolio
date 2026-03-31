# 性能测试平台 (Performance Testing Platform)

**分类: 性能测试 (Performance Testing)**

k6 + JMeter 双引擎性能测试平台：smoke / load / stress / spike 四种模式 + 系统指标采集 + 容量测试，Express 目标 API，JMeter HTML / k6 HTML 报告，Grafana + InfluxDB 可观测。

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

| 操作 | API | 流量权重 | 特征 |
|------|-----|---------|------|
| 浏览商品列表 | `GET /api/products` | 60% | 读操作，高频 |
| 查看商品详情 | `GET /api/products/:id` | 30% | 读操作，高频 |
| 下单购买 | `POST /api/orders` | 10% | 写操作，库存扣减 + 订单创建 |

> `/health` 是运维心跳，不在性能测试范围。

## 测试概览

| 类型 | 数量 | 工具 |
|------|------|------|
| 单元测试 | 20 | Jest + Supertest |
| k6 性能测试 | 4 脚本 | k6 (smoke, load, stress, spike) → HTML 报告 |
| JMeter 性能测试 | 4 测试计划 | JMeter (.jmx + .properties) → HTML 报告 |
| 系统指标采集 | 1 采集器 | Node.js (CPU/mem/disk/net → CSV) |
| 容量测试 | 二分法逼近 | k6 阶梯递增 + 系统指标 → 瓶颈定位 |

## 运行环境要求

### 必备软件

| 软件 | 最低版本 | 验证命令 | 安装方式 |
|------|----------|----------|----------|
| Node.js | 18+ | `node -v` | nodejs.org |
| npm | 9+ | `npm -v` | 随 Node.js |
| k6 | 0.49+ | `k6 version` | `brew install k6` (macOS) |
| JMeter | 5.6+ | `jmeter --version` | `brew install jmeter` (macOS, 可选) |
| Docker | 20+ | `docker -v` | docker.com (Grafana 可视化需要) |
| Docker Compose | v2+ | `docker compose version` | 随 Docker Desktop (Grafana 可视化需要) |

### 本机环境基线

| 项目 | 规格 |
|------|------|
| 硬件 | MacBook Pro (Intel) |
| CPU | Intel Core i5-1038NG7 @ 2.00GHz, 4 核 8 线程 |
| 内存 | 16 GB |
| 磁盘 | SSD |
| OS | macOS 26.3.1 (x86_64) |
| Runtime | Node.js v25.8.1 |

### 端口占用

| 端口 | 服务 | 使用场景 |
|------|------|----------|
| 3000 | Express 目标 API | `npm start` 或 `docker compose up` |
| 3010 | Grafana 面板 | `docker compose up` |
| 8086 | InfluxDB | `docker compose up` |

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

## 配置说明

### 环境变量

| 变量 | 默认值 | 说明 | 使用位置 |
|------|--------|------|----------|
| `PORT` | `3000` | 目标 API 监听端口 | `src/server.js` |
| `ORDER_DELAY_MS` | `50` | 订单接口模拟延迟 (ms) | `docker-compose.yml` |
| `BASE_URL` | `http://localhost:3000` | k6 脚本目标地址 | `tests/performance/helpers/utils.js` |

### k6 测试配置

| 模式 | VUs | 持续时间 | 阈值 |
|------|-----|----------|------|
| Smoke | 5 | 60s | p95 < 500ms, 错误率 < 1% |
| Load | 渐进 20→50 | 5m | p95 < 2000ms, 错误率 < 1% |
| Stress | 阶梯至 200 | 3.5m | p95 < 3000ms, 错误率 < 5% |
| Spike | 5→100 突增 | 1.5m | p95 < 2000ms, 错误率 < 10% |

### JMeter 测试配置

| 模式 | Threads | 持续时间 | 配置文件 |
|------|---------|----------|----------|
| Smoke | 5 | 60s | `config/smoke.properties` |
| Load | 20→50 (2 阶) | 4m | `config/load.properties` |
| Stress | 50→200 (4 阶) | 3.5m | `config/stress.properties` |
| Spike | 5→100 突增 | 2m | `config/spike.properties` |

### npm 脚本

| 命令 | 说明 |
|------|------|
| `npm start` | 启动目标 API |
| `npm test` | 运行 Jest 单元测试 (20 tests) |
| `npm run test:coverage` | 单元测试 + 覆盖率 |
| `npm run k6:smoke` | k6 smoke 测试 → HTML 报告 |
| `npm run k6:load` | k6 load 测试 → HTML 报告 |
| `npm run k6:stress` | k6 stress 测试 → HTML 报告 |
| `npm run k6:spike` | k6 spike 测试 → HTML 报告 |
| `npm run k6:smoke:influx` | smoke 测试 → InfluxDB |
| `npm run k6:load:influx` | load 测试 → InfluxDB |
| `npm run jmeter:smoke` | JMeter smoke → .jtl + HTML 报告 |
| `npm run jmeter:load` | JMeter load 测试 |
| `npm run jmeter:stress` | JMeter stress 测试 |
| `npm run jmeter:spike` | JMeter spike 测试 |
| `npm run lint` | ESLint 检查 |
| `npm run format:check` | Prettier 格式检查 |
| `npm run docker:up` | 启动所有 Docker 服务 |
| `npm run docker:down` | 停止所有 Docker 服务 |

### 依赖说明

| 类型 | 包 | 版本 | 用途 |
|------|-----|------|------|
| 运行时 | `express` | ^4.18.2 | Web 框架 |
| 运行时 | `better-sqlite3` | ^11.0.0 | 内存 SQLite 数据库 |
| 开发 | `jest` | ^29.7.0 | 单元测试 |
| 开发 | `supertest` | ^6.3.3 | HTTP 断言 |
| 开发 | `eslint` | ^8.56.0 | 代码检查 |
| 开发 | `prettier` | ^3.2.0 | 代码格式化 |
| 外部 | `k6` | 系统安装 | 性能测试引擎 (`brew install k6`) |
| 外部 | `jmeter` | 系统安装 | 企业级性能测试 (`brew install jmeter`) |

## 文档

| 文档 | 路径 |
|------|------|
| 架构设计 | [docs/architecture/](docs/architecture/) |
| 测试用例 | [docs/test-cases/](docs/test-cases/) |
| RTM 追溯矩阵 | [docs/test-cases/rtm-jmeter.md](docs/test-cases/rtm-jmeter.md) |
| 项目管理 | [docs/project-management/](docs/project-management/) |
| 需求文档 | [docs/project-management/requirements.md](docs/project-management/requirements.md) |
| 性能测试参数指南 | [docs/guides/performance-testing-parameters.md](docs/guides/performance-testing-parameters.md) |

属于 [Michael Zhou's QA Portfolio](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio)。
