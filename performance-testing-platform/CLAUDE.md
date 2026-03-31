# CLAUDE.md - 性能测试平台 (Performance Testing Platform)

## 项目说明

**分类: 性能测试** | k6 + JMeter 双引擎负载测试 + Express Cluster (多核) + 系统指标采集 + 容量测试 + Grafana + InfluxDB 可观测

> **Cluster 模式:** 服务端支持 Node.js Cluster，自动 fork N 个 Worker (N = CPU 核数)，充分利用多核 CPU。
> 单进程模式: `npm run start:single` | Cluster 模式: `npm start`

## 测试对象

电商 API 漏斗模型: `GET /api/products` (60%) + `GET /api/products/:id` (30%) + `POST /api/orders` (10%)

> `/health` 是运维心跳，不在性能测试范围。

## 测试层级

| 层 | 工具 | 数量 | 目的 |
|----|------|------|------|
| 单元测试 | Jest + Supertest | 20 tests | API 功能正确性 |
| 性能测试 (轻量级) | k6 | 4 脚本 | 延迟、吞吐、错误率 → HTML 报告 |
| 性能测试 (企业级) | JMeter | 4 测试计划 | 负载测试 + HTML 报告 + Grafana 可视化 |
| 系统指标采集 | Node.js 采集器 | SM-01~09 | CPU / 内存 / 磁盘 I/O / 网络 I/O → CSV |
| 容量测试 | k6 阶梯递增 | 二分法 | 最大并发承载量 + 瓶颈定位 |

## 本机环境基线

CPU: i5-1038NG7 4C8T @ 2.00GHz | 内存: 16GB | 磁盘: SSD | Node.js v25.8.1

## 前置条件

```bash
brew install k6              # macOS, k6 性能测试
brew install jmeter           # macOS, JMeter 性能测试 (可选)
```

## 快速开始

```bash
cd performance-testing-platform
npm install
npm start &                  # 启动目标 API (port 3000)
```

## 常用命令

```bash
# 单元测试
npm test                     # 全部 20 tests
npm run test:coverage        # 带覆盖率

# k6 性能测试 (→ HTML 报告)
npm run k6:smoke             # smoke test → reports/k6-smoke.html
npm run k6:load              # load test → reports/k6-load.html
npm run k6:stress            # stress test → reports/k6-stress.html
npm run k6:spike             # spike test → reports/k6-spike.html
npm run k6:smoke:influx      # smoke → InfluxDB

# JMeter 性能测试 (→ HTML 报告)
npm run jmeter:smoke         # smoke → .jtl + HTML 报告
npm run jmeter:load          # load test
npm run jmeter:stress        # stress test
npm run jmeter:spike         # spike test

# 代码质量
npm run lint                 # ESLint
npm run format:check         # Prettier

# Docker (Grafana + InfluxDB)
npm run docker:up            # 启动可观测栈
npm run docker:down          # 停止
```

## 项目结构

```
performance-testing-platform/
├── src/                     # 目标 API (Express + SQLite)
│   ├── routes/              # products, orders, health
│   ├── middleware/           # metrics tracking
│   ├── db/                  # SQLite in-memory
│   └── utils/               # delay simulation
├── scripts/                 # 工具脚本 (端口检查, 指标采集)
├── tests/
│   ├── unit/                # Jest 单元测试 (20 tests)
│   ├── performance/         # k6 脚本 (smoke, load, stress, spike)
│   └── jmeter/              # JMeter 测试计划 + config/*.properties
├── grafana/                 # Dashboard + provisioning
├── docker-compose.yml       # API + Grafana + InfluxDB
└── docs/                    # 标准文档结构
```

## CI 工作流

`performance-ci.yml` — lint → unit-test → k6 smoke gate + JMeter smoke gate (双引擎并行门禁)

触发: push/PR to `main` 或 `feature/performance-testing`

## SLA 定义

| 指标 | 阈值 | 含义 |
|------|------|------|
| p95 | < 500ms | 95% 请求延迟在可接受范围 |
| error rate | < 1% | 几乎无错误 |
| throughput | 持续增长 | 系统未饱和 |

## 约定规范

- **TDD**: 先写失败测试，再写实现
- **JMeter 参数外置**: `.jmx` 保持最小化，参数放 `config/*.properties`
- **覆盖率目标**: statements ≥ 80%, branches ≥ 70%, functions ≥ 80%, lines ≥ 80%
- **性能阈值**: smoke p95 < 500ms, 错误率 < 1%

## Phase 规划

| Phase | 内容 | 状态 |
|-------|------|------|
| 1 | k6 + JMeter 双引擎 (smoke/load/stress/spike) | ✅ Done |
| 2 | 系统指标采集 + 容量测试 + 瓶颈定位 (#54) | 🔄 In progress |
| 3 | Soak Test / Custom Metrics / AlertManager | Planned |
