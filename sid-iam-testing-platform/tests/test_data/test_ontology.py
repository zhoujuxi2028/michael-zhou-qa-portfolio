import logging

import pytest

from src.mock_services.graph_db import GraphDBError

logger = logging.getLogger(__name__)


@pytest.mark.data
class TestOntologyEntity:
    @pytest.mark.P0
    def test_entity_creation(self, sample_ontology):
        """TC-DATA-ONT-001: 实体创建（学生/课程/院系）"""
        logger.info("TC-DATA-ONT-001: Testing entity creation")
        entity = sample_ontology.get_entity("student_001")
        assert entity["entity_type"] == "student"
        assert entity["name"] == "Alice"
        course = sample_ontology.get_entity("course_cs101")
        assert course["entity_type"] == "course"
        dept = sample_ontology.get_entity("dept_cs")
        assert dept["entity_type"] == "department"

    @pytest.mark.P0
    def test_relation_creation(self, sample_ontology):
        """TC-DATA-ONT-002: 关系创建（选修/所属/教授）"""
        logger.info("TC-DATA-ONT-002: Testing relation creation")
        relations = sample_ontology.get_relations("student_001")
        assert len(relations["outgoing"]) == 2
        course_relations = sample_ontology.get_relations("course_cs101")
        assert len(course_relations["incoming"]) >= 2
        assert len(course_relations["outgoing"]) == 1

    @pytest.mark.P0
    def test_graph_traversal(self, sample_ontology):
        """TC-DATA-ONT-003: 图遍历（BFS/DFS）"""
        logger.info("TC-DATA-ONT-003: Testing graph traversal")
        bfs_result = sample_ontology.traverse_bfs("student_001")
        assert "student_001" in bfs_result
        assert "course_cs101" in bfs_result
        dfs_result = sample_ontology.traverse_dfs("student_001")
        assert "student_001" in dfs_result
        assert len(dfs_result) >= 3

    @pytest.mark.P0
    def test_shortest_path(self, sample_ontology):
        """TC-DATA-ONT-004: 路径查询（最短路径）"""
        logger.info("TC-DATA-ONT-004: Testing shortest path query")
        path = sample_ontology.shortest_path("student_001", "dept_cs")
        assert path is not None
        assert path[0] == "student_001"
        assert path[-1] == "dept_cs"

    @pytest.mark.P1
    def test_entity_update_delete(self, sample_ontology):
        """TC-DATA-ONT-005: 实体更新与删除"""
        logger.info("TC-DATA-ONT-005: Testing entity update and delete")
        sample_ontology.add_entity("temp_entity", "temp", {"value": 1})
        sample_ontology.update_entity("temp_entity", {"value": 2})
        updated = sample_ontology.get_entity("temp_entity")
        assert updated["value"] == 2
        sample_ontology.delete_entity("temp_entity")
        with pytest.raises(GraphDBError):
            sample_ontology.get_entity("temp_entity")

    @pytest.mark.P1
    def test_cascade_delete(self, sample_ontology):
        """TC-DATA-ONT-006: 关系级联删除"""
        logger.info("TC-DATA-ONT-006: Testing cascade delete")
        sample_ontology.add_entity("cascade_src", "test")
        sample_ontology.add_entity("cascade_tgt", "test")
        sample_ontology.add_relation("cascade_src", "cascade_tgt", "test_rel")
        sample_ontology.delete_entity("cascade_src", cascade=True)
        assert not sample_ontology.graph.has_edge("cascade_src", "cascade_tgt")
        sample_ontology.delete_entity("cascade_tgt")

    @pytest.mark.P1
    def test_cycle_detection(self, sample_ontology):
        """TC-DATA-ONT-007: 循环检测（防止环形关系）"""
        logger.info("TC-DATA-ONT-007: Testing cycle detection")
        sample_ontology.add_entity("cycle_a", "test")
        sample_ontology.add_entity("cycle_b", "test")
        sample_ontology.add_entity("cycle_c", "test")
        sample_ontology.add_relation("cycle_a", "cycle_b", "next")
        sample_ontology.add_relation("cycle_b", "cycle_c", "next")
        sample_ontology.add_relation("cycle_c", "cycle_a", "next")
        cycles = sample_ontology.detect_cycles()
        assert len(cycles) > 0
        for n in ["cycle_a", "cycle_b", "cycle_c"]:
            sample_ontology.delete_entity(n, cascade=True)

    @pytest.mark.P1
    def test_schema_migration(self, sample_ontology):
        """TC-DATA-ONT-008: Schema 迁移（版本演进）"""
        logger.info("TC-DATA-ONT-008: Testing schema migration")
        old = sample_ontology.get_schema_version()

        def migrate(g):
            for node in g.nodes():
                if "schema_v" not in g.nodes[node]:
                    g.nodes[node]["schema_v"] = 2

        result = sample_ontology.migrate_schema(2, migrate)
        assert result["from"] == old
        assert result["to"] == 2
        assert sample_ontology.get_schema_version() == 2

    @pytest.mark.P2
    def test_large_graph_performance(self, graph_db):
        """TC-DATA-ONT-009: 大规模图性能（1000+ 节点）"""
        logger.info("TC-DATA-ONT-009: Testing large graph performance")
        db = graph_db
        _ = db.node_count()
        entities = [(f"perf_node_{i}", "perf", {"idx": i}) for i in range(1000)]
        added = db.bulk_add_entities(entities)
        assert added == 1000
        for i in range(999):
            db.graph.add_edge(f"perf_node_{i}", f"perf_node_{i + 1}", relation_type="seq")
        path = db.shortest_path("perf_node_0", "perf_node_999")
        assert path is not None
        assert len(path) == 1000
        for i in range(1000):
            db.graph.remove_node(f"perf_node_{i}")

    @pytest.mark.P2
    def test_isolated_node_detection(self, sample_ontology):
        """TC-DATA-ONT-010: 孤立节点检测与清理"""
        logger.info("TC-DATA-ONT-010: Testing isolated node detection")
        sample_ontology.add_entity("orphan_1", "orphan")
        sample_ontology.add_entity("orphan_2", "orphan")
        isolated = sample_ontology.find_isolated_nodes()
        assert "orphan_1" in isolated
        assert "orphan_2" in isolated
        for node in ["orphan_1", "orphan_2"]:
            sample_ontology.delete_entity(node)
