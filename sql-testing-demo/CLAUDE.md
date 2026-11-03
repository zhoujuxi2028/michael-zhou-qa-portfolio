# sql-testing-demo — CLAUDE.md

## 项目概述

FastWare WMS SQL 测试 demo。用 pytest + psycopg v3 + testcontainers 对 PostgreSQL 执行全栈 SQL 测试。

## 快速启动

```bash
source /Users/michaelzhou/Documents/github/venv/bin/activate
cd sql-testing-demo
pip install -r requirements.txt

# 运行所有测试（需 OrbStack 运行中）
pytest tests/ -v

# 覆盖率
pytest tests/ -v --cov=src --cov-report=term-missing
```

## 关键文件

| 文件 | 说明 |
|------|------|
| `src/schema.sql` | FastWare WMS 数据库 schema（4 张表） |
| `src/seed.sql` | 初始测试数据 |
| `src/procedures.sql` | PL/pgSQL 存储过程 |
| `tests/conftest.py` | pytest fixtures，PostgreSQL 容器生命周期 |
| `tests/unit/test_crud.py` | SQL-03 CRUD 测试 |
| `tests/unit/test_queries.py` | SQL-04 复杂查询 |
| `tests/unit/test_procedures.py` | SQL-05 存储过程 |
| `tests/integration/test_performance.py` | SQL-06 EXPLAIN ANALYZE |
| `tests/integration/test_reports.py` | SQL-09 报表查询 |

## 需求 ID

- Portfolio: PREQ-019 / Issue #828
- 项目: SQL-01 ~ SQL-10（见 `docs/project-management/requirements.md`）

## 注意事项

- OrbStack 必须运行，否则 testcontainers 无法启动容器
- CI 使用 `services: postgres`（见 `.github/workflows/sql-testing-demo-ci.yml`）
- 使用 psycopg v3（非 psycopg2），Python 3.14 兼容
