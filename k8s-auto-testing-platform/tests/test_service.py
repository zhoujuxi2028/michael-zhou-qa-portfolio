"""
Service Tests

Tests for Kubernetes Service functionality including:
- Service creation and configuration
- Service discovery
- Load balancing
- Endpoint management
"""

import logging

import pytest

logger = logging.getLogger(__name__)


@pytest.mark.service
class TestService:
    """Test Service functionality"""

    def test_service_exists(self, core_v1_api, namespace, service_name):
        """TC-SVC-CFG-001: 验证 Service 存在"""
        service = core_v1_api.read_namespaced_service(name=service_name, namespace=namespace)

        assert service is not None
        assert service.metadata.name == service_name

        logger.info(f"Service {service_name} exists")

    def test_service_type(self, core_v1_api, namespace, service_name):
        """TC-SVC-CFG-002: 验证服务类型"""
        service = core_v1_api.read_namespaced_service(name=service_name, namespace=namespace)

        assert service.spec.type == "ClusterIP"

        logger.info(f"Service type: {service.spec.type}")

    def test_service_selector(self, core_v1_api, namespace, service_name):
        """TC-SVC-CFG-003: 验证选择器配置"""
        service = core_v1_api.read_namespaced_service(name=service_name, namespace=namespace)

        selector = service.spec.selector

        assert selector is not None
        assert "app" in selector
        assert selector["app"] == "test-app"

        logger.info(f"Service selector: {selector}")

    def test_service_ports(self, core_v1_api, namespace, service_name):
        """TC-SVC-CFG-004: 验证端口配置"""
        service = core_v1_api.read_namespaced_service(name=service_name, namespace=namespace)

        ports = service.spec.ports

        assert len(ports) > 0

        http_port = ports[0]
        assert http_port.port == 80
        assert http_port.target_port == 8080
        assert http_port.protocol == "TCP"

        logger.info(f"Service ports: {ports[0].port} -> {ports[0].target_port}")

    def test_service_endpoints(self, core_v1_api, namespace, service_name):
        """TC-SVC-FUN-001: 验证 Endpoints"""
        endpoints = core_v1_api.read_namespaced_endpoints(name=service_name, namespace=namespace)

        assert endpoints is not None
        assert endpoints.subsets is not None
        assert len(endpoints.subsets) > 0

        # Check that there are addresses
        addresses = endpoints.subsets[0].addresses
        assert addresses is not None
        assert len(addresses) > 0

        logger.info(f"Service has {len(addresses)} endpoints")

    def test_service_dns(self, core_v1_api, namespace, service_name):
        """TC-SVC-FUN-002: 验证 DNS 名称"""
        service = core_v1_api.read_namespaced_service(name=service_name, namespace=namespace)

        # Service should be accessible via DNS
        dns_name = f"{service_name}.{namespace}.svc.cluster.local"

        logger.info(f"Service DNS: {dns_name}")

        # In a real test, you would test DNS resolution
        # For now, just verify the service exists
        assert service is not None

    def test_nodeport_service_exists(self, core_v1_api, namespace):
        """TC-SVC-FUN-003: 验证 NodePort 服务"""
        nodeport_service_name = "test-app-nodeport"

        service = core_v1_api.read_namespaced_service(name=nodeport_service_name, namespace=namespace)

        assert service is not None
        assert service.spec.type == "NodePort"

        # Check NodePort is assigned
        assert service.spec.ports[0].node_port == 30080

        logger.info(f"NodePort service exists on port {service.spec.ports[0].node_port}")


@pytest.mark.smoke
def test_service_smoke(core_v1_api, namespace, service_name):
    """TC-SVC-SMK-001: Service 冒烟测试"""
    service = core_v1_api.read_namespaced_service(name=service_name, namespace=namespace)

    assert service is not None
    assert service.spec.cluster_ip is not None

    logger.info("Service smoke test passed")
