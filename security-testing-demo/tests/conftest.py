"""
Pytest Configuration and Fixtures for Security Testing

Provides common fixtures for ZAP connection, target URLs, and test setup.
"""

import os
import pytest
import requests
from dotenv import load_dotenv

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


# Test hooks
def pytest_collection_modifyitems(config, items):
    """Modify test collection based on markers."""
    # Skip ZAP tests if ZAP is not available
    for item in items:
        if "zap" in item.keywords:
            item.add_marker(
                pytest.mark.skipif(
                    not _is_zap_available(),
                    reason="ZAP is not available",
                )
            )


def _is_zap_available():
    """Check if ZAP is available."""
    try:
        # Use custom Host header to tell ZAP this is an API request, not a proxy request
        # Without this, ZAP treats localhost:8090 as a proxy target and fails
        zap_url = f"http://{Config.ZAP_HOST}:{Config.ZAP_PORT}/JSON/core/view/version/"
        response = requests.get(zap_url, timeout=5, headers={"Host": "zap"})
        return response.status_code == 200
    except Exception:
        return False
