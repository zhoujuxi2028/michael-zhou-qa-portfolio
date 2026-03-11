"""
Nessus API Helper - Wrapper for Nessus Essentials API operations.

This module provides a high-level interface to interact with Nessus
vulnerability scanner for security testing purposes.
"""

import os
import time
import logging
from typing import List, Dict, Optional, Any

try:
    from tenable.nessus import Nessus
    TENABLE_AVAILABLE = True
except ImportError:
    TENABLE_AVAILABLE = False

logger = logging.getLogger(__name__)


class NessusHelper:
    """Helper class for interacting with Nessus vulnerability scanner."""

    def __init__(
        self,
        host: str = None,
        port: int = None,
        username: str = None,
        password: str = None,
        access_key: str = None,
        secret_key: str = None,
    ):
        """
        Initialize Nessus connection parameters.

        Args:
            host: Nessus server hostname (default: from NESSUS_HOST env)
            port: Nessus server port (default: from NESSUS_PORT env or 8834)
            username: Nessus username (default: from NESSUS_USERNAME env)
            password: Nessus password (default: from NESSUS_PASSWORD env)
            access_key: Nessus API access key (default: from NESSUS_ACCESS_KEY env)
            secret_key: Nessus API secret key (default: from NESSUS_SECRET_KEY env)
        """
        self.host = host or os.getenv("NESSUS_HOST", "localhost")
        self.port = port or int(os.getenv("NESSUS_PORT", "8834"))
        self.username = username or os.getenv("NESSUS_USERNAME", "admin")
        self.password = password or os.getenv("NESSUS_PASSWORD", "")
        self.access_key = access_key or os.getenv("NESSUS_ACCESS_KEY", "")
        self.secret_key = secret_key or os.getenv("NESSUS_SECRET_KEY", "")

        self._client: Optional[Any] = None
        self._authenticated = False

    @property
    def base_url(self) -> str:
        """Return the base URL for Nessus server."""
        return f"https://{self.host}:{self.port}"

    def is_connected(self) -> bool:
        """
        Check if Nessus server is accessible.

        Returns:
            True if server responds, False otherwise.
        """
        if not TENABLE_AVAILABLE:
            logger.warning("pyTenable library not installed")
            return False

        try:
            # Attempt to create a connection and check server info
            client = Nessus(
                url=self.base_url,
                access_key=self.access_key,
                secret_key=self.secret_key,
                ssl_verify=False,
            )
            # Try to get server status/properties
            client.server.properties()
            return True
        except Exception as e:
            logger.debug(f"Nessus connection check failed: {e}")
            # Try username/password auth
            try:
                client = Nessus(
                    url=self.base_url,
                    username=self.username,
                    password=self.password,
                    ssl_verify=False,
                )
                client.server.properties()
                return True
            except Exception as e2:
                logger.debug(f"Nessus password auth failed: {e2}")
                return False

    def get_version(self) -> str:
        """
        Get Nessus server version.

        Returns:
            Version string or empty string if unavailable.
        """
        if not self._ensure_client():
            return ""

        try:
            props = self._client.server.properties()
            return props.get("server_version", props.get("nessus_ui_version", ""))
        except Exception as e:
            logger.error(f"Failed to get Nessus version: {e}")
            return ""

    def authenticate(self) -> bool:
        """
        Authenticate with Nessus server.

        Returns:
            True if authentication successful, False otherwise.
        """
        if not TENABLE_AVAILABLE:
            logger.error("pyTenable library not available")
            return False

        try:
            # Try API key authentication first
            if self.access_key and self.secret_key:
                self._client = Nessus(
                    url=self.base_url,
                    access_key=self.access_key,
                    secret_key=self.secret_key,
                    ssl_verify=False,
                )
                self._client.server.properties()
                self._authenticated = True
                logger.info("Authenticated with Nessus using API keys")
                return True
        except Exception as e:
            logger.debug(f"API key authentication failed: {e}")

        try:
            # Fall back to username/password authentication
            if self.username and self.password:
                self._client = Nessus(
                    url=self.base_url,
                    username=self.username,
                    password=self.password,
                    ssl_verify=False,
                )
                self._client.server.properties()
                self._authenticated = True
                logger.info("Authenticated with Nessus using username/password")
                return True
        except Exception as e:
            logger.error(f"Nessus authentication failed: {e}")
            self._authenticated = False
            return False

        logger.error("No valid credentials provided")
        return False

    def _ensure_client(self) -> bool:
        """Ensure we have an authenticated client."""
        if self._client and self._authenticated:
            return True
        return self.authenticate()

    def create_scan(
        self,
        name: str,
        targets: str,
        policy: str = "Basic Network Scan",
        description: str = "",
    ) -> Optional[int]:
        """
        Create a new scan.

        Args:
            name: Scan name
            targets: Comma-separated list of targets (IPs, hostnames, ranges)
            policy: Scan policy/template name
            description: Optional scan description

        Returns:
            Scan ID if created successfully, None otherwise.
        """
        if not self._ensure_client():
            return None

        try:
            # Get policy template UUID
            templates = self._client.policies.templates()
            template_uuid = None
            for template in templates:
                if template.get("name", "").lower() == policy.lower():
                    template_uuid = template.get("uuid")
                    break

            # Default to basic network scan if not found
            if not template_uuid:
                for template in templates:
                    if "basic" in template.get("name", "").lower():
                        template_uuid = template.get("uuid")
                        break

            if not template_uuid and templates:
                template_uuid = templates[0].get("uuid")

            scan = self._client.scans.create(
                name=name,
                targets=targets.split(",") if isinstance(targets, str) else targets,
                template=template_uuid,
            )
            scan_id = scan.get("id")
            logger.info(f"Created scan '{name}' with ID: {scan_id}")
            return scan_id

        except Exception as e:
            logger.error(f"Failed to create scan: {e}")
            return None

    def launch_scan(self, scan_id: int) -> Optional[str]:
        """
        Launch an existing scan.

        Args:
            scan_id: The scan ID to launch

        Returns:
            Scan UUID if launched successfully, None otherwise.
        """
        if not self._ensure_client():
            return None

        try:
            result = self._client.scans.launch(scan_id)
            scan_uuid = result.get("scan_uuid", str(scan_id))
            logger.info(f"Launched scan {scan_id}, UUID: {scan_uuid}")
            return scan_uuid
        except Exception as e:
            logger.error(f"Failed to launch scan {scan_id}: {e}")
            return None

    def get_scan_status(self, scan_id: int) -> Dict[str, Any]:
        """
        Get current status of a scan.

        Args:
            scan_id: The scan ID to check

        Returns:
            Dictionary with scan status information.
        """
        if not self._ensure_client():
            return {"status": "unknown", "error": "Not authenticated"}

        try:
            scan_details = self._client.scans.details(scan_id)
            info = scan_details.get("info", {})
            return {
                "status": info.get("status", "unknown"),
                "name": info.get("name", ""),
                "targets": info.get("targets", ""),
                "host_count": info.get("hostcount", 0),
                "progress": scan_details.get("progress", 0),
            }
        except Exception as e:
            logger.error(f"Failed to get scan status: {e}")
            return {"status": "error", "error": str(e)}

    def wait_for_scan(self, scan_id: int, timeout: int = 300) -> bool:
        """
        Wait for a scan to complete.

        Args:
            scan_id: The scan ID to wait for
            timeout: Maximum time to wait in seconds

        Returns:
            True if scan completed, False if timeout or error.
        """
        if not self._ensure_client():
            return False

        start_time = time.time()
        while time.time() - start_time < timeout:
            status = self.get_scan_status(scan_id)
            current_status = status.get("status", "unknown").lower()

            if current_status == "completed":
                logger.info(f"Scan {scan_id} completed")
                return True
            elif current_status in ("canceled", "aborted", "error"):
                logger.warning(f"Scan {scan_id} ended with status: {current_status}")
                return False

            logger.debug(f"Scan {scan_id} status: {current_status}")
            time.sleep(10)

        logger.warning(f"Scan {scan_id} timed out after {timeout}s")
        return False

    def get_vulnerabilities(self, scan_id: int) -> List[Dict[str, Any]]:
        """
        Get vulnerabilities found in a scan.

        Args:
            scan_id: The scan ID to get results from

        Returns:
            List of vulnerability dictionaries.
        """
        if not self._ensure_client():
            return []

        try:
            scan_details = self._client.scans.details(scan_id)
            vulnerabilities = []

            for host in scan_details.get("hosts", []):
                host_id = host.get("host_id")
                host_vulns = self._client.scans.host_details(scan_id, host_id)

                for vuln in host_vulns.get("vulnerabilities", []):
                    vulnerabilities.append({
                        "host": host.get("hostname", host.get("host_ip", "")),
                        "host_id": host_id,
                        "plugin_id": vuln.get("plugin_id"),
                        "plugin_name": vuln.get("plugin_name"),
                        "severity": vuln.get("severity"),
                        "severity_name": self._severity_name(vuln.get("severity", 0)),
                        "count": vuln.get("count", 1),
                    })

            return vulnerabilities

        except Exception as e:
            logger.error(f"Failed to get vulnerabilities: {e}")
            return []

    def _severity_name(self, severity: int) -> str:
        """Convert numeric severity to name."""
        severity_map = {
            0: "Info",
            1: "Low",
            2: "Medium",
            3: "High",
            4: "Critical",
        }
        return severity_map.get(severity, "Unknown")

    def export_report(self, scan_id: int, format: str = "html") -> Optional[bytes]:
        """
        Export scan report in specified format.

        Args:
            scan_id: The scan ID to export
            format: Report format ('html', 'pdf', 'csv', 'nessus')

        Returns:
            Report content as bytes, or None on error.
        """
        if not self._ensure_client():
            return None

        try:
            # Request export
            export_request = self._client.scans.export_request(
                scan_id,
                format=format,
            )
            file_id = export_request

            # Wait for export to be ready
            max_wait = 60
            waited = 0
            while waited < max_wait:
                status = self._client.scans.export_status(scan_id, file_id)
                if status.get("status") == "ready":
                    break
                time.sleep(2)
                waited += 2

            # Download the report
            report_data = self._client.scans.export_download(scan_id, file_id)
            logger.info(f"Exported scan {scan_id} report in {format} format")
            return report_data

        except Exception as e:
            logger.error(f"Failed to export report: {e}")
            return None

    def get_scan_summary(self, scan_id: int) -> Dict[str, Any]:
        """
        Get summary statistics for a scan.

        Args:
            scan_id: The scan ID to summarize

        Returns:
            Dictionary with summary statistics.
        """
        if not self._ensure_client():
            return {}

        try:
            scan_details = self._client.scans.details(scan_id)
            info = scan_details.get("info", {})

            # Count vulnerabilities by severity
            severity_counts = {
                "critical": 0,
                "high": 0,
                "medium": 0,
                "low": 0,
                "info": 0,
            }

            for host in scan_details.get("hosts", []):
                severity_counts["critical"] += host.get("critical", 0)
                severity_counts["high"] += host.get("high", 0)
                severity_counts["medium"] += host.get("medium", 0)
                severity_counts["low"] += host.get("low", 0)
                severity_counts["info"] += host.get("info", 0)

            return {
                "name": info.get("name", ""),
                "status": info.get("status", ""),
                "targets": info.get("targets", ""),
                "host_count": info.get("hostcount", 0),
                "start_time": info.get("scan_start"),
                "end_time": info.get("scan_end"),
                "severity_counts": severity_counts,
                "total_vulnerabilities": sum(severity_counts.values()),
            }

        except Exception as e:
            logger.error(f"Failed to get scan summary: {e}")
            return {}

    def list_scans(self) -> List[Dict[str, Any]]:
        """
        List all available scans.

        Returns:
            List of scan dictionaries.
        """
        if not self._ensure_client():
            return []

        try:
            scans = self._client.scans.list()
            return [
                {
                    "id": scan.get("id"),
                    "name": scan.get("name"),
                    "status": scan.get("status"),
                    "folder_id": scan.get("folder_id"),
                }
                for scan in scans.get("scans", []) or []
            ]
        except Exception as e:
            logger.error(f"Failed to list scans: {e}")
            return []

    def delete_scan(self, scan_id: int) -> bool:
        """
        Delete a scan.

        Args:
            scan_id: The scan ID to delete

        Returns:
            True if deleted, False otherwise.
        """
        if not self._ensure_client():
            return False

        try:
            self._client.scans.delete(scan_id)
            logger.info(f"Deleted scan {scan_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete scan {scan_id}: {e}")
            return False
