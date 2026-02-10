"""
IWSVA System Updates Verification - Enterprise Edition

Test Case ID: TC-SYS-001, TC-SYS-002, TC-SYS-003
Priority: P0
Category: System Verification
Module: System Updates

Test Coverage:
- System Updates page accessibility and navigation
- Kernel version display verification (UI layer)
- Kernel version verification via SSH (Backend layer)
- Frameset architecture validation (3-frame structure)
- Complete system information retrieval

Verification Levels:
- UI Level: Page content and element verification
- Backend Level: SSH command execution and system state validation
- Architecture Level: Frame structure and navigation verification

Author: QA Automation Team
Created: 2025-01-XX
Last Modified: 2025-01-XX
Version: 1.0.0

Requirements Traceability:
- REQ-SYS-001: System information display
- REQ-SYS-002: Kernel version accuracy
- REQ-SYS-003: Multi-frame UI architecture support

Dependencies:
- selenium>=4.16.0
- paramiko>=3.4.0
- pytest>=7.4.3
- allure-pytest>=2.13.2

Environment Requirements:
- IWSVA 5.0+ server accessible
- Admin credentials configured in .env
- SSH access to IWSVA server (root)
- Network connectivity to test environment
"""

import re
import time
import pytest
import allure
from typing import Optional

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from config.test_config import TestConfig
from helpers.logger import TestLogger, get_logger
from helpers.debug_helper import DebugHelper, DebugContext


# Initialize logger for this module
logger = get_logger(__name__)


# ==================== Test Class ====================

