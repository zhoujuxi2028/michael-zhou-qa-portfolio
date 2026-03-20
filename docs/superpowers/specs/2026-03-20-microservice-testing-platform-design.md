# Microservice Testing Platform - Design Spec

## Overview

电商订单微服务测试平台，展示微服务测试能力（契约测试、集成测试、可观测性）+ 开发与测试全流程能力。

## Tech Stack

| Component | Choice |
|-----------|--------|
| Framework | Express.js |
| Message Queue | Redis Pub/Sub |
| Database | SQLite per service |
| Container | Docker Compose |
| Testing | Jest, Pact, Supertest, k6 |
| Observability | Winston, Correlation ID, prom-client |

## Services

| Service | Responsibility | Communication |
|---------|---------------|---------------|
| Order Service | 创建/查询/管理订单 | REST (入口) + Redis Pub |
| Inventory Service | 库存查询/扣减/回滚 | REST (被同步调用) |
| Payment Service | 处理支付/回调通知 | Redis Sub + REST 回调 |

## Business Flow

1. Client → Order: 创建订单
2. Order → Inventory (REST): 检查并扣减库存
3. Order → Redis (Pub): `order.created` 事件
4. Payment (Sub): 收到事件，处理支付
5. Payment → Order (REST): 回调更新订单状态

## 5 Phase Lifecycle

| Phase | Name | Deliverables |
|-------|------|-------------|
| 1 | 需求分析 | requirements.md, api-spec.md, test-cases.md |
| 2 | 设计阶段 | architecture.md, data-model.md, test-strategy.md |
| 3 | 开发阶段 | 3 services + Docker Compose + observability |
| 4 | 测试阶段 | 6 layers (~90 tests) + test-report.md |
| 5 | 收尾阶段 | CI/CD, README, CLAUDE.md, PR |

## Test Layers (~90 tests)

| Layer | Tool | Count |
|-------|------|-------|
| Unit | Jest | ~30 |
| Contract | Pact | ~15 |
| Integration | Supertest + Testcontainers | ~20 |
| E2E | Supertest | ~10 |
| Performance | k6 | ~5 |
| Observability | Jest | ~10 |
