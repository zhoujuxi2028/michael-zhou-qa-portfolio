import logging

import pytest

from src.config import settings
from src.mock_services.ldap_server import LDAPAuthError, LDAPInjectionError

logger = logging.getLogger(__name__)


@pytest.mark.auth
class TestLDAPBind:
    @pytest.mark.P0
    def test_simple_bind_success(self, ldap_server):
        """TC-AUTH-LDAP-001: Simple Bind 认证成功"""
        logger.info("TC-AUTH-LDAP-001: Testing simple bind authentication")
        conn_id = ldap_server.bind(
            f"uid=student001,ou=students,{settings.ldap_base_dn}", "pass123"
        )
        assert conn_id is not None

    @pytest.mark.P0
    def test_invalid_credentials_rejected(self, ldap_server):
        """TC-AUTH-LDAP-002: 无效凭据 Bind 拒绝"""
        logger.info("TC-AUTH-LDAP-002: Testing invalid credentials rejection")
        with pytest.raises(LDAPAuthError):
            ldap_server.bind(
                f"uid=student001,ou=students,{settings.ldap_base_dn}", "wrongpass"
            )

    @pytest.mark.P0
    def test_ldap_injection_defense(self, ldap_server, ldap_connection):
        """TC-AUTH-LDAP-004: LDAP 注入防御"""
        logger.info("TC-AUTH-LDAP-004: Testing LDAP injection defense")
        injection_payloads = [
            "uid=*)(objectClass=*",
            "uid=admin)(|(password=*)",
            "*()|&",
        ]
        for payload in injection_payloads:
            with pytest.raises(LDAPInjectionError):
                ldap_server.search(ldap_connection, settings.ldap_base_dn, payload)


@pytest.mark.auth
class TestLDAPSearch:
    @pytest.mark.P0
    def test_user_search_by_uid(self, ldap_server, ldap_connection):
        """TC-AUTH-LDAP-003: 用户搜索（按 UID/邮箱）"""
        logger.info("TC-AUTH-LDAP-003: Testing user search by UID")
        result = ldap_server.search(
            ldap_connection, settings.ldap_base_dn, "uid=student001"
        )
        assert result["total"] >= 1
        found = result["results"][0]
        assert found["attributes"]["uid"] == "student001"
        assert found["attributes"]["mail"] == "student001@university.edu"

    @pytest.mark.P1
    def test_ou_tree_traversal(self, ldap_server, ldap_connection):
        """TC-AUTH-LDAP-005: 组织树查询（OU 遍历）"""
        logger.info("TC-AUTH-LDAP-005: Testing OU tree traversal")
        result = ldap_server.search(
            ldap_connection,
            f"ou=students,{settings.ldap_base_dn}",
            "objectClass=inetOrgPerson",
            scope="subtree",
        )
        assert result["total"] >= 1
        for entry in result["results"]:
            assert "ou=students" in entry["dn"]

    @pytest.mark.P1
    def test_user_attribute_modify(self, ldap_server, ldap_connection):
        """TC-AUTH-LDAP-006: 用户属性修改"""
        logger.info("TC-AUTH-LDAP-006: Testing user attribute modification")
        dn = f"uid=student002,ou=students,{settings.ldap_base_dn}"
        result = ldap_server.modify(ldap_connection, dn, {"mail": "newemail@university.edu"})
        assert result is True
        search_result = ldap_server.search(ldap_connection, settings.ldap_base_dn, "uid=student002")
        assert search_result["results"][0]["attributes"]["mail"] == "newemail@university.edu"
        ldap_server.modify(ldap_connection, dn, {"mail": "student002@university.edu"})

    @pytest.mark.P1
    def test_paged_search(self, ldap_server, ldap_connection):
        """TC-AUTH-LDAP-007: 分页查询（大结果集）"""
        logger.info("TC-AUTH-LDAP-007: Testing paged search")
        result = ldap_server.search(
            ldap_connection, settings.ldap_base_dn, "objectClass=top", page_size=2
        )
        assert len(result["results"]) <= 2
        assert result["total"] > 2
        if result["cookie"]:
            page2 = ldap_server.search(
                ldap_connection, settings.ldap_base_dn, "objectClass=top",
                page_size=2, page_cookie=result["cookie"],
            )
            assert len(page2["results"]) >= 1

    @pytest.mark.P1
    def test_connection_pool(self, ldap_server):
        """TC-AUTH-LDAP-008: 连接池管理"""
        logger.info("TC-AUTH-LDAP-008: Testing connection pool management")
        conns = []
        for _ in range(3):
            conn = ldap_server.get_connection()
            conns.append(conn)
        assert ldap_server.pool_size() == 3
        for conn in conns:
            ldap_server.release_connection(conn)

    @pytest.mark.P2
    def test_tls_connection(self, ldap_server):
        """TC-AUTH-LDAP-009: TLS/STARTTLS 连接验证"""
        logger.info("TC-AUTH-LDAP-009: Testing TLS connection")
        assert not ldap_server.is_tls_enabled()
        ldap_server.enable_tls()
        assert ldap_server.is_tls_enabled()
        conn_id = ldap_server.bind(settings.ldap_admin_dn, settings.ldap_admin_password)
        assert conn_id is not None
        ldap_server._tls_enabled = False

    @pytest.mark.P2
    def test_anonymous_bind_restricted(self, ldap_server):
        """TC-AUTH-LDAP-010: Anonymous Bind 限制"""
        logger.info("TC-AUTH-LDAP-010: Testing anonymous bind restriction")
        with pytest.raises(LDAPAuthError, match="Anonymous bind not allowed"):
            ldap_server.bind("", "")
        ldap_server.set_anonymous_access(True)
        conn_id = ldap_server.bind("", "")
        assert conn_id is not None
        with pytest.raises(LDAPAuthError, match="Anonymous bind"):
            ldap_server.search(conn_id, settings.ldap_base_dn, "uid=student001")
            ldap_server.modify(conn_id, f"uid=student001,ou=students,{settings.ldap_base_dn}", {"cn": "hacked"})
        ldap_server.set_anonymous_access(False)
