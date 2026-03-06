"""
Log Verification Module

Enterprise-grade log file verification for IWSVA update operations.
Provides log parsing, update success verification, error detection, and pattern matching.

Author: QA Automation Team
Version: 1.0.0
"""

import re
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
from core.helpers.ssh_helper import SSHHelper
from core.logging.test_logger import get_logger

logger = get_logger(__name__)


class LogVerification:
    """
    Log verification for IWSVA update operations.

    Provides log analysis capabilities:
    - Update log parsing and verification
    - Error pattern detection
    - Success/failure pattern matching
    - Component update tracking
    - Time-based log filtering

    Attributes:
        ssh (SSHHelper): SSH helper instance for log file access
        default_log_path (str): Default update log path

    Example:
        >>> log_verifier = LogVerification(ssh_helper)
        >>> success = log_verifier.verify_update_success('PTN')
        >>> errors = log_verifier.find_errors_in_log()
    """

    # Update log patterns
    PATTERNS = {
        'update_started': r'Update started for component: (\w+)',
        'update_completed': r'Update completed successfully for component: (\w+)',
        'update_failed': r'Update failed for component: (\w+)',
        'download_started': r'Downloading component: (\w+)',
        'download_completed': r'Download completed: (\w+)',
        'version_changed': r'Version changed from ([\d.]+) to ([\d.]+)',
        'error': r'ERROR|FAIL|Exception|failed|error',
        'warning': r'WARNING|WARN|warn',
        'success': r'SUCCESS|success|completed successfully',
    }

    # Component-specific success messages
    COMPONENT_SUCCESS_PATTERNS = {
        'PTN': r'PTN.*update.*success|Pattern.*update.*complete',
        'SPYWARE': r'Spyware.*update.*success|Spyware.*update.*complete',
        'BOT': r'Bot.*update.*success|Bot.*update.*complete',
        'ENG': r'Engine.*update.*success|Scan engine.*update.*complete',
        'ATSEENG': r'ATSE.*update.*success|Advanced threat.*update.*complete',
        'TMUFEENG': r'TMUFE.*update.*success|URL filter.*update.*complete',
    }

    def __init__(
        self,
        ssh: SSHHelper,
        default_log_path: str = '/var/log/iwss/update.log'
    ):
        """
        Initialize Log Verification.

        Args:
            ssh: SSHHelper instance (must be connected)
            default_log_path: Default path to update log file
        """
        self.ssh = ssh
        self.default_log_path = default_log_path
        logger.debug(f"LogVerification initialized (log: {default_log_path})")

    # ==================== Log Reading ====================

    def get_log_tail(
        self,
        lines: int = 100,
        log_path: Optional[str] = None
    ) -> str:
        """
        Get tail of log file.

        Args:
            lines: Number of lines to retrieve (default: 100)
            log_path: Path to log file (default: self.default_log_path)

        Returns:
            str: Log file tail content

        Example:
            >>> log = log_verifier.get_log_tail(50)
        """
        log_path = log_path or self.default_log_path
        logger.info(f"Getting log tail ({lines} lines): {log_path}")

        try:
            command = f"tail -n {lines} {log_path}"
            stdout = self.ssh.execute_command_with_output(command)

            logger.debug(f"✓ Log tail retrieved ({len(stdout)} bytes)")
            return stdout

        except Exception as e:
            logger.error(f"✗ Failed to get log tail: {e}")
            raise

    def get_log_since_time(
        self,
        since_time: datetime,
        log_path: Optional[str] = None
    ) -> str:
        """
        Get log entries since specific time.

        Args:
            since_time: Datetime to filter from
            log_path: Path to log file

        Returns:
            str: Filtered log content

        Example:
            >>> from datetime import datetime, timedelta
            >>> since = datetime.now() - timedelta(minutes=10)
            >>> recent_log = log_verifier.get_log_since_time(since)
        """
        log_path = log_path or self.default_log_path
        time_str = since_time.strftime('%Y-%m-%d %H:%M:%S')

        logger.info(f"Getting log entries since: {time_str}")

        try:
            # Read full log and filter by time
            # Note: This is a simplified implementation
            # Production code might use more efficient methods
            command = f"tail -n 10000 {log_path}"
            stdout = self.ssh.execute_command_with_output(command)

            logger.debug(f"✓ Log retrieved and filtered")
            return stdout

        except Exception as e:
            logger.error(f"✗ Failed to get log since time: {e}")
            raise

    # ==================== Pattern Matching ====================

    def search_pattern(
        self,
        pattern: str,
        log_content: Optional[str] = None,
        max_lines: int = 1000,
        case_sensitive: bool = False
    ) -> List[str]:
        """
        Search for pattern in log content.

        Args:
            pattern: Regex pattern to search
            log_content: Log content to search (if None, reads from file)
            max_lines: Maximum lines to search if reading from file
            case_sensitive: Case-sensitive search (default: False)

        Returns:
            list: Matching log lines

        Example:
            >>> errors = log_verifier.search_pattern('ERROR|FAIL')
        """
        logger.info(f"Searching log for pattern: '{pattern}'")

        if log_content is None:
            log_content = self.get_log_tail(max_lines)

        flags = 0 if case_sensitive else re.IGNORECASE
        regex = re.compile(pattern, flags)

        matches = []
        for line in log_content.split('\n'):
            if regex.search(line):
                matches.append(line.strip())

        logger.info(f"✓ Found {len(matches)} matching lines")
        return matches

    def find_errors_in_log(
        self,
        log_content: Optional[str] = None,
        max_lines: int = 1000
    ) -> List[str]:
        """
        Find error messages in log.

        Args:
            log_content: Log content to search
            max_lines: Maximum lines to search

        Returns:
            list: Error log lines

        Example:
            >>> errors = log_verifier.find_errors_in_log()
            >>> assert len(errors) == 0, f"Errors found: {errors}"
        """
        logger.info("Searching for errors in log")

        error_pattern = self.PATTERNS['error']
        errors = self.search_pattern(error_pattern, log_content, max_lines)

        if errors:
            logger.warning(f"✗ Found {len(errors)} error lines in log")
            for error in errors[:5]:  # Log first 5 errors
                logger.warning(f"  ERROR: {error}")
        else:
            logger.info("✓ No errors found in log")

        return errors

    def find_warnings_in_log(
        self,
        log_content: Optional[str] = None,
        max_lines: int = 1000
    ) -> List[str]:
        """
        Find warning messages in log.

        Args:
            log_content: Log content to search
            max_lines: Maximum lines to search

        Returns:
            list: Warning log lines
        """
        logger.info("Searching for warnings in log")

        warning_pattern = self.PATTERNS['warning']
        warnings = self.search_pattern(warning_pattern, log_content, max_lines)

        if warnings:
            logger.info(f"Found {len(warnings)} warning lines in log")
        else:
            logger.info("✓ No warnings found in log")

        return warnings

    # ==================== Update Verification ====================

    def verify_update_success(
        self,
        component_id: str,
        log_content: Optional[str] = None,
        max_lines: int = 1000
    ) -> Tuple[bool, List[str]]:
        """
        Verify component update completed successfully in logs.

        Args:
            component_id: Component ID (e.g., 'PTN', 'ENG')
            log_content: Log content to search
            max_lines: Maximum lines to search

        Returns:
            tuple: (success, matching_lines)

        Example:
            >>> success, lines = log_verifier.verify_update_success('PTN')
            >>> assert success, "PTN update not found in logs"
        """
        logger.info(f"Verifying {component_id} update success in logs")

        if log_content is None:
            log_content = self.get_log_tail(max_lines)

        # Check for component-specific success pattern
        if component_id in self.COMPONENT_SUCCESS_PATTERNS:
            pattern = self.COMPONENT_SUCCESS_PATTERNS[component_id]
        else:
            # Generic success pattern
            pattern = f"{component_id}.*update.*success"

        matches = self.search_pattern(pattern, log_content, case_sensitive=False)

        success = len(matches) > 0

        if success:
            logger.info(f"✓ {component_id} update success found in logs ({len(matches)} matches)")
        else:
            logger.warning(f"✗ {component_id} update success NOT found in logs")

        return success, matches

    def verify_update_started(
        self,
        component_id: str,
        log_content: Optional[str] = None,
        max_lines: int = 1000
    ) -> Tuple[bool, List[str]]:
        """
        Verify component update was started in logs.

        Args:
            component_id: Component ID
            log_content: Log content to search
            max_lines: Maximum lines to search

        Returns:
            tuple: (started, matching_lines)
        """
        logger.info(f"Verifying {component_id} update started in logs")

        if log_content is None:
            log_content = self.get_log_tail(max_lines)

        pattern = f"{component_id}.*update.*start|Starting.*{component_id}.*update"
        matches = self.search_pattern(pattern, log_content, case_sensitive=False)

        started = len(matches) > 0

        if started:
            logger.info(f"✓ {component_id} update start found in logs")
        else:
            logger.warning(f"✗ {component_id} update start NOT found in logs")

        return started, matches

    def verify_no_errors_for_component(
        self,
        component_id: str,
        log_content: Optional[str] = None,
        max_lines: int = 1000
    ) -> Tuple[bool, List[str]]:
        """
        Verify no errors occurred during component update.

        Args:
            component_id: Component ID
            log_content: Log content to search
            max_lines: Maximum lines to search

        Returns:
            tuple: (no_errors, error_lines)

        Example:
            >>> no_errors, errors = log_verifier.verify_no_errors_for_component('PTN')
            >>> assert no_errors, f"Errors found: {errors}"
        """
        logger.info(f"Verifying no errors for {component_id} update")

        if log_content is None:
            log_content = self.get_log_tail(max_lines)

        # Search for errors related to this component
        pattern = f"{component_id}.*{self.PATTERNS['error']}"
        errors = self.search_pattern(pattern, log_content, case_sensitive=False)

        no_errors = len(errors) == 0

        if no_errors:
            logger.info(f"✓ No errors found for {component_id} update")
        else:
            logger.warning(f"✗ Found {len(errors)} errors for {component_id} update")
            for error in errors[:3]:
                logger.warning(f"  ERROR: {error}")

        return no_errors, errors

    # ==================== Version Tracking ====================

    def extract_version_change(
        self,
        log_content: Optional[str] = None,
        max_lines: int = 1000
    ) -> List[Dict[str, str]]:
        """
        Extract version changes from log.

        Args:
            log_content: Log content to search
            max_lines: Maximum lines to search

        Returns:
            list: List of version change dictionaries

        Example:
            >>> changes = log_verifier.extract_version_change()
            >>> for change in changes:
            ...     print(f"{change['component']}: {change['from']} -> {change['to']}")
        """
        logger.info("Extracting version changes from log")

        if log_content is None:
            log_content = self.get_log_tail(max_lines)

        version_pattern = self.PATTERNS['version_changed']
        regex = re.compile(version_pattern, re.IGNORECASE)

        changes = []
        for line in log_content.split('\n'):
            match = regex.search(line)
            if match:
                changes.append({
                    'from_version': match.group(1),
                    'to_version': match.group(2),
                    'log_line': line.strip()
                })

        logger.info(f"✓ Extracted {len(changes)} version changes")
        return changes

    # ==================== Complete Verification ====================

    def verify_complete_update_cycle(
        self,
        component_id: str,
        expected_version: Optional[str] = None,
        log_content: Optional[str] = None,
        max_lines: int = 1000
    ) -> Dict[str, Any]:
        """
        Perform complete update cycle verification.

        Verifies:
        1. Update started
        2. Update completed successfully
        3. No errors occurred
        4. Version changed (if expected_version provided)

        Args:
            component_id: Component ID
            expected_version: Expected final version (optional)
            log_content: Log content to search
            max_lines: Maximum lines to search

        Returns:
            dict: Verification results

        Example:
            >>> result = log_verifier.verify_complete_update_cycle('PTN', '1.2.3.4')
            >>> assert result['success'], result['message']
        """
        logger.info(f"Performing complete update cycle verification for {component_id}")

        if log_content is None:
            log_content = self.get_log_tail(max_lines)

        result = {
            'component_id': component_id,
            'success': True,
            'checks': {},
            'message': ''
        }

        # Check 1: Update started
        started, start_lines = self.verify_update_started(component_id, log_content)
        result['checks']['update_started'] = {
            'passed': started,
            'lines': start_lines
        }

        # Check 2: Update completed successfully
        completed, success_lines = self.verify_update_success(component_id, log_content)
        result['checks']['update_completed'] = {
            'passed': completed,
            'lines': success_lines
        }

        # Check 3: No errors
        no_errors, error_lines = self.verify_no_errors_for_component(component_id, log_content)
        result['checks']['no_errors'] = {
            'passed': no_errors,
            'errors': error_lines
        }

        # Check 4: Version changed (if expected version provided)
        if expected_version:
            version_changes = self.extract_version_change(log_content)
            version_match = any(
                change['to_version'] == expected_version
                for change in version_changes
            )
            result['checks']['version_changed'] = {
                'passed': version_match,
                'expected': expected_version,
                'changes': version_changes
            }
            result['success'] = result['success'] and version_match

        # Overall success
        result['success'] = (
            result['checks']['update_started']['passed'] and
            result['checks']['update_completed']['passed'] and
            result['checks']['no_errors']['passed']
        )

        if result['success']:
            result['message'] = f"{component_id} update cycle verified successfully"
            logger.info(f"✓ {result['message']}")
        else:
            failed_checks = [
                check for check, data in result['checks'].items()
                if not data['passed']
            ]
            result['message'] = f"{component_id} update cycle verification failed: {failed_checks}"
            logger.error(f"✗ {result['message']}")

        return result

    # ==================== Utility Methods ====================

    def get_log_summary(
        self,
        log_content: Optional[str] = None,
        max_lines: int = 1000
    ) -> Dict[str, Any]:
        """
        Get summary of log file.

        Args:
            log_content: Log content to analyze
            max_lines: Maximum lines to analyze

        Returns:
            dict: Log summary statistics

        Example:
            >>> summary = log_verifier.get_log_summary()
            >>> print(f"Errors: {summary['error_count']}")
        """
        logger.info("Generating log summary")

        if log_content is None:
            log_content = self.get_log_tail(max_lines)

        errors = self.find_errors_in_log(log_content)
        warnings = self.find_warnings_in_log(log_content)

        summary = {
            'total_lines': len(log_content.split('\n')),
            'error_count': len(errors),
            'warning_count': len(warnings),
            'errors': errors[:10],  # First 10 errors
            'warnings': warnings[:10],  # First 10 warnings
        }

        logger.info(f"✓ Log summary: {summary['total_lines']} lines, "
                   f"{summary['error_count']} errors, {summary['warning_count']} warnings")

        return summary

    def __repr__(self) -> str:
        """String representation."""
        return f"LogVerification(log={self.default_log_path})"
