import logging

import pytest

from src.mock_services.session_manager import SessionError, SessionManager

logger = logging.getLogger(__name__)


@pytest.mark.auth
class TestSessionLifecycle:
    @pytest.mark.P0
    def test_session_creation(self, session_store):
        """TC-AUTH-SES-001: 会话创建与存储"""
        logger.info("TC-AUTH-SES-001: Testing session creation and storage")
        session = session_store.create_session("user001", {"device": "laptop"})
        assert session["session_id"] is not None
        assert session["user_id"] == "user001"
        assert session["valid"] is True

    @pytest.mark.P0
    def test_session_timeout(self, session_manager):
        """TC-AUTH-SES-002: 会话超时（绝对/空闲）"""
        logger.info("TC-AUTH-SES-002: Testing session timeout")
        mgr = SessionManager(absolute_timeout=1, idle_timeout=1)
        session = mgr.create_session("user002")
        validated = mgr.validate_session(session["session_id"])
        assert validated["valid"] is True
        import time
        time.sleep(1.1)
        with pytest.raises(SessionError, match="expired"):
            mgr.validate_session(session["session_id"])

    @pytest.mark.P0
    def test_session_fixation_defense(self, session_store):
        """TC-AUTH-SES-003: Session Fixation 防御"""
        logger.info("TC-AUTH-SES-003: Testing session fixation defense")
        session = session_store.create_session("user003")
        old_id = session["session_id"]
        new_session = session_store.regenerate_session_id(old_id)
        assert new_session["session_id"] != old_id
        with pytest.raises(SessionError):
            session_store.validate_session(old_id)
        validated = session_store.validate_session(new_session["session_id"])
        assert validated["valid"] is True

    @pytest.mark.P0
    def test_concurrent_session_limit(self, session_manager):
        """TC-AUTH-SES-004: 并发会话数限制"""
        logger.info("TC-AUTH-SES-004: Testing concurrent session limit")
        mgr = SessionManager(max_concurrent=2)
        mgr.create_session("user004")
        mgr.create_session("user004")
        with pytest.raises(SessionError, match="Max concurrent"):
            mgr.create_session("user004")


@pytest.mark.auth
class TestSessionSecurity:
    @pytest.mark.P1
    def test_invalidated_session_rejected(self, session_store):
        """TC-AUTH-SES-005: 会话失效后拒绝请求"""
        logger.info("TC-AUTH-SES-005: Testing invalidated session rejection")
        session = session_store.create_session("user005")
        session_store.invalidate_session(session["session_id"])
        with pytest.raises(SessionError, match="invalidated"):
            session_store.validate_session(session["session_id"])

    @pytest.mark.P1
    def test_cross_device_session(self, session_store):
        """TC-AUTH-SES-006: 跨设备会话管理"""
        logger.info("TC-AUTH-SES-006: Testing cross-device session management")
        s1 = session_store.create_session("user006", {"device": "laptop"})
        s2 = session_store.create_session("user006", {"device": "mobile"})
        sessions = session_store.get_user_sessions("user006")
        assert len(sessions) >= 2
        devices = {s["device"] for s in sessions}
        assert "laptop" in devices
        assert "mobile" in devices

    @pytest.mark.P1
    def test_session_data_encryption(self, session_store):
        """TC-AUTH-SES-007: 会话数据加密存储"""
        logger.info("TC-AUTH-SES-007: Testing session data encryption")
        session = session_store.create_session("user007", {"secret": "sensitive-data"})
        raw_metadata = session["metadata"]
        assert "sensitive-data" not in raw_metadata
        decrypted = session_store.get_session_data(session["session_id"])
        assert "sensitive-data" in decrypted

    @pytest.mark.P2
    def test_session_renewal(self, session_store):
        """TC-AUTH-SES-008: 会话续期机制"""
        logger.info("TC-AUTH-SES-008: Testing session renewal")
        session = session_store.create_session("user008")
        old_expires = session["expires_at"]
        import time
        time.sleep(0.1)
        renewed = session_store.renew_session(session["session_id"])
        assert renewed["expires_at"] >= old_expires
