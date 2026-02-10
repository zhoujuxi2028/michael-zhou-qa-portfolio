"""
Pytest Configuration and Fixtures

This module provides pytest fixtures and configuration for the test suite including:
- WebDriver initialization and teardown
- Page object fixtures
- Test hooks for failure handling
- Allure reporting integration
- Session and function-level setup/teardown

Author: QA Automation Team
Version: 1.0.0
"""

import os
import sys
import pytest
import allure
from datetime import datetime
from typing import Generator

from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.firefox.service import Service as FirefoxService
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.firefox.options import Options as FirefoxOptions
from webdriver_manager.chrome import ChromeDriverManager
from webdriver_manager.firefox import GeckoDriverManager

# Add parent directory to path to import from pages and helpers
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.test_config import TestConfig
from helpers.logger import TestLogger, get_logger
from helpers.debug_helper import DebugHelper
from pages.login_page import LoginPage
from pages.system_update_page import SystemUpdatePage


logger = get_logger(__name__)


# ==================== Session-Level Fixtures ====================

@pytest.fixture(scope='session', autouse=True)
def test_session_setup():
    """
    Session-level setup - runs once before all tests.

    Performs:
    - Configuration validation
    - Test environment logging
    - Directory creation
    """
    logger.info("=" * 80)
    logger.info("TEST SESSION STARTED")
    logger.info("=" * 80)

    # Validate configuration
    try:
        TestConfig.validate_config()
        logger.info("✓ Configuration validated")
    except ValueError as e:
        logger.error(f"✗ Configuration validation failed: {e}")
        pytest.exit(f"Configuration error: {e}")

    # Log test environment
    config_summary = TestConfig.get_config_summary()
    logger.info("Test Environment Configuration:")
    for key, value in config_summary.items():
        logger.info(f"  {key}: {value}")

    logger.info("=" * 80)

    yield

    # Session teardown
    logger.info("=" * 80)
    logger.info("TEST SESSION COMPLETED")
    logger.info("=" * 80)


# ==================== WebDriver Fixture ====================

@pytest.fixture(scope='function')
def driver() -> Generator[webdriver.Remote, None, None]:
    """
    WebDriver fixture - creates and manages browser instance.

    Scope: function (new driver for each test)

    Provides:
    - Browser initialization based on TestConfig.BROWSER
    - Automatic WebDriver management (webdriver-manager)
    - Browser options configuration (SSL, headless, etc.)
    - Automatic cleanup after test

    Yields:
        WebDriver: Configured WebDriver instance

    Example:
        >>> def test_example(driver):
        ...     driver.get('https://example.com')
        ...     assert 'Example' in driver.title
    """
    logger.info("=" * 60)
    logger.info(f"INITIALIZING WEBDRIVER: {TestConfig.BROWSER.upper()}")
    logger.info("=" * 60)

    driver_instance = None

    try:
        # Initialize driver based on browser choice
        if TestConfig.BROWSER.lower() == 'chrome':
            driver_instance = _create_chrome_driver()
        elif TestConfig.BROWSER.lower() == 'firefox':
            driver_instance = _create_firefox_driver()
        else:
            raise ValueError(f"Unsupported browser: {TestConfig.BROWSER}")

        # Configure driver
        driver_instance.maximize_window()
        driver_instance.set_page_load_timeout(TestConfig.PAGE_LOAD_TIMEOUT)
        driver_instance.set_script_timeout(TestConfig.SCRIPT_TIMEOUT)
        driver_instance.implicitly_wait(TestConfig.IMPLICIT_WAIT)

        logger.info("✓ WebDriver initialized successfully")
        logger.info(f"  Browser: {TestConfig.BROWSER}")
        logger.info(f"  Headless: {TestConfig.HEADLESS}")
        logger.info(f"  Window size: {TestConfig.BROWSER_WIDTH}x{TestConfig.BROWSER_HEIGHT}")

        yield driver_instance

    except Exception as e:
        logger.error(f"✗ Failed to initialize WebDriver: {e}")
        raise

    finally:
        # Cleanup
        if driver_instance:
            logger.debug("Closing WebDriver")
            try:
                driver_instance.quit()
                logger.info("✓ WebDriver closed successfully")
            except Exception as e:
                logger.error(f"✗ Error closing WebDriver: {e}")


