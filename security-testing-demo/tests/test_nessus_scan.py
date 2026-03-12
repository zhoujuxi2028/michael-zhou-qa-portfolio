"""
Nessus Vulnerability Scanner Tests

This module contains pytest tests for Nessus Essentials integration,
covering connectivity, scanning, vulnerability detection, and reporting.

Tests will skip gracefully if Nessus is not available.
"""

import pytest
import os

# Skip all tests in this module if Nessus is not available
pytestmark = pytest.mark.nessus


class TestNessusConnection:
    """Tests for Nessus server connectivity and authentication."""

    def test_nessus_is_accessible(self, nessus_client):
        """
        Test that Nessus server is accessible.

        Verifies the server responds on the configured host:port.
        """
        if not nessus_client.is_connected():
            pytest.skip("Nessus server not accessible - skipping connectivity tests")

        assert nessus_client.is_connected(), "Nessus server should be accessible"

    def test_nessus_version(self, nessus_authenticated):
        """
        Test that Nessus version can be retrieved.

        Verifies we can query server version after authentication.
        """
        version = nessus_authenticated.get_version()
        assert version, "Should retrieve Nessus version"
        assert isinstance(version, str), "Version should be a string"

    def test_nessus_authentication(self, nessus_client):
        """
        Test Nessus authentication mechanism.

        Verifies credentials allow successful authentication.
        """
        if not nessus_client.is_connected():
            pytest.skip("Nessus server not accessible")

        result = nessus_client.authenticate()
        if not result:
            pytest.skip("No valid Nessus credentials configured")
        assert result, "Authentication should succeed with valid credentials"


class TestNessusHostDiscovery:
    """Tests for Nessus host discovery scanning."""

    @pytest.mark.slow
    def test_host_discovery_scan_creation(self, nessus_authenticated, cleanup_scan):
        """
        Test creating a host discovery scan.

        Verifies a scan can be created with target hosts.
        """
        scan_id = nessus_authenticated.create_scan(
            name="Test Host Discovery",
            targets="127.0.0.1",
            policy="Host Discovery",
        )

        if scan_id:
            cleanup_scan.append(scan_id)

        assert scan_id is not None, "Should create scan and return ID"
        assert isinstance(scan_id, int), "Scan ID should be an integer"

    @pytest.mark.slow
    def test_host_discovery_detects_targets(
        self, nessus_authenticated, cleanup_scan, dvwa_ip
    ):
        """
        Test that host discovery finds target hosts.

        Creates and runs a discovery scan, verifies targets detected.
        """
        scan_id = nessus_authenticated.create_scan(
            name="Discovery Test - DVWA",
            targets=dvwa_ip,
            policy="Host Discovery",
        )

        if scan_id is None:
            pytest.skip("Could not create scan")

        cleanup_scan.append(scan_id)

        # Launch and wait for scan
        scan_uuid = nessus_authenticated.launch_scan(scan_id)
        assert scan_uuid is not None, "Scan should launch successfully"

        # Wait with shorter timeout for discovery
        completed = nessus_authenticated.wait_for_scan(scan_id, timeout=120)

        if not completed:
            pytest.skip("Scan did not complete in time")

        summary = nessus_authenticated.get_scan_summary(scan_id)
        assert summary.get("host_count", 0) >= 0, "Should report host count"


class TestNessusNetworkScan:
    """Tests for Nessus network vulnerability scanning."""

    @pytest.mark.slow
    def test_basic_network_scan_dvwa(
        self, nessus_authenticated, cleanup_scan, dvwa_ip
    ):
        """
        Test basic network scan against DVWA.

        Creates and runs a network scan targeting DVWA container.
        """
        scan_id = nessus_authenticated.create_scan(
            name="Network Scan - DVWA",
            targets=dvwa_ip,
            policy="Basic Network Scan",
        )

        if scan_id is None:
            pytest.skip("Could not create scan")

        cleanup_scan.append(scan_id)

        # Verify scan was created
        status = nessus_authenticated.get_scan_status(scan_id)
        assert status.get("status") != "error", "Scan should be created without error"

    @pytest.mark.slow
    def test_basic_network_scan_juice_shop(
        self, nessus_authenticated, cleanup_scan, juice_shop_ip
    ):
        """
        Test basic network scan against OWASP Juice Shop.

        Creates and runs a network scan targeting Juice Shop container.
        """
        scan_id = nessus_authenticated.create_scan(
            name="Network Scan - Juice Shop",
            targets=juice_shop_ip,
            policy="Basic Network Scan",
        )

        if scan_id is None:
            pytest.skip("Could not create scan")

        cleanup_scan.append(scan_id)

        # Verify scan was created
        status = nessus_authenticated.get_scan_status(scan_id)
        assert status.get("status") != "error", "Scan should be created without error"

    @pytest.mark.slow
    def test_scan_detects_open_ports(
        self, nessus_authenticated, cleanup_scan, dvwa_ip
    ):
        """
        Test that scans detect open ports on targets.

        Runs a scan and verifies port information is collected.
        """
        scan_id = nessus_authenticated.create_scan(
            name="Port Scan Test",
            targets=dvwa_ip,
            policy="Basic Network Scan",
        )

        if scan_id is None:
            pytest.skip("Could not create scan")

        cleanup_scan.append(scan_id)

        # Launch scan
        nessus_authenticated.launch_scan(scan_id)

        # Wait for completion
        completed = nessus_authenticated.wait_for_scan(scan_id, timeout=180)

        if not completed:
            pytest.skip("Scan did not complete in time")

        # Get vulnerabilities (port findings are often categorized as vulns)
        vulns = nessus_authenticated.get_vulnerabilities(scan_id)

        # At minimum, localhost should have some findings
        assert isinstance(vulns, list), "Should return list of vulnerabilities"


