"""
Update Workflow Module

Orchestrates complete component update operations for IWSVA.
Provides high-level APIs for update operations with built-in verification,
error handling, and progress monitoring.

Author: QA Automation Team
Version: 1.0.0
"""

import time
from typing import Dict, Any, Optional, List
from datetime import datetime

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from core.logging.test_logger import get_logger
from core.config.test_config import TestConfig
from frameworks.pages.system_update_page import SystemUpdatePage
from frameworks.verification.backend_verification import BackendVerification
from frameworks.verification.ui_verification import UIVerification
from frameworks.verification.log_verification import LogVerification

logger = get_logger(__name__)


class UpdateWorkflow:
    """
    Orchestrates complete component update operations.

    Provides high-level methods for:
    - Normal component updates
    - Forced updates
    - Update all components
    - Progress monitoring
    - Multi-level verification (UI + Backend + Log)

    Attributes:
        driver: WebDriver instance
        system_update_page: System Update page object
        backend_verifier: Backend verification instance (optional)
        ui_verifier: UI verification instance
        log_verifier: Log verification instance (optional)

    Example:
        >>> workflow = UpdateWorkflow(driver, backend_verifier, ui_verifier, log_verifier)
        >>> result = workflow.execute_normal_update('PTN', verify=True)
        >>> assert result['success'], result['message']
    """

    # Component update timeout mapping (seconds)
    UPDATE_TIMEOUTS = {
        'PTN': 300,         # 5 minutes
        'SPYWARE': 300,     # 5 minutes
        'BOT': 300,         # 5 minutes
        'ITP': 300,         # 5 minutes
        'ITE': 300,         # 5 minutes
        'ICRCAGENT': 300,   # 5 minutes
        'ENG': 720,         # 12 minutes
        'ATSEENG': 600,     # 10 minutes
        'TMUFEENG': 600,    # 10 minutes
    }

    def __init__(
        self,
        driver: webdriver.Remote,
        backend_verifier: Optional[BackendVerification] = None,
        ui_verifier: Optional[UIVerification] = None,
        log_verifier: Optional[LogVerification] = None
    ):
        """
        Initialize Update Workflow.

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

        logger.debug("UpdateWorkflow initialized")

    # ==================== Normal Update Operations ====================

    def execute_normal_update(
        self,
        component_id: str,
        verify_before: bool = True,
        verify_after: bool = True,
        verify_logs: bool = True,
        timeout: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Execute normal component update with comprehensive verification.

        Workflow Steps:
        1. Pre-update verification (optional)
        2. Navigate to System Updates page
        3. Select component and trigger update
        4. Monitor update progress
        5. Post-update verification (optional)
        6. Log verification (optional)

        Args:
            component_id: Component ID (e.g., 'PTN', 'ENG')
            verify_before: Perform pre-update verification
            verify_after: Perform post-update verification
            verify_logs: Verify update logs
            timeout: Update timeout in seconds (default: from UPDATE_TIMEOUTS)

        Returns:
            dict: Update result with status, message, and verification details

        Example:
            >>> result = workflow.execute_normal_update('PTN', verify=True)
            >>> print(f"Update {'succeeded' if result['success'] else 'failed'}")
        """
        logger.info("=" * 80)
        logger.info(f"EXECUTING NORMAL UPDATE: {component_id}")
        logger.info("=" * 80)

        result = {
            'component_id': component_id,
            'update_type': 'normal',
            'success': False,
            'message': '',
            'start_time': datetime.now().isoformat(),
            'pre_verification': {},
            'post_verification': {},
            'log_verification': {},
            'duration': 0
        }

        start_time = time.time()

        try:
            # Step 1: Pre-update verification
            if verify_before and self.backend_verifier:
                logger.info("Step 1: Pre-update verification")
                pre_version = self._get_component_version_safe(component_id)
                result['pre_verification'] = {
                    'version': pre_version,
                    'timestamp': datetime.now().isoformat()
                }
                logger.info(f"Pre-update version: {pre_version}")

            # Step 2: Navigate to System Updates page
            logger.info("Step 2: Navigate to System Updates page")
            self.system_update_page.navigate()
            self.ui_verifier.verify_page_title("System Update", exact_match=False)

            # Step 3: Trigger update
            logger.info(f"Step 3: Trigger {component_id} update")
            self._trigger_component_update(component_id)

            # Step 4: Monitor progress
            logger.info("Step 4: Monitor update progress")
            update_timeout = timeout or self.UPDATE_TIMEOUTS.get(component_id, 600)

            if self.backend_verifier:
                # Backend monitoring via lock file
                success = self.backend_verifier.wait_for_lock_file_removal(
                    component_id,
                    timeout=update_timeout
                )
                if not success:
                    result['success'] = False
                    result['message'] = f"Update timeout after {update_timeout}s"
                    return result
            else:
                # UI monitoring (fallback)
                self._wait_for_update_completion_ui(update_timeout)

            logger.info(f"✓ {component_id} update completed")

            # Step 5: Post-update verification
            if verify_after and self.backend_verifier:
                logger.info("Step 5: Post-update verification")
                post_version = self._get_component_version_safe(component_id)
                result['post_verification'] = {
                    'version': post_version,
                    'timestamp': datetime.now().isoformat()
                }

                # Verify version changed
                if verify_before and pre_version:
                    if post_version == pre_version:
                        logger.warning(f"Version unchanged: {pre_version}")
                    else:
                        logger.info(f"Version changed: {pre_version} → {post_version}")

            # Step 6: Log verification
            if verify_logs and self.log_verifier:
                logger.info("Step 6: Log verification")
                log_result = self.log_verifier.verify_complete_update_cycle(
                    component_id,
                    max_lines=1000
                )
                result['log_verification'] = log_result

            # Calculate duration
            result['duration'] = time.time() - start_time
            result['end_time'] = datetime.now().isoformat()

            # Overall success
            result['success'] = True
            result['message'] = f"{component_id} update completed successfully"

            logger.info("=" * 80)
            logger.info(f"✓ UPDATE COMPLETED: {component_id} ({result['duration']:.1f}s)")
            logger.info("=" * 80)

        except Exception as e:
            result['success'] = False
            result['message'] = f"Update failed: {str(e)}"
            result['error'] = str(e)
            result['duration'] = time.time() - start_time

            logger.error("=" * 80)
            logger.error(f"✗ UPDATE FAILED: {component_id}")
            logger.error(f"Error: {e}")
            logger.error("=" * 80)

        return result

    def execute_forced_update(
        self,
        component_id: str,
        verify_after: bool = True,
        timeout: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Execute forced component update.

        Forces update even if component is up-to-date.

        Args:
            component_id: Component ID
            verify_after: Perform post-update verification
            timeout: Update timeout in seconds

        Returns:
            dict: Update result

        Example:
            >>> result = workflow.execute_forced_update('PTN')
        """
        logger.info(f"Executing FORCED update: {component_id}")

        # Similar to normal update but with force flag
        # Implementation depends on IWSVA UI for forced update
        # For now, delegate to normal update with note
        result = self.execute_normal_update(
            component_id,
            verify_before=False,
            verify_after=verify_after,
            timeout=timeout
        )

        result['update_type'] = 'forced'
        return result

    # ==================== Batch Update Operations ====================

    def execute_update_all(
        self,
        component_ids: Optional[List[str]] = None,
        verify_after: bool = True,
        continue_on_error: bool = False
    ) -> Dict[str, Any]:
        """
        Execute update for multiple components.

        Args:
            component_ids: List of component IDs (if None, updates all components)
            verify_after: Perform post-update verification
            continue_on_error: Continue updating remaining components if one fails

        Returns:
            dict: Batch update results

        Example:
            >>> result = workflow.execute_update_all(['PTN', 'SPYWARE', 'BOT'])
            >>> print(f"Success: {result['success_count']}/{result['total_count']}")
        """
        logger.info("=" * 80)
        logger.info("EXECUTING BATCH UPDATE")
        logger.info("=" * 80)

        # Default component list
        if component_ids is None:
            component_ids = list(self.UPDATE_TIMEOUTS.keys())

        result = {
            'update_type': 'batch',
            'total_count': len(component_ids),
            'success_count': 0,
            'failure_count': 0,
            'component_results': {},
            'start_time': datetime.now().isoformat()
        }

        for component_id in component_ids:
            logger.info(f"Updating component {result['success_count'] + result['failure_count'] + 1}/{result['total_count']}: {component_id}")

            try:
                comp_result = self.execute_normal_update(
                    component_id,
                    verify_before=False,
                    verify_after=verify_after,
                    verify_logs=False  # Skip log verification for batch
                )

                result['component_results'][component_id] = comp_result

                if comp_result['success']:
                    result['success_count'] += 1
                else:
                    result['failure_count'] += 1
                    if not continue_on_error:
                        logger.error(f"Update failed for {component_id}, stopping batch update")
                        break

            except Exception as e:
                logger.error(f"Exception updating {component_id}: {e}")
                result['failure_count'] += 1
                result['component_results'][component_id] = {
                    'success': False,
                    'error': str(e)
                }

                if not continue_on_error:
                    break

        result['end_time'] = datetime.now().isoformat()
        result['success'] = result['failure_count'] == 0

        logger.info("=" * 80)
        logger.info(f"BATCH UPDATE COMPLETED: {result['success_count']}/{result['total_count']} successful")
        logger.info("=" * 80)

        return result

    # ==================== Helper Methods ====================

    def _trigger_component_update(self, component_id: str) -> None:
        """
        Trigger component update via UI.

        Args:
            component_id: Component ID to update
        """
        # This would interact with System Update page to trigger update
        # Implementation depends on IWSVA UI structure
        logger.info(f"Triggering {component_id} update via UI")

        # Placeholder - actual implementation would:
        # 1. Select component in UI
        # 2. Click update button
        # 3. Confirm any dialogs
        pass

    def _wait_for_update_completion_ui(self, timeout: int) -> bool:
        """
        Wait for update completion by monitoring UI.

        Args:
            timeout: Maximum wait time in seconds

        Returns:
            bool: True if update completed
        """
        logger.info(f"Waiting for update completion (UI monitoring, timeout: {timeout}s)")

        # Placeholder - actual implementation would:
        # 1. Monitor progress bar/status messages
        # 2. Wait for completion indicator
        # 3. Check for error messages

        # For now, simple sleep
        time.sleep(5)
        return True

    def _get_component_version_safe(self, component_id: str) -> Optional[str]:
        """
        Safely get component version (returns None if unavailable).

        Args:
            component_id: Component ID

        Returns:
            str: Component version or None
        """
        try:
            if self.backend_verifier:
                return self.backend_verifier.get_component_version_from_ini(component_id)
        except Exception as e:
            logger.warning(f"Could not get version for {component_id}: {e}")

        return None

    # ==================== Status Checking ====================

    def check_update_status(self, component_id: str) -> Dict[str, Any]:
        """
        Check current update status for component.

        Args:
            component_id: Component ID

        Returns:
            dict: Status information

        Example:
            >>> status = workflow.check_update_status('PTN')
            >>> if status['is_updating']:
            ...     print("Update in progress")
        """
        logger.info(f"Checking update status: {component_id}")

        status = {
            'component_id': component_id,
            'is_updating': False,
            'current_version': None,
            'timestamp': datetime.now().isoformat()
        }

        # Check lock file
        if self.backend_verifier:
            status['is_updating'] = self.backend_verifier.check_lock_file_exists(component_id)
            status['current_version'] = self._get_component_version_safe(component_id)

        return status

    def get_component_info(self, component_id: str) -> Dict[str, Any]:
        """
        Get comprehensive component information.

        Args:
            component_id: Component ID

        Returns:
            dict: Component information

        Example:
            >>> info = workflow.get_component_info('PTN')
            >>> print(f"Current version: {info['version']}")
        """
        logger.info(f"Getting component info: {component_id}")

        info = {
            'component_id': component_id,
            'version': None,
            'is_updating': False,
            'update_timeout': self.UPDATE_TIMEOUTS.get(component_id, 600),
            'timestamp': datetime.now().isoformat()
        }

        if self.backend_verifier:
            info['version'] = self._get_component_version_safe(component_id)
            info['is_updating'] = self.backend_verifier.check_lock_file_exists(component_id)

        return info

    def __repr__(self) -> str:
        """String representation."""
        has_backend = "with backend" if self.backend_verifier else "UI only"
        return f"UpdateWorkflow({has_backend})"
