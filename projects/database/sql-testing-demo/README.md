# sql-testing-demo

使用 pytest + PostgreSQL（testcontainers + OrbStack）进行 SQL 与 PL/pgSQL 测试的演示项目。

> **Portfolio 说明**：本项目展示企业级 WMS 岗位所需的 SQL 测试能力，覆盖 CRUD 校验、复杂查询、存储过程、查询性能分析和仓储报表查询。

[English Version](./README.en.md)

---

## 业务背景 — FastWare WMS 场景

**FastWare** 是一家虚构的第三方物流（3PL）公司。FastWare 为多个零售客户管理仓库，仓库操作员负责入库收货、库存查询、出库发货和日常库存报表。

**核心业务流程：**

```
供应商 → [入库收货] → 库存更新 → [客户订单] → 拣货发货 → 库存报表
```

**测试故事线（直接映射到 SQL-01 ~ SQL-09）：**

| 场景步骤 | 发生了什么 | 对应需求 |
|---------|-----------|---------|
| 1. 新 SKU 入库 | 耳机 "ANC-X1" 200 件入库到 Zone A Bin 03 | SQL-03 CRUD |
| 2. 库存检查 | 查找所有低于安全库存阈值的 SKU（补货预警） | SQL-04 复杂查询 |
| 3. 订单履行 | `sp_fulfill_order` 扣减库存并写入出库流水 | SQL-05 存储过程 |
| 4. 慢查询优化 | 百万行流水表日期范围查询：1200ms → 8ms（加索引后）| SQL-06 性能 |
| 5. 库存不足 | 库存为 0 时发货 → 整个事务回滚，无脏写 | SQL-08 事务 |
| 6. 月度报表 | 按 SKU 汇总计费周期内的进出库数量 | SQL-09 报表 |

---

## 技术栈

| 工具 | 版本 | 用途 |
|------|------|------|
| Python | 3.14 | 测试运行语言 |
| pytest | ≥ 8.0 | 测试框架 |
| psycopg（v3） | ≥ 3.3 | PostgreSQL 驱动 |
| testcontainers | ≥ 4.15 | 自动管理 PostgreSQL 容器 |
| PostgreSQL | 16-alpine | 被测数据库 |
| OrbStack | — | Docker 运行时（macOS） |

---

## 快速开始

```bash
# 1. 激活虚拟环境
source /Users/michaelzhou/Documents/github/venv/bin/activate

# 2. 安装依赖
pip install -r requirements.txt

# 3. 运行全部测试（需先启动 OrbStack）
pytest tests/ -v

# 4. 带覆盖率运行
pytest tests/ -v --cov=src --cov-report=term-missing
```

---

## 项目结构

```
sql-testing-demo/
├── src/
│   ├── schema.sql          # WMS 表结构：warehouses / inventory / orders / stock_movements
│   ├── seed.sql            # FastWare 样本数据（仓区、SKU、初始库存）
│   └── procedures.sql      # PL/pgSQL：sp_fulfill_order、sp_receive_stock、fn_check_stock
├── tests/
│   ├── conftest.py               # pytest fixture — PostgreSQL 容器生命周期管理
│   ├── unit/
│   │   ├── test_smoke.py         # 连接、种子数据、存储过程加载
│   │   ├── test_crud.py          # SQL-03：CRUD（ANC-X1 入库）
│   │   ├── test_queries.py       # SQL-04：JOIN / 窗口函数 / 补货预警
│   │   ├── test_procedures.py    # SQL-05：sp_fulfill_order / sp_receive_stock
│   │   └── test_constraints.py   # SQL-07：FK、唯一约束、NOT NULL 违反
│   └── integration/
│       ├── test_transactions.py  # SQL-08：库存不足时事务回滚
│       ├── test_performance.py   # SQL-06：查询延迟 SLA 断言
│       └── test_reports.py       # SQL-09：跨表统计报表
├── docs/
│   ├── architecture/architecture.md   # 架构设计
│   ├── project-management/
│   │   ├── requirements.md            # SQL-01 ~ SQL-10 详细需求
│   │   └── risks.md                   # R-01 ~ R-04 风险登记册
│   └── qa/test-plan.md                # 测试计划（TC-01 ~ TC-09）
├── requirements.txt
├── pytest.ini
├── README.md               # 本文件（中文）
├── README.en.md            # English version
└── CLAUDE.md
```

---

## 数据库 Schema（FastWare WMS）

| 表 | 关键字段 | 说明 |
|----|---------|------|
| `warehouses` | id, name, zone, capacity | 仓库分区（A、B、C） |
| `inventory` | id, sku, warehouse_id, qty, safety_stock | 每个 SKU 在每个仓区的当前库存 |
| `orders` | id, client_id, status, created_at | 客户出库订单 |
| `stock_movements` | id, sku, order_id, movement_type, qty, moved_at | 完整的进出库审计日志 |

---

## 测试覆盖

| 文件 | 类型 | 数量 | 测试点 |
|------|------|------|--------|
| test_smoke.py | 单元 | 3 | 数据库连接、种子数据、存储过程加载 |
| test_crud.py | 单元 | 4 | INSERT / SELECT / UPDATE / DELETE |
| test_queries.py | 单元 | 5 | JOIN、GROUP BY、窗口函数、子查询、补货预警 |
| test_constraints.py | 单元 | 4 | FK 违反、NOT NULL、唯一约束、CHECK 约束 |
| test_procedures.py | 单元 | 6 | sp_receive_stock、sp_fulfill_order、fn_check_stock |
| test_transactions.py | 集成 | 3 | 事务原子性、错误回滚、约束不破坏状态 |
| test_performance.py | 集成 | 3 | 查询延迟 SLA：查询 <10ms、JOIN <20ms、扫描 <50ms |
| test_reports.py | 集成 | 4 | 分区汇总、补货报表、流水统计、库存排名 |
| **合计** | | **32** | |

