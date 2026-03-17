import pytest
from fastapi.testclient import TestClient

from src.mock_services.sso_provider import app as sso_app, reset as sso_reset
from src.mock_services.ldap_server import MockLDAPServer
from src.mock_services.kerberos_kdc import MockKerberosKDC
from src.mock_services.zero_trust_engine import ZeroTrustEngine
from src.mock_services.session_manager import SessionManager
from src.mock_services.mfa_provider import MFAProvider
from src.mock_services.graph_db import MockGraphDB
from src.mock_services.pipeline_engine import MockPipelineEngine
from src.mock_services.data_warehouse import MockDataWarehouse
from src.mock_services.tag_store import MockTagStore
from src.mock_services.analytics_engine import AnalyticsEngine
from src.mock_services.ai_agent import MockAIAgent


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


@pytest.fixture(scope="session")
def graph_db():
    db = MockGraphDB()
    yield db
    db.reset()


@pytest.fixture(scope="session")
def pipeline_engine():
    engine = MockPipelineEngine()
    yield engine
    engine.reset()


@pytest.fixture(scope="session")
def data_warehouse():
    wh = MockDataWarehouse()
    yield wh
    wh.reset()


@pytest.fixture(scope="session")
def tag_store():
    store = MockTagStore()
    yield store
    store.reset()


@pytest.fixture(scope="session")
def analytics_engine(data_warehouse):
    engine = AnalyticsEngine(warehouse=data_warehouse)
    yield engine
    engine.reset()


@pytest.fixture(scope="session")
def ai_agent():
    agent = MockAIAgent()
    yield agent
    agent.reset()
