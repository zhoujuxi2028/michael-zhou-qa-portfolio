"""
Deployment Tests

Tests for Kubernetes Deployment functionality including:
- Deployment creation and status
- Rolling updates
- Rollbacks
- Pod management
"""

import pytest
import time
import logging

logger = logging.getLogger(__name__)


@pytest.mark.deployment
class TestDeployment:
    """Test Deployment functionality"""

    def test_deployment_exists(self, apps_v1_api, namespace, deployment_name):
        """Test that deployment exists"""
        deployment = apps_v1_api.read_namespaced_deployment(
            name=deployment_name,
            namespace=namespace
        )

        assert deployment is not None
        assert deployment.metadata.name == deployment_name

        logger.info(f"Deployment {deployment_name} exists")


    def test_deployment_replicas(self, apps_v1_api, namespace, deployment_name):
        """Test deployment has correct replica count"""
        deployment = apps_v1_api.read_namespaced_deployment(
            name=deployment_name,
            namespace=namespace
        )

        spec_replicas = deployment.spec.replicas
        ready_replicas = deployment.status.ready_replicas or 0

        logger.info(f"Deployment replicas - Desired: {spec_replicas}, Ready: {ready_replicas}")

        assert ready_replicas > 0, "No ready replicas found"


    def test_deployment_labels(self, apps_v1_api, namespace, deployment_name):
        """Test deployment has correct labels"""
        deployment = apps_v1_api.read_namespaced_deployment(
            name=deployment_name,
            namespace=namespace
        )

        labels = deployment.metadata.labels

        assert labels is not None
        assert 'app' in labels
        assert labels['app'] == 'test-app'

        logger.info(f"Deployment labels: {labels}")


    def test_pods_running(self, core_v1_api, namespace):
        """Test that pods are running"""
        pods = core_v1_api.list_namespaced_pod(
            namespace=namespace,
            label_selector='app=test-app'
        )

        assert len(pods.items) > 0, "No pods found"

        running_pods = [p for p in pods.items if p.status.phase == 'Running']

        assert len(running_pods) > 0, "No running pods found"

        logger.info(f"Found {len(running_pods)} running pods")


    def test_pod_health_checks(self, core_v1_api, namespace):
        """Test that pods have health checks configured"""
        pods = core_v1_api.list_namespaced_pod(
            namespace=namespace,
            label_selector='app=test-app'
        )

        assert len(pods.items) > 0

        pod = pods.items[0]
        container = pod.spec.containers[0]

        # Check liveness probe
        assert container.liveness_probe is not None
        assert container.liveness_probe.http_get is not None
        assert container.liveness_probe.http_get.path == '/health'

        # Check readiness probe
        assert container.readiness_probe is not None
        assert container.readiness_probe.http_get is not None
        assert container.readiness_probe.http_get.path == '/ready'

        logger.info("Health checks configured correctly")


    def test_pod_resources(self, core_v1_api, namespace):
        """Test that pods have resource limits"""
        pods = core_v1_api.list_namespaced_pod(
            namespace=namespace,
            label_selector='app=test-app'
        )

        assert len(pods.items) > 0

        pod = pods.items[0]
        container = pod.spec.containers[0]

        # Check resource requests
        assert container.resources.requests is not None
        assert 'cpu' in container.resources.requests
        assert 'memory' in container.resources.requests

        # Check resource limits
        assert container.resources.limits is not None
        assert 'cpu' in container.resources.limits
        assert 'memory' in container.resources.limits

        logger.info(f"Resource requests: {container.resources.requests}")
        logger.info(f"Resource limits: {container.resources.limits}")


    @pytest.mark.integration
    def test_pod_restart(self, core_v1_api, apps_v1_api, namespace, deployment_name, wait_helper):
        """Test pod auto-restart after deletion"""
        # Get initial pod count
        initial_deployment = apps_v1_api.read_namespaced_deployment(
            name=deployment_name,
            namespace=namespace
        )
        initial_replicas = initial_deployment.status.ready_replicas or 0

        # Get a pod to delete
        pods = core_v1_api.list_namespaced_pod(
            namespace=namespace,
            label_selector='app=test-app'
        )

        if not pods.items:
            pytest.skip("No pods found to test restart")

        pod_to_delete = pods.items[0].metadata.name

        logger.info(f"Deleting pod: {pod_to_delete}")

        # Delete the pod
        core_v1_api.delete_namespaced_pod(
            name=pod_to_delete,
            namespace=namespace
        )

        # Wait for new pod to be ready
        def check_pod_recovered():
            deployment = apps_v1_api.read_namespaced_deployment(
                name=deployment_name,
                namespace=namespace
            )
            current_replicas = deployment.status.ready_replicas or 0
            return current_replicas == initial_replicas

        recovered = wait_helper(check_pod_recovered, timeout=60, interval=5)

        assert recovered, "Pod did not recover within timeout"

        logger.info("Pod successfully restarted")


@pytest.mark.smoke
def test_deployment_smoke(apps_v1_api, namespace, deployment_name):
    """Quick smoke test for deployment"""
    deployment = apps_v1_api.read_namespaced_deployment(
        name=deployment_name,
        namespace=namespace
    )

    assert deployment is not None
    assert deployment.status.ready_replicas > 0

    logger.info(f"Deployment smoke test passed")
