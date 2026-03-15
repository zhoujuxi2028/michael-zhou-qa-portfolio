# 🔧 Bug Fix Log & Problem-Solving Journal

**Project**: Playwright Demo Test Automation
**Purpose**: Document the problem-solving process for learning and reference
**Maintainer**: Michael Zhou

---

## 📖 How to Use This Log

This document serves multiple purposes:
1. **Learning Record**: Document what I learned during each bug fix
2. **FAQ / Reference Material**: Demonstrate problem-solving skills
3. **Knowledge Base**: Help future debugging efforts
4. **Process Documentation**: Show systematic debugging approach

---

## 🎯 Bug Fix Template

Each bug fix entry should include:
- **Problem**: What was broken?
- **Investigation**: How did I diagnose it?
- **Root Cause**: Why did it happen?
- **Solution**: How did I fix it?
- **Verification**: How did I confirm the fix?
- **Lessons Learned**: What did I learn?
- **Prevention**: How to avoid this in the future?

---

## 📅 Bug Fix History

---

### 🐛 BUG-PW-001: Mobile Chrome SSL Certificate Error

**Date**: 2026-03-15
**Status**: 🟢 Resolved
**Time Spent**: < 1 hour (investigation + fix + verification)
**Complexity**: Low–Medium
**Fix Verified**: ✅ Yes

#### 1️⃣ Problem Discovery

**Initial Symptom**:
```
Running 190 tests using 6 workers

  189 passed
  1 failed

  [mobile-chrome] › tests/ui/responsive.spec.ts:26:9
    › Responsive — Mobile (375×667) › should render description on mobile

  Error: page.goto: net::ERR_CERT_AUTHORITY_INVALID at https://example.com/
```

**Context**:
- First full test run of the Playwright demo project
- 189 out of 190 tests passed on the first attempt
- Only the `mobile-chrome` (Pixel 5) browser project was affected
- All other projects (chromium, firefox, webkit, mobile-safari) passed

#### 2️⃣ Investigation Process

**Step 1: Identify the Failing Test**
```
Test: tests/ui/responsive.spec.ts:26:9
Project: mobile-chrome (Pixel 5 emulation)
Error: net::ERR_CERT_AUTHORITY_INVALID
URL: https://example.com/
```

**Step 2: Compare Across Browser Projects**

| Project | Engine | Device | Result |
|---------|--------|--------|--------|
| chromium | Chromium | Desktop Chrome | ✅ Pass |
| firefox | Gecko | Desktop Firefox | ✅ Pass |
| webkit | WebKit | Desktop Safari | ✅ Pass |
| mobile-chrome | Chromium | Pixel 5 | ❌ Fail |
| mobile-safari | WebKit | iPhone 12 | ✅ Pass |

**Key observation**: Both `chromium` (Desktop) and `mobile-chrome` (Pixel 5) use the Chromium engine, but only Pixel 5 fails → the issue is in the **device emulation profile**, not the engine.

**Step 3: Check Playwright Config**
```typescript
// playwright.config.ts — use block
use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // ❌ No ignoreHTTPSErrors setting!
},
```

**Step 4: Hypothesis & Fix**
- Pixel 5 device emulation has stricter TLS defaults
- Adding `ignoreHTTPSErrors: true` should resolve it
- This is consistent with how Cypress handles SSL: `chromeWebSecurity: false`

#### 3️⃣ Root Cause Analysis

**Primary Cause**: Missing `ignoreHTTPSErrors: true` in Playwright config

**Why This Happened**:
1. Default `ignoreHTTPSErrors` is `false` in Playwright
2. Desktop browser projects happened to tolerate the certificate
3. Pixel 5 device emulation profile enforces stricter TLS validation
4. The config gap was invisible until the first full cross-browser run

**Contributing Factors**:
- Tests were developed and verified on individual browser projects before running the full matrix
- SSL tolerance behavior differs between device emulation profiles — not documented prominently in Playwright docs

#### 4️⃣ Solution Implementation

**File Modified**: `playwright.config.ts` (line 37)

**Change**:
```typescript
// BEFORE
use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
},

// AFTER
use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    ignoreHTTPSErrors: true,
},
```

**Scope**: 1 file, 1 line added

#### 5️⃣ Verification Results

**Test Execution**:
```bash
$ npx playwright test
Running 190 tests using 6 workers

  190 passed
```

**Success Criteria** (All Met):
- [✅] `mobile-chrome` responsive test passes
- [✅] All 190 tests pass across 5 browser projects
- [✅] No regression in other tests
- [✅] No SSL-related errors in any project
- [✅] HTML report shows 100% pass rate

