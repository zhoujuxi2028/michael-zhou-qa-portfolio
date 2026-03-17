import pytest

from src.clients.auth_client import AuthClient
from src.config import settings


@pytest.fixture
def test_user():
    return {
        "username": "student001",
        "password": "pass123",
        "uid": "student001",
        "email": "student001@university.edu",
        "display_name": "Test Student",
        "roles": ["student"],
        "tenant": "default",
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
def auth_client(sso_provider, ldap_server):
    return AuthClient(sso_client=sso_provider, ldap_server=ldap_server)
