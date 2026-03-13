"""
Pytest Configuration and Fixtures for Security Testing

Provides common fixtures for ZAP connection, Nessus scanning, target URLs, and test setup.
"""

import os
import sys
import pytest
import requests
from dotenv import load_dotenv

# Add project root to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.nessus_helper import NessusHelper
from utils.openvas_helper import OpenVASHelper

# Load environment variables
load_dotenv()

# Disable system proxy for localhost connections
os.environ["NO_PROXY"] = "localhost,127.0.0.1"
os.environ["no_proxy"] = "localhost,127.0.0.1"


# Configuration
class Config:
    """Test configuration from environment variables."""

    ZAP_HOST = os.getenv("ZAP_HOST", "localhost")
    ZAP_PORT = int(os.getenv("ZAP_PORT", 8090))
    ZAP_API_KEY = os.getenv("ZAP_API_KEY", "")

    TARGET_URL = os.getenv("TARGET_URL", "http://localhost")
    DVWA_URL = os.getenv("DVWA_URL", "http://localhost")
    DVWA_USERNAME = os.getenv("DVWA_USERNAME", "admin")
    DVWA_PASSWORD = os.getenv("DVWA_PASSWORD", "password")

    # Juice Shop configuration
    JUICE_SHOP_URL = os.getenv("JUICE_SHOP_URL", "http://localhost:3000")
    JUICE_SHOP_API_URL = os.getenv("JUICE_SHOP_API_URL", "http://localhost:3000/api")


@pytest.fixture(scope="session")
def config():
    """Provide test configuration."""
    return Config()


@pytest.fixture(scope="session")
def zap_client(config):
    """Create ZAP API client.

    Returns:
        ZAPv2 client instance or None if not available
    """
    try:
        from zapv2 import ZAPv2

        zap = ZAPv2(
            apikey=config.ZAP_API_KEY,
            proxies={
                "http": f"http://{config.ZAP_HOST}:{config.ZAP_PORT}",
                "https": f"http://{config.ZAP_HOST}:{config.ZAP_PORT}",
            },
        )
        # Test connection
        zap.core.version
        return zap
    except Exception:
        pytest.skip("ZAP is not available")
        return None


@pytest.fixture(scope="session")
def target_url(config):
    """Provide target URL."""
    return config.TARGET_URL


@pytest.fixture(scope="session")
def dvwa_session(config):
    """Create authenticated DVWA session.

    Returns:
        requests.Session with DVWA authentication
    """
    session = requests.Session()

    try:
        # Get login page to retrieve CSRF token
        login_url = f"{config.DVWA_URL}/login.php"
        response = session.get(login_url, timeout=10)

        if response.status_code != 200:
            pytest.skip("DVWA is not available")
            return None

        # Extract CSRF token (simplified, may need adjustment)
        csrf_token = ""
        if "user_token" in response.text:
            import re

            match = re.search(r"user_token'[^>]+value='([^']+)'", response.text)
            if match:
                csrf_token = match.group(1)

        # Login
        login_data = {
            "username": config.DVWA_USERNAME,
            "password": config.DVWA_PASSWORD,
            "Login": "Login",
            "user_token": csrf_token,
        }

        response = session.post(login_url, data=login_data, timeout=10)

        # Set security level to low for testing
        session.get(f"{config.DVWA_URL}/security.php", timeout=10)
        session.post(
            f"{config.DVWA_URL}/security.php",
            data={"security": "low", "seclev_submit": "Submit"},
            timeout=10,
        )

        return session

    except requests.RequestException:
        pytest.skip("DVWA is not available")
        return None


@pytest.fixture(scope="function")
def http_session():
    """Create clean HTTP session for each test."""
    session = requests.Session()
    yield session
    session.close()


@pytest.fixture(scope="session")
def juice_shop_url(config):
    """Provide Juice Shop URL."""
    return config.JUICE_SHOP_URL


@pytest.fixture(scope="session")
def juice_shop_api_url(config):
    """Provide Juice Shop API URL."""
    return config.JUICE_SHOP_API_URL


@pytest.fixture(scope="session")
def juice_shop_session(config):
    """Create session for Juice Shop testing.

    Returns:
        requests.Session configured for Juice Shop
    """
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Accept": "application/json",
    })

    try:
        # Verify Juice Shop is available
        response = session.get(f"{config.JUICE_SHOP_URL}/rest/admin/application-version", timeout=10)
        if response.status_code not in [200, 401, 403]:
            pytest.skip("Juice Shop is not available")
            return None
        return session
    except requests.RequestException:
        pytest.skip("Juice Shop is not available")
        return None


