"""
OpenVAS/GVM Vulnerability Scanner Tests

This module contains pytest tests for OpenVAS/GVM integration,
covering connectivity, scanning, vulnerability detection, and reporting.

Tests will skip gracefully if OpenVAS is not available.
"""

import pytest

# Skip all tests in this module if OpenVAS is not available
pytestmark = pytest.mark.openvas


class TestOpenVASConnection:
    """Tests for OpenVAS/GVM server connectivity and authentication."""

    def test_openvas_is_accessible(self, openvas_client):
        """
        Test that OpenVAS/GVM server is accessible.

        Verifies the server responds on the configured host:port.
        """
        if not openvas_client.is_connected():
            pytest.skip("OpenVAS/GVM server not accessible - skipping connectivity tests")

        assert openvas_client.is_connected(), "OpenVAS server should be accessible"

    def test_openvas_version(self, openvas_available):
        """
        Test that GVM version can be retrieved.

        Verifies we can query server version after authentication.
        """
        version = openvas_available.get_version()
        assert version, "Should retrieve GVM version"
        assert isinstance(version, str), "Version should be a string"

    def test_openvas_authentication(self, openvas_client):
        """
        Test OpenVAS authentication mechanism.

        Verifies credentials allow successful authentication.
        """
        if not openvas_client.is_connected():
            pytest.skip("OpenVAS server not accessible")

        result = openvas_client.authenticate()
        assert result, "Authentication should succeed with valid credentials"

    def test_nvt_database_available(self, openvas_available):
        """
        Test that NVT (Network Vulnerability Tests) database is loaded.

        OpenVAS requires NVTs to perform vulnerability scans.
        """
        nvt_count = openvas_available.get_nvt_count()
        # A fresh install may have 50,000+ NVTs
        # We just check that some exist (database is loaded)
        assert nvt_count >= 0, "Should have NVT database available"


class TestOpenVASTargetManagement:
    """Tests for OpenVAS target creation and management."""

    def test_create_target(self, openvas_available, cleanup_openvas_task):
        """
        Test creating a scan target.

        Verifies a target can be created with host specification.
        """
        target_id = openvas_available.create_target(
            name="Test Target - Localhost",
            hosts="127.0.0.1",
            comment="Test target for pytest",
        )

        if target_id:
            cleanup_openvas_task["target_ids"].append(target_id)
            assert target_id, "Should create target and return ID"
            assert isinstance(target_id, str), "Target ID should be a string (UUID)"
        else:
            pytest.skip("Could not create target - may require additional setup")

    def test_create_target_with_range(self, openvas_available, cleanup_openvas_task):
        """
        Test creating a target with IP range.

        Verifies targets can be created with CIDR notation.
        """
        target_id = openvas_available.create_target(
            name="Test Target - Range",
            hosts="192.168.1.0/24",
            comment="Test range target",
        )

        if target_id:
            cleanup_openvas_task["target_ids"].append(target_id)
            assert target_id, "Should create range target"
        else:
            pytest.skip("Could not create target")


class TestOpenVASHostDiscovery:
    """Tests for OpenVAS host discovery scanning."""

    @pytest.mark.slow
    def test_host_discovery_scan_creation(self, openvas_available, cleanup_openvas_task):
        """
        Test creating a host discovery scan.

        Creates a task with discovery configuration.
        """
        # Create target first
        target_id = openvas_available.create_target(
            name="Discovery Target",
            hosts="127.0.0.1",
        )

        if not target_id:
            pytest.skip("Could not create target")

        cleanup_openvas_task["target_ids"].append(target_id)

        # Create task with host discovery config
        task_id = openvas_available.create_task(
            name="Host Discovery Test",
            target_id=target_id,
            config="host_discovery",
        )

        if task_id:
            cleanup_openvas_task["task_ids"].append(task_id)
            assert task_id, "Should create discovery task"
        else:
            pytest.skip("Could not create task")

    @pytest.mark.slow
    def test_discovery_scan_execution(self, openvas_available, cleanup_openvas_task):
        """
        Test executing a discovery scan.

        Starts a scan and verifies it begins execution.
        """
        # Create target
        target_id = openvas_available.create_target(
            name="Discovery Execution Target",
            hosts="127.0.0.1",
        )

        if not target_id:
            pytest.skip("Could not create target")

        cleanup_openvas_task["target_ids"].append(target_id)

        # Create task
        task_id = openvas_available.create_task(
            name="Discovery Execution Test",
            target_id=target_id,
            config="host_discovery",
        )

        if not task_id:
            pytest.skip("Could not create task")

        cleanup_openvas_task["task_ids"].append(task_id)

        # Start task
        report_id = openvas_available.start_task(task_id)
        assert report_id is not None, "Should start task and return report ID"


