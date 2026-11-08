import logging

import pytest

from src.config import settings
from src.mock_services.kerberos_kdc import KerberosError

logger = logging.getLogger(__name__)


@pytest.mark.auth
class TestKerberosTGT:
    @pytest.mark.P0
    def test_tgt_request(self, kerberos_kdc):
        """TC-AUTH-KRB-001: TGT 请求与签发"""
        logger.info("TC-AUTH-KRB-001: Testing TGT request and issuance")
        tgt = kerberos_kdc.request_tgt(f"student001@{settings.krb_realm}", "pass123")
        assert tgt["type"] == "TGT"
        assert tgt["principal"] == f"student001@{settings.krb_realm}"
        assert tgt["realm"] == settings.krb_realm
        assert "session_key" in tgt

    @pytest.mark.P0
    def test_service_ticket_request(self, kerberos_kdc, kerberos_ticket):
        """TC-AUTH-KRB-002: Service Ticket 请求"""
        logger.info("TC-AUTH-KRB-002: Testing service ticket request")
        service = f"HTTP/webapp.{settings.krb_realm.lower()}@{settings.krb_realm}"
        st = kerberos_kdc.request_service_ticket(kerberos_ticket, service)
        assert st["type"] == "ST"
        assert st["service"] == service
        assert st["principal"] == kerberos_ticket["principal"]

    @pytest.mark.P0
    def test_ticket_expiration_renewal(self, kerberos_kdc, kerberos_ticket):
        """TC-AUTH-KRB-003: 票据过期与续期"""
        logger.info("TC-AUTH-KRB-003: Testing ticket expiration and renewal")
        validated = kerberos_kdc.validate_ticket(kerberos_ticket)
        assert validated is not None
        renewed = kerberos_kdc.renew_ticket(kerberos_ticket)
        assert renewed["ticket_id"] == kerberos_ticket["ticket_id"]


@pytest.mark.auth
class TestKerberosSecurity:
    @pytest.mark.P1
    def test_replay_detection(self, kerberos_kdc, kerberos_ticket):
        """TC-AUTH-KRB-004: 重放攻击检测（时间戳校验）"""
        logger.info("TC-AUTH-KRB-004: Testing replay attack detection")
        timestamp = "2024-01-01T12:00:00Z"
        kerberos_kdc.check_replay(kerberos_ticket["ticket_id"], timestamp)
        with pytest.raises(KerberosError, match="Replay"):
            kerberos_kdc.check_replay(kerberos_ticket["ticket_id"], timestamp)

    @pytest.mark.P1
    def test_cross_realm_authorization(self, kerberos_kdc, kerberos_ticket):
        """TC-AUTH-KRB-005: 跨域票据授权（cross-realm）"""
        logger.info("TC-AUTH-KRB-005: Testing cross-realm ticket authorization")
        remote_realm = "PARTNER.EDU"
        with pytest.raises(KerberosError, match="No trust"):
            kerberos_kdc.request_service_ticket(kerberos_ticket, f"HTTP/app@{remote_realm}")
        kerberos_kdc.add_cross_realm_trust(remote_realm)
        st = kerberos_kdc.request_service_ticket(kerberos_ticket, f"HTTP/app@{remote_realm}")
        assert st["realm"] == remote_realm

    @pytest.mark.P1
    def test_key_rotation(self, kerberos_kdc):
        """TC-AUTH-KRB-006: 密钥轮换验证"""
        logger.info("TC-AUTH-KRB-006: Testing key rotation")
        old_version = kerberos_kdc._key_version
        tgt = kerberos_kdc.request_tgt(f"student001@{settings.krb_realm}", "pass123")
        assert tgt["key_version"] == old_version
        new_version = kerberos_kdc.rotate_keys()
        assert new_version == old_version + 1
        new_tgt = kerberos_kdc.request_tgt(f"student001@{settings.krb_realm}", "pass123")
        assert new_tgt["key_version"] == new_version

    @pytest.mark.P2
    def test_invalid_ticket_rejected(self, kerberos_kdc):
        """TC-AUTH-KRB-007: 无效票据拒绝"""
        logger.info("TC-AUTH-KRB-007: Testing invalid ticket rejection")
        with pytest.raises(KerberosError, match="Invalid ticket"):
            kerberos_kdc.validate_ticket("fake-ticket-id")
        with pytest.raises(KerberosError, match="Invalid principal"):
            kerberos_kdc.request_tgt("nonexistent@FAKE.REALM", "wrongpass")

    @pytest.mark.P2
    def test_ticket_cache(self, kerberos_kdc):
        """TC-AUTH-KRB-008: 票据缓存管理"""
        logger.info("TC-AUTH-KRB-008: Testing ticket cache management")
        principal = f"teacher001@{settings.krb_realm}"
        kerberos_kdc.request_tgt(principal, "teach123")
        kerberos_kdc.request_tgt(principal, "teach123")
        cache = kerberos_kdc.get_ticket_cache(principal)
        assert len(cache) >= 2
        kerberos_kdc.invalidate_ticket(cache[0]["ticket_id"])
        updated_cache = kerberos_kdc.get_ticket_cache(principal)
        assert len(updated_cache) < len(cache)
