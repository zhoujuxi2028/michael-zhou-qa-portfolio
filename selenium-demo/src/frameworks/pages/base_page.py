"""
Base Page Object Model

Provides common functionality for all page objects including:
- Frame navigation (IWSVA uses legacy 3-frame architecture)
- Wait mechanisms
- Element interaction wrappers
- Screenshot capture
- Error handling

Author: QA Automation Team
Version: 1.0.0
"""

from typing import Optional, List
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.remote.webelement import WebElement
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import (
    TimeoutException,
    NoSuchElementException,
    StaleElementReferenceException
)

from core.config.test_config import TestConfig
from core.logging.test_logger import TestLogger, get_logger


logger = get_logger(__name__)


class BasePage:
    """
    Base class for all page objects.

    Provides common methods for interacting with web pages including:
    - Frame navigation and switching
    - Element waiting and finding
    - Safe element interactions
    - Error handling and logging

    Attributes:
        driver: WebDriver instance
        wait: WebDriverWait instance with default timeout
    """

    def __init__(self, driver: WebDriver):
        """
        Initialize base page object.

        Args:
            driver: WebDriver instance
        """
        self.driver = driver
        self.wait = WebDriverWait(driver, TestConfig.EXPLICIT_WAIT)
        self.logger = logger

    # ==================== Frame Navigation ====================

    def switch_to_frame(self, frame_name: str) -> bool:
        """
        Switch to specified frame with error handling.

        IWSVA uses a 3-frame structure:
        - tophead: Navigation bar
        - left: Menu sidebar
        - right: Main content area

        Args:
            frame_name: Name of the frame ('tophead', 'left', 'right')

        Returns:
            bool: True if switch successful, False otherwise

        Example:
            >>> page.switch_to_frame('right')
            >>> # Now in right frame
        """
        try:
            self.driver.switch_to.default_content()
            self.wait.until(
                EC.frame_to_be_available_and_switch_to_it(frame_name)
            )
            self.logger.debug(f"✓ Switched to frame: {frame_name}")
            return True

        except TimeoutException as e:
            self.logger.error(f"✗ Failed to switch to frame: {frame_name}")
            TestLogger.log_exception(e, f"Frame switch timeout: {frame_name}")
            return False

    def switch_to_default_content(self):
        """
        Switch back to main document (exit all frames).

        Example:
            >>> page.switch_to_frame('right')
            >>> # Do work in frame
            >>> page.switch_to_default_content()
        """
        self.driver.switch_to.default_content()
        self.logger.debug("✓ Switched to default content")

    def get_frame_content(self, frame_name: str) -> str:
        """
        Get text content from specified frame.

        Args:
            frame_name: Name of the frame

        Returns:
            str: Text content of the frame body

        Example:
            >>> content = page.get_frame_content('right')
        """
        self.switch_to_frame(frame_name)
        try:
            body = self.wait.until(
                EC.presence_of_element_located((By.TAG_NAME, 'body'))
            )
            return body.text
        finally:
            self.switch_to_default_content()

    # ==================== Menu Navigation (ISSUE-004 Fix) ====================

    def wait_for_frame_content(
        self,
        frame_name: str,
        expected_text: str,
        timeout: int = 10
    ) -> bool:
        """
        Wait for frame to contain expected text.

        This is used for menu navigation to ensure submenu items
        have loaded before attempting to click them.

        Args:
            frame_name: Name of the frame to check
            expected_text: Text to wait for in frame
            timeout: Maximum wait time in seconds

        Returns:
            bool: True if text found within timeout, False otherwise

        Example:
            >>> page.wait_for_frame_content('left', 'System Update', 5)
        """
        import time
        end_time = time.time() + timeout

        while time.time() < end_time:
            try:
                if self.switch_to_frame(frame_name):
                    body = self.driver.find_element(By.TAG_NAME, 'body')
                    if expected_text in body.text:
                        self.logger.debug(f"✓ Found '{expected_text}' in frame '{frame_name}'")
                        self.switch_to_default_content()
                        return True
                    self.switch_to_default_content()
            except Exception as e:
                self.logger.debug(f"Waiting for '{expected_text}' in frame...")

            time.sleep(0.5)

        self.logger.warning(f"✗ Timeout waiting for '{expected_text}' in frame '{frame_name}'")
        self.switch_to_default_content()
        return False

    def click_in_frame_by_text(
        self,
        frame_name: str,
        text_content: str
    ) -> bool:
        """
        Click element in frame by its text content.

        This searches for an element (link or other clickable) that
        contains the specified text and clicks it.

        Args:
            frame_name: Name of the frame
            text_content: Text to search for (case-insensitive)

        Returns:
            bool: True if element found and clicked, False otherwise

        Example:
            >>> page.click_in_frame_by_text('left', 'Administration')
        """
        try:
            if not self.switch_to_frame(frame_name):
                return False

            # Try to find link with text
            links = self.driver.find_elements(By.TAG_NAME, 'a')
            for link in links:
                if text_content.lower() in link.text.lower():
                    self.logger.debug(f"✓ Clicking '{link.text}' in frame '{frame_name}'")
                    link.click()
                    self.switch_to_default_content()
                    return True

            self.logger.error(f"✗ No element found with text '{text_content}' in frame '{frame_name}'")
            self.switch_to_default_content()
            return False

        except Exception as e:
            self.logger.error(f"✗ Failed to click element in frame: {e}")
            self.switch_to_default_content()
            return False

    def click_link_in_frame(
        self,
        frame_name: str,
        search_text: str
    ) -> bool:
        """
        Click link in frame by partial text match.

        This is specifically for clicking menu links, using a
        case-insensitive partial text match.

        Args:
            frame_name: Name of the frame
            search_text: Partial text to search for in links

        Returns:
            bool: True if link found and clicked, False otherwise

        Example:
            >>> page.click_link_in_frame('left', 'system update')
        """
        try:
            if not self.switch_to_frame(frame_name):
                return False

            # Use PARTIAL_LINK_TEXT for more flexible matching
            try:
                link = self.driver.find_element(
                    By.PARTIAL_LINK_TEXT,
                    search_text
                )
                self.logger.debug(f"✓ Clicking link '{link.text}' in frame '{frame_name}'")
                link.click()
                self.switch_to_default_content()
                return True
            except:
                # Fallback: search through all links
                links = self.driver.find_elements(By.TAG_NAME, 'a')
                for link in links:
                    if search_text.lower() in link.text.lower():
                        self.logger.debug(f"✓ Clicking link '{link.text}' in frame '{frame_name}'")
                        link.click()
                        self.switch_to_default_content()
                        return True

            self.logger.error(f"✗ No link found with text '{search_text}' in frame '{frame_name}'")
            self.switch_to_default_content()
            return False

        except Exception as e:
            self.logger.error(f"✗ Failed to click link in frame: {e}")
            TestLogger.log_exception(e, f"Click link in frame failed: {frame_name}")
            self.switch_to_default_content()
            return False

    # ==================== Element Finding ====================

    def find_element(
        self,
        by: By,
        value: str,
        timeout: Optional[int] = None
    ) -> Optional[WebElement]:
        """
        Find element with explicit wait.

        Args:
            by: Locator strategy (By.ID, By.XPATH, etc.)
            value: Locator value
            timeout: Custom timeout in seconds (optional)

        Returns:
            WebElement if found, None otherwise

        Example:
            >>> element = page.find_element(By.ID, 'username')
        """
        wait_time = timeout or TestConfig.EXPLICIT_WAIT
        wait = WebDriverWait(self.driver, wait_time)

        try:
            element = wait.until(
                EC.presence_of_element_located((by, value))
            )
            self.logger.debug(f"✓ Found element: {by}={value}")
            return element

        except TimeoutException:
            self.logger.warning(f"✗ Element not found: {by}={value}")
            return None

    def find_elements(
        self,
        by: By,
        value: str,
        timeout: Optional[int] = None
    ) -> List[WebElement]:
        """
        Find multiple elements with explicit wait.

        Args:
            by: Locator strategy
            value: Locator value
            timeout: Custom timeout in seconds (optional)

        Returns:
            list: List of WebElements (empty list if none found)

        Example:
            >>> links = page.find_elements(By.TAG_NAME, 'a')
        """
        wait_time = timeout or TestConfig.EXPLICIT_WAIT
        wait = WebDriverWait(self.driver, wait_time)

        try:
            elements = wait.until(
                EC.presence_of_all_elements_located((by, value))
            )
            self.logger.debug(f"✓ Found {len(elements)} elements: {by}={value}")
            return elements

        except TimeoutException:
            self.logger.warning(f"✗ Elements not found: {by}={value}")
            return []

    def is_element_visible(
        self,
        by: By,
        value: str,
        timeout: Optional[int] = None
    ) -> bool:
        """
        Check if element is visible.

        Args:
            by: Locator strategy
            value: Locator value
            timeout: Custom timeout in seconds (optional)

        Returns:
            bool: True if element is visible, False otherwise

        Example:
            >>> if page.is_element_visible(By.ID, 'error_message'):
            ...     print("Error displayed")
        """
        wait_time = timeout or TestConfig.EXPLICIT_WAIT
        wait = WebDriverWait(self.driver, wait_time)

        try:
            wait.until(EC.visibility_of_element_located((by, value)))
            return True
        except TimeoutException:
            return False

    # ==================== Element Interactions ====================

    def click_element(
        self,
        by: By,
        value: str,
        timeout: Optional[int] = None
    ) -> bool:
        """
        Click element with retry logic.

        Args:
            by: Locator strategy
            value: Locator value
            timeout: Custom timeout in seconds (optional)

        Returns:
            bool: True if click successful, False otherwise

        Example:
            >>> page.click_element(By.ID, 'submit_button')
        """
        element = self.find_element(by, value, timeout)

        if not element:
            return False

        try:
            # Wait until element is clickable
            wait = WebDriverWait(self.driver, TestConfig.EXPLICIT_WAIT)
            clickable = wait.until(EC.element_to_be_clickable((by, value)))
            clickable.click()
            self.logger.debug(f"✓ Clicked element: {by}={value}")
            return True

        except Exception as e:
            self.logger.error(f"✗ Failed to click element: {by}={value}")
            TestLogger.log_exception(e, f"Click failed: {by}={value}")
            return False

    def enter_text(
        self,
        by: By,
        value: str,
        text: str,
        clear_first: bool = True,
        timeout: Optional[int] = None
    ) -> bool:
        """
        Enter text into input field.

        Args:
            by: Locator strategy
            value: Locator value
            text: Text to enter
            clear_first: Clear field before entering text
            timeout: Custom timeout in seconds (optional)

        Returns:
            bool: True if text entered successfully, False otherwise

        Example:
            >>> page.enter_text(By.ID, 'username', 'admin')
        """
        element = self.find_element(by, value, timeout)

        if not element:
            return False

        try:
            if clear_first:
                element.clear()
            element.send_keys(text)
            self.logger.debug(f"✓ Entered text in: {by}={value}")
            return True

        except Exception as e:
            self.logger.error(f"✗ Failed to enter text: {by}={value}")
            TestLogger.log_exception(e, f"Text entry failed: {by}={value}")
            return False

    def get_element_text(
        self,
        by: By,
        value: str,
        timeout: Optional[int] = None
    ) -> Optional[str]:
        """
        Get text content of element.

        Args:
            by: Locator strategy
            value: Locator value
            timeout: Custom timeout in seconds (optional)

        Returns:
            str: Element text, or None if not found

        Example:
            >>> message = page.get_element_text(By.CLASS_NAME, 'success')
        """
        element = self.find_element(by, value, timeout)

        if element:
            return element.text
        return None

    def get_element_attribute(
        self,
        by: By,
        value: str,
        attribute: str,
        timeout: Optional[int] = None
    ) -> Optional[str]:
        """
        Get attribute value of element.

        Args:
            by: Locator strategy
            value: Locator value
            attribute: Attribute name
            timeout: Custom timeout in seconds (optional)

        Returns:
            str: Attribute value, or None if not found

        Example:
            >>> href = page.get_element_attribute(By.ID, 'link', 'href')
        """
        element = self.find_element(by, value, timeout)

        if element:
            return element.get_attribute(attribute)
        return None

    # ==================== Wait Mechanisms ====================

    def wait_for_page_load(self, timeout: Optional[int] = None):
        """
        Wait for page to finish loading.

        Args:
            timeout: Custom timeout in seconds (optional)
        """
        wait_time = timeout or TestConfig.PAGE_LOAD_TIMEOUT
        wait = WebDriverWait(self.driver, wait_time)

        wait.until(
            lambda driver: driver.execute_script('return document.readyState') == 'complete'
        )
        self.logger.debug("✓ Page loaded")

    def wait_for_element_to_disappear(
        self,
        by: By,
        value: str,
        timeout: Optional[int] = None
    ) -> bool:
        """
        Wait for element to disappear (become invisible or removed from DOM).

        Args:
            by: Locator strategy
            value: Locator value
            timeout: Custom timeout in seconds (optional)

        Returns:
            bool: True if element disappeared, False if still visible

        Example:
            >>> page.wait_for_element_to_disappear(By.ID, 'loading_spinner')
        """
        wait_time = timeout or TestConfig.EXPLICIT_WAIT
        wait = WebDriverWait(self.driver, wait_time)

        try:
            wait.until(EC.invisibility_of_element_located((by, value)))
            self.logger.debug(f"✓ Element disappeared: {by}={value}")
            return True
        except TimeoutException:
            self.logger.warning(f"✗ Element still visible: {by}={value}")
            return False

    # ==================== Navigation ====================

    def navigate_to(self, url: str):
        """
        Navigate to specified URL.

        Args:
            url: URL to navigate to

        Example:
            >>> page.navigate_to('https://example.com/login')
        """
        self.logger.info(f"Navigating to: {url}")
        self.driver.get(url)
        self.wait_for_page_load()

    def get_current_url(self) -> str:
        """
        Get current page URL.

        Returns:
            str: Current URL
        """
        return self.driver.current_url

    def get_page_title(self) -> str:
        """
        Get current page title.

        Returns:
            str: Page title
        """
        return self.driver.title

    # ==================== Utility Methods ====================

    def execute_script(self, script: str, *args):
        """
        Execute JavaScript in the browser.

        Args:
            script: JavaScript code to execute
            *args: Arguments to pass to the script

        Returns:
            Result of script execution

        Example:
            >>> page.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        """
        return self.driver.execute_script(script, *args)

    def refresh_page(self):
        """
        Refresh current page.
        """
        self.logger.debug("Refreshing page")
        self.driver.refresh()
        self.wait_for_page_load()

    def get_page_source(self) -> str:
        """
        Get HTML source of current page.

        Returns:
            str: Page HTML source
        """
        return self.driver.page_source
