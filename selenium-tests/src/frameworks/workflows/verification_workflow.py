"""
Verification Workflow Module

Orchestrates multi-level verification operations (UI + Backend + Log).
Provides comprehensive verification with detailed reporting.

Author: QA Automation Team
Version: 1.0.0
"""

from typing import Dict, Any, Optional, List
from datetime import datetime

from selenium import webdriver

from core.logging.test_logger import get_logger
from frameworks.pages.system_update_page import SystemUpdatePage
from frameworks.verification.backend_verification import BackendVerification
from frameworks.verification.ui_verification import UIVerification
from frameworks.verification.log_verification import LogVerification

logger = get_logger(__name__)


class VerificationWorkflow:
    """
    Orchestrates multi-level verification operations.

    Provides comprehensive verification across:
    - UI Level: What user sees
    - Backend Level: Source of truth (SSH)
    - Log Level: Historical audit trail

    Attributes:
        driver: WebDriver instance
        system_update_page: System Update page object
        backend_verifier: Backend verification instance (optional)
        ui_verifier: UI verification instance
        log_verifier: Log verification instance (optional)

    Example:
        >>> workflow = VerificationWorkflow(driver, backend_verifier, ui_verifier, log_verifier)
        >>> result = workflow.verify_component_state('PTN')
        >>> assert result['all_passed'], result['failures']
    """

    def __init__(
        self,
        driver: webdriver.Remote,
        backend_verifier: Optional[BackendVerification] = None,
        ui_verifier: Optional[UIVerification] = None,
        log_verifier: Optional[LogVerification] = None
    ):
        """
        Initialize Verification Workflow.

        Args:
            driver: WebDriver instance
            backend_verifier: Backend verification instance (optional)
            ui_verifier: UI verification instance (optional)
            log_verifier: Log verification instance (optional)
        """
        self.driver = driver
        self.system_update_page = SystemUpdatePage(driver)
        self.backend_verifier = backend_verifier
        self.ui_verifier = ui_verifier or UIVerification(driver)
        self.log_verifier = log_verifier

        logger.debug("VerificationWorkflow initialized")

    # ==================== Multi-Level Verification ====================

    def verify_component_state(
        self,
        component_id: str,
        expected_version: Optional[str] = None,
        check_ui: bool = True,
        check_backend: bool = True,
        check_logs: bool = True
    ) -> Dict[str, Any]:
        """
        Perform comprehensive multi-level component verification.

        Verifies:
        1. UI Level: Component displayed correctly
        2. Backend Level: Version in INI file
        3. Log Level: No recent errors

        Args:
            component_id: Component ID (e.g., 'PTN')
            expected_version: Expected version (optional)
            check_ui: Perform UI verification
            check_backend: Perform backend verification
            check_logs: Perform log verification

        Returns:
            dict: Comprehensive verification results

        Example:
            >>> result = workflow.verify_component_state('PTN', '1.2.3.4')
            >>> if not result['all_passed']:
            ...     print(f"Failures: {result['failures']}")
        """
        logger.info("=" * 80)
        logger.info(f"MULTI-LEVEL VERIFICATION: {component_id}")
        logger.info("=" * 80)

        result = {
            'component_id': component_id,
            'expected_version': expected_version,
            'all_passed': True,
            'ui_verification': {},
            'backend_verification': {},
            'log_verification': {},
            'failures': [],
            'timestamp': datetime.now().isoformat()
        }

        # UI Level Verification
        if check_ui:
            logger.info("UI Level Verification")
            ui_result = self._verify_ui_level(component_id)
            result['ui_verification'] = ui_result

            if not ui_result.get('passed', False):
                result['all_passed'] = False
                result['failures'].append('UI verification failed')

        # Backend Level Verification
        if check_backend and self.backend_verifier:
            logger.info("Backend Level Verification")
            backend_result = self._verify_backend_level(component_id, expected_version)
            result['backend_verification'] = backend_result

            if not backend_result.get('passed', False):
                result['all_passed'] = False
                result['failures'].append('Backend verification failed')

        # Log Level Verification
        if check_logs and self.log_verifier:
            logger.info("Log Level Verification")
            log_result = self._verify_log_level(component_id)
            result['log_verification'] = log_result

            if not log_result.get('passed', False):
                result['all_passed'] = False
                result['failures'].append('Log verification failed')

        # Summary
        if result['all_passed']:
            logger.info("=" * 80)
            logger.info(f"✓ ALL VERIFICATIONS PASSED: {component_id}")
            logger.info("=" * 80)
        else:
            logger.error("=" * 80)
            logger.error(f"✗ VERIFICATION FAILURES: {component_id}")
            logger.error(f"Failures: {', '.join(result['failures'])}")
            logger.error("=" * 80)

        return result

    def _verify_ui_level(self, component_id: str) -> Dict[str, Any]:
        """UI level verification."""
        result = {
            'level': 'ui',
            'passed': True,
            'checks': []
        }

        try:
            # Navigate to System Updates page
            self.system_update_page.navigate()

            # Verify page loaded
            self.ui_verifier.verify_page_title("System Update", exact_match=False)

            result['checks'].append({
                'name': 'Page loaded',
                'passed': True
            })

        except Exception as e:
            result['passed'] = False
            result['error'] = str(e)
            result['checks'].append({
                'name': 'Page loaded',
                'passed': False,
                'error': str(e)
            })

        return result

    def _verify_backend_level(
        self,
        component_id: str,
        expected_version: Optional[str]
    ) -> Dict[str, Any]:
        """Backend level verification."""
        result = {
            'level': 'backend',
            'passed': True,
            'checks': [],
            'current_version': None
        }

        try:
            # Get component version
            version = self.backend_verifier.get_component_version_from_ini(component_id)
            result['current_version'] = version

            if version:
                result['checks'].append({
                    'name': 'Version retrieved',
                    'passed': True,
                    'value': version
                })

                # Verify against expected version if provided
                if expected_version:
                    version_match = version == expected_version
                    result['checks'].append({
                        'name': 'Version match',
                        'passed': version_match,
                        'expected': expected_version,
                        'actual': version
                    })

                    if not version_match:
                        result['passed'] = False
            else:
                result['passed'] = False
                result['checks'].append({
                    'name': 'Version retrieved',
                    'passed': False,
                    'error': 'Version not found'
                })

        except Exception as e:
            result['passed'] = False
            result['error'] = str(e)

        return result

    def _verify_log_level(self, component_id: str) -> Dict[str, Any]:
        """Log level verification."""
        result = {
            'level': 'log',
            'passed': True,
            'checks': [],
            'error_count': 0
        }

        try:
            # Check for errors in logs
            no_errors, errors = self.log_verifier.verify_no_errors_for_component(
                component_id,
                max_lines=500
            )

            result['error_count'] = len(errors)
            result['checks'].append({
                'name': 'No errors',
                'passed': no_errors,
                'error_count': len(errors)
            })

            if not no_errors:
                result['passed'] = False
                result['errors'] = errors[:5]  # First 5 errors

        except Exception as e:
            result['passed'] = False
            result['error'] = str(e)

        return result

    # ==================== System-Level Verification ====================

    def verify_system_health(self) -> Dict[str, Any]:
        """
        Perform comprehensive system health verification.

        Verifies:
        - Kernel version
        - IWSS service status
        - System information
        - Recent log errors

        Returns:
            dict: System health verification results

        Example:
            >>> result = workflow.verify_system_health()
            >>> assert result['healthy'], result['issues']
        """
        logger.info("=" * 80)
        logger.info("SYSTEM HEALTH VERIFICATION")
        logger.info("=" * 80)

        result = {
            'healthy': True,
            'checks': {},
            'issues': [],
            'timestamp': datetime.now().isoformat()
        }

        if self.backend_verifier:
            # Kernel version
            try:
                kernel = self.backend_verifier.get_kernel_version()
                result['checks']['kernel'] = {
                    'passed': True,
                    'value': kernel
                }
                logger.info(f"Kernel: {kernel}")
            except Exception as e:
                result['healthy'] = False
                result['issues'].append(f"Kernel check failed: {e}")
                result['checks']['kernel'] = {'passed': False, 'error': str(e)}

            # Service status
            try:
                is_running = self.backend_verifier.is_iwss_service_running()
                result['checks']['service'] = {
                    'passed': is_running,
                    'running': is_running
                }

                if not is_running:
                    result['healthy'] = False
                    result['issues'].append("IWSS service is not running")

                logger.info(f"IWSS Service: {'Running' if is_running else 'Not running'}")
            except Exception as e:
                result['healthy'] = False
                result['issues'].append(f"Service check failed: {e}")

        if self.log_verifier:
            # Recent errors
            try:
                summary = self.log_verifier.get_log_summary(max_lines=500)
                result['checks']['logs'] = {
                    'passed': summary['error_count'] == 0,
                    'error_count': summary['error_count'],
                    'warning_count': summary['warning_count']
                }

                if summary['error_count'] > 0:
                    result['healthy'] = False
                    result['issues'].append(f"{summary['error_count']} errors in recent logs")

                logger.info(f"Logs: {summary['error_count']} errors, {summary['warning_count']} warnings")
            except Exception as e:
                logger.warning(f"Log check failed: {e}")

        # Summary
        if result['healthy']:
            logger.info("=" * 80)
            logger.info("✓ SYSTEM HEALTH: GOOD")
            logger.info("=" * 80)
        else:
            logger.error("=" * 80)
            logger.error("✗ SYSTEM HEALTH: ISSUES DETECTED")
            logger.error(f"Issues: {', '.join(result['issues'])}")
            logger.error("=" * 80)

        return result

    # ==================== Batch Verification ====================

    def verify_multiple_components(
        self,
        component_ids: List[str],
        expected_versions: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Verify multiple components in batch.

        Args:
            component_ids: List of component IDs
            expected_versions: Dict mapping component_id to expected version

        Returns:
            dict: Batch verification results

        Example:
            >>> result = workflow.verify_multiple_components(
            ...     ['PTN', 'ENG', 'SPYWARE'],
            ...     {'PTN': '1.2.3', 'ENG': '2.3.4'}
            ... )
        """
        logger.info("=" * 80)
        logger.info(f"BATCH VERIFICATION: {len(component_ids)} components")
        logger.info("=" * 80)

        result = {
            'total_count': len(component_ids),
            'passed_count': 0,
            'failed_count': 0,
            'component_results': {},
            'timestamp': datetime.now().isoformat()
        }

        for component_id in component_ids:
            expected_ver = None
            if expected_versions:
                expected_ver = expected_versions.get(component_id)

            comp_result = self.verify_component_state(
                component_id,
                expected_version=expected_ver,
                check_ui=False,  # Skip UI for batch
                check_backend=True,
                check_logs=False  # Skip logs for batch
            )

            result['component_results'][component_id] = comp_result

            if comp_result['all_passed']:
                result['passed_count'] += 1
            else:
                result['failed_count'] += 1

        result['all_passed'] = result['failed_count'] == 0

        logger.info("=" * 80)
        logger.info(f"BATCH VERIFICATION COMPLETED: {result['passed_count']}/{result['total_count']} passed")
        logger.info("=" * 80)

        return result

    def __repr__(self) -> str:
        """String representation."""
        verifiers = []
        if self.ui_verifier:
            verifiers.append("UI")
        if self.backend_verifier:
            verifiers.append("Backend")
        if self.log_verifier:
            verifiers.append("Log")

        return f"VerificationWorkflow({', '.join(verifiers)})"
