"""
Debug Helper for Test Failure Analysis

Provides comprehensive debugging capabilities:
- Screenshot capture with automatic naming
- HTML source code preservation
- Browser console logs extraction
- Network logs capture (Chrome only)
- Page state snapshot
- Exception context preservation

Author: QA Automation Team
Version: 1.0.0
"""

import json
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any
from selenium.webdriver.remote.webdriver import WebDriver

from config.test_config import TestConfig, SCREENSHOTS_DIR, LOGS_DIR
from helpers.logger import TestLogger


class DebugHelper:
    """
    Comprehensive debugging assistant for test failure analysis.

    Automatically captures:
    - Screenshots (PNG format)
    - HTML source code
    - Browser console logs
    - Network activity logs (Chrome only)
    - Current URL and title
    - Browser capabilities
    """

    @staticmethod
    def capture_failure_artifacts(
        driver: WebDriver,
        test_name: str,
        test_id: Optional[str] = None,
        exception: Optional[Exception] = None
    ) -> Dict[str, str]:
        """
        Capture all debugging artifacts when a test fails.

        This is the main method called on test failure. It captures:
        1. Screenshot
        2. HTML source code
        3. Browser console logs
        4. Network logs (Chrome only)
        5. Exception details

        Args:
            driver: WebDriver instance
            test_name: Test function name
            test_id: Test case ID (optional)
            exception: Exception that caused the failure (optional)

        Returns:
            dict: Paths to all captured artifacts

        Example:
            >>> artifacts = DebugHelper.capture_failure_artifacts(
            ...     driver,
            ...     "test_kernel_version",
            ...     "TC-SYS-001",
            ...     exception
            ... )
            >>> print(f"Screenshot saved to: {artifacts['screenshot']}")
        """
        logger = TestLogger.get_logger(__name__)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        base_name = f"{test_id or test_name}_{timestamp}"

        artifacts = {}

        try:
            # 1. Capture Screenshot
            if TestConfig.SCREENSHOT_ON_FAILURE:
                screenshot_path = DebugHelper.capture_screenshot(
                    driver, base_name
                )
                artifacts['screenshot'] = screenshot_path
                logger.info(f"📸 Screenshot saved: {screenshot_path}")

            # 2. Save HTML source
            if TestConfig.SAVE_HTML_ON_FAILURE:
                html_path = DebugHelper.save_page_source(
                    driver, base_name
                )
                artifacts['html'] = html_path
                logger.info(f"📄 HTML source saved: {html_path}")

            # 3. Save browser logs
            if TestConfig.SAVE_BROWSER_LOGS_ON_FAILURE:
                logs_path = DebugHelper.save_browser_logs(
                    driver, base_name
                )
                artifacts['browser_logs'] = logs_path
                logger.info(f"📋 Browser logs saved: {logs_path}")

            # 4. Save page info
            info_path = DebugHelper.save_page_info(
                driver, base_name, exception
            )
            artifacts['page_info'] = info_path
            logger.info(f"ℹ️  Page info saved: {info_path}")

            logger.info("=" * 80)
            logger.info("🔍 FAILURE ARTIFACTS CAPTURED")
            logger.info("=" * 80)
            for artifact_type, path in artifacts.items():
                logger.info(f"  {artifact_type}: {path}")
            logger.info("=" * 80)

        except Exception as e:
            logger.error(f"Failed to capture debug artifacts: {e}")
            TestLogger.log_exception(e, "Artifact capture failed")

        return artifacts

    @staticmethod
    def capture_screenshot(
        driver: WebDriver,
        name: str,
        directory: Optional[Path] = None
    ) -> str:
        """
        Capture screenshot with automatic naming and path management.

        Args:
            driver: WebDriver instance
            name: Screenshot base name
            directory: Custom directory (optional, defaults to SCREENSHOTS_DIR)

        Returns:
            str: Path to saved screenshot

        Example:
            >>> path = DebugHelper.capture_screenshot(driver, "login_page")
        """
        save_dir = directory or SCREENSHOTS_DIR
        save_dir.mkdir(parents=True, exist_ok=True)

        screenshot_path = save_dir / f"{name}.png"
        driver.save_screenshot(str(screenshot_path))

        return str(screenshot_path)

    @staticmethod
    def save_page_source(
        driver: WebDriver,
        name: str,
        directory: Optional[Path] = None
    ) -> str:
        """
        Save current page HTML source code.

        Args:
            driver: WebDriver instance
            name: File base name
            directory: Custom directory (optional)

        Returns:
            str: Path to saved HTML file

        Example:
            >>> path = DebugHelper.save_page_source(driver, "error_page")
        """
        save_dir = directory or SCREENSHOTS_DIR
        save_dir.mkdir(parents=True, exist_ok=True)

        html_path = save_dir / f"{name}.html"

        try:
            page_source = driver.page_source
            html_path.write_text(page_source, encoding='utf-8')
        except Exception as e:
            TestLogger.get_logger(__name__).error(
                f"Failed to save page source: {e}"
            )

        return str(html_path)

    @staticmethod
    def save_browser_logs(
        driver: WebDriver,
        name: str,
        directory: Optional[Path] = None
    ) -> str:
        """
        Save browser console logs (errors, warnings, info).

        Args:
            driver: WebDriver instance
            name: File base name
            directory: Custom directory (optional)

        Returns:
            str: Path to saved log file

        Example:
            >>> path = DebugHelper.save_browser_logs(driver, "console_errors")
        """
        save_dir = directory or LOGS_DIR
        save_dir.mkdir(parents=True, exist_ok=True)

        log_path = save_dir / f"{name}_browser.log"

        try:
            # Get browser logs (Chrome only)
            logs = driver.get_log('browser')

            with open(log_path, 'w', encoding='utf-8') as f:
                f.write(f"Browser Console Logs - {name}\n")
                f.write("=" * 80 + "\n\n")

                if not logs:
                    f.write("No browser logs available\n")
                else:
                    for entry in logs:
                        timestamp = datetime.fromtimestamp(
                            entry['timestamp'] / 1000
                        ).strftime('%Y-%m-%d %H:%M:%S')

                        f.write(f"[{timestamp}] [{entry['level']}] {entry['message']}\n")

        except Exception as e:
            # Firefox and some browsers don't support get_log
            TestLogger.get_logger(__name__).debug(
                f"Browser logs not available: {e}"
            )
            log_path.write_text("Browser logs not supported for this browser\n")

        return str(log_path)

    @staticmethod
    def save_page_info(
        driver: WebDriver,
        name: str,
        exception: Optional[Exception] = None,
        directory: Optional[Path] = None
    ) -> str:
        """
        Save comprehensive page state information.

        Includes:
        - Current URL
        - Page title
        - Window size
        - Browser capabilities
        - Exception details (if provided)

        Args:
            driver: WebDriver instance
            name: File base name
            exception: Exception object (optional)
            directory: Custom directory (optional)

        Returns:
            str: Path to saved info file

        Example:
            >>> path = DebugHelper.save_page_info(driver, "test_failure", exception)
        """
        save_dir = directory or SCREENSHOTS_DIR
        save_dir.mkdir(parents=True, exist_ok=True)

        info_path = save_dir / f"{name}_info.json"

        try:
            page_info = {
                'timestamp': datetime.now().isoformat(),
                'test_name': name,
                'url': driver.current_url,
                'title': driver.title,
                'window_size': driver.get_window_size(),
                'capabilities': driver.capabilities,
            }

            # Add exception info if provided
            if exception:
                page_info['exception'] = {
                    'type': type(exception).__name__,
                    'message': str(exception),
                    'args': exception.args,
                }

            # Add cookies (sanitized)
            try:
                cookies = driver.get_cookies()
                page_info['cookies'] = [
                    {k: v for k, v in cookie.items() if k != 'value'}
                    for cookie in cookies
                ]
            except:
                page_info['cookies'] = 'Unable to retrieve cookies'

            info_path.write_text(
                json.dumps(page_info, indent=2, default=str),
                encoding='utf-8'
            )

        except Exception as e:
            TestLogger.get_logger(__name__).error(
                f"Failed to save page info: {e}"
            )

        return str(info_path)

    @staticmethod
    def save_network_logs(driver: WebDriver, name: str) -> Optional[str]:
        """
        Save network activity logs (Chrome only with performance logging enabled).

        Args:
            driver: WebDriver instance
            name: File base name

        Returns:
            str: Path to saved network log file, or None if not available

        Note:
            Requires Chrome with performance logging enabled in capabilities.
        """
        log_path = LOGS_DIR / f"{name}_network.log"

        try:
            logs = driver.get_log('performance')

            with open(log_path, 'w', encoding='utf-8') as f:
                f.write(f"Network Logs - {name}\n")
                f.write("=" * 80 + "\n\n")

                for entry in logs:
                    log_entry = json.loads(entry['message'])
                    f.write(json.dumps(log_entry, indent=2) + "\n")

            return str(log_path)

        except Exception:
            return None

    @staticmethod
    def capture_element_screenshot(
        driver: WebDriver,
        element,
        name: str
    ) -> str:
        """
        Capture screenshot of a specific element.

        Args:
            driver: WebDriver instance
            element: WebElement to capture
            name: Screenshot name

        Returns:
            str: Path to saved screenshot

        Example:
            >>> error_msg = driver.find_element(By.CLASS_NAME, 'error')
            >>> path = DebugHelper.capture_element_screenshot(driver, error_msg, "error_message")
        """
        screenshot_path = SCREENSHOTS_DIR / f"{name}_element.png"
        element.screenshot(str(screenshot_path))
        return str(screenshot_path)


