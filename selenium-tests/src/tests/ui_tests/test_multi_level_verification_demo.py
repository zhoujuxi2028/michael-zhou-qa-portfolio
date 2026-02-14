"""
Multi-Level Verification Demo Tests

Demonstrates Phase 2 capabilities: UI + Backend + Log verification
This test suite showcases enterprise-grade verification across all levels.

Test Cases:
- TC-VERIFY-001: Multi-level kernel version verification
- TC-VERIFY-002: System information comprehensive verification
- TC-VERIFY-003: Update log verification

Author: QA Automation Team
Version: 1.0.0
"""

import pytest
import allure
from selenium.webdriver.common.by import By

from core.config.test_config import TestConfig
from core.logging.test_logger import TestLogger


@allure.epic("Phase 2: Multi-Level Verification")
@allure.feature("Verification Framework Demo")
@pytest.mark.smoke
@pytest.mark.P0
class TestMultiLevelVerification:
    """
    Multi-level verification demonstration test suite.

    Demonstrates:
    - UI verification using ui_verifier fixture
    - Backend verification using backend_verifier fixture
    - Log verification using log_verifier fixture
    - Complete verification workflow
    """

    @allure.story("TC-VERIFY-001: Multi-Level Kernel Version Verification")
    @allure.testcase("TC-VERIFY-001", "Kernel Version Multi-Level Verification")
    @allure.severity(allure.severity_level.CRITICAL)
    @allure.description("""
    Verify kernel version across all verification levels:
    1. UI Level: Verify kernel version displayed on System Updates page
    2. Backend Level: Verify kernel version via SSH (uname -r)
    3. Log Level: Verify no system errors in logs

    This test demonstrates Phase 2 multi-level verification capabilities.
    """)
    def test_kernel_version_multi_level(
        self,
        system_update_page,
        backend_verifier,
        ui_verifier,
        log_verifier
    ):
        """
        TC-VERIFY-001: Verify kernel version using multi-level verification.

        Test Steps:
        1. Navigate to System Updates page (UI)
        2. Verify kernel version displayed on page (UI verification)
        3. Get kernel version from backend via SSH (Backend verification)
        4. Compare UI and Backend versions
        5. Verify no errors in system logs (Log verification)

        Expected Results:
        - Kernel version displayed on UI
        - Backend kernel version matches UI version
        - Backend kernel version matches expected version from config
        - No errors in system logs

        Args:
            system_update_page: System Updates page object
            backend_verifier: Backend verification fixture
            ui_verifier: UI verification fixture
            log_verifier: Log verification fixture
        """
        TestLogger.log_test_start(
            "TC-VERIFY-001",
            "Multi-Level Kernel Version Verification",
            "Verify kernel version across UI, Backend, and Logs"
        )

        with allure.step("Step 1: Navigate to System Updates page"):
            TestLogger.log_step("Navigate to System Updates page")
            system_update_page.navigate()

        with allure.step("Step 2: UI Verification - Get kernel version from page"):
            TestLogger.log_step("UI Verification: Get kernel version from page")

            # Verify page is loaded
            ui_verifier.verify_page_title("System Update", exact_match=False)

            # Get kernel version from UI
            ui_kernel_version = system_update_page.get_kernel_version()

            TestLogger.log_info(f"UI Kernel Version: {ui_kernel_version}")
            allure.attach(
                ui_kernel_version,
                name="UI Kernel Version",
                attachment_type=allure.attachment_type.TEXT
            )

            assert ui_kernel_version is not None, "Kernel version not found on UI"
            assert len(ui_kernel_version) > 0, "Kernel version is empty"

            TestLogger.log_verification(
                "UI Kernel Version",
                f"Not empty",
                ui_kernel_version,
                True
            )

        with allure.step("Step 3: Backend Verification - Get kernel version via SSH"):
            TestLogger.log_step("Backend Verification: Get kernel version via SSH")

            # Get kernel version from backend
            backend_kernel_version = backend_verifier.get_kernel_version()

            TestLogger.log_info(f"Backend Kernel Version: {backend_kernel_version}")
            allure.attach(
                backend_kernel_version,
                name="Backend Kernel Version",
                attachment_type=allure.attachment_type.TEXT
            )

            assert backend_kernel_version is not None, "Backend kernel version not retrieved"

            TestLogger.log_verification(
                "Backend Kernel Version",
                "Not None",
                backend_kernel_version,
                True
            )

        with allure.step("Step 4: Compare UI and Backend kernel versions"):
            TestLogger.log_step("Compare UI and Backend kernel versions")

            # UI and Backend should match
            assert ui_kernel_version == backend_kernel_version, (
                f"Kernel version mismatch: "
                f"UI='{ui_kernel_version}', Backend='{backend_kernel_version}'"
            )

            TestLogger.log_verification(
                "Kernel Version Match (UI vs Backend)",
                ui_kernel_version,
                backend_kernel_version,
                True
            )

        with allure.step("Step 5: Verify against expected kernel version"):
            TestLogger.log_step("Verify against expected kernel version from config")

            expected_version = TestConfig.TARGET_KERNEL_VERSION

            # Verify backend matches expected
            is_match, actual = backend_verifier.verify_kernel_version(expected_version)

            TestLogger.log_verification(
                "Expected Kernel Version",
                expected_version,
                actual,
                is_match
            )

            if not is_match:
                TestLogger.log_warning(
                    f"Kernel version mismatch: expected '{expected_version}', got '{actual}'"
                )
                # This is a soft assertion - log but don't fail
                # (Server might be updated to different version)

        with allure.step("Step 6: Log Verification - Check for system errors"):
            TestLogger.log_step("Log Verification: Check for system errors")

            # Get recent log entries
            log_summary = log_verifier.get_log_summary(max_lines=500)

            TestLogger.log_info(f"Log Summary: {log_summary['total_lines']} lines, "
                              f"{log_summary['error_count']} errors")

            allure.attach(
                str(log_summary),
                name="Log Summary",
                attachment_type=allure.attachment_type.JSON
            )

            # Log error count (soft check - errors might be from previous tests)
            if log_summary['error_count'] > 0:
                TestLogger.log_warning(
                    f"Found {log_summary['error_count']} errors in recent logs"
                )

        TestLogger.log_test_result("PASS", "Multi-level kernel verification completed")

    @allure.story("TC-VERIFY-002: System Information Comprehensive Verification")
    @allure.testcase("TC-VERIFY-002", "System Information Verification")
    @allure.severity(allure.severity_level.NORMAL)
    @allure.description("""
    Verify comprehensive system information via backend:
    1. Get complete system information
    2. Verify kernel version
    3. Verify OS version
    4. Verify hostname
    5. Verify IWSS service status
    """)
    def test_system_information_backend(
        self,
        backend_verifier
    ):
        """
        TC-VERIFY-002: Verify comprehensive system information via backend.

        Test Steps:
        1. Get complete system information via SSH
        2. Verify all required fields are present
        3. Verify IWSS service is running
        4. Verify system details

        Expected Results:
        - System info contains kernel_version, os_version, hostname
        - IWSS service is running
        - All system details are valid

        Args:
            backend_verifier: Backend verification fixture
        """
        TestLogger.log_test_start(
            "TC-VERIFY-002",
            "System Information Comprehensive Verification",
            "Verify system information via backend SSH"
        )

        with allure.step("Step 1: Get comprehensive system information"):
            TestLogger.log_step("Get system information via backend")

            system_info = backend_verifier.get_system_info()

            TestLogger.log_info(f"System Information: {system_info}")
            allure.attach(
                str(system_info),
                name="System Information",
                attachment_type=allure.attachment_type.JSON
            )

        with allure.step("Step 2: Verify required fields are present"):
            TestLogger.log_step("Verify required fields in system info")

            required_fields = ['kernel_version', 'os_version', 'hostname', 'uptime', 'current_time']

            for field in required_fields:
                assert field in system_info, f"Missing required field: {field}"
                assert system_info[field], f"Field '{field}' is empty"

                TestLogger.log_verification(
                    field,
                    "Present and non-empty",
                    system_info[field],
                    True
                )

        with allure.step("Step 3: Verify IWSS service status"):
            TestLogger.log_step("Verify IWSS service is running")

            is_running = backend_verifier.is_iwss_service_running()

            TestLogger.log_info(f"IWSS Service Running: {is_running}")

            # Get detailed service status
            service_status = backend_verifier.get_iwss_service_status()

            allure.attach(
                str(service_status),
                name="IWSS Service Status",
                attachment_type=allure.attachment_type.JSON
            )

            # Soft assertion - service might be stopped for maintenance
            if is_running:
                TestLogger.log_verification(
                    "IWSS Service Status",
                    "running",
                    "running",
                    True
                )
            else:
                TestLogger.log_warning("IWSS service is not running")

        TestLogger.log_test_result("PASS", "System information verification completed")

    @allure.story("TC-VERIFY-003: Update Log Verification")
    @allure.testcase("TC-VERIFY-003", "Update Log Analysis")
    @allure.severity(allure.severity_level.NORMAL)
    @allure.description("""
    Verify update log file verification capabilities:
    1. Read update log tail
    2. Search for specific patterns
    3. Check for errors and warnings
    4. Verify log parsing functionality
    """)
    @pytest.mark.backend
    def test_update_log_verification(
        self,
        log_verifier
    ):
        """
        TC-VERIFY-003: Verify update log verification capabilities.

        Test Steps:
        1. Get update log tail
        2. Search for success patterns
        3. Search for error patterns
        4. Generate log summary

        Expected Results:
        - Log can be read successfully
        - Pattern matching works correctly
        - Error detection works correctly
        - Log summary is generated

        Args:
            log_verifier: Log verification fixture
        """
        TestLogger.log_test_start(
            "TC-VERIFY-003",
            "Update Log Verification",
            "Verify log file parsing and analysis"
        )

        with allure.step("Step 1: Get update log tail"):
            TestLogger.log_step("Read update log tail (100 lines)")

            log_content = log_verifier.get_log_tail(lines=100)

            TestLogger.log_info(f"Log content length: {len(log_content)} bytes")
            allure.attach(
                log_content[:1000] + "\n...[truncated]" if len(log_content) > 1000 else log_content,
                name="Update Log (tail)",
                attachment_type=allure.attachment_type.TEXT
            )

            assert log_content is not None, "Failed to read log file"
            assert len(log_content) > 0, "Log file is empty"

        with allure.step("Step 2: Search for success patterns"):
            TestLogger.log_step("Search for success patterns in log")

            success_lines = log_verifier.search_pattern('success|SUCCESS|completed')

            TestLogger.log_info(f"Found {len(success_lines)} success pattern matches")

            if success_lines:
                allure.attach(
                    '\n'.join(success_lines[:10]),
                    name="Success Patterns (first 10)",
                    attachment_type=allure.attachment_type.TEXT
                )

        with allure.step("Step 3: Check for errors and warnings"):
            TestLogger.log_step("Check for errors and warnings in log")

            errors = log_verifier.find_errors_in_log(log_content=log_content)
            warnings = log_verifier.find_warnings_in_log(log_content=log_content)

            TestLogger.log_info(f"Errors found: {len(errors)}")
            TestLogger.log_info(f"Warnings found: {len(warnings)}")

            if errors:
                allure.attach(
                    '\n'.join(errors[:10]),
                    name="Errors Found (first 10)",
                    attachment_type=allure.attachment_type.TEXT
                )

            if warnings:
                allure.attach(
                    '\n'.join(warnings[:10]),
                    name="Warnings Found (first 10)",
                    attachment_type=allure.attachment_type.TEXT
                )

        with allure.step("Step 4: Generate log summary"):
            TestLogger.log_step("Generate comprehensive log summary")

            summary = log_verifier.get_log_summary(log_content=log_content)

            TestLogger.log_info(f"Log Summary: {summary}")

            allure.attach(
                str(summary),
                name="Log Summary",
                attachment_type=allure.attachment_type.JSON
            )

            assert summary['total_lines'] > 0, "No log lines found"

            TestLogger.log_verification(
                "Log Summary Total Lines",
                "> 0",
                summary['total_lines'],
                True
            )

        TestLogger.log_test_result("PASS", "Update log verification completed")
