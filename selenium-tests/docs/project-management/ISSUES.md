# 🐛 Known Issues & Bug Tracking

**Project**: IWSVA Selenium Test Automation Framework
**Last Updated**: 2026-02-15
**Maintainer**: Michael Zhou

---

## 📊 Issues Summary

| Status | Count |
|--------|-------|
| 🔴 **Open** | 1 |
| 🟡 **In Progress** | 0 |
| 🟢 **Resolved** | 3 |
| **Total** | 4 |

---

## 🔴 Active Issues

### ISSUE-004: System Update Page Requires Menu Navigation (404 Error) 🔴 OPEN

**Status**: 🔴 Open
**Severity**: Critical
**Priority**: P0
**Reported**: 2026-02-15
**Assigned**: TBD
**Category**: Page Navigation / Test Framework
**Test Case**: `test_kernel_version_multi_level`

#### Description
The Selenium test `test_kernel_version_multi_level` fails with a 404 error when attempting to navigate to the System Updates page. The test tries to access `/jsp/system_update.jsp` directly, but IWSVA requires navigation through the menu system rather than direct URL access.

#### Test Failure Details
```
Test: src/tests/ui_tests/test_multi_level_verification_demo.py::TestMultiLevelVerification::test_kernel_version_multi_level
Result: FAILED (after 3 retries)
Error: AssertionError: Page title mismatch: expected 'System Update', got 'HTTP Status 404 – Not Found'
```

#### Root Cause
**Problem**: Direct URL access to `/jsp/system_update.jsp` returns HTTP 404

**Why**:
- IWSVA implements access control requiring menu-based navigation
- The page likely checks session state/permissions set during menu navigation
- Cypress tests work because they navigate via menu clicks

**Evidence**:
1. ✅ Login succeeds
2. ✅ SSH connection works
3. ✅ WebDriver initializes correctly
4. ❌ Direct URL access: `https://10.206.201.9:8443/jsp/system_update.jsp` → 404

#### Comparison: Cypress vs Selenium

**Cypress (Working)**:
```javascript
navigateToSystemUpdates() {
  // 1. Click "Administration" in left frame
  this.clickInFrameByText('left', 'Administration')

  // 2. Wait for submenu
  this.waitForFrameContent('left', 'System Update', 5000)

  // 3. Click "System Updates" link
  this.clickLinkInFrame('left', 'system update')

  // 4. Wait for content
  this.waitForFrameContent('right', 'System', 10000)
}
```

**Selenium (Not Working)**:
```python
def navigate(self):
    # ❌ Direct URL access
    driver.get(TestConfig.URLS['system_update'])
```

#### Affected Components
- `src/frameworks/pages/system_update_page.py` - `navigate()` method (line 73-83)
- `src/frameworks/pages/base_page.py` - Missing menu navigation helpers
- Test: `test_kernel_version_multi_level`
- Test: `test_page_load_and_title`
- Test: `test_kernel_version_display`

#### Impact
- ❌ **3 out of 6 test cases** fail (50% failure rate)
- ❌ Cannot verify kernel version via UI
- ❌ Cannot test System Updates page functionality
- ✅ Backend tests (SSH-based) still work
- ✅ Frame structure tests still work

#### Required Fix
**Implement menu navigation in Selenium framework**

**Phase 1: Add Base Page Helpers**
Add to `src/frameworks/pages/base_page.py`:
- `wait_for_frame_content(frame_name, expected_text, timeout)`
- `click_in_frame_by_text(frame_name, text_content)`
- `click_link_in_frame(frame_name, search_text)`

**Phase 2: Update SystemUpdatePage**
Replace direct URL navigation with menu-based navigation:
```python
def navigate(self):
    # 1. Wait for left frame
    self.wait_for_frame_content('left', 'Administration', timeout=5)

    # 2. Click Administration menu
    self.click_in_frame_by_text('left', 'Administration')

    # 3. Wait for submenu
    self.wait_for_frame_content('left', 'System Update', timeout=5)

    # 4. Click System Updates link
    self.click_link_in_frame('left', 'system update')

    # 5. Wait for content
    self.wait_for_frame_content('right', 'System', timeout=10)
```

#### Verification Steps
After fix:
1. Run `test_kernel_version_multi_level`
2. Verify navigation via menu succeeds
3. Verify page content loads correctly
4. Verify all 6 tests pass

#### Related Issues
- Similar to: Cypress implementation in `cypress/support/pages/SystemUpdatePage.js` (lines 116-135)
- Blocks: All System Updates page UI tests

#### Additional Notes
- This is a **critical blocker** for UI verification tests
- Backend verification tests are **not affected** (they use SSH directly)
- Consider implementing as reusable menu navigation utility

---

## 🟢 Resolved Issues

### ISSUE-001: Login Page Element Locators Mismatch 🟢 RESOLVED

**Status**: 🟢 Resolved
**Severity**: Critical
**Priority**: P0
**Reported**: 2026-02-11
**Resolved**: 2026-02-11
**Resolution Time**: ~6 hours (including investigation and documentation)
**Assigned**: Michael Zhou
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

#### Resolution
**Fixed** in commit `[pending]`

**Changes Made**:
Updated locators in `src/frameworks/pages/login_page.py` (lines 42-46):
```python
# Before (incorrect)
USERNAME_INPUT = (By.NAME, 'userid')    # ❌
PASSWORD_INPUT = (By.NAME, 'password')  # ❌
LOGIN_BUTTON = (By.NAME, 'submit')      # ❌

# After (correct)
USERNAME_INPUT = (By.NAME, 'uid')       # ✅
PASSWORD_INPUT = (By.NAME, 'passwd')    # ✅
LOGIN_BUTTON = (By.NAME, 'pwd')         # ✅
```

