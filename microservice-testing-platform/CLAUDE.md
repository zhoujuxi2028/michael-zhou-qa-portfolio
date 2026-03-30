# CLAUDE.md - Microservice Testing Platform

## 项目说明

电商订单微服务测试平台，展示微服务测试能力（契约测试、集成测试、可观测性）+ Dev & QA 全流程能力。

**所属**: Michael Zhou QA Portfolio (`michael-zhou-qa-portfolio`)

## 项目生命周期

| Phase | Name | Status |
|-------|------|--------|
| 1 | 需求分析 | **Complete** |
| 2 | 设计阶段 | **Complete** |
| 3 | 开发阶段 | **Complete** |
| 4 | 测试阶段 | **Complete** |
| 5 | 收尾阶段 | **Complete** |

## Quick Start

```bash
cd microservice-testing-platform
npm install
npm run test:unit          # 46 unit tests
npm run test:contract      # 15 contract tests
npm run test:integration   # 20 integration tests
npm run test:e2e           # 10 E2E tests
npm run test:observability # 10 observability tests
npm run test:all           # All 101 tests
npm run test:coverage      # All tests + coverage report (coverage/)
```

Tests generate HTML report at `reports/test-report.html` automatically.

### Docker Compose (full stack)

```bash
npm run docker:up          # Start all services + Redis
npm run docker:down        # Stop all
```

### Performance (requires Docker + k6)

```bash
npm run docker:up
k6 run tests/performance/single-service.k6.js
k6 run tests/performance/full-flow.k6.js
```

## Architecture

```
services/
├── order-service/      Express :3003, SQLite, Redis Pub
├── inventory-service/  Express :3004, SQLite
└── payment-service/    Express :3005, SQLite, Redis Sub
```

| Communication | Pattern | Example |
|---------------|---------|---------|
| Sync | REST | Order → Inventory (deduct) |
| Async | Redis Pub/Sub | Order → Payment (order.created) |
| Callback | REST | Payment → Order (status update) |

## Test Layers (101 tests)

| Layer | Tests | Tool |
|-------|:-----:|------|
| Unit | 46 | Jest |
| Contract | 15 | JSON Schema (ajv) |
| Integration | 20 | Supertest |
| E2E | 10 | Supertest (cross-service) |
| Performance | 5 scripts | k6 |
| Observability | 10 | Jest |

## Tech Stack

| Category | Choice |
|----------|--------|
| Runtime | Node.js 18 |
| Framework | Express.js |
| Database | SQLite (better-sqlite3) |
| Message Queue | Redis Pub/Sub |
| Testing | Jest, Supertest, ajv, k6 |
| Observability | Winston, prom-client, Correlation ID |
| Container | Docker Compose |
| CI/CD | GitHub Actions |
| Code Quality | ESLint + Prettier |

## Key Design Decisions

| Decision | Reason |
|----------|--------|
| SQLite per service | 零配置，本地即跑 |
| Redis Pub/Sub | 一个组件解决消息+缓存 |
| JSON Schema contracts | 比 Pact 轻量，CI 友好 |
| app.js/server.js 分离 | Supertest 可直接测试 app |
| 幂等设计 | 扣减/回滚/支付按 orderId 去重 |
