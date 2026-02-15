# Phase 2 Quick Start Guide

## 🚀 What's New in Phase 2?

**Multi-Level Verification Framework** - Verify test results across UI, Backend (SSH), and Log levels.

---

## ⚡ Quick Usage Examples

### Example 1: Basic Multi-Level Verification

```python
def test_kernel_version(backend_verifier, ui_verifier, system_update_page):
    # UI Level
    ui_version = system_update_page.get_kernel_version()

    # Backend Level
    backend_version = backend_verifier.get_kernel_version()

    # Verify they match
    assert ui_version == backend_version
```

### Example 2: Component Update Verification

```python
def test_ptn_update(backend_verifier, log_verifier):
    # Get initial version
    initial = backend_verifier.get_component_version_from_ini('PTN')

    # ... trigger update ...

    # Wait for update completion
    backend_verifier.wait_for_lock_file_removal('PTN', timeout=600)

    # Verify new version
    new_version = backend_verifier.get_component_version_from_ini('PTN')
    assert new_version != initial

    # Verify in logs
    success, lines = log_verifier.verify_update_success('PTN')
    assert success
```

### Example 3: Log Analysis

```python
def test_no_errors(log_verifier):
    # Get recent logs
    summary = log_verifier.get_log_summary(max_lines=1000)

    # Verify no errors
    assert summary['error_count'] == 0, f"Errors: {summary['errors']}"
```

---

## 🔧 Configuration

### 1. Update `.env` File

Add SSH credentials:

```bash
# SSH Configuration (for backend verification)
SSH_HOST=10.206.201.9
SSH_PORT=22
SSH_USERNAME=root
SSH_PASSWORD=your_ssh_password
```

### 2. Verify Configuration

```bash
cd selenium-tests
python -c "from src.core.config.test_config import TestConfig; print(TestConfig.SSH_CONFIG)"
```

---

## 🏃 Running Tests

### Run Phase 2 Demo Tests

```bash
# All Phase 2 demo tests
pytest src/tests/ui_tests/test_multi_level_verification_demo.py -v

# Single test
pytest src/tests/ui_tests/test_multi_level_verification_demo.py::TestMultiLevelVerification::test_kernel_version_multi_level -v

# With Allure report
pytest src/tests/ui_tests/test_multi_level_verification_demo.py --alluredir=outputs/reports/allure-results
allure serve outputs/reports/allure-results
```

### Run Backend Tests Only

```bash
pytest -m backend -v
```

---

## 📚 Available Fixtures

| Fixture | Scope | Description |
|---------|-------|-------------|
| `ssh_helper` | session | SSH connection (shared across tests) |
| `backend_verifier` | function | Backend verification via SSH |
| `ui_verifier` | function | UI-level verification |
| `log_verifier` | function | Log file verification |

---

## 🎓 Key Classes & Methods

### BackendVerification

```python
# Kernel
backend_verifier.get_kernel_version()
backend_verifier.verify_kernel_version(expected)

# Components (PTN, ENG, SPYWARE, etc.)
backend_verifier.get_component_version_from_ini('PTN')
backend_verifier.verify_component_version('PTN', '1.2.3')

# Lock files (update progress)
backend_verifier.check_lock_file_exists('PTN')
backend_verifier.wait_for_lock_file_removal('PTN', timeout=600)

# Service status
backend_verifier.is_iwss_service_running()
backend_verifier.get_system_info()
```

### UIVerification

```python
# Element visibility
ui_verifier.verify_element_visible((By.ID, 'submit'))
ui_verifier.verify_element_not_visible((By.ID, 'error'))

# Text verification
ui_verifier.verify_text_present('Welcome')
ui_verifier.verify_text_equals((By.ID, 'title'), 'System Update')

# Page state
ui_verifier.verify_page_title('System Update')
ui_verifier.verify_url_contains('system_update.jsp')
```

### LogVerification

```python
# Log reading
log_verifier.get_log_tail(lines=100)

# Pattern search
errors = log_verifier.find_errors_in_log()
warnings = log_verifier.find_warnings_in_log()

# Update verification
success, lines = log_verifier.verify_update_success('PTN')
no_errors, errors = log_verifier.verify_no_errors_for_component('PTN')

# Complete verification
result = log_verifier.verify_complete_update_cycle('PTN', '1.2.3.4')
```

---

## 🐛 Troubleshooting

### SSH Connection Failed

**Error**: "SSH connection failed: Authentication failed"

**Solution**:
1. Check `.env` file has correct SSH credentials
2. Verify SSH server is accessible: `ssh root@10.206.201.9`
3. Check firewall settings

### Backend Tests Skipped

**Message**: "Backend verification requires SSH connection"

**Solution**:
- Tests auto-skip if SSH unavailable (graceful degradation)
- This is expected behavior if SSH not configured
- Configure SSH in `.env` to enable backend tests

### Log File Not Found

**Error**: "Failed to read log file"

**Solution**:
1. Verify log file exists: `ssh root@server 'ls -la /var/log/iwss/update.log'`
2. Check SSH user has read permissions
3. Verify path in TestConfig.BACKEND_PATHS

---

## 📖 Documentation

- **Full Details**: `PHASE_2_IMPLEMENTATION.md`
- **API Documentation**: Docstrings in each module
- **Demo Tests**: `test_multi_level_verification_demo.py`

---

## ✅ Next Phase

**Phase 3: Workflow Layer** - Orchestrate complex multi-step operations

Coming soon!

---

*Phase 2 Complete - Framework is 60% Complete!*
