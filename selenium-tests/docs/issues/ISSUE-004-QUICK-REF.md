# 🐛 ISSUE-004: System Update Page Navigation Error

**Quick Reference Card**

---

## 📊 Issue Summary

| Field | Value |
|-------|-------|
| **Issue ID** | ISSUE-004 |
| **Status** | 🔴 Open |
| **Priority** | P0 (Critical) |
| **Severity** | Critical |
| **Reported** | 2026-02-15 |
| **Category** | Page Navigation / Framework |

---

## ❌ Failed Test

```
Test: test_kernel_version_multi_level
File: src/tests/ui_tests/test_multi_level_verification_demo.py
Line: TestMultiLevelVerification::test_kernel_version_multi_level

Error: AssertionError: Page title mismatch
Expected: 'System Update'
Got: 'HTTP Status 404 – Not Found'

Retry: 3 attempts, all failed
Exit Code: 0 (test framework ran, but test failed)
```

---

## 🔍 Root Cause

**Direct URL access not allowed**

```python
# ❌ Current (Not Working)
driver.get("https://10.206.201.9:8443/jsp/system_update.jsp")
# Result: HTTP 404

# ✅ Required (Menu Navigation)
1. Click "Administration" in left frame
2. Wait for submenu to expand
3. Click "System Updates" link
4. Wait for content to load
```

**Why**: IWSVA requires menu-based navigation for access control/session validation

---

## 📍 Affected Tests

| Test Case | Status | Impact |
|-----------|--------|--------|
| `test_kernel_version_multi_level` | ❌ Fail | Cannot verify kernel version via UI |
| `test_page_load_and_title` | ❌ Fail | Cannot load System Updates page |
| `test_kernel_version_display` | ❌ Fail | Cannot extract kernel version |
| `test_system_information_backend` | ✅ Pass | Uses SSH (not affected) |
| `test_update_log_verification` | ✅ Pass | Uses SSH (not affected) |
| `test_validate_frame_structure` | ✅ Pass | Checks frames after login |

**Impact**: 3 out of 6 tests fail (50% failure rate)

---

## 🔧 Required Fix

### Phase 1: Add BasePage Methods

Add to `src/frameworks/pages/base_page.py`:

```python
def wait_for_frame_content(self, frame_name, expected_text, timeout=10):
    """Wait for frame to contain expected text"""
    pass

def click_in_frame_by_text(self, frame_name, text_content):
    """Click element in frame by text content"""
    pass

def click_link_in_frame(self, frame_name, search_text):
    """Click link in frame by partial text match"""
    pass
```

### Phase 2: Update SystemUpdatePage

Replace in `src/frameworks/pages/system_update_page.py`:

```python
def navigate(self):
    """Navigate via menu instead of direct URL"""
    TestLogger.log_step("Navigate to System Updates via menu")

    # 1. Click Administration
    self.wait_for_frame_content('left', 'Administration', timeout=5)
    self.click_in_frame_by_text('left', 'Administration')

    # 2. Click System Updates
    self.wait_for_frame_content('left', 'System Update', timeout=5)
    self.click_link_in_frame('left', 'system update')

    # 3. Wait for page load
    self.wait_for_frame_content('right', 'System', timeout=10)
```

---

## ✅ Verification Checklist

After implementing fix:

- [ ] `test_kernel_version_multi_level` passes
- [ ] `test_page_load_and_title` passes
- [ ] `test_kernel_version_display` passes
- [ ] Navigation happens via menu clicks (not direct URL)
- [ ] All 6 tests pass (100% success rate)

---

## 📚 Reference

**Cypress Implementation** (working example):
- File: `cypress-tests/cypress/support/pages/SystemUpdatePage.js`
- Method: `navigateToSystemUpdates()` (lines 116-135)

**Configuration**:
- URL: `TestConfig.URLS['system_update']`
- File: `src/core/config/test_config.py` (line 134)

---

## 📝 Notes

- **Backend tests** (SSH-based) are **not affected** by this issue
- This is a **framework limitation**, not a server issue
- Cypress tests work because they use menu navigation
- Fix will make Selenium framework consistent with Cypress approach

---

**Created**: 2026-02-15
**Next Action**: Implement menu navigation helpers in BasePage