@pytest.fixture(scope="function")
def juice_shop_auth_session(config):
    """Create authenticated session for Juice Shop.

    Registers a test user and returns authenticated session.

    Returns:
        tuple: (session, auth_token, user_email)
    """
    import json
    import time

    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Accept": "application/json",
    })

    try:
        # Generate unique test user
        timestamp = int(time.time())
        test_email = f"test{timestamp}@test.com"
        test_password = "TestPass123!"

        # Register user
        register_url = f"{config.JUICE_SHOP_URL}/api/Users/"
        register_data = {
            "email": test_email,
            "password": test_password,
            "passwordRepeat": test_password,
            "securityQuestion": {
                "id": 1,
                "question": "Your eldest siblings middle name?"
            },
            "securityAnswer": "test"
        }

        response = session.post(
            register_url,
            data=json.dumps(register_data),
            timeout=10
        )

        # Login
        login_url = f"{config.JUICE_SHOP_URL}/rest/user/login"
        login_data = {
            "email": test_email,
            "password": test_password
        }

        response = session.post(
            login_url,
            data=json.dumps(login_data),
            timeout=10
        )

        if response.status_code == 200:
            auth_data = response.json()
            token = auth_data.get("authentication", {}).get("token", "")
            session.headers.update({"Authorization": f"Bearer {token}"})
            yield session, token, test_email
        else:
            pytest.skip("Could not authenticate with Juice Shop")
            yield None, None, None

    except requests.RequestException:
        pytest.skip("Juice Shop is not available")
        yield None, None, None

    finally:
        session.close()


# Pytest markers
def pytest_configure(config):
    """Register custom markers."""
    config.addinivalue_line("markers", "xss: XSS vulnerability tests")
    config.addinivalue_line("markers", "sqli: SQL injection tests")
    config.addinivalue_line("markers", "csrf: CSRF tests")
    config.addinivalue_line("markers", "auth: Authentication tests")
    config.addinivalue_line("markers", "headers: Security headers tests")
    config.addinivalue_line("markers", "slow: Slow running tests")
    config.addinivalue_line("markers", "zap: Tests requiring ZAP")
    config.addinivalue_line("markers", "juice_shop: Juice Shop tests")
    config.addinivalue_line("markers", "jwt: JWT authentication tests")
    config.addinivalue_line("markers", "nosql: NoSQL injection tests")
    config.addinivalue_line("markers", "api: API security tests")
    config.addinivalue_line("markers", "business_logic: Business logic tests")
    config.addinivalue_line("markers", "nessus: marks tests requiring Nessus (skip if unavailable)")
    config.addinivalue_line("markers", "openvas: marks tests requiring OpenVAS/GVM (skip if unavailable)")
    config.addinivalue_line("markers", "multi_level: Multi-security-level tests")
    config.addinivalue_line("markers", "sqlmap: SQLMap integration tests")
    config.addinivalue_line("markers", "crypto: Cryptographic failures tests (A02)")
    config.addinivalue_line("markers", "components: Vulnerable components tests (A06)")
    config.addinivalue_line("markers", "integrity: Software integrity tests (A08)")
    config.addinivalue_line("markers", "logging: Logging failures tests (A09)")
    config.addinivalue_line("markers", "ssrf: SSRF tests (A10)")


# Test hooks
def pytest_collection_modifyitems(config, items):
    """Modify test collection based on markers."""
    zap_available = None
    juice_shop_available = None

    for item in items:
        # Skip ZAP tests if ZAP is not available
        if "zap" in item.keywords:
            if zap_available is None:
                zap_available = _is_zap_available()
            if not zap_available:
                item.add_marker(pytest.mark.skip(reason="ZAP is not available"))

        # Skip Juice Shop tests if Juice Shop is not available
        if "juice_shop" in item.keywords:
            if juice_shop_available is None:
                juice_shop_available = _is_juice_shop_available()
            if not juice_shop_available:
                item.add_marker(pytest.mark.skip(reason="Juice Shop is not available"))


def _is_zap_available():
    """Check if ZAP is available."""
    try:
        zap_url = f"http://{Config.ZAP_HOST}:{Config.ZAP_PORT}/JSON/core/view/version/"
        response = requests.get(zap_url, timeout=5, headers={"Host": "zap"})
        return response.status_code == 200
    except Exception:
        return False


def _is_juice_shop_available():
    """Check if Juice Shop is available."""
    try:
        response = requests.get(f"{Config.JUICE_SHOP_URL}/", timeout=5)
        return response.status_code == 200
    except Exception:
        return False


# ============================================================================
# Nessus Fixtures
# ============================================================================

@pytest.fixture(scope="session")
def nessus_client():
    """
    Nessus API client fixture.

    Returns an unauthenticated NessusHelper instance.
    Tests should check is_connected() before proceeding.

    Yields:
        NessusHelper: Nessus client instance
    """
    client = NessusHelper(
        host=os.getenv("NESSUS_HOST", "localhost"),
        port=int(os.getenv("NESSUS_PORT", "8834")),
        username=os.getenv("NESSUS_USERNAME", "admin"),
        password=os.getenv("NESSUS_PASSWORD", ""),
        access_key=os.getenv("NESSUS_ACCESS_KEY", ""),
        secret_key=os.getenv("NESSUS_SECRET_KEY", ""),
    )
    yield client


@pytest.fixture(scope="session")
def nessus_authenticated(nessus_client):
    """
    Authenticated Nessus session fixture.

    Requires Nessus to be running and accessible.
    Skips tests if authentication fails.

    Args:
        nessus_client: The base Nessus client fixture

    Yields:
        NessusHelper: Authenticated Nessus client
    """
    if not nessus_client.is_connected():
        pytest.skip("Nessus server not accessible")

    if not nessus_client.authenticate():
        pytest.skip("Nessus authentication failed")

    yield nessus_client


