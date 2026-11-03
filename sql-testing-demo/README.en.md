# sql-testing-demo

SQL & PL/pgSQL testing demo using pytest + PostgreSQL (via testcontainers + OrbStack).

> **Portfolio context:** Demonstrates SQL testing skills aligned to enterprise WMS roles (e.g., DSV Senior IT Specialist #114361). Covers CRUD validation, complex queries, stored procedures, query performance analysis, and WMS-style reporting queries.

[中文版](./README.md)

## Business Context — FastWare WMS Scenario

**FastWare** is a fictional third-party logistics (3PL) company (modelled after real-world 3PL providers such as DSV). FastWare manages a warehouse for multiple retail clients. Warehouse operators handle inbound receipts, inventory checks, outbound order fulfilment, and daily inventory reports.

**Core business flow:**

```
Supplier → [Inbound Receipt] → Inventory Update → [Customer Order] → Pick & Ship → Inventory Report
```

**Test story-line (maps directly to SQL-01 ~ SQL-09):**

| Story Step | What happens | Requirement |
|-----------|-------------|-------------|
| 1. New SKU arrives | Headset "ANC-X1" x 200 units received into Zone A, Bin 03 | SQL-03 CRUD |
| 2. Stock check | Find all SKUs below safety-stock threshold (reorder alert) | SQL-04 Complex queries |
| 3. Order fulfilment | `sp_fulfill_order(order_id)` deducts inventory and writes movement log | SQL-05 Procedures |
| 4. Slow query fix | Date-range query on 1M-row movement table: 1 200 ms → 8 ms after index | SQL-06 Performance |
| 5. Insufficient stock | Fulfil order when stock = 0 → full transaction rollback, no dirty write | SQL-08 Transactions |
| 6. Monthly report | Per-SKU inbound/outbound summary report for the billing period | SQL-09 Reports |

---

## Tech Stack

| Tool | Version | Purpose |
|------|---------|---------|
| Python | 3.14 | Test runner language |
| pytest | ≥ 8.0 | Test framework |
| psycopg (v3) | ≥ 3.3 | PostgreSQL driver |
| testcontainers | ≥ 4.15 | Auto-manage PostgreSQL container |
| PostgreSQL | 16-alpine | Database under test |
| OrbStack | — | Docker runtime (macOS) |

## Quick Start

```bash
# 1. Activate venv
source /Users/michaelzhou/Documents/github/venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run all tests (OrbStack must be running)
pytest tests/ -v

# 4. Run with coverage
pytest tests/ -v --cov=src --cov-report=term-missing
```

## Project Structure

```
sql-testing-demo/
├── src/
│   ├── schema.sql          # WMS schema: warehouses / inventory / orders / stock_movements
│   ├── seed.sql            # FastWare sample data (zones, SKUs, initial stock)
│   └── procedures.sql      # PL/pgSQL: sp_fulfill_order, sp_receive_stock, fn_check_stock
├── tests/
│   ├── conftest.py               # pytest fixtures — PostgreSQL container lifecycle
│   ├── unit/
│   │   ├── test_crud.py          # SQL-03: CRUD (ANC-X1 inbound receipt)
│   │   ├── test_queries.py       # SQL-04: JOIN / window functions / reorder alert
│   │   ├── test_procedures.py    # SQL-05: sp_fulfill_order / sp_receive_stock
│   │   ├── test_constraints.py   # SQL-07: FK, unique, NOT NULL violations
│   │   └── test_transactions.py  # SQL-08: rollback on insufficient stock
│   └── integration/
│       ├── test_performance.py   # SQL-06: EXPLAIN ANALYZE, index before/after
│       └── test_reports.py       # SQL-09: monthly inbound/outbound summary
├── docs/
│   ├── architecture/architecture.md
│   ├── project-management/
│   │   ├── requirements.md       # SQL-01 ~ SQL-10 detailed requirements
│   │   └── risks.md              # R-01 ~ R-04 risk register
│   └── qa/test-plan.md
├── requirements.txt
├── pytest.ini
├── CLAUDE.md
└── README.md
```

## Database Schema (FastWare WMS)

| Table | Key Columns | Description |
|-------|------------|-------------|
| `warehouses` | id, name, zone, capacity | Warehouse zones (A, B, C) |
| `inventory` | id, sku, warehouse_id, qty, safety_stock | Current stock level per SKU per zone |
| `orders` | id, client_id, status, created_at | Outbound customer orders |
| `stock_movements` | id, sku, order_id, movement_type, qty, moved_at | Full inbound/outbound audit log |

## JD Alignment (DSV Senior IT Specialist #114361)

| JD Requirement | Demo Coverage |
|---------------|---------------|
| Good SQL command language | CRUD, JOIN, aggregation, window functions (`test_crud.py`, `test_queries.py`) |
| PL/SQL queries + tuning | PL/pgSQL stored procedures + EXPLAIN ANALYZE index optimisation (`test_procedures.py`, `test_performance.py`) |
| Regression testing for warehouse flows | Full test suite re-run on every commit (CI workflow) |
| Develop test plans and scenarios | `docs/qa/test-plan.md` with TC-01 ~ TC-09 |
| 4-eyes principle / validation | PR review + CI gate before merge |
| Version / source control | Git + conventional commits + PR workflow |
