import logging

import pytest

from src.mock_services.mfa_provider import MFAError

logger = logging.getLogger(__name__)


@pytest.mark.auth
class TestMFA:
    @pytest.mark.P0
    def test_totp_generation_verification(self, mfa_provider, mfa_secret):
        """TC-AUTH-MFA-001: TOTP 码生成与验证"""
        logger.info("TC-AUTH-MFA-001: Testing TOTP code generation and verification")
        secret = mfa_secret["secret"]
        code = mfa_provider.generate_totp(secret)
        assert len(code) == 6
        assert code.isdigit()
        result = mfa_provider.verify("student001", code)
        assert result is True

    @pytest.mark.P0
    def test_mfa_registration(self, mfa_provider):
        """TC-AUTH-MFA-002: MFA 注册流程"""
        logger.info("TC-AUTH-MFA-002: Testing MFA registration flow")
        reg = mfa_provider.register("new_user_mfa")
        assert "secret" in reg
        assert len(reg["recovery_codes"]) == 8
        assert mfa_provider.is_registered("new_user_mfa")

    @pytest.mark.P1
    def test_invalid_totp_rejected(self, mfa_provider, mfa_secret):
        """TC-AUTH-MFA-003: 无效 TOTP 码拒绝"""
        logger.info("TC-AUTH-MFA-003: Testing invalid TOTP code rejection")
        with pytest.raises(MFAError, match="Invalid TOTP"):
            mfa_provider.verify("student001", "000000")

    @pytest.mark.P1
    def test_mfa_bypass_detection(self, mfa_provider, mfa_secret):
        """TC-AUTH-MFA-004: MFA 绕过检测"""
        logger.info("TC-AUTH-MFA-004: Testing MFA bypass detection")
        result = mfa_provider.check_bypass_attempt("student001", {"X-Skip-MFA": "true"})
        assert result["bypass_detected"] is True
        result = mfa_provider.check_bypass_attempt("student001", {"X-MFA-Bypass": "1"})
        assert result["bypass_detected"] is True
        result = mfa_provider.check_bypass_attempt("student001", {})
        assert result["bypass_detected"] is False

    @pytest.mark.P1
    def test_recovery_code(self, mfa_provider, mfa_secret):
        """TC-AUTH-MFA-005: 恢复码机制"""
        logger.info("TC-AUTH-MFA-005: Testing recovery code mechanism")
        codes = mfa_secret["recovery_codes"]
        result = mfa_provider.use_recovery_code("student001", codes[0])
        assert result["remaining_codes"] == 7
        with pytest.raises(MFAError, match="Invalid recovery code"):
            mfa_provider.use_recovery_code("student001", codes[0])

    @pytest.mark.P2
    def test_totp_time_window_tolerance(self, mfa_provider, mfa_secret):
        """TC-AUTH-MFA-006: TOTP 时间窗口容忍"""
        logger.info("TC-AUTH-MFA-006: Testing TOTP time window tolerance")
        import time
        secret = mfa_secret["secret"]
        current_code = mfa_provider.generate_totp(secret, time.time())
        result = mfa_provider.verify("student001", current_code)
        assert result is True
        adjacent_code = mfa_provider.generate_totp(secret, time.time() - mfa_provider.time_step)
        result = mfa_provider.verify("student001", adjacent_code)
        assert result is True
