"""
UI Verification Module

Enterprise-grade UI-level verification helpers for Selenium tests.
Provides reusable verification methods for element visibility, text content,
attributes, page state, and more.

Author: QA Automation Team
Version: 1.0.0
"""

from typing import List, Optional, Tuple, Any
from selenium import webdriver
from selenium.webdriver.remote.webelement import WebElement
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import (
    TimeoutException,
    NoSuchElementException,
    StaleElementReferenceException
)

from core.logging.test_logger import get_logger

logger = get_logger(__name__)


class UIVerification:
    """
    UI-level verification helper for Selenium tests.

    Provides reusable methods for verifying UI elements and page state:
    - Element visibility and presence
    - Text content validation
    - Attribute verification
    - Page title and URL checks
    - Multi-element verification

    Example:
        >>> ui_verifier = UIVerification(driver)
        >>> ui_verifier.verify_element_visible((By.ID, 'username'))
        >>> ui_verifier.verify_text_present('Welcome')
    """

    def __init__(self, driver: webdriver.Remote, default_timeout: int = 10):
        """
        Initialize UI Verification.

        Args:
            driver: WebDriver instance
            default_timeout: Default wait timeout in seconds (default: 10)
        """
        self.driver = driver
        self.default_timeout = default_timeout
        logger.debug(f"UIVerification initialized (timeout: {default_timeout}s)")

    # ==================== Element Visibility ====================

    def verify_element_visible(
        self,
        locator: Tuple[By, str],
        timeout: Optional[int] = None,
        error_message: Optional[str] = None
    ) -> bool:
        """
        Verify element is visible on the page.

        Args:
            locator: Tuple of (By, value) for element location
            timeout: Wait timeout in seconds (default: self.default_timeout)
            error_message: Custom error message if verification fails

        Returns:
            bool: True if element is visible

        Raises:
            AssertionError: If element is not visible within timeout

        Example:
            >>> ui_verifier.verify_element_visible((By.ID, 'submit_button'))
        """
        timeout = timeout or self.default_timeout
        by, value = locator

        logger.info(f"Verifying element visible: {by}={value}")

        try:
            element = WebDriverWait(self.driver, timeout).until(
                EC.visibility_of_element_located(locator)
            )

            logger.info(f"✓ Element is visible: {by}={value}")
            return True

        except TimeoutException:
            msg = error_message or f"Element not visible: {by}={value} (timeout: {timeout}s)"
            logger.error(f"✗ {msg}")
            raise AssertionError(msg)

    def verify_element_not_visible(
        self,
        locator: Tuple[By, str],
        timeout: Optional[int] = None
    ) -> bool:
        """
        Verify element is not visible on the page.

        Args:
            locator: Tuple of (By, value)
            timeout: Wait timeout in seconds

        Returns:
            bool: True if element is not visible

        Example:
            >>> ui_verifier.verify_element_not_visible((By.ID, 'error_message'))
        """
        timeout = timeout or self.default_timeout
        by, value = locator

        logger.info(f"Verifying element NOT visible: {by}={value}")

        try:
            WebDriverWait(self.driver, timeout).until(
                EC.invisibility_of_element_located(locator)
            )

            logger.info(f"✓ Element is not visible: {by}={value}")
            return True

        except TimeoutException:
            logger.error(f"✗ Element is still visible: {by}={value}")
            raise AssertionError(f"Element is still visible: {by}={value}")

    def verify_element_present(
        self,
        locator: Tuple[By, str],
        timeout: Optional[int] = None
    ) -> bool:
        """
        Verify element is present in DOM (may not be visible).

        Args:
            locator: Tuple of (By, value)
            timeout: Wait timeout in seconds

        Returns:
            bool: True if element is present

        Example:
            >>> ui_verifier.verify_element_present((By.XPATH, '//div[@class="hidden"]'))
        """
        timeout = timeout or self.default_timeout
        by, value = locator

        logger.info(f"Verifying element present in DOM: {by}={value}")

        try:
            WebDriverWait(self.driver, timeout).until(
                EC.presence_of_element_located(locator)
            )

            logger.info(f"✓ Element present in DOM: {by}={value}")
            return True

        except TimeoutException:
            logger.error(f"✗ Element not present in DOM: {by}={value}")
            raise AssertionError(f"Element not present in DOM: {by}={value}")

    # ==================== Text Verification ====================

    def verify_text_present(
        self,
        expected_text: str,
        locator: Optional[Tuple[By, str]] = None,
        timeout: Optional[int] = None
    ) -> bool:
        """
        Verify text is present on the page or in specific element.

        Args:
            expected_text: Text to verify
            locator: Optional element locator (if None, checks entire page)
            timeout: Wait timeout in seconds

        Returns:
            bool: True if text is present

        Example:
            >>> ui_verifier.verify_text_present('Login successful')
            >>> ui_verifier.verify_text_present('Welcome', (By.ID, 'header'))
        """
        timeout = timeout or self.default_timeout

        if locator:
            by, value = locator
            logger.info(f"Verifying text '{expected_text}' in element: {by}={value}")

            try:
                WebDriverWait(self.driver, timeout).until(
                    EC.text_to_be_present_in_element(locator, expected_text)
                )

                logger.info(f"✓ Text '{expected_text}' found in element")
                return True

            except TimeoutException:
                logger.error(f"✗ Text '{expected_text}' not found in element")
                raise AssertionError(f"Text '{expected_text}' not found in element {by}={value}")

        else:
            logger.info(f"Verifying text '{expected_text}' on page")

            page_source = self.driver.page_source

            if expected_text in page_source:
                logger.info(f"✓ Text '{expected_text}' found on page")
                return True
            else:
                logger.error(f"✗ Text '{expected_text}' not found on page")
                raise AssertionError(f"Text '{expected_text}' not found on page")

    def verify_text_equals(
        self,
        locator: Tuple[By, str],
        expected_text: str,
        timeout: Optional[int] = None
    ) -> bool:
        """
        Verify element text equals expected value exactly.

        Args:
            locator: Tuple of (By, value)
            expected_text: Expected exact text
            timeout: Wait timeout in seconds

        Returns:
            bool: True if text matches

        Example:
            >>> ui_verifier.verify_text_equals((By.ID, 'title'), 'System Update')
        """
        timeout = timeout or self.default_timeout
        by, value = locator

        logger.info(f"Verifying text equals '{expected_text}' for: {by}={value}")

        try:
            element = WebDriverWait(self.driver, timeout).until(
                EC.visibility_of_element_located(locator)
            )

            actual_text = element.text.strip()

            if actual_text == expected_text:
                logger.info(f"✓ Text matches: '{actual_text}'")
                return True
            else:
                logger.error(f"✗ Text mismatch: expected '{expected_text}', got '{actual_text}'")
                raise AssertionError(
                    f"Text mismatch for {by}={value}: "
                    f"expected '{expected_text}', got '{actual_text}'"
                )

        except TimeoutException:
            logger.error(f"✗ Element not found: {by}={value}")
            raise AssertionError(f"Element not found: {by}={value}")

    def verify_text_contains(
        self,
        locator: Tuple[By, str],
        expected_text: str,
        timeout: Optional[int] = None
    ) -> bool:
        """
        Verify element text contains expected value.

        Args:
            locator: Tuple of (By, value)
            expected_text: Expected text substring
            timeout: Wait timeout in seconds

        Returns:
            bool: True if text contains substring

        Example:
            >>> ui_verifier.verify_text_contains((By.ID, 'message'), 'success')
        """
        timeout = timeout or self.default_timeout
        by, value = locator

        logger.info(f"Verifying text contains '{expected_text}' for: {by}={value}")

        try:
            element = WebDriverWait(self.driver, timeout).until(
                EC.visibility_of_element_located(locator)
            )

            actual_text = element.text

            if expected_text in actual_text:
                logger.info(f"✓ Text contains '{expected_text}'")
                return True
            else:
                logger.error(f"✗ Text does not contain '{expected_text}': {actual_text}")
                raise AssertionError(
                    f"Text does not contain '{expected_text}' for {by}={value}. "
                    f"Actual text: {actual_text}"
                )

        except TimeoutException:
            logger.error(f"✗ Element not found: {by}={value}")
            raise AssertionError(f"Element not found: {by}={value}")

    # ==================== Attribute Verification ====================

    def verify_attribute_value(
        self,
        locator: Tuple[By, str],
        attribute_name: str,
        expected_value: str,
        timeout: Optional[int] = None
    ) -> bool:
        """
        Verify element attribute has expected value.

        Args:
            locator: Tuple of (By, value)
            attribute_name: Attribute name (e.g., 'class', 'value', 'href')
            expected_value: Expected attribute value
            timeout: Wait timeout in seconds

        Returns:
            bool: True if attribute matches

        Example:
            >>> ui_verifier.verify_attribute_value(
            ...     (By.ID, 'username'),
            ...     'placeholder',
            ...     'Enter username'
            ... )
        """
        timeout = timeout or self.default_timeout
        by, value = locator

        logger.info(f"Verifying attribute '{attribute_name}' = '{expected_value}' for: {by}={value}")

        try:
            element = WebDriverWait(self.driver, timeout).until(
                EC.presence_of_element_located(locator)
            )

            actual_value = element.get_attribute(attribute_name)

            if actual_value == expected_value:
                logger.info(f"✓ Attribute '{attribute_name}' matches: '{actual_value}'")
                return True
            else:
                logger.error(
                    f"✗ Attribute mismatch: "
                    f"expected '{expected_value}', got '{actual_value}'"
                )
                raise AssertionError(
                    f"Attribute '{attribute_name}' mismatch for {by}={value}: "
                    f"expected '{expected_value}', got '{actual_value}'"
                )

        except TimeoutException:
            logger.error(f"✗ Element not found: {by}={value}")
            raise AssertionError(f"Element not found: {by}={value}")

    def verify_element_enabled(
        self,
        locator: Tuple[By, str],
        timeout: Optional[int] = None
    ) -> bool:
        """
        Verify element is enabled (not disabled).

        Args:
            locator: Tuple of (By, value)
            timeout: Wait timeout in seconds

        Returns:
            bool: True if element is enabled

        Example:
            >>> ui_verifier.verify_element_enabled((By.ID, 'submit_button'))
        """
        timeout = timeout or self.default_timeout
        by, value = locator

        logger.info(f"Verifying element enabled: {by}={value}")

        try:
            element = WebDriverWait(self.driver, timeout).until(
                EC.element_to_be_clickable(locator)
            )

            if element.is_enabled():
                logger.info(f"✓ Element is enabled: {by}={value}")
                return True
            else:
                logger.error(f"✗ Element is disabled: {by}={value}")
                raise AssertionError(f"Element is disabled: {by}={value}")

        except TimeoutException:
            logger.error(f"✗ Element not clickable: {by}={value}")
            raise AssertionError(f"Element not clickable: {by}={value}")

    # ==================== Page State Verification ====================

    def verify_page_title(
        self,
        expected_title: str,
        exact_match: bool = True,
        timeout: Optional[int] = None
    ) -> bool:
        """
        Verify page title.

        Args:
            expected_title: Expected page title
            exact_match: If True, title must match exactly; if False, contains check
            timeout: Wait timeout in seconds

        Returns:
            bool: True if title matches

        Example:
            >>> ui_verifier.verify_page_title('System Update')
            >>> ui_verifier.verify_page_title('System', exact_match=False)
        """
        timeout = timeout or self.default_timeout

        logger.info(f"Verifying page title: '{expected_title}' (exact={exact_match})")

        try:
            if exact_match:
                WebDriverWait(self.driver, timeout).until(
                    EC.title_is(expected_title)
                )
            else:
                WebDriverWait(self.driver, timeout).until(
                    EC.title_contains(expected_title)
                )

            actual_title = self.driver.title
            logger.info(f"✓ Page title verified: '{actual_title}'")
            return True

        except TimeoutException:
            actual_title = self.driver.title
            logger.error(f"✗ Page title mismatch: expected '{expected_title}', got '{actual_title}'")
            raise AssertionError(f"Page title mismatch: expected '{expected_title}', got '{actual_title}'")

    def verify_url_contains(
        self,
        expected_url_part: str,
        timeout: Optional[int] = None
    ) -> bool:
        """
        Verify current URL contains expected string.

        Args:
            expected_url_part: Expected URL substring
            timeout: Wait timeout in seconds

        Returns:
            bool: True if URL contains string

        Example:
            >>> ui_verifier.verify_url_contains('system_update.jsp')
        """
        timeout = timeout or self.default_timeout

        logger.info(f"Verifying URL contains: '{expected_url_part}'")

        try:
            WebDriverWait(self.driver, timeout).until(
                EC.url_contains(expected_url_part)
            )

            current_url = self.driver.current_url
            logger.info(f"✓ URL verified: {current_url}")
            return True

        except TimeoutException:
            current_url = self.driver.current_url
            logger.error(f"✗ URL does not contain '{expected_url_part}': {current_url}")
            raise AssertionError(f"URL does not contain '{expected_url_part}': {current_url}")

    # ==================== Multi-Element Verification ====================

    def verify_elements_count(
        self,
        locator: Tuple[By, str],
        expected_count: int,
        timeout: Optional[int] = None
    ) -> bool:
        """
        Verify number of elements matching locator.

        Args:
            locator: Tuple of (By, value)
            expected_count: Expected element count
            timeout: Wait timeout in seconds

        Returns:
            bool: True if count matches

        Example:
            >>> ui_verifier.verify_elements_count((By.CLASS_NAME, 'menu-item'), 5)
        """
        timeout = timeout or self.default_timeout
        by, value = locator

        logger.info(f"Verifying element count = {expected_count} for: {by}={value}")

        try:
            # Wait for at least one element to be present
            WebDriverWait(self.driver, timeout).until(
                EC.presence_of_element_located(locator)
            )

            elements = self.driver.find_elements(by, value)
            actual_count = len(elements)

            if actual_count == expected_count:
                logger.info(f"✓ Element count matches: {actual_count}")
                return True
            else:
                logger.error(f"✗ Element count mismatch: expected {expected_count}, got {actual_count}")
                raise AssertionError(
                    f"Element count mismatch for {by}={value}: "
                    f"expected {expected_count}, got {actual_count}"
                )

        except TimeoutException:
            logger.error(f"✗ No elements found: {by}={value}")
            if expected_count == 0:
                logger.info("✓ No elements found (as expected)")
                return True
            else:
                raise AssertionError(f"No elements found: {by}={value}")

    # ==================== Utility Methods ====================

    def get_element_text(
        self,
        locator: Tuple[By, str],
        timeout: Optional[int] = None
    ) -> str:
        """
        Get element text with logging.

        Args:
            locator: Tuple of (By, value)
            timeout: Wait timeout in seconds

        Returns:
            str: Element text

        Example:
            >>> text = ui_verifier.get_element_text((By.ID, 'version'))
        """
        timeout = timeout or self.default_timeout
        by, value = locator

        logger.debug(f"Getting text for element: {by}={value}")

        try:
            element = WebDriverWait(self.driver, timeout).until(
                EC.visibility_of_element_located(locator)
            )

            text = element.text.strip()
            logger.debug(f"✓ Element text: '{text}'")
            return text

        except TimeoutException:
            logger.error(f"✗ Element not found: {by}={value}")
            raise

    def __repr__(self) -> str:
        """String representation."""
        return f"UIVerification(timeout={self.default_timeout}s)"
