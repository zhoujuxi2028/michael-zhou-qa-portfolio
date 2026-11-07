# 测试策略文档

## 1. 测试金字塔

```
          ╱╲
         ╱  ╲          Performance (k6)           5 scenarios
        ╱    ╲         Observability (Jest)       10 tests
       ╱──────╲
      ╱        ╲       E2E (Supertest)            10 tests
     ╱──────────╲
    ╱            ╲     Integration (Supertest)    20 tests
   ╱──────────────╲
  ╱                ╲   Contract (Pact)            15 tests
 ╱──────────────────╲
╱                    ╲  Unit (Jest)               30 tests
╲────────────────────╱
        Total: 90
```

## 2. 各层策略

### 2.1 单元测试（30 tests）

| 项目 | 说明 |
|------|------|
| 工具 | Jest |
| 范围 | 业务逻辑函数、数据校验、状态机 |
| Mock | 数据库、Redis、HTTP 调用全部 mock |
| 覆盖率目标 | > 80% |
| 运行时间 | < 10s |
| 运行方式 | `npm test -- --testPathPattern=unit` |

### 2.2 契约测试（15 tests）

| 项目 | 说明 |
|------|------|
| 工具 | Pact (JS) |
| 范围 | 服务间 API 契约 + 事件格式契约 |
| 模式 | Consumer-Driven Contract Testing |
| Pact Broker | 本地文件（pacts/ 目录） |
| 运行时间 | < 15s |

**契约矩阵:**

| Consumer | Provider | 接口 |
|----------|----------|------|
| Order | Inventory | REST: 查询/扣减/回滚 |
| Payment | Order | REST: 状态更新回调 |
| Payment | Order | Event: order.created 格式 |
| Order | Payment | Event: payment.completed 格式 |

### 2.3 集成测试（20 tests）

| 项目 | 说明 |
|------|------|
| 工具 | Supertest + Testcontainers |
| 范围 | 单服务 API + 真实 DB + 真实 Redis |
| 依赖 | Docker（通过 Testcontainers 启动 Redis） |
| 隔离 | 每个测试套件独立数据库文件 |
| 运行时间 | < 30s |

### 2.4 E2E 流程测试（10 tests）

| 项目 | 说明 |
|------|------|
| 工具 | Supertest |
| 范围 | 跨服务完整业务流程 |
| 依赖 | Docker Compose 启动全部服务 |
| 前置 | `docker compose up -d` |
| 运行时间 | < 30s |
| 等待策略 | 轮询订单状态变更（异步事件处理需要等待） |

### 2.5 性能测试（5 scenarios）

| 项目 | 说明 |
|------|------|
| 工具 | k6 |
| 范围 | 单服务负载 + 全链路压力 + 消息吞吐 |
| 依赖 | Docker Compose 启动全部服务 |
| 阈值 | p95 < 200ms (单服务), p95 < 500ms (全链路) |
| 运行时间 | ~2min |

### 2.6 可观测性测试（10 tests）

| 项目 | 说明 |
|------|------|
| 工具 | Jest + 自定义断言 |
| 范围 | 日志格式、Correlation ID 传递、Prometheus 指标 |
| 方法 | 发送请求后检查日志输出和 /metrics 端点 |
| 运行时间 | < 15s |

## 3. 测试环境

| 环境 | 用途 | 启动方式 |
|------|------|----------|
| Local (no Docker) | 单元测试、契约测试 | `npm test` |
| Testcontainers | 集成测试 | 自动启动/销毁 Redis |
| Docker Compose | E2E、性能、可观测性 | `docker compose up -d` |
| CI (GitHub Actions) | 全部 | workflow 自动编排 |

## 4. 测试执行顺序

```
CI Pipeline:
  1. Lint (ESLint)
  2. Unit Tests (Jest)          ← 快，无依赖
  3. Contract Tests (Pact)      ← 快，无依赖
  4. Integration Tests          ← 需要 Docker
  5. E2E Tests                  ← 需要全部服务
  6. Performance Tests          ← 仅 main 分支 / 手动触发
```

## 5. 测试数据管理

| 策略 | 说明 |
|------|------|
| 种子数据 | 每个服务启动时初始化（PROD-001 ~ PROD-005） |
| 测试隔离 | 每个测试用例前重置数据库 |
| 幂等设计 | 扣减/回滚按 orderId 去重 |
| 异步等待 | E2E 测试用 polling + timeout 等待事件处理完成 |
