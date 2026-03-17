import logging
import time

import pytest

from src.mock_services.ai_agent import AgentError, AgentState

logger = logging.getLogger(__name__)


@pytest.mark.ai
class TestAgentLifecycle:
    @pytest.mark.P0
    def test_agent_creation(self, ai_agent):
        """TC-AI-LCY-001: Agent 创建"""
        logger.info("TC-AI-LCY-001: Testing agent creation")
        ai_agent.reset()
        agent = ai_agent.create_agent("lcy-001")
        assert agent["agent_id"] == "lcy-001"
        assert agent["state"] == AgentState.CREATED

    @pytest.mark.P0
    def test_state_transitions(self, ai_agent):
        """TC-AI-LCY-002: Agent 状态转换（创建→运行→停止）"""
        logger.info("TC-AI-LCY-002: Testing agent state transitions")
        ai_agent.reset()
        agent = ai_agent.create_agent("lcy-002")
        assert agent["state"] == AgentState.CREATED
        agent = ai_agent.transition_state("lcy-002", "running")
        assert agent["state"] == AgentState.RUNNING
        agent = ai_agent.transition_state("lcy-002", "stopped")
        assert agent["state"] == AgentState.STOPPED

    @pytest.mark.P0
    def test_agent_deletion(self, ai_agent):
        """TC-AI-LCY-003: Agent 删除与清理"""
        logger.info("TC-AI-LCY-003: Testing agent deletion and cleanup")
        ai_agent.reset()
        ai_agent.create_agent("lcy-003")
        ai_agent.delete_agent("lcy-003")
        with pytest.raises(AgentError, match="not found"):
            ai_agent.transition_state("lcy-003", "running")

    @pytest.mark.P1
    def test_max_concurrent_limit(self, ai_agent):
        """TC-AI-LCY-004: 资源限制（最大并发 Agent 数）"""
        logger.info("TC-AI-LCY-004: Testing max concurrent agent limit")
        ai_agent.reset()
        ai_agent._max_agents = 3
        for i in range(3):
            ai_agent.create_agent(f"limit-{i}")
        with pytest.raises(AgentError, match="Max concurrent"):
            ai_agent.create_agent("limit-overflow")
        ai_agent._max_agents = 10

    @pytest.mark.P1
    def test_config_update(self, ai_agent):
        """TC-AI-LCY-005: Agent 配置更新"""
        logger.info("TC-AI-LCY-005: Testing agent config update")
        ai_agent.reset()
        agent = ai_agent.create_agent("lcy-005", {"model": "v1"})
        assert agent["config"]["model"] == "v1"
        updated = ai_agent.update_config("lcy-005", {"model": "v2", "temperature": 0.7})
        assert updated["config"]["model"] == "v2"
        assert updated["config"]["temperature"] == 0.7

    @pytest.mark.P1
    def test_error_recovery(self, ai_agent):
        """TC-AI-LCY-006: Agent 异常恢复"""
        logger.info("TC-AI-LCY-006: Testing agent error recovery")
        ai_agent.reset()
        agent = ai_agent.create_agent("lcy-006")
        ai_agent.transition_state("lcy-006", "running")
        ai_agent.transition_state("lcy-006", "error")
        assert ai_agent._agents["lcy-006"]["state"] == AgentState.ERROR
        recovered = ai_agent.transition_state("lcy-006", "running")
        assert recovered["state"] == AgentState.RUNNING

    @pytest.mark.P2
    def test_invalid_state_transition(self, ai_agent):
        """TC-AI-LCY-007: 非法状态转换拒绝"""
        logger.info("TC-AI-LCY-007: Testing invalid state transition rejection")
        ai_agent.reset()
        ai_agent.create_agent("lcy-007")
        ai_agent.transition_state("lcy-007", "running")
        ai_agent.transition_state("lcy-007", "stopped")
        with pytest.raises(AgentError, match="Invalid state transition"):
            ai_agent.transition_state("lcy-007", "running")

    @pytest.mark.P2
    def test_agent_timeout(self, ai_agent):
        """TC-AI-LCY-008: Agent 超时自动停止"""
        logger.info("TC-AI-LCY-008: Testing agent timeout auto-stop")
        ai_agent.reset()
        ai_agent.create_agent("lcy-008")
        ai_agent.transition_state("lcy-008", "running")
        ai_agent.set_timeout("lcy-008", 0.1)
        time.sleep(0.15)
        timed_out = ai_agent.check_timeout("lcy-008")
        assert timed_out is True
        assert ai_agent._agents["lcy-008"]["state"] == AgentState.STOPPED
