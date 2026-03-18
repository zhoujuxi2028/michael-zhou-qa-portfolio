import pytest

from src.clients.auth_client import AuthClient
from src.config import settings
from src.constants.test_users import STUDENT_001


@pytest.fixture
def test_user():
    return {
        "username": STUDENT_001["uid"],
        "password": STUDENT_001["password"],
        "uid": STUDENT_001["uid"],
        "email": STUDENT_001["email"],
        "display_name": STUDENT_001["display_name"],
        "roles": list(STUDENT_001["roles"]),
        "tenant": STUDENT_001["tenant"],
    }


@pytest.fixture
def saml_request(test_user):
    return {
        "username": test_user["username"],
        "password": test_user["password"],
        "sp_entity_id": "https://sp.university.edu",
        "tenant": "default",
    }


@pytest.fixture
def oidc_request(test_user):
    return {
        "username": test_user["username"],
        "password": test_user["password"],
        "client_id": "test-client",
        "tenant": "default",
    }


@pytest.fixture
def ldap_connection(ldap_server):
    conn_id = ldap_server.bind(settings.ldap_admin_dn, settings.ldap_admin_password)
    yield conn_id


@pytest.fixture
def auth_client(sso_provider, ldap_server, kerberos_kdc, zero_trust_engine, session_manager, mfa_provider):
    return AuthClient(
        sso_client=sso_provider,
        ldap_server=ldap_server,
        kerberos_kdc=kerberos_kdc,
        zero_trust_engine=zero_trust_engine,
        session_manager=session_manager,
        mfa_provider=mfa_provider,
    )


@pytest.fixture
def kerberos_ticket(kerberos_kdc):
    tgt = kerberos_kdc.request_tgt(f"student001@{settings.krb_realm}", "pass123")
    return tgt


@pytest.fixture
def zero_trust_context():
    return {
        "user_id": "student001",
        "device": {
            "device_id": "dev-001",
            "os_version": "macOS 14.0",
            "antivirus": True,
            "encryption": True,
            "os_patched": True,
            "firewall": True,
            "compliant": True,
        },
        "geo_anomaly": False,
        "hour": 10,
        "ip": "10.0.1.50",
    }


@pytest.fixture
def session_store(session_manager):
    session_manager.reset()
    return session_manager


@pytest.fixture
def mfa_secret(mfa_provider):
    mfa_provider.reset()
    reg = mfa_provider.register("student001")
    return reg
