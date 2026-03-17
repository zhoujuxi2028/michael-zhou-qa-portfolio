import logging

import pytest

from src.mock_services.data_warehouse import SQLInjectionError

logger = logging.getLogger(__name__)


@pytest.mark.data
class TestWarehouseSchema:
    @pytest.mark.P0
    def test_table_creation(self, sample_schema):
        """TC-DATA-WH-001: 表创建（Schema 定义）"""
        logger.info("TC-DATA-WH-001: Testing table creation")
        assert sample_schema.table_exists("students")
        assert sample_schema.table_exists("grades")

    @pytest.mark.P0
    def test_data_insert_query(self, sample_schema):
        """TC-DATA-WH-002: 数据插入与查询"""
        logger.info("TC-DATA-WH-002: Testing data insert and query")
        rows = sample_schema.query("SELECT * FROM students")
        assert len(rows) == 3
        alice = sample_schema.query("SELECT * FROM students WHERE name = ?", ["Alice"])
        assert len(alice) == 1
        assert alice[0]["gpa"] == 3.8


@pytest.mark.data
class TestWarehouseSecurity:
    @pytest.mark.P0
    def test_row_level_security(self, sample_schema):
        """TC-DATA-WH-003: 行级安全（多租户隔离）"""
        logger.info("TC-DATA-WH-003: Testing row-level security")
        all_rows = sample_schema.query("SELECT * FROM students")
        assert len(all_rows) == 3
        tenant_a = sample_schema.query("SELECT * FROM students", user_id="user1", tenant="tenant_a")
        assert len(tenant_a) == 2
        for row in tenant_a:
            assert row["tenant_id"] == "tenant_a"
        tenant_b = sample_schema.query("SELECT * FROM students", user_id="user2", tenant="tenant_b")
        assert len(tenant_b) == 1

    @pytest.mark.P0
    def test_sql_injection_defense(self, sample_schema):
        """TC-DATA-WH-004: SQL 注入防御"""
        logger.info("TC-DATA-WH-004: Testing SQL injection defense")
        injection_payloads = [
            "'; DROP TABLE students; --",
            "1 OR 1=1 UNION SELECT * FROM grades",
            "/* malicious comment */",
        ]
        for payload in injection_payloads:
            with pytest.raises(SQLInjectionError):
                sample_schema.query(payload)


@pytest.mark.data
class TestWarehouseAdvanced:
    @pytest.mark.P1
    def test_schema_alter(self, sample_schema):
        """TC-DATA-WH-005: Schema 变更（ALTER TABLE）"""
        logger.info("TC-DATA-WH-005: Testing schema alteration")
        sample_schema.alter_table("students", add_column={"name": "major", "type": "TEXT"})
        rows = sample_schema.query("SELECT major FROM students")
        assert len(rows) == 3

    @pytest.mark.P1
    def test_aggregation_queries(self, sample_schema):
        """TC-DATA-WH-006: 聚合查询（GROUP BY/HAVING）"""
        logger.info("TC-DATA-WH-006: Testing aggregation queries")
        result = sample_schema.aggregate("grades", "course", "score", "AVG")
        assert len(result) >= 1
        cs101 = [r for r in result if r["course"] == "CS101"]
        assert len(cs101) == 1

    @pytest.mark.P1
    def test_join_query(self, sample_schema):
        """TC-DATA-WH-007: 多表联查（JOIN）"""
        logger.info("TC-DATA-WH-007: Testing JOIN queries")
        result = sample_schema.query(
            "SELECT s.name, g.course, g.score FROM students s " "INNER JOIN grades g ON s.id = g.student_id"
        )
        assert len(result) >= 3
        alice_grades = [r for r in result if r["name"] == "Alice"]
        assert len(alice_grades) == 2

    @pytest.mark.P2
    def test_empty_table_edge_case(self, data_warehouse):
        """TC-DATA-WH-008: 空表/空值边界处理"""
        logger.info("TC-DATA-WH-008: Testing empty table edge cases")
        data_warehouse.create_table("empty_test", [{"name": "id", "type": "TEXT"}])
        rows = data_warehouse.query("SELECT * FROM empty_test")
        assert rows == []
        count = data_warehouse.get_row_count("empty_test")
        assert count == 0