def _create_chrome_driver() -> webdriver.Chrome:
    """
    Create Chrome WebDriver with enterprise configuration.

    Returns:
        webdriver.Chrome: Configured Chrome driver

    Note:
        Uses webdriver-manager for automatic ChromeDriver management
    """
    options = ChromeOptions()

    # Add Chrome options from config
    for option in TestConfig.CHROME_OPTIONS:
        options.add_argument(option)

    # Set window size
    if not TestConfig.HEADLESS:
        options.add_argument(f'--window-size={TestConfig.BROWSER_WIDTH},{TestConfig.BROWSER_HEIGHT}')

    # Disable automation flags
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option('useAutomationExtension', False)

    # Enable browser logging (for debug)
    options.set_capability('goog:loggingPrefs', {'browser': 'ALL'})

    # Create driver
    service = ChromeService(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=options)

    logger.debug("✓ Chrome driver created")
    return driver


def _create_firefox_driver() -> webdriver.Firefox:
    """
    Create Firefox WebDriver with enterprise configuration.

    Returns:
        webdriver.Firefox: Configured Firefox driver

    Note:
        Uses webdriver-manager for automatic GeckoDriver management
    """
    options = FirefoxOptions()

    # Add Firefox options from config
    for option in TestConfig.FIREFOX_OPTIONS:
        options.add_argument(option)

    # Set headless mode
    if TestConfig.HEADLESS:
        options.add_argument('--headless')

    # Accept insecure certificates (for IWSVA self-signed cert)
    options.accept_insecure_certs = True

    # Set window size
    options.set_preference("browser.window.width", TestConfig.BROWSER_WIDTH)
    options.set_preference("browser.window.height", TestConfig.BROWSER_HEIGHT)

    # Create driver
    service = FirefoxService(GeckoDriverManager().install())
    driver = webdriver.Firefox(service=service, options=options)

    logger.debug("✓ Firefox driver created")
    return driver


# ==================== Page Object Fixtures ====================

@pytest.fixture(scope='function')
def login_page(driver) -> LoginPage:
    """
    Login Page fixture.

    Provides:
    - Initialized LoginPage object
    - Automatic navigation to login page
    - Automatic login with configured credentials

    Args:
        driver: WebDriver fixture

    Returns:
        LoginPage: Initialized and ready LoginPage object

    Example:
        >>> def test_login(login_page):
        ...     assert login_page.is_logged_in()
    """
    logger.debug("Creating LoginPage fixture")

    # Create page object
    page = LoginPage(driver)

    # Navigate to login page
    page.navigate()

    # Perform login
    success = page.login(TestConfig.USERNAME, TestConfig.PASSWORD)

    if not success:
        logger.error("✗ Login failed during fixture setup")
        pytest.fail("Login failed - cannot proceed with test")

    logger.info("✓ LoginPage fixture ready")

    return page


@pytest.fixture(scope='function')
def system_update_page(driver, login_page) -> SystemUpdatePage:
    """
    System Update Page fixture.

    Provides:
    - Initialized SystemUpdatePage object
    - User is already logged in (depends on login_page fixture)
    - Ready to interact with System Updates page

    Args:
        driver: WebDriver fixture
        login_page: LoginPage fixture (ensures user is logged in)

    Returns:
        SystemUpdatePage: Initialized SystemUpdatePage object

    Example:
        >>> def test_kernel_version(system_update_page):
        ...     version = system_update_page.get_kernel_version()
        ...     assert version is not None
    """
    logger.debug("Creating SystemUpdatePage fixture")

    # Create page object (user already logged in via login_page fixture)
    page = SystemUpdatePage(driver)

    # Navigate to System Updates page
    page.navigate()

    logger.info("✓ SystemUpdatePage fixture ready")

    return page


# ==================== Test Hooks ====================

@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_makereport(item, call):
    """
    Hook to capture test execution results.

    This hook runs after each test phase (setup, call, teardown) and
    makes the test result available to fixtures.

    Used for:
    - Capturing test failures
    - Attaching test results to item for failure handling
    """
    outcome = yield
    rep = outcome.get_result()

    # Store test result in item for access in fixtures
    setattr(item, f"rep_{rep.when}", rep)


