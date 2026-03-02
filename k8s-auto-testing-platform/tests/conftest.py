"""
Pytest Configuration and Fixtures for K8S Auto Testing Platform
"""

import pytest
from kubernetes import client, config
import time
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@pytest.fixture(scope="session")
def k8s_client():
    """Load Kubernetes configuration and return API client"""
    try:
        # Try to load from kubeconfig
        config.load_kube_config()
        logger.info("Loaded kubeconfig")
    except:
        # If that fails, try in-cluster config
        try:
            config.load_incluster_config()
            logger.info("Loaded in-cluster config")
        except:
            raise Exception("Could not load Kubernetes configuration")

    return client


@pytest.fixture(scope="session")
def namespace():
    """Return the test namespace"""
    return "k8s-testing"


@pytest.fixture(scope="session")
def deployment_name():
    """Return the deployment name"""
    return "test-app"


@pytest.fixture(scope="session")
def service_name():
    """Return the service name"""
    return "test-app-service"


@pytest.fixture(scope="session")
def hpa_name():
    """Return the HPA name"""
    return "test-app-hpa"


@pytest.fixture(scope="function")
def apps_v1_api(k8s_client):
    """Return Apps V1 API client"""
    return k8s_client.AppsV1Api()


@pytest.fixture(scope="function")
def core_v1_api(k8s_client):
    """Return Core V1 API client"""
    return k8s_client.CoreV1Api()


@pytest.fixture(scope="function")
def autoscaling_v2_api(k8s_client):
    """Return Autoscaling V2 API client"""
    return k8s_client.AutoscalingV2Api()


def wait_for_condition(condition_func, timeout=120, interval=5):
    """
    Wait for a condition to be true

    Args:
        condition_func: Function that returns True when condition is met
        timeout: Maximum time to wait in seconds
        interval: Check interval in seconds

    Returns:
        bool: True if condition met, False if timeout
    """
    start_time = time.time()

    while time.time() - start_time < timeout:
        if condition_func():
            return True
        time.sleep(interval)

    return False


@pytest.fixture
def wait_helper():
    """Return wait helper function"""
    return wait_for_condition


@pytest.fixture(scope="function")
def cleanup_pods(core_v1_api, namespace):
    """Fixture to cleanup test pods after test"""
    yield
    # Cleanup code runs after test
    try:
        pods = core_v1_api.list_namespaced_pod(namespace=namespace)
        for pod in pods.items:
            if "test-" in pod.metadata.name:
                core_v1_api.delete_namespaced_pod(
                    name=pod.metadata.name,
                    namespace=namespace
                )
                logger.info(f"Cleaned up test pod: {pod.metadata.name}")
    except Exception as e:
        logger.warning(f"Cleanup failed: {e}")


# Pytest configuration
def pytest_configure(config):
    """Register custom markers"""
    config.addinivalue_line("markers", "unit: Unit tests")
    config.addinivalue_line("markers", "integration: Integration tests")
    config.addinivalue_line("markers", "hpa: HPA related tests")
    config.addinivalue_line("markers", "deployment: Deployment related tests")
    config.addinivalue_line("markers", "service: Service related tests")
    config.addinivalue_line("markers", "chaos: Chaos engineering tests")
    config.addinivalue_line("markers", "slow: Tests that take a long time")
    config.addinivalue_line("markers", "smoke: Quick smoke tests")


def pytest_collection_modifyitems(config, items):
    """Modify test items based on markers"""
    for item in items:
        # Add 'integration' marker if test name contains 'integration'
        if "integration" in item.nodeid:
            item.add_marker(pytest.mark.integration)

        # Add 'slow' marker to HPA tests
        if "test_hpa" in item.nodeid:
            item.add_marker(pytest.mark.slow)
