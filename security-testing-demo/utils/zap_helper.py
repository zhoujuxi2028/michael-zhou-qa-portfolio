"""
OWASP ZAP API Helper

Wrapper class for common ZAP operations.
"""

import os
import time
from typing import Dict, List, Optional

# Disable system proxy for localhost ZAP connections
os.environ["NO_PROXY"] = "localhost,127.0.0.1"
os.environ["no_proxy"] = "localhost,127.0.0.1"

try:
    from zapv2 import ZAPv2
except ImportError:
    ZAPv2 = None


class ZAPHelper:
    """Helper class for OWASP ZAP operations."""

    def __init__(
        self,
        host: str = "localhost",
        port: int = 8090,
        api_key: str = "",
    ):
        """Initialize ZAP connection.

        Args:
            host: ZAP daemon host
            port: ZAP daemon port
            api_key: ZAP API key
        """
        if ZAPv2 is None:
            raise ImportError("python-owasp-zap-v2.4 is required")

        self.host = host
        self.port = port
        self.zap = ZAPv2(
            apikey=api_key,
            proxies={
                "http": f"http://{host}:{port}",
                "https": f"http://{host}:{port}",
            },
        )

    def is_connected(self) -> bool:
        """Check if ZAP is accessible.

        Returns:
            True if connected, False otherwise
        """
        try:
            self.zap.core.version
            return True
        except Exception:
            return False

    def get_version(self) -> str:
        """Get ZAP version.

        Returns:
            ZAP version string
        """
        return self.zap.core.version

    def spider(
        self,
        target: str,
        max_duration: int = 60,
        recurse: bool = True,
    ) -> List[str]:
        """Spider a target URL.

        Args:
            target: Target URL
            max_duration: Maximum duration in seconds
            recurse: Whether to recurse into found links

        Returns:
            List of discovered URLs
        """
        scan_id = self.zap.spider.scan(target, recurse=recurse)

        start_time = time.time()
        while int(self.zap.spider.status(scan_id)) < 100:
            if time.time() - start_time > max_duration:
                self.zap.spider.stop(scan_id)
                break
            time.sleep(2)

        return self.zap.spider.results(scan_id)

    def passive_scan(self, wait_time: int = 30) -> None:
        """Wait for passive scanning to complete.

        Args:
            wait_time: Maximum wait time in seconds
        """
        start_time = time.time()
        while int(self.zap.pscan.records_to_scan) > 0:
            if time.time() - start_time > wait_time:
                break
            time.sleep(2)

    def active_scan(
        self,
        target: str,
        max_duration: int = 300,
    ) -> str:
        """Run active scan.

        Args:
            target: Target URL
            max_duration: Maximum duration in seconds

        Returns:
            Scan ID
        """
        scan_id = self.zap.ascan.scan(target)

        start_time = time.time()
        while int(self.zap.ascan.status(scan_id)) < 100:
            if time.time() - start_time > max_duration:
                self.zap.ascan.stop(scan_id)
                break
            time.sleep(5)

        return scan_id

    def get_alerts(
        self,
        target: Optional[str] = None,
        risk: Optional[str] = None,
    ) -> List[Dict]:
        """Get alerts from scan.

        Args:
            target: Filter by target URL
            risk: Filter by risk level (High, Medium, Low, Informational)

        Returns:
            List of alert dictionaries
        """
        if target:
            alerts = self.zap.core.alerts(baseurl=target)
        else:
            alerts = self.zap.core.alerts()

        if risk:
            alerts = [a for a in alerts if a.get("risk") == risk]

        return alerts

    def get_alert_summary(self, alerts: List[Dict]) -> Dict[str, int]:
        """Generate alert summary.

        Args:
            alerts: List of alerts

        Returns:
            Dictionary with counts by risk level
        """
        summary = {"High": 0, "Medium": 0, "Low": 0, "Informational": 0}

        for alert in alerts:
            risk = alert.get("risk", "Informational")
            if risk in summary:
                summary[risk] += 1

        return summary

    def generate_html_report(self) -> str:
        """Generate HTML report.

        Returns:
            HTML report content
        """
        return self.zap.core.htmlreport()

    def generate_json_report(self) -> str:
        """Generate JSON report.

        Returns:
            JSON report content
        """
        return self.zap.core.jsonreport()

    def generate_xml_report(self) -> str:
        """Generate XML report.

        Returns:
            XML report content
        """
        return self.zap.core.xmlreport()

    def clear_session(self) -> None:
        """Clear ZAP session data."""
        self.zap.core.new_session()

    def set_context(self, name: str, include_regex: List[str]) -> str:
        """Create scan context.

        Args:
            name: Context name
            include_regex: List of URL patterns to include

        Returns:
            Context ID
        """
        context_id = self.zap.context.new_context(name)

        for regex in include_regex:
            self.zap.context.include_in_context(name, regex)

        return context_id
