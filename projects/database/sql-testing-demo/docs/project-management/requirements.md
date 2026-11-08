# sql-testing-demo 需求文档

**Portfolio 需求 ID**: PREQ-019  
**GitHub Issue**: [#828](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/828)  
**状态**: In Development  
**场景**: FastWare WMS（第三方物流仓储管理系统）

---

## 业务背景

FastWare 是一家 3PL 物流公司，管理多个零售客户的仓库。本项目通过模拟 FastWare 的仓储业务流程，演示 SQL 测试能力：CRUD 验证、复杂查询、PL/pgSQL 存储过程、查询性能调优、事务完整性和报表查询。

---

## 需求清单（SQL-01 ~ SQL-10）

| ID | 需求描述 | 类型 | 优先级 | 验收标准 | 状态 |
|----|---------|------|--------|---------|------|
| SQL-01 | testcontainers 自动启停 PostgreSQL 16-alpine 容器，pytest session fixture 管理生命周期 | FR | P1 | `pytest tests/ -v` 成功连接并运行 | Proposed |
| SQL-02 | FastWare WMS 数据库 schema（4 张表：warehouses / inventory / orders / stock_movements）+ seed 数据 | FR | P1 | `schema.sql` + `seed.sql` 执行无错误，表结构和初始数据正确 | Proposed |
| SQL-03 | CRUD 测试：SKU 入库收货（INSERT）、库存查询（SELECT）、库存更新（UPDATE）、删除过期记录（DELETE） | FR | P1 | 4 类操作各有独立测试，断言行数/字段值正确 | Proposed |
| SQL-04 | 复杂查询测试：多表 JOIN、GROUP BY 聚合、窗口函数（RANK/LAG）、子查询、补货预警（低于 safety_stock）| FR | P1 | 每类查询有对应测试，结果与预期数据一致 | Proposed |
| SQL-05 | PL/pgSQL 存储过程测试：`sp_receive_stock`（入库）、`sp_fulfill_order`（出库扣减+流水）、`fn_check_stock`（库存查询函数）| FR | P1 | 调用 procedure 后库存变更和流水记录正确 | Proposed |
| SQL-06 | 查询性能测试：EXPLAIN ANALYZE 验证索引效果，对比有/无索引在 stock_movements 大数据量下的执行计划 | FR | P2 | EXPLAIN 输出中加索引后 cost 显著降低，有断言 | Proposed |
| SQL-07 | 数据完整性测试：外键约束违反（非法 warehouse_id）、NOT NULL 违反、唯一键冲突 | FR | P1 | 违反约束时 psycopg 抛出正确异常类型 | Proposed |
| SQL-08 | 事务测试：出库时库存不足触发回滚，验证 inventory 和 stock_movements 均未脏写 | FR | P2 | 回滚后两张表数据与事务前一致 | Proposed |
| SQL-09 | 报表查询测试：月度 SKU 出入库汇总、仓库库存总值、慢动销 SKU 排名（对标 WMS 实际报表需求）| FR | P2 | 报表结果行数和关键字段与 seed 数据计算值一致 | Proposed |
| SQL-10 | CI workflow（GitHub Actions）：OrbStack 不可用，改用 `services: postgres`；pytest + coverage；上传 Artifacts | NFR | P1 | GitHub Actions 绿灯，覆盖率报告上传成功 | Proposed |

---

## 测试覆盖目标

- 单元测试覆盖率 ≥ 80%（`src/` 下的 SQL helper 函数）
- 所有 SQL-01 ~ SQL-09 需求有对应测试用例
- CI 通过且无 `continue-on-error` workaround

---

## 依赖

```
psycopg[binary]>=3.3.7
testcontainers[postgres]>=4.15.0
pytest>=8.0
pytest-cov>=5.0
black>=24.0
flake8>=7.0
```
