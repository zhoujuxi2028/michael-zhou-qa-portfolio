import logging
import uuid

import pytest

from src.config import settings
from src.helpers.assertion_helpers import assert_valid_jwt
from src.helpers.token_factory import create_expired_jwt, verify_jwt, verify_saml_assertion

logger = logging.getLogger(__name__)


@pytest.mark.auth
class TestSAML:
    @pytest.mark.P0
    def test_saml_sso_login(self, auth_client, saml_request):
        """TC-AUTH-SSO-001: SAML SSO 登录流程正确性"""
        logger.info("TC-AUTH-SSO-001: Testing SAML SSO login flow")
        result = auth_client.saml_login(**saml_request)
        assert result["status"] == "success"
        assert "saml_response" in result
        assertion_data = result["saml_response"]
        decoded = verify_saml_assertion(assertion_data)
        assert decoded["subject"] == saml_request["username"]
        assert "email" in decoded["attributes"]

    @pytest.mark.P0
    def test_saml_assertion_signature(self, auth_client, saml_request):
        """TC-AUTH-SSO-003: SAML Assertion 签名验证"""
        logger.info("TC-AUTH-SSO-003: Testing SAML assertion signature verification")
        result = auth_client.saml_login(**saml_request)
        assertion_data = result["saml_response"]
        decoded = auth_client.verify_saml(assertion_data)
        assert decoded["subject"] == saml_request["username"]
        tampered = {**assertion_data, "signature": "tampered_signature"}
        with pytest.raises(ValueError, match="Invalid SAML assertion signature"):
            auth_client.verify_saml(tampered)

    @pytest.mark.P0
    def test_saml_slo(self, auth_client, saml_request):
        """TC-AUTH-SSO-005: SSO 登出（SAML SLO）"""
        logger.info("TC-AUTH-SSO-005: Testing SAML SLO")
        login_result = auth_client.saml_login(**saml_request)
        session_id = login_result["session_id"]
        logout_result = auth_client.saml_logout(saml_request["username"], session_id)
        assert logout_result["status"] == "success"

    @pytest.mark.P1
    def test_multi_tenant_sp_isolation(self, auth_client):
        """TC-AUTH-SSO-007: 多租户 SP 隔离"""
        logger.info("TC-AUTH-SSO-007: Testing multi-tenant SP isolation")
        result_a = auth_client.saml_login("tenant_a_user", "tenanta123", tenant="tenant_a")
        assert result_a["status"] == "success"
        result_cross = auth_client.saml_login("tenant_a_user", "tenanta123", tenant="tenant_b")
        assert result_cross.get("status") == "error"
        assert result_cross.get("code") == 403

    @pytest.mark.P1
    def test_invalid_saml_assertion_rejected(self, auth_client):
        """TC-AUTH-SSO-008: 无效 SAML Assertion 拒绝"""
        logger.info("TC-AUTH-SSO-008: Testing invalid SAML assertion rejection")
        result = auth_client.saml_login("nonexistent", "wrongpass")
        assert result.get("status") == "error"
        assert result.get("code") == 401

    @pytest.mark.P2
    def test_replay_attack_detection(self, auth_client):
        """TC-AUTH-SSO-011: Replay Attack 重放攻击检测"""
        logger.info("TC-AUTH-SSO-011: Testing replay attack detection")
        assertion_id = f"_saml_{uuid.uuid4().hex}"
        result1 = auth_client.check_replay(assertion_id)
        assert result1["status"] == "success"
        result2 = auth_client.check_replay(assertion_id)
        assert result2["status"] == "error"

    @pytest.mark.P2
    def test_idp_metadata_parsing(self, auth_client):
        """TC-AUTH-SSO-012: IdP Metadata 解析与验证"""
        logger.info("TC-AUTH-SSO-012: Testing IdP metadata parsing")
        metadata = auth_client.get_idp_metadata()
        assert "issuer" in metadata
        assert "sso_url" in metadata
        assert "slo_url" in metadata
        assert "supported_bindings" in metadata


@pytest.mark.auth
class TestOIDC:
    @pytest.mark.P0
    def test_oidc_authorization_code(self, auth_client, oidc_request):
        """TC-AUTH-SSO-002: OIDC Authorization Code 流程"""
        logger.info("TC-AUTH-SSO-002: Testing OIDC authorization code flow")
        result = auth_client.oidc_login(**oidc_request)
        assert result["status"] == "success"
        assert "access_token" in result
        assert "id_token" in result
        assert "refresh_token" in result
        assert result["token_type"] == "Bearer"

    @pytest.mark.P0
    def test_oidc_id_token_claims(self, auth_client, oidc_request):
        """TC-AUTH-SSO-004: OIDC ID Token 声明验证"""
        logger.info("TC-AUTH-SSO-004: Testing OIDC ID token claims")
        result = auth_client.oidc_login(**oidc_request)
        decoded = assert_valid_jwt(
            result["id_token"],
            settings.sso_secret_key,
            required_claims=["sub", "email", "name", "roles", "iss", "aud", "exp", "iat"],
        )
        assert decoded["sub"] == oidc_request["username"]
        assert decoded["aud"] == oidc_request["client_id"]

    @pytest.mark.P0
    def test_oidc_token_refresh(self, auth_client, oidc_request):
        """TC-AUTH-SSO-006: OIDC Token 刷新"""
        logger.info("TC-AUTH-SSO-006: Testing OIDC token refresh")
        login_result = auth_client.oidc_login(**oidc_request)
        refresh_result = auth_client.oidc_refresh(login_result["refresh_token"])
        assert refresh_result["status"] == "success"
        assert "access_token" in refresh_result
        assert refresh_result["access_token"] != login_result["access_token"]

    @pytest.mark.P1
    def test_token_expiration(self, auth_client):
        """TC-AUTH-SSO-009: Token 过期处理"""
        logger.info("TC-AUTH-SSO-009: Testing token expiration handling")
        expired_token = create_expired_jwt({"sub": "student001", "scope": "openid"})
        with pytest.raises(Exception):
            auth_client.verify_token(expired_token)

    @pytest.mark.P1
    def test_concurrent_login_sessions(self, auth_client, oidc_request):
        """TC-AUTH-SSO-010: 并发登录会话管理"""
        logger.info("TC-AUTH-SSO-010: Testing concurrent login sessions")
        session_ids = set()
        for _ in range(3):
            result = auth_client.oidc_login(**oidc_request)
            assert result["status"] == "success"
            session_ids.add(result["session_id"])
        assert len(session_ids) == 3
