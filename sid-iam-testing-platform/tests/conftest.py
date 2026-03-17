import pytest
from fastapi.testclient import TestClient

from src.mock_services.sso_provider import app as sso_app, reset as sso_reset
from src.mock_services.ldap_server import MockLDAPServer


@pytest.fixture(scope="session")
def sso_provider():
    sso_reset()
    client = TestClient(sso_app)
    yield client


@pytest.fixture(scope="session")
def ldap_server():
    server = MockLDAPServer()
    yield server
    server.reset()