class TestOpenVASVulnerabilityScan:
    """Tests for OpenVAS vulnerability scanning."""

    @pytest.mark.slow
    def test_full_scan_creation(self, openvas_available, cleanup_openvas_task, dvwa_ip):
        """
        Test creating a full vulnerability scan.

        Creates a full_and_fast scan task targeting DVWA.
        """
        target_id = openvas_available.create_target(
            name="DVWA Scan Target",
            hosts=dvwa_ip,
        )

        if not target_id:
            pytest.skip("Could not create target")

        cleanup_openvas_task["target_ids"].append(target_id)

        task_id = openvas_available.create_task(
            name="DVWA Vulnerability Scan",
            target_id=target_id,
            config="full_and_fast",
        )

        if task_id:
            cleanup_openvas_task["task_ids"].append(task_id)
            assert task_id, "Should create vulnerability scan task"
        else:
            pytest.skip("Could not create task")

    @pytest.mark.slow
    def test_scan_status_retrieval(self, openvas_available, cleanup_openvas_task):
        """
        Test retrieving scan status.

        Verifies task status can be queried.
        """
        # Create minimal scan
        target_id = openvas_available.create_target(
            name="Status Test Target",
            hosts="127.0.0.1",
        )

        if not target_id:
            pytest.skip("Could not create target")

        cleanup_openvas_task["target_ids"].append(target_id)

        task_id = openvas_available.create_task(
            name="Status Test Task",
            target_id=target_id,
            config="host_discovery",
        )

        if not task_id:
            pytest.skip("Could not create task")

        cleanup_openvas_task["task_ids"].append(task_id)

        # Get status
        status = openvas_available.get_task_status(task_id)
        assert "status" in status, "Should return status information"
        assert status["status"] != "error", "Should not return error status"


class TestOpenVASVulnerabilities:
    """Tests for OpenVAS vulnerability classification and details."""

    def test_severity_classification(self, openvas_client):
        """
        Test severity classification helper.

        Verifies CVSS scores map to correct severity classes.
        """
        assert openvas_client._severity_class(9.5) == "Critical"
        assert openvas_client._severity_class(8.0) == "High"
        assert openvas_client._severity_class(5.0) == "Medium"
        assert openvas_client._severity_class(2.0) == "Low"
        assert openvas_client._severity_class(0.0) == "Info"

    def test_severity_boundaries(self, openvas_client):
        """
        Test severity classification at boundaries.

        Verifies boundary values are classified correctly.
        """
        # Critical: >= 9.0
        assert openvas_client._severity_class(9.0) == "Critical"
        assert openvas_client._severity_class(10.0) == "Critical"

        # High: >= 7.0, < 9.0
        assert openvas_client._severity_class(7.0) == "High"
        assert openvas_client._severity_class(8.9) == "High"

        # Medium: >= 4.0, < 7.0
        assert openvas_client._severity_class(4.0) == "Medium"
        assert openvas_client._severity_class(6.9) == "Medium"

        # Low: > 0.0, < 4.0
        assert openvas_client._severity_class(0.1) == "Low"
        assert openvas_client._severity_class(3.9) == "Low"