@pytest.fixture(scope="session")
def dvwa_ip():
    """
    DVWA target IP fixture for Nessus scanning.

    Returns:
        str: DVWA IP address
    """
    return os.getenv("DVWA_HOST", "localhost")


@pytest.fixture(scope="session")
def juice_shop_ip():
    """
    Juice Shop target IP fixture for Nessus scanning.

    Returns:
        str: Juice Shop IP address
    """
    return os.getenv("JUICE_SHOP_HOST", "localhost")


@pytest.fixture
def cleanup_scan(nessus_authenticated):
    """
    Fixture that cleans up scans after test completion.

    Yields a list that tests can append scan IDs to.
    All scans in the list will be deleted after the test.

    Args:
        nessus_authenticated: Authenticated Nessus client

    Yields:
        list: List to append scan IDs for cleanup
    """
    scan_ids = []
    yield scan_ids

    # Cleanup: delete all created scans
    for scan_id in scan_ids:
        try:
            nessus_authenticated.delete_scan(scan_id)
        except Exception:
            pass  # Best effort cleanup


# ============================================================================
# OpenVAS/GVM Fixtures
# ============================================================================

@pytest.fixture(scope="session")
def openvas_client():
    """
    OpenVAS/GVM API client fixture.

    Returns an unauthenticated OpenVASHelper instance.
    Tests should check is_connected() before proceeding.

    Yields:
        OpenVASHelper: OpenVAS client instance
    """
    client = OpenVASHelper(
        host=os.getenv("OPENVAS_HOST", "localhost"),
        port=int(os.getenv("OPENVAS_PORT", "9390")),
        username=os.getenv("OPENVAS_USERNAME", "admin"),
        password=os.getenv("OPENVAS_PASSWORD", "admin"),
    )
    yield client


@pytest.fixture(scope="session")
def openvas_available(openvas_client):
    """
    Check if OpenVAS is available and skip if not.

    Args:
        openvas_client: The base OpenVAS client fixture

    Yields:
        OpenVASHelper: OpenVAS client (if available)
    """
    if not openvas_client.is_connected():
        pytest.skip("OpenVAS/GVM server not accessible")

    yield openvas_client


@pytest.fixture
def cleanup_openvas_task(openvas_available):
    """
    Fixture that cleans up OpenVAS tasks after test completion.

    Yields a dict to store task_id and target_id for cleanup.

    Args:
        openvas_available: Available OpenVAS client

    Yields:
        dict: Dictionary to store IDs for cleanup
    """
    cleanup_ids = {"task_ids": [], "target_ids": []}
    yield cleanup_ids

    # Cleanup: delete all created tasks and targets
    for task_id in cleanup_ids["task_ids"]:
        try:
            openvas_available.delete_task(task_id)
        except Exception:
            pass

    for target_id in cleanup_ids["target_ids"]:
        try:
            openvas_available.delete_target(target_id)
        except Exception:
            pass


# ============================================================================
# Multi-Security-Level Fixtures
# ============================================================================

@pytest.fixture
def set_security_level(dvwa_session, config):
    """
    Factory fixture to set DVWA security level.

    Usage:
        def test_something(set_security_level):
            set_security_level("medium")
            # ... test code ...

    Args:
        dvwa_session: Authenticated DVWA session
        config: Test configuration

    Returns:
        Function to set security level
    """
    def _set_level(level: str):
        """Set DVWA security level (low, medium, high, impossible)."""
        if dvwa_session is None:
            pytest.skip("DVWA not available")

        import re as _re
        # GET security.php to extract CSRF token
        resp = dvwa_session.get(f"{config.DVWA_URL}/security.php", timeout=10)
        token_match = _re.search(r"user_token'[^>]+value='([^']+)'", resp.text)
        token = token_match.group(1) if token_match else ""
        dvwa_session.post(
            f"{config.DVWA_URL}/security.php",
            data={"security": level, "seclev_submit": "Submit", "user_token": token},
            timeout=10,
        )
        return level

    return _set_level


@pytest.fixture(params=["low", "medium", "high"])
def security_level(request, dvwa_session, config):
    """
    Parameterized fixture for testing across security levels.

    Automatically runs tests 3 times with different security levels.

    Args:
        request: pytest request object
        dvwa_session: Authenticated DVWA session
        config: Test configuration

    Yields:
        str: Current security level
    """
    if dvwa_session is None:
        pytest.skip("DVWA not available")

    level = request.param
    import re as _re
    # GET security.php to extract CSRF token
    resp = dvwa_session.get(f"{config.DVWA_URL}/security.php", timeout=10)
    token_match = _re.search(r"user_token'[^>]+value='([^']+)'", resp.text)
    token = token_match.group(1) if token_match else ""
    dvwa_session.post(
        f"{config.DVWA_URL}/security.php",
        data={"security": level, "seclev_submit": "Submit", "user_token": token},
        timeout=10,
    )
    yield level
