# 性能测试平台 (Performance Testing Platform)

**分类: 性能测试 (Performance Testing)**

k6 + JMeter 双引擎性能测试平台：smoke / load / stress / spike 四种模式，Express 目标 API，JMeter HTML 报告，Grafana + InfluxDB 可观测。

## 目录

- [架构](#架构)
- [测试概览](#测试概览)
- [运行环境要求](#运行环境要求)
- [快速开始](#快速开始)
- [文档](#文档)

---

## 架构

```
k6 脚本    ──→ 目标 API (Express + SQLite) ←── JMeter 测试计划
    │                                              │
    └──→ InfluxDB ──→ Grafana Dashboard      .jtl + HTML 报告
```

## 测试概览

| 类型              | 数量       | 工具                            |
| ----------------- | ---------- | ------------------------------- |
| 单元测试          | 20         | Jest + Supertest                |
| k6 性能测试       | 4 脚本     | k6 (smoke, load, stress, spike) |
| JMeter 性能测试   | 4 测试计划 | JMeter (.jmx + .properties)     |

## 运行环境要求

### 必备软件

| 软件           | 最低版本   | 验证命令                 | 安装方式                               |
| -------------- | ---------- | ------------------------ | -------------------------------------- |
| Node.js        | 18+        | `node -v`                | nodejs.org                             |
| npm            | 9+         | `npm -v`                 | 随 Node.js                             |
| k6             | 最新稳定版 | `k6 version`             | `brew install k6` (macOS)              |
| JMeter         | 5.6+       | `jmeter --version`       | `brew install jmeter` (macOS, 可选)    |
| Docker         | 20+        | `docker -v`              | docker.com (Grafana 可视化需要)        |
| Docker Compose | v2+        | `docker compose version` | 随 Docker Desktop (Grafana 可视化需要) |

### 资源建议

| 测试模式                               | CPU  | 内存  | 说明                     |
| -------------------------------------- | ---- | ----- | ------------------------ |
| 单元测试 / Smoke                       | 1 核 | 512MB | 最低要求                 |
| Load (50 VUs)                          | 2 核 | 1GB   | 含 API 服务              |
| Stress / Spike (200 VUs) + Docker 全栈 | 4 核 | 4GB   | API + InfluxDB + Grafana |

### 端口占用

运行前确认以下端口未被占用：

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
npm run k6:smoke             # 运行 smoke test
```

### Grafana 可视化

```bash
docker compose up -d         # API + Grafana + InfluxDB
npm run k6:load:influx       # 运行 load test，输出到 InfluxDB
# 打开 http://localhost:3010  → k6 Results dashboard
```

## 配置说明

### 环境变量

| 变量             | 默认值                  | 说明                  | 使用位置                             |
| ---------------- | ----------------------- | --------------------- | ------------------------------------ |
| `PORT`           | `3000`                  | 目标 API 监听端口     | `src/server.js`                      |
| `ORDER_DELAY_MS` | `50`                    | 订单接口模拟延迟 (ms) | `docker-compose.yml`                 |
| `BASE_URL`       | `http://localhost:3000` | k6 脚本目标地址       | `tests/performance/helpers/utils.js` |

### 服务端口

| 服务               | 端口   | 说明                                 |
| ------------------ | ------ | ------------------------------------ |
| 目标 API (Express) | `3000` | 被测应用                             |
| Grafana            | `3010` | 可视化面板 (映射容器 3000→主机 3010) |
| InfluxDB           | `8086` | 时序数据库，存储 k6 指标             |

### Docker Compose 服务

| 服务       | 镜像                     | 说明                               |
| ---------- | ------------------------ | ---------------------------------- |
| `api`      | 本地构建 (`Dockerfile`)  | Node 18-alpine，目标 API           |
| `influxdb` | `influxdb:1.8`           | 自动创建 `k6` 数据库               |
| `grafana`  | `grafana/grafana:10.2.0` | 匿名访问已启用，自动加载 dashboard |

### k6 测试配置

| 模式   | VUs        | 持续时间 | 阈值                      |
| ------ | ---------- | -------- | ------------------------- |
| Smoke  | 5          | 60s      | p95 < 500ms, 错误率 < 1%  |
| Load   | 渐进 20→50 | 5m       | p95 < 2000ms, 错误率 < 1% |
| Stress | 阶梯至 200 | 3.5m     | p95 < 3000ms, 错误率 < 5% |
| Spike  | 5→100 突增 | 1.5m     | p95 < 2000ms, 错误率 < 10% |

### JMeter 测试配置

| 模式   | Threads      | 持续时间 | 配置文件                     |
| ------ | ------------ | -------- | ---------------------------- |
| Smoke  | 5            | 60s      | `config/smoke.properties`    |
| Load   | 20→50 (2 阶) | 4m       | `config/load.properties`     |
| Stress | 50→200 (4 阶)| 3.5m     | `config/stress.properties`   |
| Spike  | 5→100 突增   | 2m       | `config/spike.properties`    |

### npm 脚本

| 命令                      | 说明                  |
| ------------------------- | --------------------- |
| `npm start`               | 启动目标 API          |
| `npm test`                | 运行 Jest 单元测试    |
| `npm run test:coverage`   | 单元测试 + 覆盖率     |
| `npm run k6:smoke`        | k6 smoke 测试         |
| `npm run k6:load`         | k6 load 测试          |
| `npm run k6:stress`       | k6 stress 测试        |
| `npm run k6:spike`        | k6 spike 测试         |
| `npm run k6:smoke:influx` | smoke 测试 → InfluxDB |
| `npm run k6:load:influx`  | load 测试 → InfluxDB  |
| `npm run jmeter:smoke`    | JMeter smoke 测试     |
| `npm run jmeter:load`     | JMeter load 测试      |
| `npm run jmeter:stress`   | JMeter stress 测试    |
| `npm run jmeter:spike`    | JMeter spike 测试     |
| `npm run lint`            | ESLint 检查           |
| `npm run format:check`    | Prettier 格式检查     |
| `npm run docker:up`       | 启动所有 Docker 服务  |
| `npm run docker:down`     | 停止所有 Docker 服务  |

### 依赖说明

| 类型   | 包               | 版本     | 用途                             |
| ------ | ---------------- | -------- | -------------------------------- |
| 运行时 | `express`        | ^4.18.2  | Web 框架                         |
| 运行时 | `better-sqlite3` | ^11.0.0  | 内存 SQLite 数据库               |
| 开发   | `jest`           | ^29.7.0  | 单元测试                         |
| 开发   | `supertest`      | ^6.3.3   | HTTP 断言                        |
| 开发   | `eslint`         | ^8.56.0  | 代码检查                         |
| 开发   | `prettier`       | ^3.2.0   | 代码格式化                       |
| 外部   | `k6`             | 系统安装 | 性能测试引擎 (`brew install k6`)     |
| 外部   | `jmeter`         | 系统安装 | 企业级性能测试 (`brew install jmeter`) |

## 文档

| 文档           | 路径                                                                               |
| -------------- | ---------------------------------------------------------------------------------- |
| 架构设计       | [docs/architecture/](docs/architecture/)                                           |
| 测试用例       | [docs/test-cases/](docs/test-cases/)                                               |
| RTM 追溯矩阵   | [docs/test-cases/rtm-jmeter.md](docs/test-cases/rtm-jmeter.md)                    |
| 项目管理       | [docs/project-management/](docs/project-management/)                               |
| 需求文档       | [docs/project-management/requirements.md](docs/project-management/requirements.md) |
| 性能测试参数指南 | [docs/guides/performance-testing-parameters.md](docs/guides/performance-testing-parameters.md) |

属于 [Michael Zhou's QA Portfolio](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio)。