# ==================== Context Manager for Step-by-Step Debugging ====================

class DebugContext:
    """
    Context manager for capturing debug info at each test step.

    Usage:
        >>> with DebugContext(driver, "login_step") as debug:
        ...     driver.find_element(By.ID, 'username').send_keys('admin')
        ...     debug.checkpoint("Username entered")
        ...     driver.find_element(By.ID, 'password').send_keys('password')
        ...     debug.checkpoint("Password entered")
    """

    def __init__(self, driver: WebDriver, step_name: str, capture_screenshot: bool = False):
        """
        Initialize debug context.

        Args:
            driver: WebDriver instance
            step_name: Name of the test step
            capture_screenshot: Whether to capture screenshots at checkpoints
        """
        self.driver = driver
        self.step_name = step_name
        self.capture_screenshot = capture_screenshot
        self.checkpoints = []
        self.logger = TestLogger.get_logger(__name__)

    def __enter__(self):
        """Enter context."""
        self.logger.debug(f"Entering debug context: {self.step_name}")
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Exit context and capture artifacts if exception occurred."""
        if exc_type is not None:
            self.logger.error(f"Exception in {self.step_name}: {exc_val}")
            DebugHelper.capture_failure_artifacts(
                self.driver,
                self.step_name,
                exception=exc_val
            )
        return False

    def checkpoint(self, description: str):
        """
        Mark a checkpoint in the test flow.

        Args:
            description: Checkpoint description
        """
        self.checkpoints.append({
            'time': datetime.now().isoformat(),
            'description': description,
        })
        self.logger.debug(f"Checkpoint: {description}")

        if self.capture_screenshot:
            DebugHelper.capture_screenshot(
                self.driver,
                f"{self.step_name}_{len(self.checkpoints)}"
            )
