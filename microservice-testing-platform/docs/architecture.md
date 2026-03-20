# 架构设计文档

## 1. 系统架构

```
                          ┌─────────────────────────────────────────┐
                          │           Docker Compose Network         │
                          │                                         │
  Client ──REST──→ ┌──────────────┐  REST (sync)  ┌──────────────┐ │
                   │ Order Service │──────────────→│Inventory Svc │ │
                   │   :3001      │               │   :3002      │ │
                   └──────┬───────┘               └──────────────┘ │
                          │                                         │
                          │ Pub: order.created                      │
                          ▼                                         │
                   ┌──────────────┐                                 │
                   │    Redis     │                                 │
                   │   :6379      │                                 │
                   └──────┬───────┘                                 │
                          │ Sub: order.created                      │
                          ▼                                         │
                   ┌──────────────┐  REST (callback)               │
                   │Payment Service│─────────────→ Order Service    │
                   │   :3003      │  PATCH /api/orders/:id/status  │
                   └──────────────┘                                 │
                          │                                         │
                          │ Pub: payment.completed                  │
                          ▼                                         │
                        Redis ──→ Order Service (Sub)               │
                                                                    │
                          └─────────────────────────────────────────┘
```

## 2. 服务职责

| 服务 | 端口 | 职责 | 数据库 |
|------|------|------|--------|
| Order Service | 3001 | 订单生命周期管理、编排入口 | SQLite (orders.db) |
| Inventory Service | 3002 | 库存查询/扣减/回滚 | SQLite (inventory.db) |
| Payment Service | 3003 | 支付处理、事件驱动 | SQLite (payments.db) |
| Redis | 6379 | 消息总线 | - |

## 3. 通信模式

### 3.1 同步通信（REST）

```
Order → Inventory: 库存检查与扣减
  GET  /api/inventory/:productId        (查询)
  POST /api/inventory/:productId/deduct  (扣减)
  POST /api/inventory/:productId/rollback (回滚)

Payment → Order: 支付结果回调
  PATCH /api/orders/:id/status           (更新状态)
```

### 3.2 异步通信（Redis Pub/Sub）

| Channel | Publisher | Subscriber | Payload |
|---------|-----------|------------|---------|
| `order.created` | Order Service | Payment Service | orderId, productId, quantity, totalAmount, correlationId |
| `payment.completed` | Payment Service | Order Service | paymentId, orderId, status, correlationId |

### 3.3 通信选型理由

| 场景 | 模式 | 理由 |
|------|------|------|
| 库存扣减 | REST 同步 | 需要立即知道结果（成功/库存不足）才能决定是否创建订单 |
| 支付处理 | Redis 异步 | 支付耗时，不应阻塞订单创建；解耦 Order 和 Payment |
| 支付回调 | REST 同步 | 状态更新是一次性操作，需要确认送达 |

## 4. 可观测性架构

### 4.1 结构化日志（Winston）

```json
{
  "timestamp": "2026-03-20T10:00:00.000Z",
  "level": "info",
  "service": "order-service",
  "correlationId": "corr-uuid-001",
  "message": "Order created",
  "metadata": {
    "orderId": "ORD-20260320-001",
    "productId": "PROD-001"
  }
}
```

### 4.2 链路追踪（Correlation ID）

```
Client Request
  │ X-Correlation-ID: corr-uuid-001 (auto-generated if missing)
  ▼
Order Service (log with corr-uuid-001)
  │ X-Correlation-ID: corr-uuid-001 (forwarded in REST call)
  ▼
Inventory Service (log with corr-uuid-001)

Order Service
  │ correlationId: corr-uuid-001 (included in Redis event)
  ▼
Payment Service (log with corr-uuid-001)
  │ X-Correlation-ID: corr-uuid-001 (forwarded in callback)
  ▼
Order Service (log with corr-uuid-001)
```

### 4.3 Prometheus 指标

| 指标 | 类型 | 说明 |
|------|------|------|
| `http_requests_total` | Counter | 请求总数（按 method, path, status） |
| `http_request_duration_seconds` | Histogram | 请求延迟分布 |
| `orders_created_total` | Counter | 订单创建数 |
| `inventory_deductions_total` | Counter | 库存扣减数（按 success/failure） |
| `payments_processed_total` | Counter | 支付处理数（按 success/failure） |
| `redis_messages_published_total` | Counter | Redis 消息发布数 |
| `redis_messages_received_total` | Counter | Redis 消息接收数 |

## 5. 订单状态机

```
                  ┌─────────┐
                  │ pending │
                  └────┬────┘
                       │ Inventory check
              ┌────────┴────────┐
              ▼                 ▼
        ┌───────────┐    ┌───────────┐
        │ confirmed │    │ cancelled │
        └─────┬─────┘    └───────────┘
              │ Payment result
        ┌─────┴─────┐
        ▼           ▼
  ┌──────────┐ ┌──────────┐
  │   paid   │ │  failed  │ → triggers inventory rollback
  └────┬─────┘ └──────────┘
       │
       ▼
  ┌───────────┐
  │ completed │
  └───────────┘
```

| From | To | Trigger |
|------|----|---------|
| pending | confirmed | 库存扣减成功 |
| pending | cancelled | 库存不足 |
| confirmed | paid | 支付成功 |
| confirmed | failed | 支付失败（触发库存回滚） |
| paid | completed | 手动确认/超时自动 |

## 6. 错误处理策略

| 场景 | 处理方式 |
|------|----------|
| Inventory Service 不可达 | Order 返回 503，不创建订单 |
| Redis 断开 | 自动重连，日志记录，健康检查标记 unhealthy |
| 支付失败 | Payment 发布 payment.completed(status:failed)，Order 触发库存回滚 |
| 重复事件 | 幂等处理（按 orderId 去重） |
| 无效事件格式 | 记录 error 日志，跳过处理，不崩溃 |
