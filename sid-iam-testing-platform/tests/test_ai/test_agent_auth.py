import logging

import pytest

from src.helpers.token_factory import create_expired_jwt
from src.mock_services.ai_agent import AgentError

logger = logging.getLogger(__name__)


@pytest.mark.ai
class TestAgentAuth:
    @pytest.mark.P0
    def test_inherit_user_token(self, ai_agent, user_context):
        """TC-AI-AUTH-001: Agent 继承用户 SSO Token"""
        logger.info("TC-AI-AUTH-001: Testing agent inherits user SSO token")
        ai_agent.reset()
        ai_agent.create_agent("auth-001")
        agent = ai_agent.inherit_auth("auth-001", user_context["token"], user_context["permissions"])
        assert agent["auth_context"] is not None
        assert agent["auth_context"]["token"] == user_context["token"]

    @pytest.mark.P0
    def test_permission_not_exceed_user(self, ai_agent, user_context):
        """TC-AI-AUTH-002: Agent 权限不超过用户权限"""
        logger.info("TC-AI-AUTH-002: Testing agent permissions don't exceed user")
        ai_agent.reset()
        ai_agent.create_agent("auth-002")
        ai_agent.inherit_auth("auth-002", user_context["token"], user_context["permissions"])
        assert ai_agent.check_permission("auth-002", "read:own_grades") is True
        assert ai_agent.check_permission("auth-002", "write:grades") is False

    @pytest.mark.P0
    def test_privilege_escalation_defense(self, ai_agent, user_context):
        """TC-AI-AUTH-003: 权限提升攻击防御"""
        logger.info("TC-AI-AUTH-003: Testing privilege escalation defense")
        ai_agent.reset()
        ai_agent.create_agent("auth-003")
        ai_agent.inherit_auth("auth-003", user_context["token"], user_context["permissions"])
        result = ai_agent.check_privilege_escalation("auth-003", {"write:grades", "admin:delete"})
        assert result["escalation_detected"] is True
        assert "admin:delete" in result["attempted"]

    @pytest.mark.P0
    def test_expired_token_rejected(self, ai_agent):
        """TC-AI-AUTH-004: Token 过期后 Agent 操作拒绝"""
        logger.info("TC-AI-AUTH-004: Testing expired token rejection")
        ai_agent.reset()
        ai_agent.create_agent("auth-004")
        ai_agent.inherit_auth("auth-004", None, set())
        with pytest.raises(AgentError, match="Token expired"):
            ai_agent.check_permission("auth-004", "read:anything")

    @pytest.mark.P1
    def test_multi_role_permission_merge(self, ai_agent, teacher_context):
        """TC-AI-AUTH-005: 多角色用户权限合并"""
        logger.info("TC-AI-AUTH-005: Testing multi-role permission merge")
        ai_agent.reset()
        ai_agent.create_agent("auth-005")
        ai_agent.inherit_auth("auth-005", teacher_context["token"], teacher_context["permissions"])
        assert ai_agent.check_permission("auth-005", "read:class_grades") is True
        assert ai_agent.check_permission("auth-005", "write:grades") is True
        assert ai_agent.check_permission("auth-005", "query:courses") is True

    @pytest.mark.P1
    def test_permission_propagation(self, ai_agent, user_context):
        """TC-AI-AUTH-006: 权限上下文传递（Agent→子服务）"""
        logger.info("TC-AI-AUTH-006: Testing permission context propagation")
        ai_agent.reset()
        ai_agent.create_agent("auth-006")
        ai_agent.inherit_auth("auth-006", user_context["token"], user_context["permissions"])
        ai_agent.transition_state("auth-006", "running")
        result = ai_agent.query_data("auth-006", "SELECT grades", data_source={"grades": [95]})
        assert result == {"grades": [95]}

    @pytest.mark.P1
    def test_anonymous_user_restricted(self, ai_agent):
        """TC-AI-AUTH-007: 匿名用户 Agent 限制"""
        logger.info("TC-AI-AUTH-007: Testing anonymous user agent restriction")
        ai_agent.reset()
        ai_agent.create_agent("auth-007")
        with pytest.raises(AgentError, match="No auth context"):
            ai_agent.check_permission("auth-007", "read:anything")

    @pytest.mark.P2
    def test_permission_cache_consistency(self, ai_agent, user_context):
        """TC-AI-AUTH-008: 权限缓存一致性"""
        logger.info("TC-AI-AUTH-008: Testing permission cache consistency")
        ai_agent.reset()
        ai_agent.create_agent("auth-008")
        ai_agent.inherit_auth("auth-008", user_context["token"], user_context["permissions"])
        assert ai_agent.check_permission("auth-008", "read:own_grades") is True
        new_perms = {"read:own_profile"}
        ai_agent.inherit_auth("auth-008", user_context["token"], new_perms)
        assert ai_agent.check_permission("auth-008", "read:own_grades") is False
        assert ai_agent.check_permission("auth-008", "read:own_profile") is True
