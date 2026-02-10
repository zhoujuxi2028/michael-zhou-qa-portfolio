# 🏢 Enterprise-Grade Selenium Test Automation Framework

> **IWSVA System Updates Verification - Production-Ready Edition**

[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://www.python.org/)
[![Selenium](https://img.shields.io/badge/Selenium-4.16.0-green.svg)](https://www.selenium.dev/)
[![Pytest](https://img.shields.io/badge/Pytest-7.4.3-orange.svg)](https://pytest.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Enterprise Features](#-enterprise-features)
- [Project Structure](#-project-structure)
- [Quick Start](#-quick-start)
- [Configuration](#-configuration)
- [Running Tests](#-running-tests)
- [Test Reports](#-test-reports)
- [Debugging](#-debugging)
- [Best Practices](#-best-practices)
- [CI/CD Integration](#-cicd-integration)

---

## 🎯 Overview

This is a **production-ready Selenium test automation framework** designed for enterprise QA teams. It implements industry best practices for:

✅ **Problem Analysis & Debugging**
- Multi-level logging (DEBUG/INFO/WARNING/ERROR)
- Automatic screenshot capture on test failure
- HTML source code preservation
- Browser console logs extraction
- Detailed exception stack traces
- Test step tracking and performance metrics

✅ **Enterprise-Level Standards**
- Comprehensive documentation (Google Docstring style)
- Test case ID and traceability matrix
- Data-driven testing (DDT)
- Allure test reporting
- CI/CD ready configuration
- PEP8 code compliance
- Test isolation and cleanup mechanisms
- Parallel execution support

---

## 🚀 Enterprise Features

### 1. Advanced Debugging Capabilities

#### Automatic Failure Artifact Capture
When a test fails, the framework **automatically captures**:

```python
artifacts/
├── screenshots/
│   ├── TC-SYS-001_20250109_143025.png      # Failure screenshot
│   └── TC-SYS-001_20250109_143025.html     # Page HTML source
├── logs/
│   ├── TC-SYS-001_20250109_143025_browser.log  # Browser console logs
│   └── TC-SYS-001_20250109_143025_info.json    # Page state snapshot
└── videos/ (optional)
    └── TC-SYS-001_20250109_143025.mp4      # Test execution video
```

#### Multi-Level Logging

```python
# Example log output
2025-01-09 14:30:25 [INFO] [TestLogger] ======================================
2025-01-09 14:30:25 [INFO] [TestLogger] TEST STARTED: TC-SYS-001 - test_kernel_version
2025-01-09 14:30:25 [INFO] [TestLogger] Description: Verify kernel version display
2025-01-09 14:30:25 [INFO] [TestLogger] ======================================
2025-01-09 14:30:26 [INFO] [SystemUpdatePage] Step 1: Navigate to System Updates page
2025-01-09 14:30:27 [INFO] [SystemUpdatePage] ✓ Switched to frame: right
2025-01-09 14:30:28 [INFO] [SystemUpdatePage] ✓ Kernel version extracted: 5.14.0-427.24.1.el9_4.x86_64
2025-01-09 14:30:28 [INFO] [TestLogger] ✓ PASS - Kernel version: 5.14.0-427.24.1.el9_4.x86_64
2025-01-09 14:30:28 [INFO] [TestLogger] ======================================
2025-01-09 14:30:28 [INFO] [TestLogger] TEST PASSED: test_kernel_version
2025-01-09 14:30:28 [INFO] [TestLogger] Duration: 3.25s
2025-01-09 14:30:28 [INFO] [TestLogger] ======================================
```

### 2. Enterprise Test Standards

#### Comprehensive Documentation

Every test case includes:
- **Test Case ID**: Unique identifier (e.g., TC-SYS-001)
- **Priority Level**: P0 (Critical), P1 (High), P2 (Medium), P3 (Low)
- **Category Tags**: @smoke, @regression, @ui, @backend
- **Allure Annotations**: Epic, Feature, Story, Severity
- **Requirements Traceability**: Links to requirements (REQ-SYS-XXX)
- **Detailed Docstrings**: Google style with Args, Returns, Raises

#### Example Test Structure

```python
@allure.epic("IWSVA System Verification")
@allure.feature("System Updates Page")
@allure.story("TC-SYS-001: Page Display and Navigation")
@allure.severity(allure.severity_level.CRITICAL)
@allure.testcase("TC-SYS-001-01", "Page Load Verification")
@pytest.mark.smoke
@pytest.mark.ui
@pytest.mark.P0
def test_page_load_and_title(self, driver, system_update_page):
    """
    TC-SYS-001 Test 1: Verify System Updates page loads with correct title.

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

    Args:
        driver: WebDriver instance
        system_update_page: System Update page object

    Raises:
        AssertionError: If any verification fails
    """
    # Test implementation...
```

---

## 📁 Project Structure

```
selenium-tests/
├── config/                          # Configuration management
│   ├── __init__.py
│   ├── test_config.py              # Centralized test configuration
│   └── logging_config.py           # Logging configuration
│
├── helpers/                         # Utility modules
│   ├── __init__.py
│   ├── logger.py                   # Enterprise logging system
│   ├── debug_helper.py             # Debug artifact capture
│   ├── ssh_helper.py               # SSH operations (Paramiko)
│   └── video_recorder.py           # Test execution recording
│
├── pages/                           # Page Object Model
│   ├── __init__.py
│   ├── base_page.py                # Base page class
│   ├── login_page.py               # Login page
│   └── system_update_page.py       # System Updates page
│
├── verification/                    # Verification modules
│   ├── __init__.py
│   ├── backend_verification.py     # SSH-based backend checks
│   ├── ui_verification.py          # UI-level verification
│   └── log_verification.py         # Log file verification
│
├── tests/                           # Test specifications
│   ├── __init__.py
│   ├── conftest.py                 # Pytest fixtures and hooks
│   └── test_system_updates_enterprise.py  # Enterprise test suite
│
├── fixtures/                        # Test data
│   ├── test_data.json
│   └── credentials.json.example
│
├── reports/                         # Test reports (auto-generated)
│   ├── allure-results/             # Allure raw data
│   ├── allure-report/              # Allure HTML report
│   ├── report.html                 # Pytest HTML report
│   └── report.json                 # JSON report for CI/CD
│
├── screenshots/                     # Screenshots (auto-generated)
│   ├── TC-SYS-001_20250109_143025.png
│   └── TC-SYS-001_20250109_143025.html
│
├── logs/                            # Log files (auto-generated)
│   ├── test_20250109.log           # Daily log file (rotated)
│   └── pytest.log                  # Pytest execution log
│
├── videos/                          # Test execution videos (optional)
│
├── .env.example                     # Environment variables template
├── .gitignore                       # Git ignore rules
├── pytest.ini                       # Pytest configuration
├── requirements.txt                 # Python dependencies
└── README.md                        # This file
```

---

## ⚡ Quick Start

### 1. Prerequisites

- **Python 3.8+** installed
- **Chrome/Firefox** browser installed
- **IWSVA server** accessible
- **SSH access** to IWSVA (for backend verification)

### 2. Installation

```bash
# Clone repository
cd selenium-tests

# Create virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your credentials and server details
```

### 3. Configuration

Create `.env` file with your configuration:

```bash
# Application Configuration
BASE_URL=https://10.206.201.9:8443
USERNAME=admin
PASSWORD=your_password

# SSH Configuration (for backend verification)
SSH_HOST=10.206.201.9
SSH_PORT=22
SSH_USERNAME=root
SSH_PASSWORD=your_ssh_password

# Browser Configuration
BROWSER=chrome
HEADLESS=false
BROWSER_WIDTH=1920
BROWSER_HEIGHT=1080

# Test Configuration
TARGET_KERNEL_VERSION=5.14.0-427.24.1.el9_4.x86_64
MAX_RETRIES=2
LOG_LEVEL=INFO

# Optional: Video Recording
ENABLE_VIDEO=false
```

### 4. Run Tests

```bash
# Run all tests
pytest tests/ -v

# Run specific test file
pytest tests/test_system_updates_enterprise.py -v

# Run with specific markers
pytest -m smoke -v           # Smoke tests only
pytest -m "P0 and ui" -v     # P0 UI tests only

# Run with Allure report
pytest --alluredir=reports/allure-results
allure serve reports/allure-results
```

---

## 🔧 Configuration

### pytest.ini

Key configuration options:

```ini
[pytest]
# Markers for test categorization
markers =
    smoke: Smoke tests for critical functionality
    regression: Regression tests for all features
    ui: UI-level tests
    backend: Backend verification tests
    P0: Priority 0 - Critical tests

# Automatic features
addopts =
    --verbose
    --html=reports/report.html
    --alluredir=reports/allure-results
    --reruns=2                    # Retry failed tests 2 times
    --reruns-delay=1              # Wait 1 second between retries

# Timeout
timeout = 300  # 5 minutes per test
```

### TestConfig

Centralized configuration in `config/test_config.py`:

```python
from config.test_config import TestConfig

# Access configuration
print(TestConfig.BASE_URL)
print(TestConfig.TARGET_KERNEL_VERSION)
print(TestConfig.SSH_CONFIG)

# Validate configuration
TestConfig.validate_config()
```

---

## 🏃 Running Tests

### Basic Execution

```bash
# Run all tests
pytest

# Run with verbose output
pytest -v

# Run specific test class
pytest tests/test_system_updates_enterprise.py::TestSystemUpdatesEnterprise

# Run specific test method
pytest tests/test_system_updates_enterprise.py::TestSystemUpdatesEnterprise::test_page_load_and_title
```

### Filter by Markers

```bash
# Run smoke tests
pytest -m smoke

# Run UI tests only
pytest -m ui

# Run P0 priority tests
pytest -m P0

# Combine markers
pytest -m "smoke and ui"
pytest -m "P0 or P1"
pytest -m "smoke and not backend"
```

### Parallel Execution

```bash
# Run tests in parallel (4 workers)
pytest -n 4

# Run tests in parallel (auto-detect CPU count)
pytest -n auto
```

### Custom Options

```bash
# Run in headless mode
HEADLESS=true pytest

# Use Firefox instead of Chrome
BROWSER=firefox pytest

# Increase log verbosity
LOG_LEVEL=DEBUG pytest

# Enable video recording
ENABLE_VIDEO=true pytest
```

---

## 📊 Test Reports

### 1. HTML Report (Pytest-HTML)

**Location**: `reports/report.html`

```bash
pytest --html=reports/report.html --self-contained-html
```

Open `reports/report.html` in browser to view:
- Test execution summary
- Pass/Fail statistics
- Test duration
- Captured logs and screenshots

### 2. Allure Report (Recommended)

**Location**: `reports/allure-report/`

```bash
# Generate Allure results
pytest --alluredir=reports/allure-results

# Generate and serve Allure report
allure serve reports/allure-results

# Generate static HTML report
allure generate reports/allure-results -o reports/allure-report --clean
```

Allure report includes:
- 📊 **Dashboards**: Overview, trends, categories
- 📝 **Test cases**: Detailed steps, attachments, logs
- 📈 **Graphs**: Duration, severity, features
- 🔍 **Traceability**: Requirements mapping
- 📸 **Screenshots**: Embedded in test steps

### 3. JSON Report (CI/CD)

**Location**: `reports/report.json`

```bash
pytest --json-report --json-report-file=reports/report.json
```

Parseable JSON for CI/CD integration.

---

## 🐛 Debugging

### Automatic Failure Capture

When a test fails, the framework automatically captures:

1. **Screenshot** (PNG)
2. **HTML source code** (HTML)
3. **Browser console logs** (LOG)
4. **Page state information** (JSON)

All artifacts are saved with timestamp in `screenshots/` directory.

### Manual Debugging

```python
from helpers.debug_helper import DebugHelper

# Capture screenshot manually
DebugHelper.capture_screenshot(driver, "my_checkpoint")

# Save page source
DebugHelper.save_page_source(driver, "error_state")

# Capture full failure artifacts
DebugHelper.capture_failure_artifacts(
    driver,
    "test_name",
    "TC-XXX-XX",
    exception
)
```

### Debug Context Manager

```python
from helpers.debug_helper import DebugContext

with DebugContext(driver, "login_flow", capture_screenshot=True) as debug:
    driver.find_element(By.ID, 'username').send_keys('admin')
    debug.checkpoint("Username entered")

    driver.find_element(By.ID, 'password').send_keys('password')
    debug.checkpoint("Password entered")

    driver.find_element(By.ID, 'submit').click()
    debug.checkpoint("Login submitted")
```

### Viewing Logs

```bash
# Real-time log monitoring
tail -f logs/test_$(date +%Y%m%d).log

# View Pytest log
cat logs/pytest.log

# View browser logs
cat screenshots/*_browser.log
```

---

## 📚 Best Practices

### 1. Test Structure

✅ **DO**: Follow AAA pattern (Arrange, Act, Assert)

```python
def test_example(self, driver):
    # Arrange
    TestLogger.log_step("Setup test data")

    # Act
    TestLogger.log_step("Perform action")

    # Assert
    TestLogger.log_step("Verify results")
```

### 2. Logging

✅ **DO**: Log every important step

```python
TestLogger.log_step("Navigate to login page")
TestLogger.log_verification("Username", "admin", actual_username, True)
TestLogger.log_performance("Page load", duration, threshold=5.0)
```

### 3. Error Handling

✅ **DO**: Use try-finally for cleanup

```python
try:
    self.switch_to_frame(driver, 'right')
    content = driver.find_element(By.TAG_NAME, 'body').text
finally:
    driver.switch_to.default_content()
```

### 4. Page Object Model

✅ **DO**: Use page objects, not direct driver calls in tests

```python
# Good
system_update_page.navigate()
system_update_page.get_kernel_version()

# Bad
driver.find_element(By.ID, 'kernel_version').text
```

---

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
name: Selenium Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.9'

      - name: Install dependencies
        run: |
          pip install -r requirements.txt

      - name: Run tests
        run: |
          pytest tests/ -v --html=reports/report.html --alluredir=reports/allure-results
        env:
          BASE_URL: ${{ secrets.BASE_URL }}
          USERNAME: ${{ secrets.USERNAME }}
          PASSWORD: ${{ secrets.PASSWORD }}

      - name: Upload Allure results
        uses: actions/upload-artifact@v3
        with:
          name: allure-results
          path: reports/allure-results

      - name: Publish Allure report
        uses: simple-elf/allure-report-action@master
        if: always()
        with:
          allure_results: reports/allure-results
          allure_report: allure-report
```

---

## 📞 Support

For questions or issues:
- Create an issue in the repository
- Contact: QA Automation Team
- Documentation: See `/docs` directory

---

## 📄 License

MIT License - See LICENSE file for details

---

**Built with ❤️ by QA Automation Team**
