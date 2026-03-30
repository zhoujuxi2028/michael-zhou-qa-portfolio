# CLAUDE.md - 性能测试平台 (Performance Testing Platform)

## 项目说明

**分类: 性能测试** | k6 + JMeter 双引擎负载测试 + Express API + Grafana + InfluxDB 可观测

## 测试层级

| 层 | 工具 | 数量 | 目的 |
|----|------|------|------|
| 单元测试 | Jest + Supertest | 20 tests | API 功能正确性 |
| 性能测试 (轻量级) | k6 | 4 脚本 | 延迟、吞吐、错误率验证 |
| 性能测试 (企业级) | JMeter | 4 测试计划 | 负载测试 + HTML 报告 + Grafana 可视化 |

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

# k6 性能测试
npm run k6:smoke             # smoke test
npm run k6:load              # load test
npm run k6:stress            # stress test
npm run k6:spike             # spike test
npm run k6:smoke:influx      # smoke → InfluxDB

# JMeter 性能测试 (需先安装 jmeter)
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

## 约定规范

- **TDD**: 先写失败测试，再写实现
- **JMeter 参数外置**: `.jmx` 保持最小化，参数放 `config/*.properties`
- **覆盖率目标**: statements ≥ 80%, branches ≥ 70%, functions ≥ 80%, lines ≥ 80%
- **性能阈值**: p95 < 500ms, 错误率 < 1%
