"""
Test Configuration Module

Enterprise-grade configuration management for Selenium test automation.
Supports multiple environments, credentials management, and runtime configuration.

Author: QA Automation Team
Version: 1.0.0
"""

import os
from pathlib import Path
from typing import Dict, Any
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# ==================== Project Paths ====================
PROJECT_ROOT = Path(__file__).parent.parent
TESTS_DIR = PROJECT_ROOT / "tests"
PAGES_DIR = PROJECT_ROOT / "pages"
REPORTS_DIR = PROJECT_ROOT / "reports"
SCREENSHOTS_DIR = PROJECT_ROOT / "screenshots"
LOGS_DIR = PROJECT_ROOT / "logs"
VIDEOS_DIR = PROJECT_ROOT / "videos"
FIXTURES_DIR = PROJECT_ROOT / "fixtures"

# Ensure directories exist
for directory in [REPORTS_DIR, SCREENSHOTS_DIR, LOGS_DIR, VIDEOS_DIR]:
    directory.mkdir(parents=True, exist_ok=True)


class TestConfig:
    """
    Centralized test configuration class.

    Manages all test-related configuration including:
    - Application URLs and credentials
    - Browser settings
    - Timeout values
    - SSH connection details
    - Test data paths
    """

    # ==================== Environment Configuration ====================
    ENVIRONMENT = os.getenv('TEST_ENV', 'qa')  # dev, qa, staging, production

    # ==================== Application Configuration ====================
    BASE_URL = os.getenv('BASE_URL', 'https://10.206.201.9:8443')
    USERNAME = os.getenv('USERNAME', 'admin')
    PASSWORD = os.getenv('PASSWORD', '111111')

    # ==================== SSH Configuration ====================
    SSH_CONFIG = {
        'host': os.getenv('SSH_HOST', '10.206.201.9'),
        'port': int(os.getenv('SSH_PORT', '22')),
        'username': os.getenv('SSH_USERNAME', 'root'),
        'password': os.getenv('SSH_PASSWORD', ''),
    }

    # ==================== Browser Configuration ====================
    BROWSER = os.getenv('BROWSER', 'chrome')  # chrome, firefox, edge
    HEADLESS = os.getenv('HEADLESS', 'false').lower() == 'true'
    BROWSER_WIDTH = int(os.getenv('BROWSER_WIDTH', '1920'))
    BROWSER_HEIGHT = int(os.getenv('BROWSER_HEIGHT', '1080'))

    # ==================== Timeout Configuration ====================
    IMPLICIT_WAIT = 10  # seconds
    EXPLICIT_WAIT = 30  # seconds
    PAGE_LOAD_TIMEOUT = 60  # seconds
    SCRIPT_TIMEOUT = 30  # seconds

    # ==================== Test Configuration ====================
    TARGET_KERNEL_VERSION = os.getenv('TARGET_KERNEL_VERSION', '5.14.0-427.24.1.el9_4.x86_64')

    # ==================== Retry Configuration ====================
    MAX_RETRIES = int(os.getenv('MAX_RETRIES', '2'))
    RETRY_DELAY = int(os.getenv('RETRY_DELAY', '1'))  # seconds

    # ==================== Screenshot Configuration ====================
    SCREENSHOT_ON_FAILURE = True
    SCREENSHOT_ON_SUCCESS = False
    SAVE_HTML_ON_FAILURE = True
    SAVE_BROWSER_LOGS_ON_FAILURE = True

    # ==================== Video Recording Configuration ====================
    ENABLE_VIDEO_RECORDING = os.getenv('ENABLE_VIDEO', 'false').lower() == 'true'
    VIDEO_FPS = 10

    # ==================== Logging Configuration ====================
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')  # DEBUG, INFO, WARNING, ERROR
    ENABLE_CONSOLE_LOG = True
    ENABLE_FILE_LOG = True

    # ==================== Allure Configuration ====================
    ALLURE_RESULTS_DIR = str(REPORTS_DIR / "allure-results")
    ALLURE_REPORT_DIR = str(REPORTS_DIR / "allure-report")

    # ==================== Chrome Options ====================
    CHROME_OPTIONS = [
        '--ignore-certificate-errors',
        '--allow-insecure-localhost',
        '--disable-blink-features=AutomationControlled',
        '--disable-extensions',
        '--disable-gpu',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--allow-running-insecure-content',
    ]

    if HEADLESS:
        CHROME_OPTIONS.append('--headless=new')

    # ==================== Firefox Options ====================
    FIREFOX_OPTIONS = [
        '-private',
    ]

    if HEADLESS:
        FIREFOX_OPTIONS.append('--headless')

    # ==================== Frame Names ====================
    FRAMES = {
        'tophead': 'tophead',
        'left': 'left',
        'right': 'right',
    }

    # ==================== URLs ====================
    URLS = {
        'login': f"{BASE_URL}/login.jsp",
        'system_update': f"{BASE_URL}/jsp/system_update.jsp",
    }

    # ==================== Backend Paths ====================
    BACKEND_PATHS = {
        'ini_file': '/etc/iscan/intscan.ini',
        'backup_dir': '/var/iwss/backup',
        'log_dir': '/var/log/iwss',
    }

    @classmethod
    def get_config_summary(cls) -> Dict[str, Any]:
        """
        Get a summary of current configuration.

        Returns:
            dict: Configuration summary (sanitized - no passwords)
        """
        return {
            'environment': cls.ENVIRONMENT,
            'base_url': cls.BASE_URL,
            'username': cls.USERNAME,
            'browser': cls.BROWSER,
            'headless': cls.HEADLESS,
            'resolution': f"{cls.BROWSER_WIDTH}x{cls.BROWSER_HEIGHT}",
            'target_kernel_version': cls.TARGET_KERNEL_VERSION,
            'ssh_host': cls.SSH_CONFIG['host'],
            'max_retries': cls.MAX_RETRIES,
            'log_level': cls.LOG_LEVEL,
            'video_recording': cls.ENABLE_VIDEO_RECORDING,
        }

    @classmethod
    def validate_config(cls) -> bool:
        """
        Validate required configuration is present.

        Returns:
            bool: True if configuration is valid

        Raises:
            ValueError: If required configuration is missing
        """
        required_fields = {
            'BASE_URL': cls.BASE_URL,
            'USERNAME': cls.USERNAME,
            'PASSWORD': cls.PASSWORD,
        }

        missing_fields = [k for k, v in required_fields.items() if not v]

        if missing_fields:
            raise ValueError(
                f"Missing required configuration: {', '.join(missing_fields)}\n"
                f"Please create a .env file with the required values."
            )

        return True


# ==================== Environment-Specific Configurations ====================
ENV_CONFIGS = {
    'dev': {
        'BASE_URL': 'https://dev-iwsva:8443',
    },
    'qa': {
        'BASE_URL': 'https://10.206.201.9:8443',
    },
    'staging': {
        'BASE_URL': 'https://staging-iwsva:8443',
    },
}

# Apply environment-specific config if exists
if TestConfig.ENVIRONMENT in ENV_CONFIGS:
    for key, value in ENV_CONFIGS[TestConfig.ENVIRONMENT].items():
        setattr(TestConfig, key, value)
