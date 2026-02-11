# 🐛 Known Issues & Bug Tracking

**Project**: IWSVA Selenium Test Automation Framework
**Last Updated**: 2026-02-11
**Maintainer**: Michael Zhou

---

## 📊 Issues Summary

| Status | Count |
|--------|-------|
| 🔴 **Open** | 3 |
| 🟡 **In Progress** | 0 |
| 🟢 **Resolved** | 0 |
| **Total** | 3 |

---

## 🔴 Active Issues

### ISSUE-001: Login Page Element Locators Mismatch 🔥 HIGH PRIORITY

**Status**: 🔴 Open
**Severity**: Critical
**Priority**: P0
**Reported**: 2026-02-11
**Assigned**: TBD
**Category**: Test Framework / Page Object Model

#### Description
The login page element locators in `LoginPage` class do not match the actual HTML structure of the IWSVA login page, causing all login tests to fail.

#### Root Cause
- **Code uses**: `name=userid`, `name=password`, `name=submit`
- **Actual HTML**: `name=uid`, `name=passwd`, `name=pwd`

#### Evidence
```
Test execution log: complete-test-run.txt (lines 89-91)
✗ Element not found: name=userid
✗ Element not found: id=userid
✗ Login failed: Could not enter username
```

#### Affected Components
- `src/frameworks/pages/login_page.py` (lines 42-44)
- All tests requiring login authentication
- Test suite: `test_system_updates.py`

#### Impact
- ❌ All UI tests requiring login cannot execute
- ❌ Cannot verify IWSVA system functionality
- ❌ Blocks testing of System Updates page
- ✅ Demo tests (demo_test.py) are NOT affected

#### Proposed Fix
Update locators in `login_page.py`:
```python
# Current (incorrect)
USERNAME_INPUT = (By.NAME, 'userid')
PASSWORD_INPUT = (By.NAME, 'password')
LOGIN_BUTTON = (By.NAME, 'submit')

# Should be (correct)
USERNAME_INPUT = (By.NAME, 'uid')
PASSWORD_INPUT = (By.NAME, 'passwd')
LOGIN_BUTTON = (By.NAME, 'pwd')
```

#### Files to Modify
1. `src/frameworks/pages/login_page.py` - Update locators (lines 42-44)
2. Add fallback locators for backward compatibility

#### Verification Steps
1. Update the locators
2. Run test: `pytest src/tests/ui_tests/test_system_updates.py::TestSystemUpdatesEnterprise::test_page_load_and_title -v`
3. Verify login succeeds
4. Check logs show "✓ Login successful"

#### Related Issues
- See: ISSUE-002 (URL redirect)
- Blocks: All IWSVA integration tests

---

### ISSUE-002: Login URL Redirect (login.jsp → logon.jsp) 🟡 MEDIUM PRIORITY

**Status**: 🔴 Open
**Severity**: Low
**Priority**: P2
**Reported**: 2026-02-11
**Assigned**: TBD
**Category**: Configuration

#### Description
The IWSVA server redirects `/login.jsp` to `/logon.jsp`. While this doesn't break functionality (HTTP 302 redirect is handled), the configuration may need updating for clarity.

#### Evidence
```bash
$ curl -I https://10.206.201.9:8443/login.jsp
HTTP/1.1 302
Location: https://10.206.201.9:8443/logon.jsp
```

#### Current Configuration
```python
# src/core/config/test_config.py (line 133)
'login': f"{BASE_URL}/login.jsp",
```

#### Impact
- ⚠️ Minor: Browser follows redirect automatically
- ⚠️ URL verification tests may fail if checking exact URL
- ✅ Does NOT block login functionality

#### Proposed Fix
**Option 1**: Update configuration to use correct URL
```python
'login': f"{BASE_URL}/logon.jsp",
```

**Option 2**: Keep current URL and document the redirect behavior

**Recommendation**: Option 2 (no action needed) - redirect is handled automatically

#### Verification Steps
1. Test login with current configuration
2. Verify redirect is transparent to tests
3. Document redirect behavior if needed

---

### ISSUE-003: Browser Configuration - Chrome Not Installed 🟡 MEDIUM PRIORITY

**Status**: 🔴 Open
**Severity**: Medium
**Priority**: P1
**Reported**: 2026-02-11
**Assigned**: TBD
**Category**: Test Environment

#### Description
The `.env` configuration specifies `BROWSER=chrome`, but Google Chrome is not installed on the test system, causing ChromeDriver initialization failures.

#### Evidence
```
Test execution log: final-test-verification.txt (lines 115-118)
/bin/sh: line 1: google-chrome: command not found
/bin/sh: line 1: google-chrome-stable: command not found
AttributeError: 'NoneType' object has no attribute 'split'
```

#### Current Configuration
```bash
# .env (line 18)
BROWSER=chrome
```

#### Available Browsers
- ❌ Chrome: Not installed
- ✅ Firefox: Installed (v140.6.0esr)
- ❌ Edge: Not installed

#### Impact
- ❌ Cannot run tests with Chrome
- ✅ Firefox works correctly (verified in demo tests)
- ⚠️ May confuse new team members

#### Proposed Fix
**Option 1**: Update .env to use Firefox (Quick fix)
```bash
BROWSER=firefox
```

**Option 2**: Install Chrome (System-level change)
```bash
# Requires admin privileges
sudo dnf install google-chrome-stable
```

**Recommendation**: Option 1 - Update configuration to Firefox

#### Files to Modify
1. `.env` (line 18) - Change BROWSER=firefox
2. Update documentation noting Firefox as primary browser

#### Verification Steps
1. Update BROWSER=firefox in .env
2. Run: `pytest src/tests/ -v`
3. Verify tests use Firefox successfully

---

## 📋 Issue Priority Matrix

| Priority | Severity | Issues |
|----------|----------|--------|
| P0 | Critical | ISSUE-001 |
| P1 | Medium | ISSUE-003 |
| P2 | Low | ISSUE-002 |

---

## 🔧 Quick Fix Order (Recommended)

1. **ISSUE-003** (5 minutes) - Change BROWSER=firefox in .env
2. **ISSUE-001** (15 minutes) - Update login page locators
3. **ISSUE-002** (0 minutes) - Document, no action needed

**Total estimated fix time**: ~20 minutes

---

## 📝 Notes

### Testing Environment
- **Server**: 10.206.201.9:8443 (✅ Accessible)
- **Network**: ✅ Reachable (ping: 0.2ms)
- **HTTPS**: ✅ Certificate accepted (-k flag)
- **Credentials**: admin/111111 (configured in .env)

### Workaround
For immediate testing, use the demo test which doesn't require IWSVA:
```bash
HEADLESS=true pytest demo_test.py -v
# ✅ 4 tests pass in 42 seconds
```

---

## 🎯 Acceptance Criteria

All issues resolved when:
- [ ] Login test passes with correct credentials
- [ ] System Updates page loads successfully
- [ ] Tests run with Firefox browser
- [ ] No element location errors in logs
- [ ] Full test suite completes without failures

---

## 📚 Related Documentation

- Test execution logs: `complete-test-run.txt`, `final-test-verification.txt`
- Configuration: `.env`, `src/core/config/test_config.py`
- Login page: `src/frameworks/pages/login_page.py`
- Bug fix log: `BUGFIX_LOG.md`

---

**Report Issues**: Create entries following the template above
**Update Status**: Change 🔴 Open → 🟡 In Progress → 🟢 Resolved
