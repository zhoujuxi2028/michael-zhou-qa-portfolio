# SQLite 数据库设计

## ER 图

```
┌─────────────┐      ┌─────────────┐      ┌──────────────┐
│  products   │◄─────│   orders    │      │    users     │
├─────────────┤      ├─────────────┤      ├──────────────┤
│ id (PK)     │      │ id (PK)     │      │ id (PK)      │
│ name        │      │ product_id  │      │ username     │
│ price       │      │   (FK)      │      │ password_hash│
│ stock       │      │ quantity    │      │ created_at   │
│ created_at  │      │ total       │      └──────────────┘
│             │      │ status      │
└─────────────┘      │ created_at  │      ┌──────────────┐
                     └─────────────┘      │token_blacklist
                                          ├──────────────┤
                                          │ id (PK)      │
                                          │ token_jti    │
                                          │ expired_at   │
                                          │ created_at   │
                                          └──────────────┘
```

## 4 张表简介

| 表 | 用途 | 行数（初始） |
|----|------|-----------|
| products | 商品列表（CRUD）| 5 种，库存 100,000 |
| orders | 订单下单（库存扣减、事务）| 动态增长 |
| users | JWT 认证（register/login） | Phase 3 新增 |
| token_blacklist | logout 后黑名单 | Phase 3 新增 |

## 初始化

```sql
-- 启动时自动创建表 + 5 种商品种子数据
products: [Laptop 999.99, Phone 699.99, Tablet 449.99, Headphones 149.99, Keyboard 89.99]
```

## 特性

- **模式切换**：test 环境 `:memory:`，生产 `data/perf.db` + WAL
- **事务**：POST /api/orders 使用 transaction，库存扣减 + 订单插入 atomic
- **并发**：Cluster 模式下，WAL 支持多 Worker 并发读