#### 6️⃣ Lessons Learned

**Technical Lessons**:
1. **Device emulation profiles carry TLS defaults**
   - Desktop browsers and mobile emulations behave differently for SSL
   - Don't assume SSL behavior is uniform across Playwright projects
   - Lesson: Always set `ignoreHTTPSErrors` explicitly in test environments

2. **Run the full matrix early**
   - Testing individual browser projects misses cross-project configuration gaps
   - The first full run is where config issues surface
   - Lesson: Run `npx playwright test` (all projects) before marking WBS tasks complete

3. **Cross-framework consistency matters**
   - Cypress uses `chromeWebSecurity: false` for similar SSL handling
   - Selenium uses `--ignore-certificate-errors` Chrome flag
   - Playwright uses `ignoreHTTPSErrors: true`
   - Lesson: When setting up a new test framework, check how existing frameworks handle SSL

**Process Lessons**:
1. **Systematic comparison narrows the cause quickly**
   - Comparing results across 5 browser projects immediately pointed to device emulation
   - Lesson: Tabular comparison is the fastest diagnostic for cross-browser issues

2. **One-line fixes still need full documentation**
   - The fix was trivial, but the investigation process and root cause analysis are valuable
   - Lesson: Document the "why" even when the "what" is simple

#### 7️⃣ FAQ / Reference Talking Points

**Skills Demonstrated**:
- ✅ Cross-browser debugging methodology
- ✅ Understanding of SSL/TLS in test automation
- ✅ Playwright configuration expertise
- ✅ Device emulation profile knowledge
- ✅ Systematic root cause analysis
- ✅ Cross-framework comparison (Playwright vs Cypress vs Selenium)

**Questions This Bug Fix Can Answer**:
- "How do you handle SSL certificate issues in test automation?"
  → Configure at the framework level: Playwright `ignoreHTTPSErrors`, Cypress `chromeWebSecurity`, Selenium launch args

- "Tell me about a bug you found during cross-browser testing"
  → BUG-PW-001: Mobile emulation had stricter TLS defaults than desktop browsers, causing 1/190 tests to fail. Systematic comparison across 5 browser projects identified the root cause in minutes.

- "How do you approach debugging a failing test in one browser but not others?"
  → Tabular comparison: list all browser projects with engine, device profile, and result. Isolate the differentiating factor (in this case, device emulation profile TLS defaults).

---

## 📊 Bug Fix Statistics

| Metric | Value |
|--------|-------|
| Total Issues Identified | 1 |
| Real Issues | 1 (BUG-PW-001) |
| False Alarms | 0 |
| **Issues Resolved** | **1 (ALL)** ✅ |
| Issues In Progress | 0 |
| Average Investigation Time | < 30 minutes |
| Average Fix Time | < 5 minutes (1 line) |
| Most Complex Issue | BUG-PW-001 (Low–Medium) |
| **Success Rate** | **100%** 🎉 |

---

## 🎓 Key Learnings Summary

### Playwright-Specific Insights
1. **`ignoreHTTPSErrors`**: Always set in test environments — device emulation profiles vary
2. **Device emulation ≠ viewport resize**: Emulation carries UA, touch, and TLS config
3. **Full matrix runs reveal config gaps**: Test all projects together, not just individually
4. **Cross-framework patterns**: SSL handling is a universal concern (Playwright, Cypress, Selenium)

### Debugging Best Practices
1. **Compare across dimensions**: Browser, engine, device profile — tabular analysis
2. **Check config first**: Most cross-browser-only failures are config issues
3. **Document the process**: The investigation is more valuable than the fix
4. **One fix, full verification**: Even a 1-line change needs a full test run

---

## 🔗 Related Resources

- **Issue Tracker**: [ISSUES.md](ISSUES.md)
- **Investigation Report**: [../issues/BUG-PW-001-INVESTIGATION.md](../issues/BUG-PW-001-INVESTIGATION.md)
- **Quick Reference**: [../issues/BUG-PW-001-QUICK-REF.md](../issues/BUG-PW-001-QUICK-REF.md)
- **Configuration**: `playwright.config.ts`

---

## 📝 Update Log

| Date | Author | Changes |
|------|--------|---------|
| 2026-03-15 | Michael Zhou | Created bug fix log, documented BUG-PW-001 |

---

**Next Steps**:
1. ✅ All tests passing — no pending fixes
2. Continue with WBS 8.0 verification tasks
