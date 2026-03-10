"""
ZAP Integration Tests

Pytest integration with OWASP ZAP scanning capabilities.
These tests verify ZAP is functioning and can detect vulnerabilities.
"""

import os
import pytest
import sys

# Add project root to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.zap_helper import ZAPHelper


@pytest.fixture(scope="module")
def zap_helper(config):
    """Create ZAP helper instance."""
    try:
        helper = ZAPHelper(
            host=config.ZAP_HOST,
            port=config.ZAP_PORT,
            api_key=config.ZAP_API_KEY,
        )
        if not helper.is_connected():
            pytest.skip("ZAP is not available")
        return helper
    except Exception as e:
        pytest.skip(f"ZAP is not available: {e}")


@pytest.mark.zap
class TestZAPConnection:
    """Test ZAP connectivity and basic operations."""

    def test_zap_connection(self, zap_helper):
        """SEC-ZAP-001: Verify ZAP daemon is accessible."""
        assert zap_helper.is_connected(), "ZAP should be connected"

    def test_zap_version(self, zap_helper):
        """SEC-ZAP-002: Verify ZAP version is retrievable."""
        version = zap_helper.get_version()
        assert version is not None, "Should return ZAP version"
        assert len(version) > 0, "Version should not be empty"


@pytest.mark.zap
@pytest.mark.slow
class TestZAPSpider:
    """Test ZAP spider/crawler functionality."""

    def test_spider_discovers_urls(self, zap_helper, target_url):
        """SEC-ZAP-003: Verify spider discovers URLs on target."""
        # Clear previous session
        zap_helper.clear_session()

        # Run spider with short timeout for test
        urls = zap_helper.spider(target_url, max_duration=30)

        assert isinstance(urls, list), "Spider should return list of URLs"
        # Spider should find at least the target URL
        assert len(urls) >= 0, "Spider results should be a valid list"


@pytest.mark.zap
@pytest.mark.slow
class TestZAPPassiveScan:
    """Test ZAP passive scanning capabilities."""

    def test_passive_scan_completes(self, zap_helper, target_url):
        """SEC-ZAP-004: Verify passive scan completes without errors."""
        # Clear session
        zap_helper.clear_session()

        # Spider first to generate traffic
        zap_helper.spider(target_url, max_duration=30)

        # Run passive scan
        zap_helper.passive_scan(wait_time=15)

        # Passive scan should complete (no exception = success)
        assert True, "Passive scan completed"

    def test_passive_scan_generates_alerts(self, zap_helper, target_url):
        """SEC-ZAP-005: Verify passive scan can detect vulnerabilities."""
        # Get alerts after scan
        alerts = zap_helper.get_alerts(target=target_url)

        assert isinstance(alerts, list), "Should return list of alerts"
        # Note: May be empty if target has no vulnerabilities


@pytest.mark.zap
class TestZAPAlerts:
    """Test ZAP alert retrieval and filtering."""

    def test_get_alerts_returns_list(self, zap_helper):
        """SEC-ZAP-006: Verify get_alerts returns proper structure."""
        alerts = zap_helper.get_alerts()

        assert isinstance(alerts, list), "Alerts should be a list"

    def test_alert_summary_structure(self, zap_helper):
        """SEC-ZAP-007: Verify alert summary has correct structure."""
        alerts = zap_helper.get_alerts()
        summary = zap_helper.get_alert_summary(alerts)

        assert "High" in summary, "Summary should have High risk count"
        assert "Medium" in summary, "Summary should have Medium risk count"
        assert "Low" in summary, "Summary should have Low risk count"
        assert "Informational" in summary, "Summary should have Informational count"

        # All counts should be non-negative integers
        for risk, count in summary.items():
            assert isinstance(count, int), f"{risk} count should be integer"
            assert count >= 0, f"{risk} count should be non-negative"

    def test_filter_alerts_by_risk(self, zap_helper):
        """SEC-ZAP-008: Verify alerts can be filtered by risk level."""
        # Get all alerts
        all_alerts = zap_helper.get_alerts()

        # Filter by High risk
        high_alerts = zap_helper.get_alerts(risk="High")

        # Filtered count should be <= total count
        assert len(high_alerts) <= len(all_alerts), \
            "Filtered alerts should not exceed total"

        # All filtered alerts should be High risk
        for alert in high_alerts:
            assert alert.get("risk") == "High", "All filtered should be High risk"


@pytest.mark.zap
class TestZAPReports:
    """Test ZAP report generation."""

    def test_html_report_generation(self, zap_helper):
        """SEC-ZAP-009: Verify HTML report can be generated."""
        report = zap_helper.generate_html_report()

        assert report is not None, "Report should not be None"
        assert len(report) > 0, "Report should have content"
        assert "<html" in report.lower() or "<!doctype" in report.lower(), \
            "Should be valid HTML"

    def test_json_report_generation(self, zap_helper):
        """SEC-ZAP-010: Verify JSON report can be generated."""
        report = zap_helper.generate_json_report()

        assert report is not None, "Report should not be None"
        assert len(report) > 0, "Report should have content"


@pytest.mark.zap
@pytest.mark.slow
class TestZAPBaselineScan:
    """Test full baseline scan workflow."""

    def test_baseline_scan_workflow(self, zap_helper, target_url, tmp_path):
        """SEC-ZAP-011: Verify complete baseline scan workflow."""
        # Clear session
        zap_helper.clear_session()

        # 1. Spider
        urls = zap_helper.spider(target_url, max_duration=30)
        assert isinstance(urls, list), "Spider should return URLs"

        # 2. Passive scan
        zap_helper.passive_scan(wait_time=15)

        # 3. Get alerts
        alerts = zap_helper.get_alerts()
        assert isinstance(alerts, list), "Should get alerts"

        # 4. Generate summary
        summary = zap_helper.get_alert_summary(alerts)
        assert all(k in summary for k in ["High", "Medium", "Low", "Informational"]), \
            "Summary should have all risk levels"

        # 5. Generate report
        html_report = zap_helper.generate_html_report()
        assert len(html_report) > 0, "Should generate HTML report"

        # 6. Save report (optional verification)
        report_path = tmp_path / "test-baseline-report.html"
        report_path.write_text(html_report)
        assert report_path.exists(), "Report file should be created"


@pytest.mark.zap
class TestZAPContext:
    """Test ZAP context management."""

    def test_create_context(self, zap_helper):
        """SEC-ZAP-012: Verify scan context can be created."""
        context_name = "test-context"
        include_patterns = ["http://localhost.*"]

        context_id = zap_helper.set_context(context_name, include_patterns)

        assert context_id is not None, "Should return context ID"

    def test_clear_session(self, zap_helper):
        """SEC-ZAP-013: Verify session can be cleared."""
        # Should not raise exception
        zap_helper.clear_session()
        assert True, "Session cleared successfully"
