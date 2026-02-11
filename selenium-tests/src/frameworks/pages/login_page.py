"""
Login Page Object Model

Handles all interactions with the IWSVA login page including:
- User authentication
- Login form submission
- Error message verification
- Post-login validation

Author: QA Automation Team
Version: 1.0.0
"""

from typing import Optional
from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webdriver import WebDriver

from .base_page import BasePage
from core.config.test_config import TestConfig
from core.logging.test_logger import TestLogger


class LoginPage(BasePage):
    """
    Page Object Model for IWSVA Login Page.

    Provides methods for:
    - User login
    - Credential entry
    - Login validation
    - Error handling

    Example:
        >>> login_page = LoginPage(driver)
        >>> login_page.navigate()
        >>> login_page.login('admin', 'password')
    """

    # ==================== Locators ====================

    # Login form elements
    USERNAME_INPUT = (By.NAME, 'userid')
    PASSWORD_INPUT = (By.NAME, 'password')
    LOGIN_BUTTON = (By.NAME, 'submit')

    # Alternative locators (backup)
    USERNAME_INPUT_ALT = (By.ID, 'userid')
    PASSWORD_INPUT_ALT = (By.ID, 'password')

    # Error messages
    ERROR_MESSAGE = (By.CLASS_NAME, 'error')
    ERROR_MESSAGE_ALT = (By.XPATH, "//*[contains(@class, 'error')]")

    # Post-login validation
    LOGOUT_LINK = (By.LINK_TEXT, 'Logout')
    TOPHEAD_FRAME = 'tophead'
    LEFT_FRAME = 'left'
    RIGHT_FRAME = 'right'

    def __init__(self, driver: WebDriver):
        """
        Initialize Login Page object.

        Args:
            driver: WebDriver instance
        """
        super().__init__(driver)
        self.logger.debug("LoginPage initialized")

    # ==================== Navigation ====================

    def navigate(self):
        """
        Navigate to login page.

        Example:
            >>> login_page.navigate()
        """
        TestLogger.log_step("Navigate to login page")
        self.navigate_to(TestConfig.URLS['login'])
        self.logger.info(f"✓ Navigated to login page: {TestConfig.URLS['login']}")

    # ==================== Actions ====================

    def enter_username(self, username: str) -> bool:
        """
        Enter username in login form.

        Args:
            username: Username to enter

        Returns:
            bool: True if successful, False otherwise

        Example:
            >>> login_page.enter_username('admin')
        """
        TestLogger.log_step(f"Enter username: {username}")

        # Try primary locator
        if self.enter_text(*self.USERNAME_INPUT, username):
            return True

        # Try alternative locator
        if self.enter_text(*self.USERNAME_INPUT_ALT, username):
            return True

        self.logger.error("✗ Failed to enter username")
        return False

    def enter_password(self, password: str) -> bool:
        """
        Enter password in login form.

        Args:
            password: Password to enter

        Returns:
            bool: True if successful, False otherwise

        Example:
            >>> login_page.enter_password('secret')
        """
        TestLogger.log_step("Enter password")

        # Try primary locator
        if self.enter_text(*self.PASSWORD_INPUT, password):
            return True

        # Try alternative locator
        if self.enter_text(*self.PASSWORD_INPUT_ALT, password):
            return True

        self.logger.error("✗ Failed to enter password")
        return False

    def click_login(self) -> bool:
        """
        Click login/submit button.

        Returns:
            bool: True if successful, False otherwise

        Example:
            >>> login_page.click_login()
        """
        TestLogger.log_step("Click login button")

        if self.click_element(*self.LOGIN_BUTTON):
            self.logger.info("✓ Clicked login button")
            return True

        self.logger.error("✗ Failed to click login button")
        return False

    def login(self, username: str, password: str) -> bool:
        """
        Perform complete login operation.

        This is the main method to use for logging in. It handles:
        1. Entering username
        2. Entering password
        3. Clicking login button
        4. Waiting for page load
        5. Validating successful login

        Args:
            username: Username for login
            password: Password for login

        Returns:
            bool: True if login successful, False otherwise

        Example:
            >>> login_page = LoginPage(driver)
            >>> success = login_page.login('admin', 'password123')
            >>> assert success, "Login failed"

        Raises:
            AssertionError: If login fails
        """
        TestLogger.log_step(f"Perform login as user: {username}")
        self.logger.info("=" * 60)
        self.logger.info("LOGIN OPERATION STARTED")
        self.logger.info("=" * 60)

        try:
            # Step 1: Enter username
            if not self.enter_username(username):
                self.logger.error("✗ Login failed: Could not enter username")
                return False

            # Step 2: Enter password
            if not self.enter_password(password):
                self.logger.error("✗ Login failed: Could not enter password")
                return False

            # Step 3: Click login button
            if not self.click_login():
                self.logger.error("✗ Login failed: Could not click login button")
                return False

            # Step 4: Wait for page to load
            self.wait_for_page_load()

            # Step 5: Validate login success
            if self.is_logged_in():
                self.logger.info("=" * 60)
                self.logger.info("✓ LOGIN SUCCESSFUL")
                self.logger.info("=" * 60)
                TestLogger.log_verification("Login status", "Success", "Success", True)
                return True
            else:
                error_msg = self.get_error_message()
                self.logger.error("=" * 60)
                self.logger.error("✗ LOGIN FAILED")
                if error_msg:
                    self.logger.error(f"Error message: {error_msg}")
                self.logger.error("=" * 60)
                TestLogger.log_verification("Login status", "Success", "Failed", False)
                return False

        except Exception as e:
            self.logger.error("✗ Login failed with exception")
            TestLogger.log_exception(e, "Login operation failed")
            return False

    # ==================== Validations ====================

    def is_logged_in(self) -> bool:
        """
        Check if user is successfully logged in.

        Validates login by checking for:
        1. Presence of frameset (IWSVA uses 3-frame architecture)
        2. Absence of login form elements
        3. Current URL (should redirect from login page)

        Returns:
            bool: True if logged in, False otherwise

        Example:
            >>> if login_page.is_logged_in():
            ...     print("User is logged in")
        """
        TestLogger.log_step("Validate login success")

        try:
            # Check 1: Look for frames (IWSVA uses 3-frame structure after login)
            frames = self.find_elements(By.TAG_NAME, 'frame', timeout=5)
            if len(frames) == 3:
                self.logger.debug("✓ Found 3 frames (expected after login)")
                return True

            # Check 2: Verify we're not on login page anymore
            current_url = self.get_current_url()
            if 'login.jsp' not in current_url:
                self.logger.debug(f"✓ Redirected from login page to: {current_url}")
                return True

            # Check 3: Login form should not be visible
            if not self.find_element(*self.LOGIN_BUTTON, timeout=2):
                self.logger.debug("✓ Login form not visible (expected after login)")
                return True

            self.logger.warning("✗ Login validation failed")
            return False

        except Exception as e:
            self.logger.error(f"✗ Error during login validation: {e}")
            return False

    def get_error_message(self) -> Optional[str]:
        """
        Get error message displayed on login page.

        Returns:
            str: Error message text, or None if no error

        Example:
            >>> error = login_page.get_error_message()
            >>> if error:
            ...     print(f"Login error: {error}")
        """
        # Try primary error locator
        error_text = self.get_element_text(*self.ERROR_MESSAGE, timeout=2)
        if error_text:
            return error_text

        # Try alternative error locator
        error_text = self.get_element_text(*self.ERROR_MESSAGE_ALT, timeout=2)
        if error_text:
            return error_text

        return None

    def is_error_displayed(self) -> bool:
        """
        Check if any error message is displayed.

        Returns:
            bool: True if error is displayed, False otherwise

        Example:
            >>> if login_page.is_error_displayed():
            ...     print("Login error occurred")
        """
        return self.get_error_message() is not None

    # ==================== Utility Methods ====================

    def logout(self) -> bool:
        """
        Logout from the application (if logout link is available).

        Returns:
            bool: True if logout successful, False otherwise

        Example:
            >>> login_page.logout()
        """
        TestLogger.log_step("Perform logout")

        try:
            # Switch to tophead frame (logout link usually there)
            if self.switch_to_frame(self.TOPHEAD_FRAME):
                if self.click_element(*self.LOGOUT_LINK):
                    self.logger.info("✓ Logout successful")
                    self.switch_to_default_content()
                    return True

            self.logger.warning("✗ Logout link not found")
            return False

        except Exception as e:
            self.logger.error("✗ Logout failed")
            TestLogger.log_exception(e, "Logout operation failed")
            return False
        finally:
            self.switch_to_default_content()

    def clear_form(self) -> bool:
        """
        Clear login form (username and password fields).

        Returns:
            bool: True if successful, False otherwise

        Example:
            >>> login_page.clear_form()
        """
        TestLogger.log_step("Clear login form")

        try:
            username_field = self.find_element(*self.USERNAME_INPUT)
            password_field = self.find_element(*self.PASSWORD_INPUT)

            if username_field:
                username_field.clear()
            if password_field:
                password_field.clear()

            self.logger.debug("✓ Login form cleared")
            return True

        except Exception as e:
            self.logger.error("✗ Failed to clear form")
            TestLogger.log_exception(e, "Form clear failed")
            return False