@pytest.fixture(scope='function', autouse=True)
def test_failure_handler(request, driver):
    """
    Automatic failure handling fixture.

    Runs after each test and captures debug artifacts on failure:
    - Screenshot
    - HTML source
    - Browser logs
    - Page information

    Args:
        request: Pytest request fixture
        driver: WebDriver fixture

    Note:
        This fixture runs automatically for all tests (autouse=True)
    """
    # Before test - nothing to do
    yield

    # After test - check for failure
    if hasattr(request.node, 'rep_call'):
        if request.node.rep_call.failed:
            test_name = request.node.name
            test_id = _extract_test_id(request.node)

            logger.error("=" * 80)
            logger.error(f"TEST FAILED: {test_name}")
            logger.error("=" * 80)

            try:
                # Capture failure artifacts
                artifacts = DebugHelper.capture_failure_artifacts(
                    driver,
                    test_name,
                    test_id,
                    exception=request.node.rep_call.longrepr
                )

                # Attach artifacts to Allure report
                for artifact_type, artifact_path in artifacts.items():
                    if os.path.exists(artifact_path):
                        _attach_to_allure(artifact_path, artifact_type)

            except Exception as e:
                logger.error(f"Failed to capture failure artifacts: {e}")


def _extract_test_id(node) -> str:
    """
    Extract test case ID from test node markers.

    Args:
        node: Pytest test node

    Returns:
        str: Test case ID (e.g., "TC-SYS-001") or test name
    """
    # Try to get test ID from Allure testcase marker
    for marker in node.iter_markers('allure_label'):
        if marker.kwargs.get('label_type') == 'testcase':
            return marker.kwargs.get('name', node.name)

    return node.name


def _attach_to_allure(file_path: str, attachment_type: str):
    """
    Attach file to Allure report.

    Args:
        file_path: Path to file to attach
        attachment_type: Type of attachment (screenshot, html, etc.)
    """
    try:
        # Determine Allure attachment type
        if attachment_type == 'screenshot' or file_path.endswith('.png'):
            allure_type = allure.attachment_type.PNG
        elif attachment_type == 'html' or file_path.endswith('.html'):
            allure_type = allure.attachment_type.HTML
        elif attachment_type == 'browser_logs' or file_path.endswith('.log'):
            allure_type = allure.attachment_type.TEXT
        elif file_path.endswith('.json'):
            allure_type = allure.attachment_type.JSON
        else:
            allure_type = allure.attachment_type.TEXT

        # Attach file
        allure.attach.file(
            file_path,
            name=f"{attachment_type}_{datetime.now().strftime('%H%M%S')}",
            attachment_type=allure_type
        )

        logger.debug(f"✓ Attached {attachment_type} to Allure report")

    except Exception as e:
        logger.error(f"Failed to attach {attachment_type} to Allure: {e}")


# ==================== Pytest Configuration ====================

def pytest_configure(config):
    """
    Pytest configuration hook - runs once at start.

    Registers custom markers for test categorization.
    """
    config.addinivalue_line(
        "markers", "smoke: mark test as smoke test"
    )
    config.addinivalue_line(
        "markers", "regression: mark test as regression test"
    )
    config.addinivalue_line(
        "markers", "ui: mark test as UI-level test"
    )
    config.addinivalue_line(
        "markers", "backend: mark test as backend verification test"
    )
    config.addinivalue_line(
        "markers", "P0: mark test as Priority 0 (Critical)"
    )
    config.addinivalue_line(
        "markers", "P1: mark test as Priority 1 (High)"
    )
    config.addinivalue_line(
        "markers", "P2: mark test as Priority 2 (Medium)"
    )
    config.addinivalue_line(
        "markers", "P3: mark test as Priority 3 (Low)"
    )


# ==================== Helper Fixtures ====================

@pytest.fixture(scope='session')
def test_config():
    """
    Test configuration fixture.

    Returns:
        TestConfig: Test configuration object

    Example:
        >>> def test_example(test_config):
        ...     print(f"Base URL: {test_config.BASE_URL}")
    """
    return TestConfig


@pytest.fixture(scope='function')
def debug_helper(driver):
    """
    Debug helper fixture.

    Provides access to DebugHelper for manual debugging.

    Args:
        driver: WebDriver fixture

    Returns:
        DebugHelper: Debug helper instance

    Example:
        >>> def test_example(driver, debug_helper):
        ...     debug_helper.capture_screenshot(driver, "checkpoint1")
    """
    return DebugHelper
