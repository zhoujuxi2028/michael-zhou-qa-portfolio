import pytest
from fastapi.testclient import TestClient

from src.mock_services.sso_provider import app as sso_app, reset as sso_reset
from src.mock_services.ldap_server import MockLDAPServer
from src.mock_services.kerberos_kdc import MockKerberosKDC
from src.mock_services.zero_trust_engine import ZeroTrustEngine
from src.mock_services.session_manager import SessionManager
from src.mock_services.mfa_provider import MFAProvider


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


@pytest.fixture(scope="session")
def kerberos_kdc():
    kdc = MockKerberosKDC()
    yield kdc
    kdc.reset()


@pytest.fixture(scope="session")
def zero_trust_engine():
    engine = ZeroTrustEngine()
    yield engine
    engine.reset()


@pytest.fixture(scope="session")
def session_manager():
    mgr = SessionManager(absolute_timeout=3600, idle_timeout=1800, max_concurrent=5)
    yield mgr
    mgr.reset()


@pytest.fixture(scope="session")
def mfa_provider():
    provider = MFAProvider()
    yield provider
    provider.reset()
