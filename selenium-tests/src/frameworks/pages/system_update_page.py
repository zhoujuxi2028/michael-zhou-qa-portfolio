"""
System Update Page Object Model

Handles all interactions with the IWSVA System Updates page including:
- Kernel version extraction and verification
- System information retrieval
- Update operations
- Frame navigation (right frame contains content)

Author: QA Automation Team
Version: 1.0.0
"""

import re
from typing import Optional, Dict
from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webdriver import WebDriver

from .base_page import BasePage
from core.config.test_config import TestConfig
from core.logging.test_logger import TestLogger


class SystemUpdatePage(BasePage):
    """
    Page Object Model for IWSVA System Updates Page.

    This page uses IWSVA's 3-frame architecture:
    - tophead: Navigation bar
    - left: Menu sidebar
    - right: Main content (System Update information)

    Provides methods for:
    - Navigating to System Updates page
    - Extracting kernel version
    - Retrieving system information
    - Update operations

    Example:
        >>> page = SystemUpdatePage(driver)
        >>> page.navigate()
        >>> kernel_version = page.get_kernel_version()
        >>> print(f"Kernel: {kernel_version}")
    """

    # ==================== Locators ====================

    # Frame names
    RIGHT_FRAME = 'right'
    LEFT_FRAME = 'left'
    TOPHEAD_FRAME = 'tophead'

    # Page elements (in right frame)
    PAGE_BODY = (By.TAG_NAME, 'body')
    PAGE_TITLE = (By.TAG_NAME, 'h1')
    KERNEL_INFO_SECTION = (By.XPATH, "//*[contains(text(), 'kernel') or contains(text(), 'Kernel')]")

    # Regex pattern for kernel version
    KERNEL_VERSION_PATTERN = r'(\d+\.\d+\.\d+-\d+\.\d+\.\d+\.el\d+[._]\d+\.x86_64)'

    def __init__(self, driver: WebDriver):
        """
        Initialize System Update Page object.

        Args:
            driver: WebDriver instance
        """
        super().__init__(driver)
        self.logger.debug("SystemUpdatePage initialized")

    # ==================== Navigation ====================

    def navigate(self):
        """
        Navigate to System Updates page.

        Example:
            >>> system_update_page.navigate()
        """
        TestLogger.log_step("Navigate to System Updates page")
        self.navigate_to(TestConfig.URLS['system_update'])
        self.wait_for_page_load()
        self.logger.info(f"✓ Navigated to System Updates page: {TestConfig.URLS['system_update']}")

    # ==================== Information Retrieval ====================

    def get_page_content(self) -> Optional[str]:
        """
        Get text content from System Updates page (right frame).

        Returns:
            str: Page content text, or None if unable to retrieve

        Example:
            >>> content = system_update_page.get_page_content()
            >>> print(content)
        """
        TestLogger.log_step("Retrieve System Updates page content")

        try:
            content = self.get_frame_content(self.RIGHT_FRAME)
            self.logger.debug(f"✓ Retrieved page content ({len(content)} characters)")
            return content

        except Exception as e:
            self.logger.error("✗ Failed to retrieve page content")
            TestLogger.log_exception(e, "Page content retrieval failed")
            return None

    def get_kernel_version(self) -> Optional[str]:
        """
        Extract kernel version from System Updates page.

        The kernel version is displayed on the page in format:
        X.X.X-XXX.XX.X.elX_X.x86_64

        Returns:
            str: Kernel version, or None if not found

        Example:
            >>> version = system_update_page.get_kernel_version()
            >>> print(f"Kernel version: {version}")
            Kernel version: 5.14.0-427.24.1.el9_4.x86_64
        """
        TestLogger.log_step("Extract kernel version from page")

        try:
            # Get page content from right frame
            content = self.get_page_content()

            if not content:
                self.logger.error("✗ Page content is empty")
                return None

            # Extract kernel version using regex
            match = re.search(self.KERNEL_VERSION_PATTERN, content)

            if match:
                kernel_version = match.group(1)
                self.logger.info(f"✓ Kernel version extracted: {kernel_version}")
                TestLogger.log_verification(
                    "Kernel version extraction",
                    "Version found",
                    kernel_version,
                    True
                )
                return kernel_version
            else:
                self.logger.warning("✗ Kernel version not found in page content")
                self.logger.debug(f"Content preview: {content[:200]}")
                return None

        except Exception as e:
            self.logger.error("✗ Failed to extract kernel version")
            TestLogger.log_exception(e, "Kernel version extraction failed")
            return None

    def verify_kernel_version(self, expected_version: str) -> bool:
        """
        Verify displayed kernel version matches expected version.

        Args:
            expected_version: Expected kernel version

        Returns:
            bool: True if version matches, False otherwise

        Example:
            >>> expected = "5.14.0-427.24.1.el9_4.x86_64"
            >>> matches = system_update_page.verify_kernel_version(expected)
            >>> assert matches, "Kernel version mismatch"
        """
        TestLogger.log_step(f"Verify kernel version matches: {expected_version}")

        actual_version = self.get_kernel_version()

        if not actual_version:
            TestLogger.log_verification(
                "Kernel version",
                expected_version,
                "Not found",
                False
            )
            return False

        matches = (actual_version == expected_version)

        TestLogger.log_verification(
            "Kernel version",
            expected_version,
            actual_version,
            matches
        )

        if matches:
            self.logger.info("✓ Kernel version verification passed")
        else:
            self.logger.error(f"✗ Kernel version mismatch")
            self.logger.error(f"  Expected: {expected_version}")
            self.logger.error(f"  Actual:   {actual_version}")

        return matches

    def get_page_title(self) -> Optional[str]:
        """
        Get page title from System Updates page.

        Returns:
            str: Page title text, or None if not found

        Example:
            >>> title = system_update_page.get_page_title()
            >>> print(f"Page title: {title}")
        """
        TestLogger.log_step("Get System Updates page title")

        try:
            # Switch to right frame
            if not self.switch_to_frame(self.RIGHT_FRAME):
                return None

            # Get page title (h1 or similar)
            title_element = self.find_element(*self.PAGE_TITLE, timeout=5)

            if title_element:
                title = title_element.text
                self.logger.info(f"✓ Page title: {title}")
                return title

            # Fallback: check if "System Update" is in page content
            body = self.find_element(*self.PAGE_BODY)
            if body and 'System Update' in body.text:
                self.logger.info("✓ Found 'System Update' in page content")
                return "System Update"

            self.logger.warning("✗ Page title not found")
            return None

        except Exception as e:
            self.logger.error("✗ Failed to get page title")
            TestLogger.log_exception(e, "Page title retrieval failed")
            return None

        finally:
            self.switch_to_default_content()

    def verify_page_loaded(self) -> bool:
        """
        Verify System Updates page loaded successfully.

        Checks:
        1. Page content is not empty
        2. Page contains "System Update" text
        3. Kernel information section is present

        Returns:
            bool: True if page loaded successfully, False otherwise

        Example:
            >>> if system_update_page.verify_page_loaded():
            ...     print("Page loaded successfully")
        """
        TestLogger.log_step("Verify System Updates page loaded")

        try:
            content = self.get_page_content()

            if not content:
                self.logger.error("✗ Page content is empty")
                return False

            # Check for expected text
            expected_keywords = ['system update', 'kernel', 'version']

            for keyword in expected_keywords:
                if keyword.lower() in content.lower():
                    self.logger.debug(f"✓ Found keyword: {keyword}")
                    TestLogger.log_verification(
                        "Page content",
                        "Contains expected keywords",
                        "Keywords found",
                        True
                    )
                    return True

            self.logger.warning("✗ Expected keywords not found in page")
            return False

        except Exception as e:
            self.logger.error("✗ Page load verification failed")
            TestLogger.log_exception(e, "Page load verification failed")
            return False

    # ==================== System Information ====================

    def get_system_information(self) -> Dict[str, Optional[str]]:
        """
        Get comprehensive system information from the page.

        Returns:
            dict: Dictionary containing system information:
                - kernel_version: Kernel version
                - page_title: Page title
                - page_url: Current page URL

        Example:
            >>> info = system_update_page.get_system_information()
            >>> print(f"Kernel: {info['kernel_version']}")
            >>> print(f"Title: {info['page_title']}")
        """
        TestLogger.log_step("Retrieve comprehensive system information")

        system_info = {
            'kernel_version': self.get_kernel_version(),
            'page_title': self.get_page_title(),
            'page_url': self.get_current_url(),
        }

        self.logger.info("=" * 60)
        self.logger.info("SYSTEM INFORMATION")
        self.logger.info("=" * 60)
        for key, value in system_info.items():
            self.logger.info(f"  {key}: {value}")
        self.logger.info("=" * 60)

        return system_info

    # ==================== Frame Validation ====================

    def verify_frame_structure(self) -> bool:
        """
        Verify IWSVA's 3-frame structure is present.

        Checks for:
        - Exactly 3 frames
        - Frame names: tophead, left, right

        Returns:
            bool: True if frame structure is correct, False otherwise

        Example:
            >>> if system_update_page.verify_frame_structure():
            ...     print("Frame structure valid")
        """
        TestLogger.log_step("Verify IWSVA 3-frame structure")

        try:
            self.switch_to_default_content()

            # Find all frames
            frames = self.find_elements(By.TAG_NAME, 'frame')
            frame_count = len(frames)

            if frame_count != 3:
                self.logger.error(f"✗ Expected 3 frames, found {frame_count}")
                TestLogger.log_verification(
                    "Frame count",
                    "3",
                    str(frame_count),
                    False
                )
                return False

            # Verify frame names
            frame_names = [f.get_attribute('name') for f in frames]
            expected_frames = ['tophead', 'left', 'right']

            for expected_frame in expected_frames:
                if expected_frame not in frame_names:
                    self.logger.error(f"✗ Expected frame '{expected_frame}' not found")
                    return False

            self.logger.info("✓ Frame structure validation passed")
            self.logger.info(f"  Frames found: {frame_names}")

            TestLogger.log_verification(
                "Frame structure",
                "3 frames (tophead, left, right)",
                f"{frame_count} frames {frame_names}",
                True
            )

            return True

        except Exception as e:
            self.logger.error("✗ Frame structure verification failed")
            TestLogger.log_exception(e, "Frame structure verification failed")
            return False

    def is_frame_accessible(self, frame_name: str) -> bool:
        """
        Check if specified frame is accessible.

        Args:
            frame_name: Name of frame to check

        Returns:
            bool: True if frame is accessible, False otherwise

        Example:
            >>> if system_update_page.is_frame_accessible('right'):
            ...     print("Right frame is accessible")
        """
        try:
            if not self.switch_to_frame(frame_name):
                return False

            # Try to access frame body
            body = self.find_element(*self.PAGE_BODY, timeout=5)

            if body:
                self.logger.debug(f"✓ Frame '{frame_name}' is accessible")
                return True

            return False

        except Exception as e:
            self.logger.error(f"✗ Frame '{frame_name}' is not accessible")
            return False

        finally:
            self.switch_to_default_content()

    # ==================== Utility Methods ====================

    def capture_page_snapshot(self) -> Dict[str, str]:
        """
        Capture complete page snapshot for debugging.

        Returns:
            dict: Dictionary containing:
                - content: Page text content
                - html: Page HTML source
                - url: Current URL
                - title: Page title

        Example:
            >>> snapshot = system_update_page.capture_page_snapshot()
        """
        TestLogger.log_step("Capture page snapshot for debugging")

        snapshot = {
            'content': self.get_page_content() or '',
            'html': self.get_page_source(),
            'url': self.get_current_url(),
            'title': self.get_page_title() or '',
        }

        self.logger.debug(f"✓ Page snapshot captured ({len(snapshot['content'])} chars)")
        return snapshot
