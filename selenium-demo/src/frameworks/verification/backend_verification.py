"""
Backend Verification Module

Enterprise-grade backend verification for IWSVA system using SSH.
Provides multi-level verification including kernel version, component versions,
INI file validation, lock file status, and service health checks.

Author: QA Automation Team
Version: 1.0.0
"""

import re
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime
from core.helpers.ssh_helper import SSHHelper, create_ssh_helper
from core.logging.test_logger import get_logger
from core.config.test_config import TestConfig

logger = get_logger(__name__)


class BackendVerification:
    """
    Backend verification for IWSVA system via SSH.

    Provides comprehensive backend verification capabilities:
    - Kernel version verification
    - Component version verification (patterns and engines)
    - INI file parsing and validation
    - Lock file status checking
    - Service status verification
    - Update log verification

    Attributes:
        ssh (SSHHelper): SSH helper instance
        connected (bool): SSH connection status

    Example:
        >>> from core.config.test_config import TestConfig
        >>> verifier = BackendVerification(TestConfig.SSH_CONFIG)
        >>> verifier.connect()
        >>> kernel = verifier.get_kernel_version()
        >>> verifier.disconnect()
    """

    # IWSVA Component INI file sections
    COMPONENT_INI_KEYS = {
        # Patterns
        'PTN': 'PTNVersion',
        'SPYWARE': 'SpywareVersion',
        'BOT': 'BotVersion',
        'ITP': 'ITPVersion',
        'ITE': 'ITEVersion',
        'ICRCAGENT': 'ICRCAgentVersion',

        # Engines
        'ENG': 'EngineVersion',
        'ATSEENG': 'ATSEEngineVersion',
        'TMUFEENG': 'TMUFEEngineVersion',
    }

    # Lock file paths for components
    LOCK_FILE_PATHS = {
        'PTN': '/var/iwss/updates/locks/ptn.lock',
        'SPYWARE': '/var/iwss/updates/locks/spyware.lock',
        'BOT': '/var/iwss/updates/locks/bot.lock',
        'ITP': '/var/iwss/updates/locks/itp.lock',
        'ITE': '/var/iwss/updates/locks/ite.lock',
        'ICRCAGENT': '/var/iwss/updates/locks/icrcagent.lock',
        'ENG': '/var/iwss/updates/locks/engine.lock',
        'ATSEENG': '/var/iwss/updates/locks/atseeng.lock',
        'TMUFEENG': '/var/iwss/updates/locks/tmufeeng.lock',
    }

    def __init__(self, ssh_config: Dict[str, Any]):
        """
        Initialize Backend Verification.

        Args:
            ssh_config: SSH configuration dictionary with keys:
                - host: SSH server hostname/IP
                - port: SSH port
                - username: SSH username
                - password: SSH password
        """
        self.ssh = create_ssh_helper(ssh_config)
        self.connected = False
        logger.debug("BackendVerification initialized")

    def connect(self) -> bool:
        """
        Establish SSH connection to IWSVA server.

        Returns:
            bool: True if connection successful

        Raises:
            Exception: If SSH connection fails
        """
        try:
            self.connected = self.ssh.connect()
            logger.info("✓ Backend verification connection established")
            return self.connected
        except Exception as e:
            logger.error(f"✗ Backend verification connection failed: {e}")
            raise

    def disconnect(self) -> None:
        """Close SSH connection."""
        self.ssh.disconnect()
        self.connected = False
        logger.info("✓ Backend verification connection closed")

    # ==================== Kernel Verification ====================

    def get_kernel_version(self) -> str:
        """
        Get current kernel version from backend.

        Returns:
            str: Kernel version (e.g., '5.14.0-427.24.1.el9_4.x86_64')

        Raises:
            RuntimeError: If command execution fails

        Example:
            >>> version = verifier.get_kernel_version()
            >>> print(f"Kernel: {version}")
        """
        logger.info("Getting kernel version from backend")

        try:
            stdout = self.ssh.execute_command_with_output('uname -r')
            kernel_version = stdout.strip()

            logger.info(f"✓ Kernel version: {kernel_version}")
            return kernel_version

        except Exception as e:
            logger.error(f"✗ Failed to get kernel version: {e}")
            raise

    def verify_kernel_version(self, expected_version: str) -> Tuple[bool, str]:
        """
        Verify kernel version matches expected version.

        Args:
            expected_version: Expected kernel version

        Returns:
            tuple: (is_match, actual_version)

        Example:
            >>> is_match, actual = verifier.verify_kernel_version('5.14.0-427.24.1.el9_4.x86_64')
            >>> assert is_match, f"Kernel mismatch: expected {expected_version}, got {actual}"
        """
        logger.info(f"Verifying kernel version (expected: {expected_version})")

        actual_version = self.get_kernel_version()
        is_match = actual_version == expected_version

        if is_match:
            logger.info(f"✓ Kernel version verified: {actual_version}")
        else:
            logger.warning(f"✗ Kernel version mismatch: expected '{expected_version}', got '{actual_version}'")

        return is_match, actual_version

    # ==================== INI File Operations ====================

    def get_ini_file_content(self, ini_path: str = None) -> str:
        """
        Get content of INI configuration file.

        Args:
            ini_path: Path to INI file (default: from TestConfig)

        Returns:
            str: INI file content

        Raises:
            FileNotFoundError: If INI file not found
        """
        if ini_path is None:
            ini_path = TestConfig.BACKEND_PATHS['ini_file']

        logger.debug(f"Reading INI file: {ini_path}")

        try:
            content = self.ssh.read_file(ini_path)
            logger.debug(f"✓ INI file read successfully ({len(content)} bytes)")
            return content

        except FileNotFoundError:
            logger.error(f"✗ INI file not found: {ini_path}")
            raise

    def parse_ini_file(self, ini_content: str) -> Dict[str, str]:
        """
        Parse INI file content into key-value dictionary.

        Args:
            ini_content: INI file content

        Returns:
            dict: Parsed INI data (key: value)

        Example:
            >>> content = verifier.get_ini_file_content()
            >>> data = verifier.parse_ini_file(content)
            >>> ptn_version = data.get('PTNVersion')
        """
        logger.debug("Parsing INI file content")

        ini_data = {}

        for line in ini_content.split('\n'):
            line = line.strip()

            # Skip empty lines and comments
            if not line or line.startswith('#') or line.startswith(';'):
                continue

            # Parse key=value pairs
            if '=' in line:
                key, value = line.split('=', 1)
                ini_data[key.strip()] = value.strip()

        logger.debug(f"✓ INI file parsed ({len(ini_data)} entries)")
        return ini_data

    def get_component_version_from_ini(self, component_id: str) -> Optional[str]:
        """
        Get component version from INI file.

        Args:
            component_id: Component ID (e.g., 'PTN', 'ENG', 'SPYWARE')

        Returns:
            str: Component version or None if not found

        Example:
            >>> ptn_version = verifier.get_component_version_from_ini('PTN')
            >>> print(f"PTN version: {ptn_version}")
        """
        logger.info(f"Getting {component_id} version from INI file")

        # Get INI key for component
        ini_key = self.COMPONENT_INI_KEYS.get(component_id)
        if not ini_key:
            logger.error(f"✗ Unknown component ID: {component_id}")
            return None

        try:
            # Read and parse INI file
            ini_content = self.get_ini_file_content()
            ini_data = self.parse_ini_file(ini_content)

            # Get version
            version = ini_data.get(ini_key)

            if version:
                logger.info(f"✓ {component_id} version from INI: {version}")
            else:
                logger.warning(f"✗ {component_id} version not found in INI file (key: {ini_key})")

            return version

        except Exception as e:
            logger.error(f"✗ Failed to get {component_id} version from INI: {e}")
            return None

    def verify_component_version(
        self,
        component_id: str,
        expected_version: str
    ) -> Tuple[bool, Optional[str]]:
        """
        Verify component version matches expected version.

        Args:
            component_id: Component ID (e.g., 'PTN', 'ENG')
            expected_version: Expected component version

        Returns:
            tuple: (is_match, actual_version)

        Example:
            >>> is_match, actual = verifier.verify_component_version('PTN', '1.2.3.4')
            >>> assert is_match, f"Version mismatch: {actual}"
        """
        logger.info(f"Verifying {component_id} version (expected: {expected_version})")

        actual_version = self.get_component_version_from_ini(component_id)

        if actual_version is None:
            logger.error(f"✗ Cannot verify {component_id} version: version not found")
            return False, None

        is_match = actual_version == expected_version

        if is_match:
            logger.info(f"✓ {component_id} version verified: {actual_version}")
        else:
            logger.warning(
                f"✗ {component_id} version mismatch: "
                f"expected '{expected_version}', got '{actual_version}'"
            )

        return is_match, actual_version

    # ==================== Lock File Operations ====================

    def check_lock_file_exists(self, component_id: str) -> bool:
        """
        Check if component lock file exists.

        Lock files indicate an update is in progress for a component.

        Args:
            component_id: Component ID (e.g., 'PTN', 'ENG')

        Returns:
            bool: True if lock file exists (update in progress)

        Example:
            >>> if verifier.check_lock_file_exists('PTN'):
            ...     print("PTN update in progress")
        """
        lock_path = self.LOCK_FILE_PATHS.get(component_id)

        if not lock_path:
            logger.error(f"✗ Unknown component ID: {component_id}")
            return False

        logger.debug(f"Checking lock file for {component_id}: {lock_path}")

        exists = self.ssh.file_exists(lock_path)

        if exists:
            logger.info(f"✓ Lock file exists for {component_id} (update in progress)")
        else:
            logger.debug(f"✗ No lock file for {component_id} (no update in progress)")

        return exists

    def wait_for_lock_file_removal(
        self,
        component_id: str,
        timeout: int = 600,
        check_interval: int = 5
    ) -> bool:
        """
        Wait for component lock file to be removed (update completion).

        Args:
            component_id: Component ID
            timeout: Maximum wait time in seconds (default: 600)
            check_interval: Check interval in seconds (default: 5)

        Returns:
            bool: True if lock file removed within timeout

        Example:
            >>> success = verifier.wait_for_lock_file_removal('PTN', timeout=300)
            >>> assert success, "Update timeout"
        """
        logger.info(f"Waiting for {component_id} lock file removal (timeout: {timeout}s)")

        import time
        start_time = time.time()
        elapsed = 0

        while elapsed < timeout:
            if not self.check_lock_file_exists(component_id):
                logger.info(f"✓ {component_id} lock file removed (update complete)")
                return True

            time.sleep(check_interval)
            elapsed = time.time() - start_time

            if elapsed % 30 == 0:  # Log every 30 seconds
                logger.info(f"Still waiting for {component_id} update... ({int(elapsed)}s elapsed)")

        logger.error(f"✗ Timeout waiting for {component_id} lock file removal ({timeout}s)")
        return False

    # ==================== Service Status ====================

    def is_iwss_service_running(self) -> bool:
        """
        Check if IWSS service is running.

        Returns:
            bool: True if IWSS service is running

        Example:
            >>> if verifier.is_iwss_service_running():
            ...     print("IWSS service is healthy")
        """
        logger.info("Checking IWSS service status")
        is_running = self.ssh.is_service_running('iwss')

        if is_running:
            logger.info("✓ IWSS service is running")
        else:
            logger.warning("✗ IWSS service is not running")

        return is_running

    def get_iwss_service_status(self) -> Dict[str, Any]:
        """
        Get detailed IWSS service status.

        Returns:
            dict: Service status information
        """
        logger.info("Getting IWSS service detailed status")
        return self.ssh.get_service_status('iwss')

    # ==================== Log Verification ====================

    def get_update_log_tail(self, lines: int = 100) -> str:
        """
        Get tail of update log file.

        Args:
            lines: Number of lines to retrieve (default: 100)

        Returns:
            str: Log file tail content

        Example:
            >>> log = verifier.get_update_log_tail(50)
            >>> assert 'Update completed successfully' in log
        """
        log_path = '/var/log/iwss/update.log'
        logger.info(f"Getting update log tail ({lines} lines)")

        try:
            command = f"tail -n {lines} {log_path}"
            stdout = self.ssh.execute_command_with_output(command)

            logger.debug(f"✓ Update log retrieved ({len(stdout)} bytes)")
            return stdout

        except Exception as e:
            logger.error(f"✗ Failed to get update log: {e}")
            raise

    def search_log_for_pattern(
        self,
        pattern: str,
        log_path: str = '/var/log/iwss/update.log',
        max_lines: int = 1000
    ) -> List[str]:
        """
        Search log file for pattern using grep.

        Args:
            pattern: Regex pattern to search
            log_path: Path to log file
            max_lines: Maximum lines to search

        Returns:
            list: Matching log lines

        Example:
            >>> errors = verifier.search_log_for_pattern('ERROR|FAIL')
            >>> assert len(errors) == 0, f"Found errors: {errors}"
        """
        logger.info(f"Searching log for pattern: {pattern}")

        try:
            command = f"tail -n {max_lines} {log_path} | grep -E '{pattern}' || true"
            stdout = self.ssh.execute_command_with_output(command, expected_exit_code=0)

            matches = [line.strip() for line in stdout.split('\n') if line.strip()]

            logger.info(f"✓ Found {len(matches)} matching log lines")
            return matches

        except Exception as e:
            logger.error(f"✗ Failed to search log: {e}")
            return []

    # ==================== System Information ====================

    def get_system_info(self) -> Dict[str, str]:
        """
        Get comprehensive system information.

        Returns:
            dict: System information including OS, kernel, hostname, uptime

        Example:
            >>> info = verifier.get_system_info()
            >>> print(f"OS: {info['os_version']}")
        """
        logger.info("Getting system information")

        info = {}

        try:
            # Kernel version
            info['kernel_version'] = self.ssh.execute_command_with_output('uname -r')

            # OS version
            info['os_version'] = self.ssh.execute_command_with_output('cat /etc/redhat-release')

            # Hostname
            info['hostname'] = self.ssh.execute_command_with_output('hostname')

            # Uptime
            info['uptime'] = self.ssh.execute_command_with_output('uptime -p')

            # Current time
            info['current_time'] = self.ssh.execute_command_with_output('date')

            logger.info(f"✓ System info retrieved: {info['hostname']} ({info['os_version']})")
            return info

        except Exception as e:
            logger.error(f"✗ Failed to get system info: {e}")
            raise

    # ==================== Context Manager ====================

    def __enter__(self):
        """Context manager entry - auto connect."""
        self.connect()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - auto disconnect."""
        self.disconnect()

    def __repr__(self) -> str:
        """String representation."""
        status = "connected" if self.connected else "disconnected"
        return f"BackendVerification({status})"
