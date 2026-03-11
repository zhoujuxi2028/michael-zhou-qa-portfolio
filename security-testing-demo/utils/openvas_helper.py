"""
OpenVAS/GVM API Helper - Wrapper for Greenbone Vulnerability Management operations.

This module provides a high-level interface to interact with OpenVAS/GVM
vulnerability scanner for security testing purposes.
"""

import os
import time
import logging
from typing import List, Dict, Optional, Any

try:
    from gvm.connections import UnixSocketConnection, TLSConnection
    from gvm.protocols.gmp import Gmp
    from gvm.transforms import EtreeTransform
    from gvm.errors import GvmError
    GVM_AVAILABLE = True
except ImportError:
    GVM_AVAILABLE = False

logger = logging.getLogger(__name__)


class OpenVASHelper:
    """Helper class for interacting with OpenVAS/GVM vulnerability scanner."""

    # Scan config UUIDs (built-in configs)
    SCAN_CONFIGS = {
        "discovery": "8715c877-47a0-438d-98a3-27c7a6ab2196",
        "host_discovery": "2d3f051c-55ba-11e3-bf43-406186ea4fc5",
        "system_discovery": "bbca7412-a950-11e3-9109-406186ea4fc5",
        "full_and_fast": "daba56c8-73ec-11df-a475-002264764cea",
        "full_and_deep": "708f25c4-7489-11df-8094-002264764cea",
        "full_and_very_deep": "74db13d6-7489-11df-91b9-002264764cea",
    }

    def __init__(
        self,
        host: str = None,
        port: int = None,
        username: str = None,
        password: str = None,
        socket_path: str = None,
    ):
        """
        Initialize OpenVAS/GVM connection parameters.

        Args:
            host: GVM server hostname (default: from OPENVAS_HOST env)
            port: GVM server port (default: from OPENVAS_PORT env or 9390)
            username: GVM username (default: from OPENVAS_USERNAME env)
            password: GVM password (default: from OPENVAS_PASSWORD env)
            socket_path: Unix socket path (alternative to TCP connection)
        """
        self.host = host or os.getenv("OPENVAS_HOST", "localhost")
        self.port = port or int(os.getenv("OPENVAS_PORT", "9390"))
        self.username = username or os.getenv("OPENVAS_USERNAME", "admin")
        self.password = password or os.getenv("OPENVAS_PASSWORD", "admin")
        self.socket_path = socket_path or os.getenv("OPENVAS_SOCKET", "")

        self._connection = None
        self._gmp = None
        self._authenticated = False

    def is_connected(self) -> bool:
        """
        Check if GVM server is accessible.

        Returns:
            True if server responds, False otherwise.
        """
        if not GVM_AVAILABLE:
            logger.warning("python-gvm library not installed")
            return False

        try:
            with self._create_connection() as connection:
                with Gmp(connection=connection, transform=EtreeTransform()) as gmp:
                    gmp.authenticate(self.username, self.password)
                    gmp.get_version()
                    return True
        except Exception as e:
            logger.debug(f"OpenVAS connection check failed: {e}")
            return False

    def _create_connection(self):
        """Create appropriate connection based on configuration."""
        if self.socket_path:
            return UnixSocketConnection(path=self.socket_path)
        else:
            return TLSConnection(hostname=self.host, port=self.port)

    def get_version(self) -> str:
        """
        Get GVM/OpenVAS version.

        Returns:
            Version string or empty string if unavailable.
        """
        if not GVM_AVAILABLE:
            return ""

        try:
            with self._create_connection() as connection:
                with Gmp(connection=connection, transform=EtreeTransform()) as gmp:
                    gmp.authenticate(self.username, self.password)
                    version_response = gmp.get_version()
                    version = version_response.find(".//version")
                    if version is not None:
                        return version.text or ""
                    return ""
        except Exception as e:
            logger.error(f"Failed to get GVM version: {e}")
            return ""

    def authenticate(self) -> bool:
        """
        Authenticate with GVM server.

        Returns:
            True if authentication successful, False otherwise.
        """
        if not GVM_AVAILABLE:
            logger.error("python-gvm library not available")
            return False

        try:
            self._connection = self._create_connection()
            self._connection.connect()
            self._gmp = Gmp(connection=self._connection, transform=EtreeTransform())
            self._gmp.authenticate(self.username, self.password)
            self._authenticated = True
            logger.info("Authenticated with GVM")
            return True
        except Exception as e:
            logger.error(f"GVM authentication failed: {e}")
            self._authenticated = False
            return False

    def disconnect(self):
        """Disconnect from GVM server."""
        if self._connection:
            try:
                self._connection.disconnect()
            except Exception:
                pass
            self._connection = None
            self._gmp = None
            self._authenticated = False

    def get_nvt_count(self) -> int:
        """
        Get the count of Network Vulnerability Tests (NVTs).

        Returns:
            Number of NVTs available, 0 if error.
        """
        if not GVM_AVAILABLE:
            return 0

        try:
            with self._create_connection() as connection:
                with Gmp(connection=connection, transform=EtreeTransform()) as gmp:
                    gmp.authenticate(self.username, self.password)
                    nvts = gmp.get_nvts()
                    nvt_list = nvts.findall(".//nvt")
                    return len(nvt_list)
        except Exception as e:
            logger.error(f"Failed to get NVT count: {e}")
            return 0

    def create_target(
        self,
        name: str,
        hosts: str,
        port_list_id: str = None,
        comment: str = "",
    ) -> Optional[str]:
        """
        Create a scan target.

        Args:
            name: Target name
            hosts: Comma-separated list of hosts (IPs, ranges, hostnames)
            port_list_id: Port list ID to use (default: All TCP and Nmap top 100 UDP)
            comment: Optional comment

        Returns:
            Target ID if created successfully, None otherwise.
        """
        if not GVM_AVAILABLE:
            return None

        try:
            with self._create_connection() as connection:
                with Gmp(connection=connection, transform=EtreeTransform()) as gmp:
                    gmp.authenticate(self.username, self.password)

                    # Get default port list if not specified
                    if not port_list_id:
                        port_lists = gmp.get_port_lists()
                        for pl in port_lists.findall(".//port_list"):
                            pl_name = pl.find("name")
                            if pl_name is not None and "All TCP" in (pl_name.text or ""):
                                port_list_id = pl.get("id")
                                break

                    response = gmp.create_target(
                        name=name,
                        hosts=[hosts] if isinstance(hosts, str) else hosts,
                        port_list_id=port_list_id,
                        comment=comment,
                    )

                    target_id = response.get("id")
                    if target_id:
                        logger.info(f"Created target '{name}' with ID: {target_id}")
                        return target_id

                    # Try to extract ID from response
                    status = response.get("status")
                    if status == "201":
                        target_id = response.get("id")
                        return target_id

                    return None

        except Exception as e:
            logger.error(f"Failed to create target: {e}")
            return None

    def create_task(
        self,
        name: str,
        target_id: str,
        config: str = "full_and_fast",
        scanner_id: str = None,
        comment: str = "",
    ) -> Optional[str]:
        """
        Create a scan task.

        Args:
            name: Task name
            target_id: Target ID to scan
            config: Scan config name or UUID (default: full_and_fast)
            scanner_id: Scanner ID (default: OpenVAS Default Scanner)
            comment: Optional comment

        Returns:
            Task ID if created successfully, None otherwise.
        """
        if not GVM_AVAILABLE:
            return None

        # Resolve config name to UUID
        config_id = self.SCAN_CONFIGS.get(config, config)

        try:
            with self._create_connection() as connection:
                with Gmp(connection=connection, transform=EtreeTransform()) as gmp:
                    gmp.authenticate(self.username, self.password)

                    # Get default scanner if not specified
                    if not scanner_id:
                        scanners = gmp.get_scanners()
                        for scanner in scanners.findall(".//scanner"):
                            scanner_name = scanner.find("name")
                            if scanner_name is not None and "OpenVAS" in (scanner_name.text or ""):
                                scanner_id = scanner.get("id")
                                break

                    response = gmp.create_task(
                        name=name,
                        config_id=config_id,
                        target_id=target_id,
                        scanner_id=scanner_id,
                        comment=comment,
                    )

                    task_id = response.get("id")
                    if task_id:
                        logger.info(f"Created task '{name}' with ID: {task_id}")
                        return task_id

                    return None

        except Exception as e:
            logger.error(f"Failed to create task: {e}")
            return None

    def start_task(self, task_id: str) -> Optional[str]:
        """
        Start a scan task.

        Args:
            task_id: The task ID to start

        Returns:
            Report ID if started successfully, None otherwise.
        """
        if not GVM_AVAILABLE:
            return None

        try:
            with self._create_connection() as connection:
                with Gmp(connection=connection, transform=EtreeTransform()) as gmp:
                    gmp.authenticate(self.username, self.password)
                    response = gmp.start_task(task_id)

                    report_id = response.find(".//report_id")
                    if report_id is not None:
                        rid = report_id.text
                        logger.info(f"Started task {task_id}, report ID: {rid}")
                        return rid

                    return None

        except Exception as e:
            logger.error(f"Failed to start task {task_id}: {e}")
            return None

    def get_task_status(self, task_id: str) -> Dict[str, Any]:
        """
        Get current status of a task.

        Args:
            task_id: The task ID to check

        Returns:
            Dictionary with task status information.
        """
        if not GVM_AVAILABLE:
            return {"status": "unknown", "error": "python-gvm not available"}

        try:
            with self._create_connection() as connection:
                with Gmp(connection=connection, transform=EtreeTransform()) as gmp:
                    gmp.authenticate(self.username, self.password)
                    task = gmp.get_task(task_id)

                    status_elem = task.find(".//status")
                    progress_elem = task.find(".//progress")
                    name_elem = task.find(".//name")

                    return {
                        "status": status_elem.text if status_elem is not None else "unknown",
                        "progress": int(progress_elem.text) if progress_elem is not None and progress_elem.text else 0,
                        "name": name_elem.text if name_elem is not None else "",
                    }

        except Exception as e:
            logger.error(f"Failed to get task status: {e}")
            return {"status": "error", "error": str(e)}

    def wait_for_task(self, task_id: str, timeout: int = 600) -> bool:
        """
        Wait for a task to complete.

        Args:
            task_id: The task ID to wait for
            timeout: Maximum time to wait in seconds

        Returns:
            True if task completed, False if timeout or error.
        """
        start_time = time.time()
        while time.time() - start_time < timeout:
            status = self.get_task_status(task_id)
            current_status = status.get("status", "").lower()

            if current_status == "done":
                logger.info(f"Task {task_id} completed")
                return True
            elif current_status in ("stopped", "stop requested"):
                logger.warning(f"Task {task_id} was stopped")
                return False

            progress = status.get("progress", 0)
            logger.debug(f"Task {task_id} progress: {progress}%")
            time.sleep(10)

        logger.warning(f"Task {task_id} timed out after {timeout}s")
        return False

    def get_results(self, task_id: str) -> List[Dict[str, Any]]:
        """
        Get vulnerability results from a task.

        Args:
            task_id: The task ID to get results from

        Returns:
            List of result dictionaries.
        """
        if not GVM_AVAILABLE:
            return []

        try:
            with self._create_connection() as connection:
                with Gmp(connection=connection, transform=EtreeTransform()) as gmp:
                    gmp.authenticate(self.username, self.password)

                    # Get task to find report ID
                    task = gmp.get_task(task_id)
                    last_report = task.find(".//last_report/report")
                    if last_report is None:
                        return []

                    report_id = last_report.get("id")
                    if not report_id:
                        return []

                    # Get report results
                    report = gmp.get_report(report_id)
                    results = []

                    for result in report.findall(".//result"):
                        nvt = result.find("nvt")
                        host_elem = result.find("host")
                        severity_elem = result.find("severity")
                        desc_elem = result.find("description")

                        results.append({
                            "nvt_oid": nvt.get("oid") if nvt is not None else "",
                            "nvt_name": nvt.find("name").text if nvt is not None and nvt.find("name") is not None else "",
                            "host": host_elem.text if host_elem is not None else "",
                            "severity": float(severity_elem.text) if severity_elem is not None and severity_elem.text else 0.0,
                            "severity_class": self._severity_class(float(severity_elem.text) if severity_elem is not None and severity_elem.text else 0.0),
                            "description": desc_elem.text[:500] if desc_elem is not None and desc_elem.text else "",
                        })

                    return results

        except Exception as e:
            logger.error(f"Failed to get results: {e}")
            return []

    def _severity_class(self, severity: float) -> str:
        """Convert CVSS severity score to class name."""
        if severity >= 9.0:
            return "Critical"
        elif severity >= 7.0:
            return "High"
        elif severity >= 4.0:
            return "Medium"
        elif severity > 0.0:
            return "Low"
        else:
            return "Info"

    def get_report_summary(self, task_id: str) -> Dict[str, Any]:
        """
        Get summary statistics for a task's report.

        Args:
            task_id: The task ID to summarize

        Returns:
            Dictionary with summary statistics.
        """
        results = self.get_results(task_id)

        severity_counts = {
            "critical": 0,
            "high": 0,
            "medium": 0,
            "low": 0,
            "info": 0,
        }

        hosts = set()
        for result in results:
            severity_class = result.get("severity_class", "Info").lower()
            if severity_class in severity_counts:
                severity_counts[severity_class] += 1
            hosts.add(result.get("host", ""))

        return {
            "total_results": len(results),
            "host_count": len(hosts),
            "severity_counts": severity_counts,
        }

    def delete_task(self, task_id: str) -> bool:
        """
        Delete a task.

        Args:
            task_id: The task ID to delete

        Returns:
            True if deleted, False otherwise.
        """
        if not GVM_AVAILABLE:
            return False

        try:
            with self._create_connection() as connection:
                with Gmp(connection=connection, transform=EtreeTransform()) as gmp:
                    gmp.authenticate(self.username, self.password)
                    gmp.delete_task(task_id, ultimate=True)
                    logger.info(f"Deleted task {task_id}")
                    return True

        except Exception as e:
            logger.error(f"Failed to delete task {task_id}: {e}")
            return False

    def delete_target(self, target_id: str) -> bool:
        """
        Delete a target.

        Args:
            target_id: The target ID to delete

        Returns:
            True if deleted, False otherwise.
        """
        if not GVM_AVAILABLE:
            return False

        try:
            with self._create_connection() as connection:
                with Gmp(connection=connection, transform=EtreeTransform()) as gmp:
                    gmp.authenticate(self.username, self.password)
                    gmp.delete_target(target_id, ultimate=True)
                    logger.info(f"Deleted target {target_id}")
                    return True

        except Exception as e:
            logger.error(f"Failed to delete target {target_id}: {e}")
            return False

    def list_tasks(self) -> List[Dict[str, Any]]:
        """
        List all available tasks.

        Returns:
            List of task dictionaries.
        """
        if not GVM_AVAILABLE:
            return []

        try:
            with self._create_connection() as connection:
                with Gmp(connection=connection, transform=EtreeTransform()) as gmp:
                    gmp.authenticate(self.username, self.password)
                    tasks = gmp.get_tasks()

                    result = []
                    for task in tasks.findall(".//task"):
                        name_elem = task.find("name")
                        status_elem = task.find("status")
                        result.append({
                            "id": task.get("id"),
                            "name": name_elem.text if name_elem is not None else "",
                            "status": status_elem.text if status_elem is not None else "",
                        })
                    return result

        except Exception as e:
            logger.error(f"Failed to list tasks: {e}")
            return []

    def list_scan_configs(self) -> List[Dict[str, str]]:
        """
        List available scan configurations.

        Returns:
            List of scan config dictionaries.
        """
        if not GVM_AVAILABLE:
            return []

        try:
            with self._create_connection() as connection:
                with Gmp(connection=connection, transform=EtreeTransform()) as gmp:
                    gmp.authenticate(self.username, self.password)
                    configs = gmp.get_scan_configs()

                    result = []
                    for config in configs.findall(".//config"):
                        name_elem = config.find("name")
                        result.append({
                            "id": config.get("id"),
                            "name": name_elem.text if name_elem is not None else "",
                        })
                    return result

        except Exception as e:
            logger.error(f"Failed to list scan configs: {e}")
            return []
