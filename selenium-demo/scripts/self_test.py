#!/usr/bin/env python3
"""
Selenium Tests Framework Self-Test Script

Validates the framework installation, configuration, and module imports.
Performs smoke tests without requiring a running IWSVA server.

Author: QA Automation Team
Version: 1.0.0
"""

import sys
import os
from pathlib import Path

# Add src to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root / "src"))

print("=" * 80)
print("SELENIUM TESTS FRAMEWORK SELF-TEST")
print("=" * 80)
print()

# Test counters
tests_run = 0
tests_passed = 0
tests_failed = 0
failures = []


def test(name):
    """Decorator for test functions."""
    def decorator(func):
        def wrapper():
            global tests_run, tests_passed, tests_failed
            tests_run += 1
            print(f"Test {tests_run}: {name}...", end=" ")
            try:
                func()
                print("✅ PASS")
                tests_passed += 1
                return True
            except Exception as e:
                print(f"❌ FAIL: {e}")
                tests_failed += 1
                failures.append(f"{name}: {e}")
                return False
        return wrapper
    return decorator


# ==================== Phase 1 Tests ====================

@test("Phase 1: Core configuration imports")
def test_phase1_config():
    from core.config.test_config import TestConfig
    assert hasattr(TestConfig, 'BASE_URL')
    assert hasattr(TestConfig, 'SSH_CONFIG')
    assert hasattr(TestConfig, 'BACKEND_PATHS')


@test("Phase 1: Logging system imports")
def test_phase1_logging():
    from core.logging.test_logger import TestLogger, get_logger
    logger = get_logger(__name__)
    assert logger is not None


@test("Phase 1: Debug helper imports")
def test_phase1_debug():
    from core.debugging.debug_helper import DebugHelper, DebugContext
    assert hasattr(DebugHelper, 'capture_screenshot')


@test("Phase 1: Page objects import")
def test_phase1_pages():
    from frameworks.pages.base_page import BasePage
    from frameworks.pages.login_page import LoginPage
    from frameworks.pages.system_update_page import SystemUpdatePage
    assert hasattr(BasePage, 'find_element')
    assert hasattr(LoginPage, 'login')
    assert hasattr(SystemUpdatePage, 'get_kernel_version')


# ==================== Phase 2 Tests ====================

@test("Phase 2: SSH helper imports")
def test_phase2_ssh():
    from core.helpers.ssh_helper import SSHHelper, create_ssh_helper
    assert hasattr(SSHHelper, 'connect')
    assert hasattr(SSHHelper, 'execute_command')


@test("Phase 2: Backend verification imports")
def test_phase2_backend():
    from frameworks.verification.backend_verification import BackendVerification
    assert hasattr(BackendVerification, 'get_kernel_version')
    assert hasattr(BackendVerification, 'verify_component_version')
    assert len(BackendVerification.COMPONENT_INI_KEYS) == 9


@test("Phase 2: UI verification imports")
def test_phase2_ui():
    from frameworks.verification.ui_verification import UIVerification
    assert hasattr(UIVerification, 'verify_element_visible')
    assert hasattr(UIVerification, 'verify_text_present')


@test("Phase 2: Log verification imports")
def test_phase2_log():
    from frameworks.verification.log_verification import LogVerification
    assert hasattr(LogVerification, 'verify_update_success')
    assert hasattr(LogVerification, 'find_errors_in_log')
    assert 'update_started' in LogVerification.PATTERNS


@test("Phase 2: Verification package exports")
def test_phase2_package():
    from frameworks.verification import BackendVerification, UIVerification, LogVerification
    assert BackendVerification is not None


# ==================== Phase 3 Tests ====================

@test("Phase 3: UpdateWorkflow imports")
def test_phase3_update():
    from frameworks.workflows.update_workflow import UpdateWorkflow
    assert hasattr(UpdateWorkflow, 'execute_normal_update')
    assert hasattr(UpdateWorkflow, 'execute_forced_update')
    assert hasattr(UpdateWorkflow, 'execute_update_all')
    assert len(UpdateWorkflow.UPDATE_TIMEOUTS) == 9


@test("Phase 3: RollbackWorkflow imports")
def test_phase3_rollback():
    from frameworks.workflows.rollback_workflow import RollbackWorkflow
    assert hasattr(RollbackWorkflow, 'execute_rollback')
    assert hasattr(RollbackWorkflow, 'can_rollback')
    assert RollbackWorkflow.ROLLBACK_SUPPORTED['PTN'] is True
    assert RollbackWorkflow.ROLLBACK_SUPPORTED['TMUFEENG'] is False


@test("Phase 3: VerificationWorkflow imports")
def test_phase3_verification():
    from frameworks.workflows.verification_workflow import VerificationWorkflow
    assert hasattr(VerificationWorkflow, 'verify_component_state')
    assert hasattr(VerificationWorkflow, 'verify_system_health')


@test("Phase 3: SetupWorkflow imports")
def test_phase3_setup():
    from frameworks.workflows.setup_workflow import SetupWorkflow
    assert hasattr(SetupWorkflow, 'validate_test_environment')
    assert hasattr(SetupWorkflow, 'create_version_snapshot')


@test("Phase 3: Workflows package exports")
def test_phase3_package():
    from frameworks.workflows import (
        UpdateWorkflow,
        RollbackWorkflow,
        VerificationWorkflow,
        SetupWorkflow
    )
    assert UpdateWorkflow is not None


# ==================== Configuration Tests ====================

@test("Configuration: Environment variables")
def test_config_env():
    from core.config.test_config import TestConfig
    # Check that config values exist (don't validate actual values)
    assert TestConfig.BASE_URL is not None
    assert TestConfig.USERNAME is not None
    assert TestConfig.BROWSER in ['chrome', 'firefox', 'edge']


