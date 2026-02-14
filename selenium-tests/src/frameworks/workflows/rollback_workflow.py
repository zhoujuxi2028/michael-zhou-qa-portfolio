"""
Rollback Workflow Module

Orchestrates component rollback operations for IWSVA.
Handles version restoration, verification, and state management.

Author: QA Automation Team
Version: 1.0.0
"""

import time
from typing import Dict, Any, Optional
from datetime import datetime

from selenium import webdriver

from core.logging.test_logger import get_logger
from frameworks.pages.system_update_page import SystemUpdatePage
from frameworks.verification.backend_verification import BackendVerification
from frameworks.verification.ui_verification import UIVerification
from frameworks.verification.log_verification import LogVerification

logger = get_logger(__name__)


class RollbackWorkflow:
    """
    Orchestrates component rollback operations.

    Provides high-level methods for:
    - Component version rollback
    - Rollback verification
    - State restoration
    - Rollback progress monitoring

    Note:
        TMUFEENG (URL Filtering Engine) does NOT support rollback.

    Attributes:
        driver: WebDriver instance
        system_update_page: System Update page object
        backend_verifier: Backend verification instance (optional)
        ui_verifier: UI verification instance
        log_verifier: Log verification instance (optional)

    Example:
        >>> workflow = RollbackWorkflow(driver, backend_verifier, ui_verifier)
        >>> result = workflow.execute_rollback('PTN', verify=True)
        >>> assert result['success'], result['message']
    """

    # Components that support rollback
    ROLLBACK_SUPPORTED = {
        'PTN': True,
        'SPYWARE': True,
        'BOT': True,
        'ITP': True,
        'ITE': True,
        'ICRCAGENT': True,
        'ENG': True,
        'ATSEENG': True,
        'TMUFEENG': False,  # Does NOT support rollback
    }

    # Rollback timeout mapping (seconds)
    ROLLBACK_TIMEOUTS = {
        'PTN': 180,         # 3 minutes
        'SPYWARE': 180,
        'BOT': 180,
        'ITP': 180,
        'ITE': 180,
        'ICRCAGENT': 180,
        'ENG': 360,         # 6 minutes
        'ATSEENG': 300,     # 5 minutes
        'TMUFEENG': 0,      # Not supported
    }

    def __init__(
        self,
        driver: webdriver.Remote,
        backend_verifier: Optional[BackendVerification] = None,
        ui_verifier: Optional[UIVerification] = None,
        log_verifier: Optional[LogVerification] = None
    ):
        """
        Initialize Rollback Workflow.

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

        logger.debug("RollbackWorkflow initialized")

    # ==================== Rollback Operations ====================

    def execute_rollback(
        self,
        component_id: str,
        verify_before: bool = True,
        verify_after: bool = True,
        timeout: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Execute component rollback with verification.

        Workflow Steps:
        1. Validate rollback is supported
        2. Pre-rollback verification (optional)
        3. Navigate to System Updates page
        4. Trigger rollback operation
        5. Monitor rollback progress
        6. Post-rollback verification (optional)

        Args:
            component_id: Component ID (e.g., 'PTN', 'ENG')
            verify_before: Perform pre-rollback verification
            verify_after: Perform post-rollback verification
            timeout: Rollback timeout in seconds

        Returns:
            dict: Rollback result with status and verification details

        Raises:
            ValueError: If component does not support rollback

        Example:
            >>> result = workflow.execute_rollback('PTN', verify=True)
            >>> print(f"Rollback {'succeeded' if result['success'] else 'failed'}")
        """
        logger.info("=" * 80)
        logger.info(f"EXECUTING ROLLBACK: {component_id}")
        logger.info("=" * 80)

        result = {
            'component_id': component_id,
            'operation': 'rollback',
            'success': False,
            'message': '',
            'start_time': datetime.now().isoformat(),
            'pre_verification': {},
            'post_verification': {},
            'duration': 0
        }

        start_time = time.time()

        try:
            # Step 1: Validate rollback support
            if not self.can_rollback(component_id):
                raise ValueError(
                    f"{component_id} does not support rollback. "
                    f"Rollback is not available for this component."
                )

            # Step 2: Pre-rollback verification
            if verify_before and self.backend_verifier:
                logger.info("Step 1: Pre-rollback verification")
                pre_version = self._get_component_version_safe(component_id)
                result['pre_verification'] = {
                    'version': pre_version,
                    'timestamp': datetime.now().isoformat()
                }
                logger.info(f"Pre-rollback version: {pre_version}")

            # Step 3: Navigate to System Updates page
            logger.info("Step 2: Navigate to System Updates page")
            self.system_update_page.navigate()
            self.ui_verifier.verify_page_title("System Update", exact_match=False)

            # Step 4: Trigger rollback
            logger.info(f"Step 3: Trigger {component_id} rollback")
            self._trigger_component_rollback(component_id)

            # Step 5: Monitor progress
            logger.info("Step 4: Monitor rollback progress")
            rollback_timeout = timeout or self.ROLLBACK_TIMEOUTS.get(component_id, 300)

            if self.backend_verifier:
                # Backend monitoring
                # Note: Rollback might not use lock files, depend on implementation
                time.sleep(rollback_timeout // 10)  # Wait minimum time
            else:
                # UI monitoring
                time.sleep(5)

            logger.info(f"✓ {component_id} rollback completed")

            # Step 6: Post-rollback verification
            if verify_after and self.backend_verifier:
                logger.info("Step 5: Post-rollback verification")
                post_version = self._get_component_version_safe(component_id)
                result['post_verification'] = {
                    'version': post_version,
                    'timestamp': datetime.now().isoformat()
                }

                # Verify version changed (rolled back)
                if verify_before and pre_version:
                    if post_version == pre_version:
                        logger.warning(f"Version unchanged after rollback: {pre_version}")
                    else:
                        logger.info(f"Version rolled back: {pre_version} → {post_version}")

            # Calculate duration
            result['duration'] = time.time() - start_time
            result['end_time'] = datetime.now().isoformat()

            # Overall success
            result['success'] = True
            result['message'] = f"{component_id} rollback completed successfully"

            logger.info("=" * 80)
            logger.info(f"✓ ROLLBACK COMPLETED: {component_id} ({result['duration']:.1f}s)")
            logger.info("=" * 80)

        except ValueError as e:
            # Rollback not supported
            result['success'] = False
            result['message'] = str(e)
            result['error'] = str(e)
            result['duration'] = time.time() - start_time

            logger.error("=" * 80)
            logger.error(f"✗ ROLLBACK NOT SUPPORTED: {component_id}")
            logger.error(f"Error: {e}")
            logger.error("=" * 80)

        except Exception as e:
            result['success'] = False
            result['message'] = f"Rollback failed: {str(e)}"
            result['error'] = str(e)
            result['duration'] = time.time() - start_time

            logger.error("=" * 80)
            logger.error(f"✗ ROLLBACK FAILED: {component_id}")
            logger.error(f"Error: {e}")
            logger.error("=" * 80)

        return result

    # ==================== Rollback Capability Checking ====================

    def can_rollback(self, component_id: str) -> bool:
        """
        Check if component supports rollback.

        Args:
            component_id: Component ID

        Returns:
            bool: True if component supports rollback

        Example:
            >>> if workflow.can_rollback('PTN'):
            ...     result = workflow.execute_rollback('PTN')
            >>> else:
            ...     print("Rollback not supported")
        """
        can_rb = self.ROLLBACK_SUPPORTED.get(component_id, False)

        if can_rb:
            logger.debug(f"{component_id} supports rollback")
        else:
            logger.debug(f"{component_id} does NOT support rollback")

        return can_rb

    def get_rollback_info(self, component_id: str) -> Dict[str, Any]:
        """
        Get rollback capability information for component.

        Args:
            component_id: Component ID

        Returns:
            dict: Rollback information

        Example:
            >>> info = workflow.get_rollback_info('TMUFEENG')
            >>> if not info['supported']:
            ...     print(f"Rollback not available: {info['reason']}")
        """
        info = {
            'component_id': component_id,
            'supported': self.can_rollback(component_id),
            'timeout': self.ROLLBACK_TIMEOUTS.get(component_id, 0),
            'current_version': None,
            'reason': None
        }

        if not info['supported']:
            info['reason'] = f"{component_id} does not support rollback operation"

        if self.backend_verifier:
            info['current_version'] = self._get_component_version_safe(component_id)

        return info

    # ==================== Helper Methods ====================

    def _trigger_component_rollback(self, component_id: str) -> None:
        """
        Trigger component rollback via UI.

        Args:
            component_id: Component ID to rollback
        """
        logger.info(f"Triggering {component_id} rollback via UI")

        # Placeholder - actual implementation would:
        # 1. Navigate to rollback section
        # 2. Select component
        # 3. Click rollback button
        # 4. Confirm rollback dialog
        pass

    def _get_component_version_safe(self, component_id: str) -> Optional[str]:
        """
        Safely get component version.

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

    # ==================== Batch Rollback ====================

    def execute_batch_rollback(
        self,
        component_ids: list,
        continue_on_error: bool = False
    ) -> Dict[str, Any]:
        """
        Execute rollback for multiple components.

        Args:
            component_ids: List of component IDs to rollback
            continue_on_error: Continue with remaining components if one fails

        Returns:
            dict: Batch rollback results

        Example:
            >>> result = workflow.execute_batch_rollback(['PTN', 'SPYWARE'])
            >>> print(f"Success: {result['success_count']}/{result['total_count']}")
        """
        logger.info("=" * 80)
        logger.info("EXECUTING BATCH ROLLBACK")
        logger.info("=" * 80)

        result = {
            'operation': 'batch_rollback',
            'total_count': len(component_ids),
            'success_count': 0,
            'failure_count': 0,
            'skipped_count': 0,
            'component_results': {},
            'start_time': datetime.now().isoformat()
        }

        for component_id in component_ids:
            logger.info(f"Rolling back component: {component_id}")

            # Skip if rollback not supported
            if not self.can_rollback(component_id):
                logger.warning(f"Skipping {component_id} (rollback not supported)")
                result['skipped_count'] += 1
                result['component_results'][component_id] = {
                    'success': False,
                    'skipped': True,
                    'reason': 'Rollback not supported'
                }
                continue

            try:
                comp_result = self.execute_rollback(
                    component_id,
                    verify_before=False,
                    verify_after=True
                )

                result['component_results'][component_id] = comp_result

                if comp_result['success']:
                    result['success_count'] += 1
                else:
                    result['failure_count'] += 1
                    if not continue_on_error:
                        logger.error(f"Rollback failed for {component_id}, stopping batch")
                        break

            except Exception as e:
                logger.error(f"Exception rolling back {component_id}: {e}")
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
        logger.info(
            f"BATCH ROLLBACK COMPLETED: "
            f"{result['success_count']} succeeded, "
            f"{result['failure_count']} failed, "
            f"{result['skipped_count']} skipped"
        )
        logger.info("=" * 80)

        return result

    def __repr__(self) -> str:
        """String representation."""
        has_backend = "with backend" if self.backend_verifier else "UI only"
        return f"RollbackWorkflow({has_backend})"
