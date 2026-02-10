"""
Enterprise Logging System

Multi-level logging with file rotation, colored console output, and test context tracking.
Designed for production-grade test automation with detailed debugging capabilities.

Features:
- Colored console output for better readability
- File logging with automatic rotation
- Test context tracking (test name, case ID, step number)
- Performance metrics logging
- Exception stack trace capture
- Thread-safe logging

Author: QA Automation Team
Version: 1.0.0
"""

import logging
import sys
from pathlib import Path
from datetime import datetime
from typing import Optional
import colorlog
from logging.handlers import RotatingFileHandler

from config.test_config import TestConfig, LOGS_DIR


class ContextFormatter(logging.Formatter):
    """
    Custom formatter that provides default values for missing context fields.

    This prevents KeyError when logging without test context set.
    """

    def format(self, record):
        # Provide default values for test context fields if not present
        if not hasattr(record, 'test_name'):
            record.test_name = 'N/A'
        if not hasattr(record, 'step_number'):
            record.step_number = 0
        return super().format(record)


class TestLogger:
    """
    Enterprise-grade logger with enhanced debugging capabilities.

    Provides structured logging with:
    - Multiple output targets (console, file, test report)
    - Context tracking (test case ID, step number, timestamp)
    - Performance measurement
    - Automatic log rotation
    """

    _loggers = {}  # Cache loggers by name
    _current_test_context = {
        'test_name': None,
        'test_id': None,
        'step_number': 0,
    }

    @classmethod
    def get_logger(cls, name: str = 'TestAutomation') -> logging.Logger:
        """
        Get or create a logger instance with enterprise configuration.

        Args:
            name: Logger name (usually module or class name)

        Returns:
            logging.Logger: Configured logger instance

        Example:
            >>> logger = TestLogger.get_logger(__name__)
            >>> logger.info("Test started")
        """
        if name in cls._loggers:
            return cls._loggers[name]

        logger = logging.getLogger(name)
        logger.setLevel(getattr(logging, TestConfig.LOG_LEVEL))
        logger.handlers = []  # Clear existing handlers

        # ==================== Console Handler (Colored) ====================
        if TestConfig.ENABLE_CONSOLE_LOG:
            console_handler = colorlog.StreamHandler(sys.stdout)
            console_handler.setLevel(logging.INFO)

            console_format = colorlog.ColoredFormatter(
                '%(log_color)s%(asctime)s [%(levelname)8s] [%(name)s] %(message)s',
                datefmt='%H:%M:%S',
                log_colors={
                    'DEBUG': 'cyan',
                    'INFO': 'green',
                    'WARNING': 'yellow',
                    'ERROR': 'red',
                    'CRITICAL': 'red,bg_white',
                }
            )
            console_handler.setFormatter(console_format)
            logger.addHandler(console_handler)

        # ==================== File Handler (Rotating) ====================
        if TestConfig.ENABLE_FILE_LOG:
            log_file = LOGS_DIR / f"test_{datetime.now().strftime('%Y%m%d')}.log"
            file_handler = RotatingFileHandler(
                log_file,
                maxBytes=10 * 1024 * 1024,  # 10MB
                backupCount=5,
                encoding='utf-8'
            )
            file_handler.setLevel(logging.DEBUG)

            file_format = ContextFormatter(
                '%(asctime)s [%(levelname)8s] [%(name)s:%(lineno)d] '
                '[Test: %(test_name)s] [Step: %(step_number)s] %(message)s',
                datefmt='%Y-%m-%d %H:%M:%S'
            )
            file_handler.setFormatter(file_format)
            logger.addHandler(file_handler)

        # Prevent propagation to root logger
        logger.propagate = False

        cls._loggers[name] = logger
        return logger

    @classmethod
    def set_test_context(cls, test_name: str, test_id: Optional[str] = None):
        """
        Set current test context for logging.

        Args:
            test_name: Current test function name
            test_id: Test case ID (e.g., TC-SYS-001)

        Example:
            >>> TestLogger.set_test_context('test_kernel_version', 'TC-SYS-001')
        """
        cls._current_test_context['test_name'] = test_name
        cls._current_test_context['test_id'] = test_id
        cls._current_test_context['step_number'] = 0

    @classmethod
    def increment_step(cls) -> int:
        """
        Increment test step counter.

        Returns:
            int: New step number
        """
        cls._current_test_context['step_number'] += 1
        return cls._current_test_context['step_number']

    @classmethod
    def reset_context(cls):
        """Reset test context (call after test completion)."""
        cls._current_test_context = {
            'test_name': None,
            'test_id': None,
            'step_number': 0,
        }

    @classmethod
    def log_test_start(cls, test_name: str, test_id: str, description: str):
        """
        Log test case start with formatted header.

        Args:
            test_name: Test function name
            test_id: Test case ID
            description: Test description
        """
        logger = cls.get_logger()
        logger.info("=" * 80)
        logger.info(f"TEST STARTED: {test_id} - {test_name}")
        logger.info(f"Description: {description}")
        logger.info("=" * 80)

    @classmethod
    def log_test_end(cls, test_name: str, status: str, duration: float):
        """
        Log test case end with results.

        Args:
            test_name: Test function name
            status: Test status (PASSED, FAILED, SKIPPED)
            duration: Test execution time in seconds
        """
        logger = cls.get_logger()
        logger.info("=" * 80)
        logger.info(f"TEST {status}: {test_name}")
        logger.info(f"Duration: {duration:.2f}s")
        logger.info("=" * 80)

    @classmethod
    def log_step(cls, step_description: str, level: str = 'INFO'):
        """
        Log a test step with auto-incremented step number.

        Args:
            step_description: Description of the step
            level: Log level (DEBUG, INFO, WARNING, ERROR)

        Example:
            >>> TestLogger.log_step("Navigate to login page")
            >>> TestLogger.log_step("Enter credentials")
        """
        logger = cls.get_logger()
        step_num = cls.increment_step()

        log_method = getattr(logger, level.lower(), logger.info)
        log_method(f"Step {step_num}: {step_description}", extra={
            'test_name': cls._current_test_context.get('test_name', 'N/A'),
            'step_number': step_num
        })

    @classmethod
    def log_verification(cls, item: str, expected: str, actual: str, passed: bool):
        """
        Log verification result with clear pass/fail indication.

        Args:
            item: What is being verified
            expected: Expected value
            actual: Actual value
            passed: Whether verification passed

        Example:
            >>> TestLogger.log_verification(
            ...     "Kernel version",
            ...     "5.14.0-427.24.1.el9_4.x86_64",
            ...     "5.14.0-427.24.1.el9_4.x86_64",
            ...     True
            ... )
        """
        logger = cls.get_logger()
        status = "✓ PASS" if passed else "✗ FAIL"

        if passed:
            logger.info(f"{status} - {item}: {actual}")
        else:
            logger.error(f"{status} - {item}")
            logger.error(f"  Expected: {expected}")
            logger.error(f"  Actual:   {actual}")

    @classmethod
    def log_performance(cls, operation: str, duration: float, threshold: Optional[float] = None):
        """
        Log performance metrics.

        Args:
            operation: Operation name
            duration: Time taken in seconds
            threshold: Performance threshold (optional)

        Example:
            >>> TestLogger.log_performance("Page load", 2.5, threshold=3.0)
        """
        logger = cls.get_logger()

        if threshold and duration > threshold:
            logger.warning(
                f"PERFORMANCE: {operation} took {duration:.2f}s "
                f"(threshold: {threshold:.2f}s) ⚠️"
            )
        else:
            logger.info(f"PERFORMANCE: {operation} took {duration:.2f}s")

    @classmethod
    def log_exception(cls, exception: Exception, context: str = ""):
        """
        Log exception with full stack trace.

        Args:
            exception: Exception object
            context: Additional context information

        Example:
            >>> try:
            ...     driver.find_element(By.ID, 'invalid')
            ... except Exception as e:
            ...     TestLogger.log_exception(e, "Failed to find element")
        """
        logger = cls.get_logger()
        logger.error(f"EXCEPTION: {context}")
        logger.error(f"Type: {type(exception).__name__}")
        logger.error(f"Message: {str(exception)}")
        logger.exception("Stack trace:", exc_info=exception)


# ==================== Convenience Methods ====================

def get_logger(name: str = __name__) -> logging.Logger:
    """
    Convenience function to get logger.

    Args:
        name: Logger name

    Returns:
        logging.Logger: Configured logger

    Example:
        >>> from helpers.logger import get_logger
        >>> logger = get_logger(__name__)
    """
    return TestLogger.get_logger(name)
