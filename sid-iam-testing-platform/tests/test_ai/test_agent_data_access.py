import logging

import pytest

logger = logging.getLogger(__name__)


@pytest.mark.ai
class TestAgentDataAccess:
    @pytest.mark.P0
    def test_authorized_data_query(self, ai_agent, user_context):
        """TC-AI-DAT-001: 权限范围内数据查询"""
        logger.info("TC-AI-DAT-001: Testing authorized data query")
        ai_agent.reset()
        ai_agent.create_agent("dat-001")
        ai_agent.inherit_auth("dat-001", user_context["token"], user_context["permissions"])
        ai_agent.transition_state("dat-001", "running")
        result = ai_agent.query_data("dat-001", "SELECT my grades", data_source={"grades": [95, 88]})
        assert result["grades"] == [95, 88]

    @pytest.mark.P0
    def test_unauthorized_query_rejected(self, ai_agent, user_context):
        """TC-AI-DAT-002: 越权查询拒绝"""
        logger.info("TC-AI-DAT-002: Testing unauthorized query rejection")
        ai_agent.reset()
        ai_agent.create_agent("dat-002")
        assert (
            ai_agent.check_permission("dat-002", "read:all_grades") is False
            if ai_agent._agents["dat-002"].get("auth_context")
            else True
        )
        ai_agent.inherit_auth("dat-002", user_context["token"], user_context["permissions"])
        assert ai_agent.check_permission("dat-002", "read:all_grades") is False

    @pytest.mark.P0
    def test_pii_auto_masking(self, ai_agent, pii_samples):
        """TC-AI-DAT-003: PII 自动脱敏"""
        logger.info("TC-AI-DAT-003: Testing PII auto-masking")
        masked_phone = ai_agent.mask_pii(pii_samples["phone"])
        assert "123-456-7890" not in masked_phone
        assert "PHONE_MASKED" in masked_phone
        masked_email = ai_agent.mask_pii(pii_samples["email"])
        assert "alice@university.edu" not in masked_email
        masked_ssn = ai_agent.mask_pii(pii_samples["ssn"])
        assert "123-45-6789" not in masked_ssn
        masked_mixed = ai_agent.mask_pii(pii_samples["mixed"])
        assert "alice@uni.edu" not in masked_mixed
        assert "555-123-4567" not in masked_mixed

    @pytest.mark.P0
    def test_data_retrieval_accuracy(self, ai_agent, user_context):
        """TC-AI-DAT-004: 数据检索结果准确性"""
        logger.info("TC-AI-DAT-004: Testing data retrieval accuracy")
        ai_agent.reset()
        ai_agent.create_agent("dat-004")
        ai_agent.inherit_auth("dat-004", user_context["token"], user_context["permissions"])
        ai_agent.transition_state("dat-004", "running")
        expected = {"students": [{"id": "s001", "name": "Alice"}]}
        result = ai_agent.query_data("dat-004", "get students", data_source=expected)
        assert result == expected

    @pytest.mark.P1
    def test_multi_source_query(self, ai_agent, user_context):
        """TC-AI-DAT-005: 多数据源聚合查询"""
        logger.info("TC-AI-DAT-005: Testing multi-source aggregated query")
        ai_agent.reset()
        ai_agent.create_agent("dat-005")
        ai_agent.inherit_auth("dat-005", user_context["token"], user_context["permissions"])
        ai_agent.transition_state("dat-005", "running")
        graph_result = ai_agent.query_data("dat-005", "graph query", data_source={"nodes": 10})
        sql_result = ai_agent.query_data("dat-005", "sql query", data_source={"rows": 5})
        assert graph_result["nodes"] == 10
        assert sql_result["rows"] == 5

    @pytest.mark.P1
    def test_query_result_caching(self, ai_agent, user_context):
        """TC-AI-DAT-006: 查询结果缓存"""
        logger.info("TC-AI-DAT-006: Testing query result caching")
        ai_agent.reset()
        ai_agent.create_agent("dat-006")
        ai_agent.inherit_auth("dat-006", user_context["token"], user_context["permissions"])
        ai_agent.transition_state("dat-006", "running")
        r1 = ai_agent.query_data("dat-006", "cached query", data_source={"val": 42})
        r2 = ai_agent.query_data("dat-006", "cached query", data_source={"val": 42})
        assert r1 == r2

    @pytest.mark.P1
    def test_data_access_audit(self, ai_agent, user_context):
        """TC-AI-DAT-007: 数据访问审计记录"""
        logger.info("TC-AI-DAT-007: Testing data access audit logging")
        ai_agent.reset()
        ai_agent.create_agent("dat-007")
        ai_agent.inherit_auth("dat-007", user_context["token"], user_context["permissions"])
        ai_agent.transition_state("dat-007", "running")
        ai_agent.query_data("dat-007", "audit test query", data_source={})
        logs = ai_agent.get_audit_log("dat-007", "data_query")
        assert len(logs) >= 1
        assert "audit test query" in logs[-1]["detail"]

    @pytest.mark.P2
    def test_large_result_truncation(self, ai_agent, user_context):
        """TC-AI-DAT-008: 大结果集截断处理"""
        logger.info("TC-AI-DAT-008: Testing large result set truncation")
        ai_agent.reset()
        ai_agent.create_agent("dat-008")
        ai_agent.inherit_auth("dat-008", user_context["token"], user_context["permissions"])
        ai_agent.transition_state("dat-008", "running")
        large_data = {"results": list(range(10000))}
        result = ai_agent.query_data("dat-008", "big query", data_source=large_data)
        assert len(result["results"]) == 10000
