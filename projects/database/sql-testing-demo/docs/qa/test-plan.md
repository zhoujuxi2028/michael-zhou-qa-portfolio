# sql-testing-demo 测试计划

**项目**: sql-testing-demo (PREQ-019)  
**场景**: FastWare WMS  
**最近更新**: 2026-11-03（Stage 2 设计阶段）

---

## 测试策略

| 层级 | 工具 | 范围 | 触发 |
|------|------|------|------|
| 单元（隔离） | pytest + psycopg v3 | CRUD、查询、存储过程、约束、事务 | 每次 commit |
| 集成 | pytest + psycopg v3 | 性能分析、报表查询 | 每次 commit |
| CI | GitHub Actions | 全套 | Push / PR |

**覆盖率目标**: src/ 下 SQL helper 函数 ≥ 80%

---

## 测试用例表

| TC ID | 需求 | 测试文件 | 测试函数 | 验收标准 |
|-------|------|---------|---------|---------|
| TC-01 | SQL-01 | conftest.py + test_smoke.py | test_db_connection | psycopg 连接成功，SELECT 1 返回 1 |
| TC-02 | SQL-02 | test_smoke.py | test_seed_data_loaded | warehouses 表有 3 行 |
| TC-03 | SQL-03 | test_crud.py | test_insert_new_sku | INSERT 返回有效 id |
| TC-04 | SQL-03 | test_crud.py | test_select_inventory_by_sku | ANC-X1 qty = 200 |
| TC-05 | SQL-03 | test_crud.py | test_update_inventory_qty | qty + 50 后 = 250 |
| TC-06 | SQL-03 | test_crud.py | test_delete_expired_movement | DELETE 后 SELECT 返回 None |
| TC-07 | SQL-04 | test_queries.py | test_join_inventory_with_warehouse | JOIN 结果包含 Zone A |
| TC-08 | SQL-04 | test_queries.py | test_reorder_alert_below_safety_stock | MSE-PRO 和 USB-HUB 在结果中 |
| TC-09 | SQL-04 | test_queries.py | test_total_inventory_value_per_zone | Zone A=230, Zone B=105 |
| TC-10 | SQL-04 | test_queries.py | test_window_function_rank_by_qty | ANC-X1 排名第 1 |
| TC-11 | SQL-04 | test_queries.py | test_subquery_warehouses_with_low_stock | 至少 1 个仓库 |
| TC-12 | SQL-05 | test_procedures.py | test_sp_receive_stock_new_sku | inventory + movement 均正确写入 |
| TC-13 | SQL-05 | test_procedures.py | test_sp_receive_stock_existing_sku_accumulates | qty 累加而非覆盖 |
| TC-14 | SQL-05 | test_procedures.py | test_sp_fulfill_order_deducts_inventory | qty 减少 10 |
| TC-15 | SQL-05 | test_procedures.py | test_sp_fulfill_order_writes_movement | outbound movement 记录正确 |
| TC-16 | SQL-05 | test_procedures.py | test_fn_check_stock_returns_qty | ANC-X1 = 200 |
| TC-17 | SQL-05 | test_procedures.py | test_fn_check_stock_unknown_sku_returns_zero | 返回 0 |
| TC-18 | SQL-06 | test_performance.py | test_index_exists_on_stock_movements_moved_at | idx_movements_moved_at 存在 |
| TC-19 | SQL-06 | test_performance.py | test_index_exists_on_inventory_sku | idx_inventory_sku 存在 |
| TC-20 | SQL-06 | test_performance.py | test_query_plan_cost_with_index | EXPLAIN plan 节点类型合法 |
| TC-21 | SQL-07 | test_constraints.py | test_fk_violation_invalid_warehouse | ForeignKeyViolation 抛出 |
| TC-22 | SQL-07 | test_constraints.py | test_not_null_violation_on_sku | NotNullViolation 抛出 |
| TC-23 | SQL-07 | test_constraints.py | test_unique_violation_duplicate_sku_warehouse | UniqueViolation 抛出 |
| TC-24 | SQL-07 | test_constraints.py | test_check_violation_negative_qty | CheckViolation 抛出 |
| TC-25 | SQL-08 | test_transactions.py | test_rollback_on_insufficient_stock | qty 事务后不变 |
| TC-26 | SQL-08 | test_transactions.py | test_commit_persists_receive_stock | commit 后 qty = 77 |
| TC-27 | SQL-09 | test_reports.py | test_monthly_sku_inbound_outbound_summary | ANC-X1 in=200, out=10 |
| TC-28 | SQL-09 | test_reports.py | test_warehouse_total_inventory_value | 总库存 = 385 |
| TC-29 | SQL-09 | test_reports.py | test_below_safety_stock_skus_report | USB-HUB + MSE-PRO 在结果中 |
| TC-30 | SQL-09 | test_reports.py | test_order_fulfillment_status_report | fulfilled ≥ 1, pending ≥ 1 |

**合计**: 30 个测试用例，覆盖 SQL-01 ~ SQL-09 全部需求。

---

## 运行命令

```bash
# 全套
cd sql-testing-demo
pytest tests/ -v

# 按标记运行
pytest tests/ -v -m crud
pytest tests/ -v -m procedures
pytest tests/ -v -m "performance or reports"

# 覆盖率
pytest tests/ -v --cov=src --cov-report=term-missing
```

---

## 回归测试策略

每次 commit 触发 CI（`sql-testing-demo-ci.yml`），全套 30 个用例必须 PASS 才允许 merge。测试失败分类：

| 类别 | 处理 |
|------|------|
| 代码缺陷 | 修复代码，重新 commit |
| 环境问题（OrbStack 未启动）| 启动 OrbStack 后重跑 |
| seed 数据不一致 | 检查 seed.sql 与测试断言对齐 |