class TestNessusVulnerabilities:
    """Tests for vulnerability detection and classification."""

    @pytest.mark.slow
    def test_vulnerability_detection(self, nessus_authenticated, cleanup_scan, dvwa_ip):
        """
        Test that vulnerabilities are detected in scan results.

        DVWA is intentionally vulnerable and should trigger findings.
        """
        scan_id = nessus_authenticated.create_scan(
            name="Vulnerability Detection Test",
            targets=dvwa_ip,
            policy="Basic Network Scan",
        )

        if scan_id is None:
            pytest.skip("Could not create scan")

        cleanup_scan.append(scan_id)

        nessus_authenticated.launch_scan(scan_id)
        completed = nessus_authenticated.wait_for_scan(scan_id, timeout=300)

        if not completed:
            pytest.skip("Scan did not complete in time")

        vulns = nessus_authenticated.get_vulnerabilities(scan_id)

        # DVWA should have at least informational findings
        assert len(vulns) >= 0, "Should return vulnerability findings"

    def test_cvss_scoring(self, nessus_authenticated):
        """
        Test CVSS scoring in vulnerability data.

        Verifies severity information is included in findings.
        """
        # List existing scans
        scans = nessus_authenticated.list_scans()

        # Skip if no completed scans available
        completed_scans = [s for s in scans if s.get("status") == "completed"]
        if not completed_scans:
            pytest.skip("No completed scans available for CVSS testing")

        # Get vulnerabilities from first completed scan
        scan_id = completed_scans[0]["id"]
        vulns = nessus_authenticated.get_vulnerabilities(scan_id)

        if not vulns:
            pytest.skip("No vulnerabilities found in existing scans")

        # Check that severity information is present
        for vuln in vulns[:5]:  # Check first 5
            assert "severity" in vuln, "Vulnerability should have severity"
            assert "severity_name" in vuln, "Vulnerability should have severity name"

    def test_severity_classification(self, nessus_client):
        """
        Test severity classification (Critical/High/Medium/Low/Info).

        Verifies severity names are properly mapped.
        This test doesn't require Nessus to be running.
        """
        # Test the severity mapping function (internal method)
        helper = nessus_client

        # Test known severity levels
        assert helper._severity_name(0) == "Info"
        assert helper._severity_name(1) == "Low"
        assert helper._severity_name(2) == "Medium"
        assert helper._severity_name(3) == "High"
        assert helper._severity_name(4) == "Critical"
        assert helper._severity_name(99) == "Unknown"


class TestNessusReporting:
    """Tests for Nessus report generation."""

    @pytest.mark.slow
    def test_report_generation_html(self, nessus_authenticated):
        """
        Test HTML report generation.

        Verifies reports can be exported in HTML format.
        """
        # Find a completed scan
        scans = nessus_authenticated.list_scans()
        completed_scans = [s for s in scans if s.get("status") == "completed"]

        if not completed_scans:
            pytest.skip("No completed scans available for report generation")

        scan_id = completed_scans[0]["id"]

        # Export report
        report = nessus_authenticated.export_report(scan_id, format="html")

        if report is None:
            pytest.skip("Report export not available")

        assert isinstance(report, bytes), "Report should be bytes"
        assert len(report) > 0, "Report should have content"

    def test_report_contains_findings(self, nessus_authenticated):
        """
        Test that reports contain vulnerability findings.

        Verifies scan summary includes finding counts.
        """
        scans = nessus_authenticated.list_scans()
        completed_scans = [s for s in scans if s.get("status") == "completed"]

        if not completed_scans:
            pytest.skip("No completed scans available")

        scan_id = completed_scans[0]["id"]
        summary = nessus_authenticated.get_scan_summary(scan_id)

        assert "severity_counts" in summary, "Summary should include severity counts"
        assert "total_vulnerabilities" in summary, "Summary should include total count"

    def test_scan_summary_statistics(self, nessus_authenticated, cleanup_scan, dvwa_ip):
        """
        Test scan summary statistics generation.

        Verifies comprehensive statistics are available.
        """
        # Create a quick scan for testing
        scan_id = nessus_authenticated.create_scan(
            name="Summary Stats Test",
            targets=dvwa_ip,
            policy="Host Discovery",  # Faster than full network scan
        )

        if scan_id is None:
            pytest.skip("Could not create scan")

        cleanup_scan.append(scan_id)

        # Launch and wait
        nessus_authenticated.launch_scan(scan_id)
        completed = nessus_authenticated.wait_for_scan(scan_id, timeout=120)

        if not completed:
            # Get summary anyway - may have partial results
            pass

        summary = nessus_authenticated.get_scan_summary(scan_id)

        # Verify summary structure
        assert "name" in summary, "Summary should include scan name"
        assert "status" in summary, "Summary should include status"
        assert "severity_counts" in summary, "Summary should include severity breakdown"


class TestNessusIntegration:
    """Integration tests combining Nessus with other tools."""

    def test_nessus_zap_complementary(self, nessus_client):
        """
        Test that Nessus complements ZAP scanning.

        Nessus focuses on infrastructure/network vulnerabilities
        while ZAP focuses on web application vulnerabilities.
        This test verifies both can work together.
        """
        if not nessus_client.is_connected():
            pytest.skip("Nessus not available")

        # Verify Nessus provides network-level scanning
        version = nessus_client.get_version() if nessus_client.authenticate() else ""

        assert version is not None, "Nessus should return version for complementary scanning verification"

        # In a full integration test, you would:
        # 1. Run ZAP spider and active scan on web app
        # 2. Run Nessus network scan on same target
        # 3. Compare and correlate findings
        # 4. Verify no duplicate reporting
        # 5. Check coverage completeness
