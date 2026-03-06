"""
Setup Workflow Module

Orchestrates test environment preparation and setup operations.
Handles snapshot creation, version downgrade, environment validation.

Author: QA Automation Team
Version: 1.0.0
"""

import time
from typing import Dict, Any, Optional, List
from datetime import datetime

from selenium import webdriver

from core.logging.test_logger import get_logger
from core.config.test_config import TestConfig
from frameworks.pages.system_update_page import SystemUpdatePage
from frameworks.verification.backend_verification import BackendVerification
from frameworks.verification.ui_verification import UIVerification

logger = get_logger(__name__)


class SetupWorkflow:
    """
    Orchestrates test environment preparation.

    Provides high-level methods for:
    - Test environment validation
    - Version state capture (snapshots)
    - Component downgrade (for update testing)
    - Environment restoration

    Attributes:
        driver: WebDriver instance
        system_update_page: System Update page object
        backend_verifier: Backend verification instance (optional)
        ui_verifier: UI verification instance

    Example:
        >>> workflow = SetupWorkflow(driver, backend_verifier, ui_verifier)
        >>> snapshot = workflow.create_version_snapshot()
        >>> workflow.validate_test_environment()
    """

    def __init__(
        self,
        driver: webdriver.Remote,
        backend_verifier: Optional[BackendVerification] = None,
        ui_verifier: Optional[UIVerification] = None
    ):
        """
        Initialize Setup Workflow.

        Args:
            driver: WebDriver instance
            backend_verifier: Backend verification instance (optional)
            ui_verifier: UI verification instance (optional)
        """
        self.driver = driver
        self.system_update_page = SystemUpdatePage(driver)
        self.backend_verifier = backend_verifier
        self.ui_verifier = ui_verifier or UIVerification(driver)

        logger.debug("SetupWorkflow initialized")

    # ==================== Environment Validation ====================

    def validate_test_environment(self) -> Dict[str, Any]:
        """
        Validate test environment is ready for testing.

        Checks:
        - IWSVA server is accessible
        - System Updates page can be loaded
        - Backend SSH connection works (if available)
        - IWSS service is running (if backend available)

        Returns:
            dict: Validation results

        Raises:
            RuntimeError: If environment validation fails

        Example:
            >>> result = workflow.validate_test_environment()
            >>> if not result['valid']:
            ...     raise RuntimeError(f"Environment not ready: {result['issues']}")
        """
        logger.info("=" * 80)
        logger.info("VALIDATING TEST ENVIRONMENT")
        logger.info("=" * 80)

        result = {
            'valid': True,
            'checks': {},
            'issues': [],
            'timestamp': datetime.now().isoformat()
        }

        # Check 1: IWSVA server accessible
        try:
            logger.info("Check 1: IWSVA server accessibility")
            self.driver.get(TestConfig.BASE_URL) # type: ignore
            result['checks']['server_accessible'] = {'passed': True}
            logger.info("✓ IWSVA server is accessible")
        except Exception as e:
            result['valid'] = False
            result['issues'].append(f"Server not accessible: {e}")
            result['checks']['server_accessible'] = {'passed': False, 'error': str(e)}
            logger.error(f"✗ Server not accessible: {e}")

        # Check 2: System Updates page loads
        try:
            logger.info("Check 2: System Updates page")
            self.system_update_page.navigate()
            self.ui_verifier.verify_page_title("System Update", exact_match=False)
            result['checks']['page_loads'] = {'passed': True}
            logger.info("✓ System Updates page loads")
        except Exception as e:
            result['valid'] = False
            result['issues'].append(f"Page load failed: {e}")
            result['checks']['page_loads'] = {'passed': False, 'error': str(e)}
            logger.error(f"✗ Page load failed: {e}")

        # Check 3: Backend SSH connection (if available)
        if self.backend_verifier:
            try:
                logger.info("Check 3: Backend SSH connection")
                kernel = self.backend_verifier.get_kernel_version()
                result['checks']['ssh_connection'] = {
                    'passed': True,
                    'kernel': kernel
                }
                logger.info(f"✓ SSH connection works (kernel: {kernel})")
            except Exception as e:
                result['valid'] = False
                result['issues'].append(f"SSH connection failed: {e}")
                result['checks']['ssh_connection'] = {'passed': False, 'error': str(e)}
                logger.error(f"✗ SSH connection failed: {e}")

            # Check 4: IWSS service status
            try:
                logger.info("Check 4: IWSS service status")
                is_running = self.backend_verifier.is_iwss_service_running()
                result['checks']['service_status'] = {
                    'passed': is_running,
                    'running': is_running
                }

                if is_running:
                    logger.info("✓ IWSS service is running")
                else:
                    result['valid'] = False
                    result['issues'].append("IWSS service is not running")
                    logger.error("✗ IWSS service is not running")
            except Exception as e:
                result['valid'] = False
                result['issues'].append(f"Service check failed: {e}")
                result['checks']['service_status'] = {'passed': False, 'error': str(e)}
                logger.error(f"✗ Service check failed: {e}")

        # Summary
        if result['valid']:
            logger.info("=" * 80)
            logger.info("✓ ENVIRONMENT VALIDATION: PASSED")
            logger.info("=" * 80)
        else:
            logger.error("=" * 80)
            logger.error("✗ ENVIRONMENT VALIDATION: FAILED")
            logger.error(f"Issues: {', '.join(result['issues'])}")
            logger.error("=" * 80)
            raise RuntimeError(f"Environment validation failed: {result['issues']}")

        return result

    # ==================== Version Snapshots ====================

    def create_version_snapshot(
        self,
        component_ids: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Create snapshot of current component versions.

        Captures current state for later restoration or comparison.

        Args:
            component_ids: List of component IDs (if None, captures all)

        Returns:
            dict: Version snapshot

        Example:
            >>> snapshot = workflow.create_version_snapshot(['PTN', 'ENG'])
            >>> print(f"PTN version: {snapshot['versions']['PTN']}")
        """
        logger.info("=" * 80)
        logger.info("CREATING VERSION SNAPSHOT")
        logger.info("=" * 80)

        snapshot = {
            'timestamp': datetime.now().isoformat(),
            'versions': {},
            'system_info': {}
        }

        # Default component list
        if component_ids is None:
            component_ids = [
                'PTN', 'SPYWARE', 'BOT', 'ITP', 'ITE', 'ICRCAGENT',
                'ENG', 'ATSEENG', 'TMUFEENG'
            ]

        if self.backend_verifier:
            # Capture component versions
            for component_id in component_ids:
                try:
                    version = self.backend_verifier.get_component_version_from_ini(component_id)
                    snapshot['versions'][component_id] = version
                    logger.info(f"  {component_id}: {version}")
                except Exception as e:
                    logger.warning(f"  {component_id}: Failed to get version - {e}")
                    snapshot['versions'][component_id] = None

            # Capture system info
            try:
                sys_info = self.backend_verifier.get_system_info()
                snapshot['system_info'] = sys_info
                logger.info(f"  Kernel: {sys_info.get('kernel_version')}")
            except Exception as e:
                logger.warning(f"Failed to get system info: {e}")

        logger.info("✓ Version snapshot created")

        return snapshot

    def compare_snapshots(
        self,
        snapshot1: Dict[str, Any],
        snapshot2: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Compare two version snapshots.

        Args:
            snapshot1: First snapshot (typically "before")
            snapshot2: Second snapshot (typically "after")

        Returns:
            dict: Comparison results with changes

        Example:
            >>> before = workflow.create_version_snapshot()
            >>> # ... perform updates ...
            >>> after = workflow.create_version_snapshot()
            >>> changes = workflow.compare_snapshots(before, after)
            >>> print(f"Components changed: {changes['changed_components']}")
        """
        logger.info("Comparing version snapshots")

        comparison = {
            'snapshot1_time': snapshot1['timestamp'],
            'snapshot2_time': snapshot2['timestamp'],
            'changed_components': [],
            'unchanged_components': [],
            'version_changes': {}
        }

        versions1 = snapshot1.get('versions', {})
        versions2 = snapshot2.get('versions', {})

        all_components = set(list(versions1.keys()) + list(versions2.keys()))

        for component_id in all_components:
            v1 = versions1.get(component_id)
            v2 = versions2.get(component_id)

            if v1 != v2:
                comparison['changed_components'].append(component_id)
                comparison['version_changes'][component_id] = {
                    'before': v1,
                    'after': v2
                }
                logger.info(f"  {component_id}: {v1} → {v2}")
            else:
                comparison['unchanged_components'].append(component_id)

        logger.info(f"✓ Comparison complete: {len(comparison['changed_components'])} changed")

        return comparison

    # ==================== Component Downgrade ====================

    def downgrade_component(
        self,
        component_id: str,
        target_version: str,
        timeout: int = 300
    ) -> Dict[str, Any]:
        """
        Downgrade component to specific version (for update testing).

        Args:
            component_id: Component ID to downgrade
            target_version: Target version to downgrade to
            timeout: Operation timeout in seconds

        Returns:
            dict: Downgrade operation result

        Example:
            >>> result = workflow.downgrade_component('PTN', '1.2.3.0')
            >>> assert result['success'], result['message']
        """
        logger.info("=" * 80)
        logger.info(f"DOWNGRADING COMPONENT: {component_id} to {target_version}")
        logger.info("=" * 80)

        result = {
            'component_id': component_id,
            'target_version': target_version,
            'success': False,
            'message': '',
            'initial_version': None,
            'final_version': None
        }

        try:
            # Get initial version
            if self.backend_verifier:
                result['initial_version'] = self.backend_verifier.get_component_version_from_ini(component_id)
                logger.info(f"Initial version: {result['initial_version']}")

            # Trigger downgrade
            # Note: Actual implementation depends on IWSVA downgrade mechanism
            # This is a placeholder
            logger.info(f"Triggering downgrade to {target_version}")
            self._trigger_downgrade_operation(component_id, target_version)

            # Wait for completion
            time.sleep(timeout // 10)

            # Verify final version
            if self.backend_verifier:
                result['final_version'] = self.backend_verifier.get_component_version_from_ini(component_id)
                logger.info(f"Final version: {result['final_version']}")

                if result['final_version'] == target_version:
                    result['success'] = True
                    result['message'] = f"Successfully downgraded to {target_version}"
                else:
                    result['message'] = f"Downgrade verification failed: got {result['final_version']}, expected {target_version}"

        except Exception as e:
            result['message'] = f"Downgrade failed: {e}"
            logger.error(f"✗ Downgrade failed: {e}")

        if result['success']:
            logger.info("✓ Downgrade completed successfully")
        else:
            logger.error(f"✗ Downgrade failed: {result['message']}")

        return result

    def _trigger_downgrade_operation(self, component_id: str, target_version: str) -> None:
        """
        Trigger downgrade operation via UI or backend.

        Args:
            component_id: Component to downgrade
            target_version: Target version
        """
        # Placeholder - actual implementation depends on IWSVA
        logger.debug(f"Triggering downgrade: {component_id} → {target_version}")
        pass

    # ==================== Environment Cleanup ====================

    def cleanup_test_artifacts(self) -> Dict[str, Any]:
        """
        Clean up test artifacts and temporary files.

        Returns:
            dict: Cleanup results

        Example:
            >>> result = workflow.cleanup_test_artifacts()
        """
        logger.info("Cleaning up test artifacts")

        result = {
            'success': True,
            'cleaned_items': [],
            'timestamp': datetime.now().isoformat()
        }

        # Placeholder - actual cleanup operations
        # Could include:
        # - Remove temporary files
        # - Clear browser cache
        # - Reset test data
        # - etc.

        logger.info("✓ Cleanup completed")

        return result

    def __repr__(self) -> str:
        """String representation."""
        has_backend = "with backend" if self.backend_verifier else "UI only"
        return f"SetupWorkflow({has_backend})"