@test("Configuration: Directory paths")
def test_config_paths():
    from core.config.test_config import REPORTS_DIR, SCREENSHOTS_DIR, LOGS_DIR
    assert REPORTS_DIR.exists()
    assert SCREENSHOTS_DIR.exists()
    assert LOGS_DIR.exists()


@test("Configuration: Backend paths")
def test_config_backend():
    from core.config.test_config import TestConfig
    assert 'ini_file' in TestConfig.BACKEND_PATHS
    assert 'backup_dir' in TestConfig.BACKEND_PATHS
    assert 'log_dir' in TestConfig.BACKEND_PATHS


# ==================== Dependency Tests ====================

@test("Dependencies: pytest installed")
def test_dep_pytest():
    import pytest
    assert pytest is not None


@test("Dependencies: selenium installed")
def test_dep_selenium():
    from selenium import webdriver
    from selenium.webdriver.common.by import By
    assert webdriver is not None
    assert By.ID is not None


@test("Dependencies: paramiko installed")
def test_dep_paramiko():
    import paramiko
    assert hasattr(paramiko, 'SSHClient')


@test("Dependencies: allure-pytest installed")
def test_dep_allure():
    import allure
    import allure_pytest
    assert allure is not None


@test("Dependencies: python-dotenv installed")
def test_dep_dotenv():
    from dotenv import load_dotenv
    assert load_dotenv is not None


# ==================== File Structure Tests ====================

@test("File structure: Core modules exist")
def test_structure_core():
    assert (project_root / "src" / "core" / "config").is_dir()
    assert (project_root / "src" / "core" / "logging").is_dir()
    assert (project_root / "src" / "core" / "debugging").is_dir()
    assert (project_root / "src" / "core" / "helpers").is_dir()


@test("File structure: Frameworks modules exist")
def test_structure_frameworks():
    assert (project_root / "src" / "frameworks" / "pages").is_dir()
    assert (project_root / "src" / "frameworks" / "verification").is_dir()
    assert (project_root / "src" / "frameworks" / "workflows").is_dir()


@test("File structure: Tests directory exists")
def test_structure_tests():
    assert (project_root / "src" / "tests").is_dir()
    assert (project_root / "src" / "tests" / "conftest.py").is_file()


@test("File structure: Documentation exists")
def test_structure_docs():
    assert (project_root / "README.md").is_file()
    assert (project_root / "PHASE_2_IMPLEMENTATION.md").is_file()
    assert (project_root / "PHASE_3_IMPLEMENTATION.md").is_file()


# ==================== Component Registry Tests ====================

@test("Component Registry: All 9 components defined")
def test_components_count():
    from frameworks.verification.backend_verification import BackendVerification
    assert len(BackendVerification.COMPONENT_INI_KEYS) == 9
    assert len(BackendVerification.LOCK_FILE_PATHS) == 9


@test("Component Registry: Patterns defined")
def test_components_patterns():
    from frameworks.verification.backend_verification import BackendVerification
    patterns = ['PTN', 'SPYWARE', 'BOT', 'ITP', 'ITE', 'ICRCAGENT']
    for pattern in patterns:
        assert pattern in BackendVerification.COMPONENT_INI_KEYS


@test("Component Registry: Engines defined")
def test_components_engines():
    from frameworks.verification.backend_verification import BackendVerification
    engines = ['ENG', 'ATSEENG', 'TMUFEENG']
    for engine in engines:
        assert engine in BackendVerification.COMPONENT_INI_KEYS


# ==================== Run All Tests ====================

# Run all test functions
if __name__ == "__main__":
    print("Running framework validation tests...\n")

    # Get all test functions
    test_functions = [
        test_phase1_config,
        test_phase1_logging,
        test_phase1_debug,
        test_phase1_pages,
        test_phase2_ssh,
        test_phase2_backend,
        test_phase2_ui,
        test_phase2_log,
        test_phase2_package,
        test_phase3_update,
        test_phase3_rollback,
        test_phase3_verification,
        test_phase3_setup,
        test_phase3_package,
        test_config_env,
        test_config_paths,
        test_config_backend,
        test_dep_pytest,
        test_dep_selenium,
        test_dep_paramiko,
        test_dep_allure,
        test_dep_dotenv,
        test_structure_core,
        test_structure_frameworks,
        test_structure_tests,
        test_structure_docs,
        test_components_count,
        test_components_patterns,
        test_components_engines,
    ]

    # Execute all tests
    for test_func in test_functions:
        test_func()

    # Print summary
    print()
    print("=" * 80)
    print("SELF-TEST SUMMARY")
    print("=" * 80)
    print(f"Total Tests: {tests_run}")
    print(f"Passed: {tests_passed} ✅")
    print(f"Failed: {tests_failed} ❌")
    print()

    if tests_failed > 0:
        print("FAILURES:")
        for i, failure in enumerate(failures, 1):
            print(f"  {i}. {failure}")
        print()
        print("❌ SELF-TEST FAILED")
        sys.exit(1)
    else:
        print("✅ ALL TESTS PASSED - Framework is healthy!")
        print()
        print("Framework Status:")
        print("  - Phase 1 (Core Infrastructure): ✅ Validated")
        print("  - Phase 2 (Verification Layer): ✅ Validated")
        print("  - Phase 3 (Workflow Layer): ✅ Validated")
        print("  - Dependencies: ✅ Validated")
        print("  - File Structure: ✅ Validated")
        print()
        print("The framework is ready for testing!")
        sys.exit(0)
