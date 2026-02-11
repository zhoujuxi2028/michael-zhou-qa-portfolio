# 🐛 Known Issues & Bug Tracking

**Project**: IWSVA Selenium Test Automation Framework
**Last Updated**: 2026-02-11
**Maintainer**: Michael Zhou

---

## 📊 Issues Summary

| Status | Count |
|--------|-------|
| 🔴 **Open** | 1 |
| 🟡 **In Progress** | 0 |
| 🟢 **Resolved** | 2 |
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
| P0 | Critical | 🔴 Open | ISSUE-001 |
| P1 | Medium | 🟢 Resolved | ~~ISSUE-003~~ |
| P2 | Low | 🟢 Resolved | ~~ISSUE-002~~ |

---

## 🔧 Fix Status Update

1. ~~**ISSUE-003**~~ ✅ **RESOLVED** - Chrome is already installed and working
2. ~~**ISSUE-002**~~ ✅ **RESOLVED** - Documented, no action needed (auto-redirect works)
3. **ISSUE-001** 🔴 **OPEN** - Still needs fix (15 minutes) - Update login page locators

**Total estimated fix time**: ~15 minutes (only ISSUE-001 remains)

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
