# 数据模型设计

## 1. Order Service（orders.db）

### orders 表

```sql
CREATE TABLE orders (
    id          TEXT PRIMARY KEY,           -- ORD-YYYYMMDD-NNN
    product_id  TEXT NOT NULL,
    quantity    INTEGER NOT NULL CHECK(quantity > 0),
    unit_price  REAL NOT NULL CHECK(unit_price > 0),
    total_amount REAL NOT NULL,
    status      TEXT NOT NULL DEFAULT 'pending',
    payment_id  TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
```

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | TEXT | PK | 格式: ORD-YYYYMMDD-NNN |
| product_id | TEXT | NOT NULL | 商品 ID |
| quantity | INTEGER | > 0 | 数量 |
| unit_price | REAL | > 0 | 单价 |
| total_amount | REAL | NOT NULL | quantity × unit_price |
| status | TEXT | NOT NULL | pending/confirmed/cancelled/paid/failed/completed |
| payment_id | TEXT | nullable | 支付成功后关联 |
| created_at | TEXT | NOT NULL | ISO 8601 |
| updated_at | TEXT | NOT NULL | ISO 8601 |

---

## 2. Inventory Service（inventory.db）

### inventory 表

```sql
CREATE TABLE inventory (
    product_id   TEXT PRIMARY KEY,
    product_name TEXT NOT NULL,
    quantity     INTEGER NOT NULL DEFAULT 0 CHECK(quantity >= 0),
    reserved     INTEGER NOT NULL DEFAULT 0 CHECK(reserved >= 0),
    updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### inventory_transactions 表

```sql
CREATE TABLE inventory_transactions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id  TEXT NOT NULL,
    order_id    TEXT NOT NULL,
    type        TEXT NOT NULL,              -- deduct / rollback
    quantity    INTEGER NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (product_id) REFERENCES inventory(product_id)
);

CREATE UNIQUE INDEX idx_inv_tx_order_type ON inventory_transactions(order_id, type);
CREATE INDEX idx_inv_tx_product ON inventory_transactions(product_id);
```

| 表 | 字段 | 说明 |
|----|------|------|
| inventory | product_id | PK，商品 ID |
| inventory | quantity | 总库存 |
| inventory | reserved | 已预留（扣减但未支付） |
| inventory | available | 计算值: quantity - reserved |
| inventory_transactions | order_id + type | 唯一索引，保证幂等 |

### 种子数据

```sql
INSERT INTO inventory (product_id, product_name, quantity) VALUES
    ('PROD-001', 'Widget A', 100),
    ('PROD-002', 'Widget B', 50),
    ('PROD-003', 'Widget C', 200),
    ('PROD-004', 'Widget D', 10),
    ('PROD-005', 'Widget E', 0);    -- 用于测试库存不足
```

---

## 3. Payment Service（payments.db）

### payments 表

```sql
CREATE TABLE payments (
    id            TEXT PRIMARY KEY,         -- PAY-NNN
    order_id      TEXT NOT NULL UNIQUE,
    amount        REAL NOT NULL CHECK(amount > 0),
    status        TEXT NOT NULL DEFAULT 'processing',
    correlation_id TEXT,
    processed_at  TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX idx_payments_order ON payments(order_id);
```

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | TEXT | PK | 格式: PAY-NNN |
| order_id | TEXT | UNIQUE | 一个订单只能有一个支付记录（幂等） |
| amount | REAL | > 0 | 支付金额 |
| status | TEXT | NOT NULL | processing/completed/failed |
| correlation_id | TEXT | nullable | 链路追踪 |
| processed_at | TEXT | nullable | 处理完成时间 |

### 支付模拟规则

| 条件 | 结果 | 用途 |
|------|------|------|
| amount < 999.99 | completed | 正常支付成功 |
| amount >= 999.99 | failed | 模拟支付失败，测试回滚流程 |

---

## 4. 数据流

```
创建订单:
  Order.orders INSERT (status: pending)
    → Inventory.inventory UPDATE (quantity -= N)
    → Inventory.inventory_transactions INSERT (type: deduct)
    → Order.orders UPDATE (status: confirmed)
    → Redis: order.created
    → Payment.payments INSERT (status: processing)
    → Payment.payments UPDATE (status: completed/failed)
    → Redis: payment.completed
    → Order.orders UPDATE (status: paid/failed)

支付失败回滚:
    → Inventory.inventory UPDATE (quantity += N)
    → Inventory.inventory_transactions INSERT (type: rollback)
```