**Additional Improvements**:
- Added comments documenting actual HTML structure
- Kept legacy locators as fallbacks (USERNAME_INPUT_ALT, PASSWORD_INPUT_ALT)
- Added fix reference: "Fix ISSUE-001" in code comments

#### Verification Results
**Test**: `test_login_fix.py` (verification script)

```
✅ Username field found: name='uid'
✅ Password field found: name='passwd'
✅ Submit button found: name='pwd'
✅ Login interaction works
✅ All elements accessible
```

**Manual Verification**:
```bash
$ python3 test_login_fix.py
🧪 Testing ISSUE-001 fix: Login page element locators
============================================================
✅ ISSUE-001 FIX VERIFIED!
All elements found with corrected locators
Login page is now functional!
```

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

### ISSUE-003: Browser Configuration - Chrome Not Installed 🟢 RESOLVED

**Status**: 🟢 Resolved
**Severity**: Medium (was incorrectly assessed)
**Priority**: P1
**Reported**: 2026-02-11
**Resolved**: 2026-02-11
**Resolution Time**: ~2 hours (investigation)
**Category**: Test Environment / False Alarm

#### Description
**INITIAL ASSESSMENT (INCORRECT)**: The `.env` configuration specifies `BROWSER=chrome`, but Google Chrome was believed to be not installed.

**ACTUAL SITUATION**: Chrome was already installed and fully functional. The issue was a **misdiagnosis** based on outdated test logs.

#### Root Cause Analysis
**Timeline of Events**:
1. **09:26** - `final-test-verification.txt` logged: "google-chrome: command not found"
2. **09:30** - Chrome was installed: `google-chrome-stable-145.0.7632.45-1.x86_64`
3. **09:50** - `complete-test-run.txt` shows Chrome working perfectly
4. **Investigation** - Assumed Chrome was not installed based on older log

**Why the confusion**:
- Looked at `final-test-verification.txt` (before Chrome installation)
- Did not verify current Chrome installation status
- Did not notice timestamps showing Chrome was installed later

#### Verification Results
```bash
# Chrome is installed and working
$ google-chrome --version
Google Chrome 145.0.7632.45 ✅

# ChromeDriver is cached
$ ls ~/.wdm/drivers/chromedriver/
145.0.7632.46 ✅

# Chrome can start and run tests
$ python3 test_chrome.py
✅ Chrome works! Title: Example Domain
```

#### Evidence from complete-test-run.txt
```
✅ 09:50:05 - ChromeDriver正常工作
✅ 09:50:06 - Chrome浏览器成功启动
✅ 09:50:06 - 成功访问登录页面
✅ 09:50:07 - 页面加载完成
❌ 09:50:38 - Element not found: name=userid  ← Real problem (ISSUE-001)
```

**Chrome was working fine. The test failure was due to incorrect element locators (ISSUE-001), NOT Chrome.**

#### Impact
- ✅ Chrome is fully functional
- ✅ No configuration change needed
- ✅ Can continue using Chrome
- ⚠️ This was a **false alarm** - diagnostic error, not a real issue

#### Resolution
**No action needed** - Chrome is installed and working correctly.

**Current Configuration (Correct)**:
```bash
# .env (line 18) - Keep as is
BROWSER=chrome  ✅
```

#### Lessons Learned
1. **Always verify current state** - Don't rely solely on old logs
2. **Check timestamps** - Understand the timeline of events
3. **Test assumptions** - Verify before concluding
4. **Read logs carefully** - `complete-test-run.txt` clearly showed Chrome working
5. **Root cause matters** - The real issue was ISSUE-001 (locators), not Chrome

---

## 📋 Issue Priority Matrix

| Priority | Severity | Status | Issues |
|----------|----------|--------|--------|
| P0 | Critical | 🔴 Open | **ISSUE-004** (Menu Navigation) |
| P0 | Critical | 🟢 Resolved | ~~ISSUE-001~~ (Login Locators) |
| P1 | Medium | 🟢 Resolved | ~~ISSUE-003~~ (Chrome Browser) |
| P2 | Low | 🟢 Resolved | ~~ISSUE-002~~ (URL Redirect) |

---

## 📊 Issue Status Summary

**Resolved Issues**:
1. ~~**ISSUE-001**~~ ✅ **RESOLVED** - Login page locators fixed (15 minutes)
2. ~~**ISSUE-003**~~ ✅ **RESOLVED** - Chrome is already installed and working
3. ~~**ISSUE-002**~~ ✅ **RESOLVED** - Documented, no action needed (auto-redirect works)

**Active Issues**:
1. **ISSUE-004** 🔴 **OPEN** - System Update page requires menu navigation (404 error)
   - **Impact**: 3 out of 6 tests fail (50% failure rate)
   - **Priority**: P0 (Critical)
   - **Status**: Reported 2026-02-15, awaiting fix

**Resolution Statistics**:
- **Total Issues**: 4
- **Resolved**: 3 (75%)
- **Open**: 1 (25%)
- **Average Resolution Time**: ~2 hours (for resolved issues)

**Project Status**: ⚠️ **Partially Functional** - Backend tests work, UI tests blocked by ISSUE-004

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
