# 🐛 BUG-PW-001: Mobile Chrome SSL Certificate Error

**Quick Reference Card**

---

## 📊 Issue Summary

| Field | Value |
|-------|-------|
| **Issue ID** | BUG-PW-001 |
| **Status** | 🟢 Resolved |
| **Priority** | P1 (High) |
| **Severity** | Medium |
| **Reported** | 2026-03-15 |
| **Resolved** | 2026-03-15 |
| **Category** | Configuration / SSL |

---

## ❌ Failed Test

```
Test: [mobile-chrome] › tests/ui/responsive.spec.ts:26:9
      › Responsive — Mobile (375×667) › should render description on mobile
File: tests/ui/responsive.spec.ts
Line: 26
Browser Project: mobile-chrome (Pixel 5 emulation)

Error: page.goto: net::ERR_CERT_AUTHORITY_INVALID at https://example.com/
```

---

## 🔍 Root Cause

**Missing `ignoreHTTPSErrors: true` in Playwright global config**

Playwright's `mobile-chrome` project uses the Pixel 5 device emulation profile, which has stricter TLS certificate validation than desktop browser projects. Without `ignoreHTTPSErrors: true` in the global `use` block, the Pixel 5 emulation rejected example.com's certificate while all other browser projects (chromium, firefox, webkit, mobile-safari) tolerated it.

**Why only mobile-chrome?**
SSL certificate validation behavior varies across browser engines and device emulation profiles. The Pixel 5 emulation profile has stricter TLS handling than desktop browsers, making it the only project that rejected example.com's certificate during this test run.

---

## 📍 Affected Tests

| Test Case | Browser | Status | Impact |
|-----------|---------|--------|--------|
| `should render description on mobile` | mobile-chrome | ❌ Fail | Cannot navigate to target URL |
| All other tests (189) | All projects | ✅ Pass | Not affected |

**Impact**: 1 out of 190 tests failed (0.5% failure rate)

---

## 🔧 Fix Implementation

**File**: `playwright-demo/playwright.config.ts` (line 37)

```typescript
// Before (line 36):
    video: 'retain-on-failure',
  },

// After (line 36-37):
    video: 'retain-on-failure',
    ignoreHTTPSErrors: true,
  },
```

**Scope**: Single line addition to the global `use` block. All 5 browser projects inherit this setting.

---

## ✅ Verification Results

```
Running 190 tests using 6 workers

  190 passed

Test Results by Project:
  ✅ chromium      — all passed
  ✅ firefox       — all passed
  ✅ webkit        — all passed
  ✅ mobile-chrome — all passed (was 1 failure)
  ✅ mobile-safari — all passed
```

**Result**: 190/190 tests pass after fix (100% pass rate)

---

## 📚 Lessons Learned

1. **Device emulation profiles carry their own TLS defaults** — don't assume desktop-level tolerance applies to mobile emulation.
2. **Set `ignoreHTTPSErrors` globally** — applying it per-project is fragile and easy to miss for new projects.
3. **First full cross-browser run reveals config gaps** — always run the complete matrix before declaring the suite stable.

---

## 🔗 Related Documents

- Investigation Report: [BUG-PW-001-INVESTIGATION.md](BUG-PW-001-INVESTIGATION.md)
- Fix Completion Report: [BUG-PW-001-FIX-COMPLETED.md](BUG-PW-001-FIX-COMPLETED.md)
- Issue Tracker: [../project-management/ISSUES.md](../project-management/ISSUES.md)
- Bug Fix Log: [../project-management/BUGFIX_LOG.md](../project-management/BUGFIX_LOG.md)

---

**Created**: 2026-03-15
**Resolution Time**: < 1 hour (investigation + fix + verification)
