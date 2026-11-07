# sql-testing-demo 架构文档

**项目**: sql-testing-demo (PREQ-019)  
**场景**: FastWare WMS（第三方物流仓储管理系统）  
**最近更新**: 2026-11-03（Stage 2 设计阶段）

---

## 1. 系统概览

```
┌─────────────────────────────────────────────────┐
│                  pytest test suite               │
│  tests/unit/          tests/integration/         │
│  ├─ test_crud.py      ├─ test_performance.py     │
│  ├─ test_queries.py   └─ test_reports.py         │
│  ├─ test_procedures.py                           │
│  ├─ test_constraints.py                          │
│  └─ test_transactions.py                         │
└──────────────┬──────────────────────────────────┘
               │ psycopg v3
               ▼
┌─────────────────────────────────────────────────┐
│           tests/conftest.py                      │
│  session fixture: PostgresContainer              │
│  function fixture: cursor + auto-rollback        │
└──────────────┬──────────────────────────────────┘
               │
    ┌──────────┴──────────┐
    │ Local               │ CI (GitHub Actions)
    ▼                     ▼
testcontainers        services: postgres
OrbStack socket       ubuntu-latest built-in
    │                     │
    └──────────┬──────────┘
               ▼
┌─────────────────────────────────────────────────┐
│         PostgreSQL 16-alpine                     │
│  src/schema.sql  — 4 tables + indexes            │
│  src/seed.sql    — FastWare sample data          │
│  src/procedures.sql — PL/pgSQL functions         │
└─────────────────────────────────────────────────┘
```

---

## 2. 数据模型（FastWare WMS）

```
warehouses              inventory
──────────              ─────────────────────
id   SERIAL PK          id            SERIAL PK
name TEXT               sku           TEXT
zone CHAR(1)            warehouse_id  FK→warehouses
capacity INT            qty           INT CHECK ≥ 0
                        safety_stock  INT
                        UNIQUE(sku, warehouse_id)
         │                    │
         └────────────────────┘

orders                  stock_movements
──────                  ───────────────────────
id         SERIAL PK    id             SERIAL PK
client_id  INT          sku            TEXT
status     TEXT         order_id       FK→orders (nullable)
created_at TIMESTAMPTZ  movement_type  TEXT (inbound|outbound)
                        qty            INT CHECK > 0
                        moved_at       TIMESTAMPTZ
```

### 索引
| 索引名 | 表 | 列 | 用途 |
|--------|----|----|------|
| `idx_movements_sku` | stock_movements | sku | SKU 流水查询 |
| `idx_movements_moved_at` | stock_movements | moved_at | 日期范围报表 |
| `idx_inventory_sku` | inventory | sku | SKU 库存查询 |

---

## 3. 模块职责

| 文件 | 职责 |
|------|------|
| `src/schema.sql` | 建表、索引、约束定义（DDL）|
| `src/seed.sql` | 初始测试数据（3 仓库 / 5 SKU / 3 订单 / 5 流水）|
| `src/procedures.sql` | PL/pgSQL：`sp_receive_stock`、`sp_fulfill_order`、`fn_check_stock` |
| `tests/conftest.py` | session fixture（PostgreSQL 容器）+ function fixture（cursor + rollback）|
| `tests/unit/` | 隔离测试：每个测试函数结束后自动 rollback，互不影响 |
| `tests/integration/` | 跨请求场景：性能分析、报表查询（可能需要 commit）|

---

## 4. Fixture 设计

```
session scope:
  pg_container  →  db_dsn  →  db_conn (schema+seed+procedures loaded once)
                                  │
function scope:                   │
  cur ──────────────────────────▶ cursor with auto-rollback
```

**为什么 function scope cursor + rollback**：每个测试用例的数据修改在函数结束后回滚，避免测试间污染，同时共享同一个 PostgreSQL 容器实例（session scope），启动开销只有一次。

---

## 5. 本地 vs CI 模式

| 环境 | 数据库来源 | 连接方式 |
|------|-----------|---------|
| 本地开发 | testcontainers（OrbStack）| `DOCKER_HOST=unix:///...orbstack/run/docker.sock` |
| GitHub Actions CI | `services: postgres` | `USE_EXTERNAL_DB=true` + env vars |

conftest.py 通过 `USE_EXTERNAL_DB` 环境变量切换，无需改代码。

---

## 6. PL/pgSQL 存储过程接口

| 过程/函数 | 参数 | 行为 |
|-----------|------|------|
| `sp_receive_stock(sku, warehouse_id, qty)` | TEXT, INT, INT | UPSERT inventory + INSERT inbound movement |
| `sp_fulfill_order(order_id, sku, warehouse_id, qty)` | INT, TEXT, INT, INT | 检查库存 → 扣减 → INSERT outbound movement → UPDATE order status |
| `fn_check_stock(sku, warehouse_id)` | TEXT, INT | RETURNS INT（当前库存，不存在返回 0）|

`sp_fulfill_order` 库存不足时 `RAISE EXCEPTION`，调用方事务回滚。