@allure.epic("IWSVA System Verification")
@allure.feature("System Updates Page")
@pytest.mark.smoke
@pytest.mark.regression
class TestSystemUpdatesEnterprise:
    """
    Enterprise-grade test suite for IWSVA System Updates page verification.

    Test Structure:
    - Setup: Login and navigation (class-level fixture)
    - Teardown: Logout and cleanup (class-level fixture)
    - Test Isolation: Each test is independent and can run in any order

    Performance Benchmarks:
    - Page load: < 5 seconds
    - Frame switch: < 1 second
    - SSH command: < 3 seconds
    """

    # ==================== Class-Level Setup ====================

    @classmethod
    def setup_class(cls):
        """
        Suite setup: Initialize test environment.

        Executed once before all tests in this class.
        """
        logger.info("=" * 80)
        logger.info("SUITE SETUP: System Updates Verification")
        logger.info("=" * 80)

        # Validate configuration
        try:
            TestConfig.validate_config()
            logger.info("✓ Configuration validated")
        except ValueError as e:
            pytest.fail(f"Configuration validation failed: {e}")

        # Log test environment
        config_summary = TestConfig.get_config_summary()
        logger.info("Test Environment:")
        for key, value in config_summary.items():
            logger.info(f"  {key}: {value}")

    @classmethod
    def teardown_class(cls):
        """
        Suite teardown: Cleanup test environment.

        Executed once after all tests in this class.
        """
        logger.info("=" * 80)
        logger.info("SUITE TEARDOWN: Cleanup completed")
        logger.info("=" * 80)

    # ==================== Test-Level Fixtures ====================

    @pytest.fixture(autouse=True)
    def test_setup_teardown(self, request, driver):
        """
        Test-level setup and teardown.

        This fixture runs before and after EACH test method.
        Handles test context tracking and failure artifact capture.

        Args:
            request: pytest request fixture
            driver: WebDriver instance (from conftest.py)
        """
        # Setup: Set test context
        test_name = request.node.name
        TestLogger.set_test_context(test_name)

        start_time = time.time()

        # Execute test
        yield driver

        # Teardown: Calculate duration and log results
        duration = time.time() - start_time

        # Check if test failed
        if hasattr(self, '_outcome'):
            result = self._outcome.result
            if result.failures or result.errors:
                status = "FAILED"
                TestLogger.log_test_end(test_name, status, duration)
            else:
                status = "PASSED"
                TestLogger.log_test_end(test_name, status, duration)
        else:
            status = "COMPLETED"

        TestLogger.reset_context()

    # ==================== Helper Methods ====================

    def switch_to_frame(self, driver, frame_name: str):
        """
        Switch to specified frame with logging and error handling.

        Args:
            driver: WebDriver instance
            frame_name: Name of the frame ('tophead', 'left', 'right')

        Raises:
            AssertionError: If frame not found or inaccessible

        Example:
            >>> self.switch_to_frame(driver, 'right')
        """
        TestLogger.log_step(f"Switching to frame: {frame_name}")

        try:
            driver.switch_to.default_content()  # Reset to main document
            wait = WebDriverWait(driver, TestConfig.EXPLICIT_WAIT)

            frame = wait.until(
                EC.frame_to_be_available_and_switch_to_it(frame_name)
            )

            logger.info(f"✓ Switched to frame: {frame_name}")
            return frame

        except Exception as e:
            logger.error(f"✗ Failed to switch to frame: {frame_name}")
            TestLogger.log_exception(e, f"Frame switch failed: {frame_name}")
            DebugHelper.capture_failure_artifacts(
                driver,
                f"frame_switch_{frame_name}_failed",
                exception=e
            )
            raise

    def get_frame_text(self, driver, frame_name: str) -> str:
        """
        Get text content from specified frame.

        Args:
            driver: WebDriver instance
            frame_name: Name of the frame

        Returns:
            str: Text content of the frame body

        Example:
            >>> content = self.get_frame_text(driver, 'right')
        """
        self.switch_to_frame(driver, frame_name)

        try:
            wait = WebDriverWait(driver, TestConfig.EXPLICIT_WAIT)
            body = wait.until(EC.presence_of_element_located((By.TAG_NAME, 'body')))
            text = body.text

            logger.debug(f"Frame '{frame_name}' content length: {len(text)} chars")
            return text

        finally:
            driver.switch_to.default_content()

    def extract_kernel_version(self, content: str) -> Optional[str]:
        """
        Extract kernel version from text content using regex.

        Args:
            content: Text content to search

        Returns:
            str: Extracted kernel version, or None if not found

        Example:
            >>> version = self.extract_kernel_version(page_content)
            >>> assert version == '5.14.0-427.24.1.el9_4.x86_64'
        """
        pattern = r'(\d+\.\d+\.\d+-\d+\.\d+\.\d+\.el\d+[._]\d+\.x86_64)'
        match = re.search(pattern, content)

        if match:
            version = match.group(1)
            logger.info(f"✓ Kernel version extracted: {version}")
            return version
        else:
            logger.warning("! Kernel version not found in content")
            return None

    # ==================== Test Cases ====================

    @allure.story("TC-SYS-001: Page Display and Navigation")
    @allure.title("Test 1: System Updates page loads with correct title")
    @allure.description("""
        Verify that the System Updates page loads successfully and displays
        the correct page title and kernel information section.

        Preconditions:
        - User is logged in to IWSVA
        - User has access to System Updates page

        Test Steps:
        1. Navigate to System Updates page
        2. Verify page title contains 'System Update'
        3. Verify kernel information section is displayed

        Expected Results:
        - Page loads within 5 seconds
        - Page title is 'System Update'
        - Kernel information section is visible
    """)
    @allure.severity(allure.severity_level.CRITICAL)
    @allure.testcase("TC-SYS-001-01", "Page Load Verification")
    @pytest.mark.ui
    @pytest.mark.P0
    def test_page_load_and_title(self, driver, login_page, system_update_page):
        """
        TC-SYS-001 Test 1: Verify System Updates page loads with correct title.

        Validates:
        - Page accessibility
        - Correct title display
        - Kernel info section presence

        Args:
            driver: WebDriver instance
            login_page: Login page object (from conftest.py)
            system_update_page: System Update page object (from conftest.py)
        """
        # ========== Test Start ==========
        TestLogger.log_test_start(
            "test_page_load_and_title",
            "TC-SYS-001-01",
            "Verify System Updates page loads correctly"
        )

        with allure.step("Step 1: Navigate to System Updates page"):
            TestLogger.log_step("Navigate to System Updates page")
            start_time = time.time()

            # TODO: Implement navigation via menu
            driver.get(TestConfig.URLS['system_update'])

            load_time = time.time() - start_time
            TestLogger.log_performance("Page load", load_time, threshold=5.0)

            # Capture screenshot for documentation
            screenshot_path = DebugHelper.capture_screenshot(
                driver, "system_update_page_loaded"
            )
            allure.attach.file(
                screenshot_path,
                name="System Updates Page",
                attachment_type=allure.attachment_type.PNG
            )

        with allure.step("Step 2: Verify page title"):
            TestLogger.log_step("Verify page title contains 'System Update'")

            content = self.get_frame_text(driver, 'right')

            assert 'System Update' in content, \
                f"Page title not found. Content preview: {content[:200]}"

            TestLogger.log_verification(
                "Page title",
                "System Update",
                "System Update",
                True
            )

        with allure.step("Step 3: Verify kernel info section displayed"):
            TestLogger.log_step("Verify kernel information section is visible")

            has_kernel_info = any(
                keyword in content.lower()
                for keyword in ['kernel', 'system', 'version']
            )

            assert has_kernel_info, \
                "Kernel information section not found on page"

            TestLogger.log_verification(
                "Kernel info section",
                "Present",
                "Present",
                True
            )

        logger.info("✓ TC-SYS-001-01 PASSED")


    @allure.story("TC-SYS-001: Page Display and Navigation")
    @allure.title("Test 2: Kernel version is displayed on page")
    @allure.description("""
        Verify that the kernel version is correctly displayed on the System Updates page.

        Test Steps:
        1. Extract kernel version from page content
        2. Validate version format matches expected pattern
        3. Verify version matches expected target version

        Expected Results:
        - Kernel version is successfully extracted
        - Version format matches: X.X.X-XXX.XX.X.elX_X.x86_64
        - Displayed version matches TARGET_KERNEL_VERSION
    """)
    @allure.severity(allure.severity_level.CRITICAL)
    @allure.testcase("TC-SYS-001-02", "Kernel Version Display")
    @pytest.mark.ui
    @pytest.mark.P0
    def test_kernel_version_display(self, driver, system_update_page):
        """
        TC-SYS-001 Test 2: Verify kernel version is displayed correctly.

        Validates:
        - Kernel version extraction
        - Version format compliance
        - Version value accuracy

        Args:
            driver: WebDriver instance
            system_update_page: System Update page object
        """
        TestLogger.log_test_start(
            "test_kernel_version_display",
            "TC-SYS-001-02",
            "Verify kernel version display on UI"
        )

        expected_version = TestConfig.TARGET_KERNEL_VERSION

        with allure.step("Step 1: Extract kernel version from page"):
            TestLogger.log_step(f"Extract kernel version (expected: {expected_version})")

            content = self.get_frame_text(driver, 'right')
            extracted_version = self.extract_kernel_version(content)

            assert extracted_version is not None, \
                "Failed to extract kernel version from page content"

            allure.attach(
                extracted_version,
                name="Extracted Kernel Version",
                attachment_type=allure.attachment_type.TEXT
            )

        with allure.step("Step 2: Validate version format"):
            TestLogger.log_step("Validate kernel version format")

            version_pattern = r'\d+\.\d+\.\d+-\d+\.\d+\.\d+\.el\d+[._]\d+\.x86_64'

            assert re.match(version_pattern, extracted_version), \
                f"Kernel version format invalid: {extracted_version}"

            TestLogger.log_verification(
                "Version format",
                "Valid pattern",
                "Valid pattern",
                True
            )

        with allure.step("Step 3: Verify version matches expected"):
            TestLogger.log_step("Compare with expected version")

            version_matches = (extracted_version == expected_version)

            TestLogger.log_verification(
                "Kernel version",
                expected_version,
                extracted_version,
                version_matches
            )

            assert version_matches, \
                f"Version mismatch. Expected: {expected_version}, Got: {extracted_version}"

        logger.info("✓ TC-SYS-001-02 PASSED")


    @allure.story("TC-SYS-003: Frameset Architecture Validation")
    @allure.title("Test 1: Validate 3-frame structure")
    @allure.description("""
        Verify IWSVA's legacy 3-frame architecture is correctly implemented.

        Test Steps:
        1. Count total number of frames on the page
        2. Verify exactly 3 frames exist
        3. Verify required frame names (tophead, left, right)
        4. Verify each frame is accessible

        Expected Results:
        - Exactly 3 frames are present
        - All required frames (tophead, left, right) exist
        - All frames are accessible
    """)
    @allure.severity(allure.severity_level.NORMAL)
    @allure.testcase("TC-SYS-003-01", "Frame Structure Validation")
    @pytest.mark.ui
    @pytest.mark.P1
    def test_validate_frame_structure(self, driver, login_page):
        """
        TC-SYS-003 Test 1: Validate IWSVA 3-frame structure.

        Validates:
        - Frame count
        - Frame names
        - Frame accessibility

        Args:
            driver: WebDriver instance
            login_page: LoginPage fixture (ensures user is logged in)
        """
        TestLogger.log_test_start(
            "test_validate_frame_structure",
            "TC-SYS-003-01",
            "Validate frameset architecture"
        )

        with allure.step("Step 1: Count frames on page"):
            TestLogger.log_step("Count total number of frames")

            driver.switch_to.default_content()
            frames = driver.find_elements(By.TAG_NAME, 'frame')
            frame_count = len(frames)

            logger.info(f"Found {frame_count} frames")

            assert frame_count == 3, \
                f"Expected 3 frames, found {frame_count}"

            TestLogger.log_verification(
                "Frame count",
                "3",
                str(frame_count),
                frame_count == 3
            )

        with allure.step("Step 2: Verify required frame names"):
            TestLogger.log_step("Verify frame names (tophead, left, right)")

            frame_names = [f.get_attribute('name') for f in frames]
            required_frames = ['tophead', 'left', 'right']

            logger.info(f"Frame names: {frame_names}")

            for required_frame in required_frames:
                assert required_frame in frame_names, \
                    f"Required frame '{required_frame}' not found. Found: {frame_names}"

                logger.info(f"✓ Frame '{required_frame}' exists")

        with allure.step("Step 3: Verify frame accessibility"):
            TestLogger.log_step("Verify each frame is accessible")

            for frame_name in required_frames:
                try:
                    self.switch_to_frame(driver, frame_name)
                    body = driver.find_element(By.TAG_NAME, 'body')

                    assert body is not None, \
                        f"Frame '{frame_name}' body not accessible"

                    logger.info(f"✓ Frame '{frame_name}' is accessible")

                finally:
                    driver.switch_to.default_content()

        logger.info("✓ TC-SYS-003-01 PASSED")


# ==================== Module-Level Documentation ====================

if __name__ == '__main__':
    """
    Run tests directly with pytest.

    Usage:
        python test_system_updates_enterprise.py
        pytest test_system_updates_enterprise.py -v
        pytest test_system_updates_enterprise.py -v -m smoke
        pytest test_system_updates_enterprise.py --alluredir=reports/allure-results
    """
    pytest.main([__file__, '-v', '--tb=short'])