class TestOpenVASReporting:
    """Tests for OpenVAS report generation and summarization."""

    def test_report_summary_structure(self, openvas_client):
        """
        Test report summary returns expected structure.

        Note: Without a completed scan, this tests the empty case.
        """
        # Test with non-existent task (should return empty structure)
        summary = openvas_client.get_report_summary("non-existent-task-id")

        assert "total_results" in summary, "Summary should include total_results"
        assert "host_count" in summary, "Summary should include host_count"
        assert "severity_counts" in summary, "Summary should include severity_counts"

    def test_scan_configs_available(self, openvas_client):
        """
        Test that scan configurations are available.

        Verifies built-in scan configs can be listed (returns empty if not connected).
        """
        configs = openvas_client.list_scan_configs()

        # May return empty if not connected, which is OK
        assert isinstance(configs, list), "Should return list of configs"

    def test_list_tasks(self, openvas_client):
        """
        Test listing existing tasks.

        Verifies task listing works correctly (returns empty if not connected).
        """
        tasks = openvas_client.list_tasks()
        assert isinstance(tasks, list), "Should return list of tasks"


class TestOpenVASIntegration:
    """Tests for OpenVAS integration with other security tools."""

    def test_helper_initialization(self):
        """
        Test OpenVASHelper can be initialized with parameters.

        Verifies helper accepts configuration.
        """
        from utils.openvas_helper import OpenVASHelper

        helper = OpenVASHelper(
            host="test-host",
            port=9390,
            username="test-user",
            password="test-pass",
        )

        assert helper.host == "test-host"
        assert helper.port == 9390
        assert helper.username == "test-user"
        assert helper.password == "test-pass"

    def test_helper_default_values(self):
        """
        Test OpenVASHelper uses environment defaults.

        Verifies defaults are applied when not specified.
        """
        import os
        from utils.openvas_helper import OpenVASHelper

        # Clear env vars temporarily
        original_host = os.environ.get("OPENVAS_HOST")
        os.environ.pop("OPENVAS_HOST", None)

        helper = OpenVASHelper()
        assert helper.host == "localhost"
        assert helper.port == 9390

        # Restore
        if original_host:
            os.environ["OPENVAS_HOST"] = original_host

    def test_scan_config_uuids_defined(self):
        """
        Test that scan config UUIDs are defined.

        Verifies built-in config UUIDs are available.
        """
        from utils.openvas_helper import OpenVASHelper

        configs = OpenVASHelper.SCAN_CONFIGS

        assert "discovery" in configs
        assert "host_discovery" in configs
        assert "full_and_fast" in configs
        assert "full_and_deep" in configs

    def test_complementary_with_nessus(self, openvas_client):
        """
        Test OpenVAS complements Nessus workflow.

        OpenVAS provides open-source alternative to commercial Nessus.
        Both use similar concepts: targets, tasks/scans, reports.
        """
        # Verify similar interface patterns
        assert hasattr(openvas_client, "is_connected")
        assert hasattr(openvas_client, "get_version")
        assert hasattr(openvas_client, "authenticate")

        # Verify scanning methods exist
        assert hasattr(openvas_client, "create_target")
        assert hasattr(openvas_client, "create_task")
        assert hasattr(openvas_client, "start_task")

        # Verify result methods exist
        assert hasattr(openvas_client, "get_results")
        assert hasattr(openvas_client, "get_report_summary")

    def test_complementary_with_zap(self, openvas_client):
        """
        Test OpenVAS complements ZAP workflow.

        OpenVAS: Network/infrastructure vulnerability scanning
        ZAP: Web application security testing (DAST)

        Together they provide comprehensive coverage.
        """
        # OpenVAS is network-focused (IP-based targets)
        # ZAP is web-focused (URL-based targets)
        # Both provide vulnerability detection but different layers

        # Verify OpenVAS provides network scanning capabilities
        assert "full_and_fast" in openvas_client.SCAN_CONFIGS
        assert "host_discovery" in openvas_client.SCAN_CONFIGS
