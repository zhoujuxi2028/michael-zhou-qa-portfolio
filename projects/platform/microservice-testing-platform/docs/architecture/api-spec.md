# API 接口规格

## 1. Order Service（端口 3003）

### 1.1 创建订单

```
POST /api/orders
```

**Request:**
```json
{
  "productId": "PROD-001",
  "quantity": 2,
  "unitPrice": 29.99
}
```

**Response (201):**
```json
{
  "id": "ORD-20260320-001",
  "productId": "PROD-001",
  "quantity": 2,
  "unitPrice": 29.99,
  "totalAmount": 59.98,
  "status": "pending",
  "createdAt": "2026-03-20T10:00:00Z"
}
```

**Error (400):** 参数校验失败
**Error (409):** 库存不足（Inventory Service 返回失败）

### 1.2 查询订单

```
GET /api/orders/:id
```

**Response (200):**
```json
{
  "id": "ORD-20260320-001",
  "productId": "PROD-001",
  "quantity": 2,
  "unitPrice": 29.99,
  "totalAmount": 59.98,
  "status": "paid",
  "createdAt": "2026-03-20T10:00:00Z",
  "updatedAt": "2026-03-20T10:00:05Z"
}
```

**Error (404):** 订单不存在

### 1.3 查询订单列表

```
GET /api/orders?status=pending&page=1&limit=10
```

**Response (200):**
```json
{
  "data": [...],
  "pagination": { "page": 1, "limit": 10, "total": 25 }
}
```

### 1.4 更新订单状态（内部回调）

```
PATCH /api/orders/:id/status
```

**Request:**
```json
{
  "status": "paid",
  "paymentId": "PAY-001"
}
```

**Response (200):** 更新后的订单对象

### 1.5 健康检查

```
GET /health
```

**Response (200):**
```json
{
  "status": "healthy",
  "service": "order-service",
  "uptime": 3600,
  "dependencies": {
    "database": "connected",
    "redis": "connected",
    "inventory-service": "reachable"
  }
}
```

### 1.6 Prometheus 指标

```
GET /metrics
```

---

## 2. Inventory Service（端口 3004）

### 2.1 查询库存

```
GET /api/inventory/:productId
```

**Response (200):**
```json
{
  "productId": "PROD-001",
  "productName": "Widget A",
  "quantity": 100,
  "reserved": 5,
  "available": 95
}
```

**Error (404):** 商品不存在

### 2.2 扣减库存

```
POST /api/inventory/:productId/deduct
```

**Request:**
```json
{
  "quantity": 2,
  "orderId": "ORD-20260320-001"
}
```

**Response (200):**
```json
{
  "productId": "PROD-001",
  "deducted": 2,
  "remaining": 93,
  "orderId": "ORD-20260320-001"
}
```

**Error (409):** 库存不足
```json
{
  "error": "INSUFFICIENT_STOCK",
  "available": 1,
  "requested": 2
}
```

### 2.3 回滚库存

```
POST /api/inventory/:productId/rollback
```

**Request:**
```json
{
  "quantity": 2,
  "orderId": "ORD-20260320-001",
  "reason": "payment_failed"
}
```

**Response (200):**
```json
{
  "productId": "PROD-001",
  "rolledBack": 2,
  "remaining": 95,
  "orderId": "ORD-20260320-001"
}
```

### 2.4 健康检查

```
GET /health
```

### 2.5 Prometheus 指标

```
GET /metrics
```

---

## 3. Payment Service（端口 3005）

### 3.1 查询支付记录

```
GET /api/payments/:orderId
```

**Response (200):**
```json
{
  "id": "PAY-001",
  "orderId": "ORD-20260320-001",
  "amount": 59.98,
  "status": "completed",
  "processedAt": "2026-03-20T10:00:05Z"
}
```

**Error (404):** 支付记录不存在

### 3.2 健康检查

```
GET /health
```

### 3.3 Prometheus 指标

```
GET /metrics
```

---

## 4. Redis 事件契约

### 4.1 order.created

**Channel:** `order.created`

**Payload:**
```json
{
  "orderId": "ORD-20260320-001",
  "productId": "PROD-001",
  "quantity": 2,
  "totalAmount": 59.98,
  "timestamp": "2026-03-20T10:00:00Z",
  "correlationId": "corr-uuid-001"
}
```

**Publisher:** Order Service
**Subscriber:** Payment Service

### 4.2 payment.completed

**Channel:** `payment.completed`

**Payload:**
```json
{
  "paymentId": "PAY-001",
  "orderId": "ORD-20260320-001",
  "status": "completed",
  "timestamp": "2026-03-20T10:00:05Z",
  "correlationId": "corr-uuid-001"
}
```

**Publisher:** Payment Service
**Subscriber:** Order Service（用于更新订单状态）

---

## 5. 通用规范

### 5.1 请求头

| Header | 说明 |
|--------|------|
| `X-Correlation-ID` | 链路追踪 ID，跨服务传递 |
| `Content-Type` | `application/json` |

### 5.2 错误响应格式

```json
{
  "error": "ERROR_CODE",
  "message": "Human readable message",
  "details": {}
}
```

### 5.3 订单状态机

```
pending → confirmed → paid → completed
pending → cancelled（库存不足）
confirmed → failed（支付失败 → 库存回滚）
```
