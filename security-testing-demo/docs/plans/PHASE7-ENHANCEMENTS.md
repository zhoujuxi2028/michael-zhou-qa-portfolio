# Phase 7: Security Testing Enhancements Plan

## Overview

| Item | Value |
|------|-------|
| Start Point | 103 tests (Phase 1-6 complete) |
| Target | ~150+ tests with full OWASP Top 10 |
| Branch | `feature/security-testing` |

---

## Task Breakdown

### Task 1: OWASP Top 10 Full Coverage

**Current Coverage:**

| ID | Vulnerability | Status | Tests |
|----|---------------|--------|-------|
| A01 | Broken Access Control | ✅ | test_csrf.py, test_auth.py, test_juice_shop_api.py |
| A02 | Cryptographic Failures | ❌ | - |
| A03 | Injection | ✅ | test_xss.py, test_sqli.py, test_nosql_injection.py |
| A04 | Insecure Design | ✅ | test_business_logic.py |
| A05 | Security Misconfiguration | ✅ | test_headers.py |
| A06 | Vulnerable Components | ❌ | - |
| A07 | Auth Failures | ✅ | test_auth.py, test_jwt.py |
| A08 | Software/Data Integrity | ❌ | - |
| A09 | Logging Failures | ❌ | - |
| A10 | SSRF | ❌ | - |

**New Test Files:**

| File | Tests | OWASP ID | Content |
|------|-------|----------|---------|
| `test_crypto.py` | 5 | A02 | TLS, weak ciphers, sensitive data exposure |
| `test_components.py` | 5 | A06 | Outdated libraries, CVE checks |
| `test_integrity.py` | 5 | A08 | Unsigned updates, CI/CD integrity |
| `test_logging.py` | 5 | A09 | Log injection, sensitive data in logs |
| `test_ssrf.py` | 5 | A10 | SSRF detection, URL validation |

**Estimated:** +25 tests

---

### Task 2: SQLMap Integration Tests

**File:** `tests/test_sqlmap.py`

| Test | Description |
|------|-------------|
| test_sqlmap_available | Check sqlmap installation |
| test_sqlmap_detection | Run detection on DVWA |
| test_sqlmap_enumerate_dbs | List databases |
| test_sqlmap_dump_tables | Extract table names |
| test_sqlmap_risk_levels | Test risk level options |

**Requirements:**
- sqlmap installed (`brew install sqlmap`)
- Mark tests with `@pytest.mark.sqlmap`
- Skip if sqlmap not available

**Estimated:** +5 tests

---

### Task 3: Multi-Security-Level Tests

**Enhancement to existing test files:**

| File | Enhancement |
|------|-------------|
| test_xss.py | Add Medium/High level tests |
| test_sqli.py | Add Medium/High level tests |
| test_csrf.py | Add Medium/High level tests |

**Implementation:**

```python
@pytest.fixture(params=["low", "medium", "high"])
def security_level(request, dvwa_session, config):
    """Parameterized fixture for security levels."""
    level = request.param
    # Set security level
    dvwa_session.post(
        f"{config.DVWA_URL}/security.php",
        data={"security": level, "seclev_submit": "Submit"}
    )
    yield level
```

**New Tests:**

| Test | Level | Expected |
|------|-------|----------|
| test_xss_medium_bypass | Medium | Bypass simple filter |
| test_xss_high_bypass | High | Bypass strong filter |
| test_sqli_medium_bypass | Medium | Escape quotes |
| test_sqli_high_parameterized | High | Should fail (secure) |

**Estimated:** +15 tests

---

### Task 4: GitHub Actions for OpenVAS/Nessus

**File:** `.github/workflows/security-scan.yml`

**Workflow Design:**

```yaml
name: Security Scan

on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly Sunday
  workflow_dispatch:

jobs:
  security-tests:
    runs-on: ubuntu-latest
    services:
      dvwa:
        image: vulnerables/web-dvwa
        ports:
          - 80:80
      juice-shop:
        image: bkimminich/juice-shop
        ports:
          - 3000:3000

    steps:
      - uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: pip install -r requirements.txt

      - name: Run security tests
        run: pytest tests/ -v --html=reports/security-report.html
        continue-on-error: true

      - name: Upload report
        uses: actions/upload-artifact@v4
        with:
          name: security-report
          path: reports/
```

**OpenVAS Job (Optional - Resource Heavy):**

```yaml
  openvas-scan:
    runs-on: ubuntu-latest
    if: github.event_name == 'workflow_dispatch'

    steps:
      - name: Start OpenVAS
        run: |
          docker run -d --name openvas \
            -p 9392:9392 -p 9390:9390 \
            greenbone/openvas-scanner
          sleep 300  # Wait for NVT sync
```

---

### Task 5: Security Scan Badge

**Add to README.md:**

```markdown
![Security Scan](https://github.com/michaelzhou/security-testing-demo/actions/workflows/security-scan.yml/badge.svg)
![Tests](https://github.com/michaelzhou/security-testing-demo/actions/workflows/tests.yml/badge.svg)
```

**Badge Types:**

| Badge | Purpose |
|-------|---------|
| Security Scan | Weekly vulnerability scan status |
| Tests | Test suite pass/fail |
| Coverage | Code coverage percentage |

---

## Implementation Order

| Order | Task | Dependency | Priority |
|-------|------|------------|----------|
| 1 | Task 5: Badge | None | Quick win |
| 2 | Task 4: GitHub Actions | None | Foundation |
| 3 | Task 3: Multi-level tests | DVWA running | Medium |
| 4 | Task 2: SQLMap tests | sqlmap installed | Medium |
| 5 | Task 1: OWASP Top 10 | Research needed | Large |

---

## File Changes Summary

| File | Operation | Lines |
|------|-----------|-------|
| `tests/test_crypto.py` | New | ~100 |
| `tests/test_components.py` | New | ~100 |
| `tests/test_integrity.py` | New | ~100 |
| `tests/test_logging.py` | New | ~100 |
| `tests/test_ssrf.py` | New | ~100 |
| `tests/test_sqlmap.py` | New | ~80 |
| `tests/test_xss.py` | Modify | +50 |
| `tests/test_sqli.py` | Modify | +50 |
| `tests/test_csrf.py` | Modify | +30 |
| `tests/conftest.py` | Modify | +30 |
| `.github/workflows/security-scan.yml` | Modify | +50 |
| `README.md` | Modify | +5 |
| `CLAUDE.md` | Modify | +10 |

---

## Test Count Projection

| Phase | Current | Added | Total |
|-------|---------|-------|-------|
| Phase 1-6 | 103 | - | 103 |
| Task 1 (OWASP) | - | +25 | 128 |
| Task 2 (SQLMap) | - | +5 | 133 |
| Task 3 (Multi-level) | - | +15 | 148 |
| **Total** | 103 | **+45** | **148** |

---

## Acceptance Criteria

- [ ] All 5 OWASP gaps covered (A02, A06, A08, A09, A10)
- [ ] SQLMap tests run when available
- [ ] Multi-level tests for XSS/SQLi/CSRF
- [ ] GitHub Actions workflow runs weekly
- [ ] Badge shows in README
- [ ] All new tests pass or skip gracefully
- [ ] Documentation updated

---

## Commands

```bash
# Create feature branch
git checkout -b feature/phase7-enhancements

# Run new tests
pytest tests/test_crypto.py -v
pytest tests/test_sqlmap.py -v
pytest -m "owasp" -v

# Run multi-level tests
pytest tests/test_xss.py --security-level=medium -v

# Verify badge
# Check GitHub repo Settings > Actions > General
```

---

## Timeline

| Task | Complexity |
|------|------------|
| Task 5 (Badge) | Simple |
| Task 4 (CI/CD) | Medium |
| Task 3 (Multi-level) | Medium |
| Task 2 (SQLMap) | Simple |
| Task 1 (OWASP A02) | Medium |
| Task 1 (OWASP A06) | Medium |
| Task 1 (OWASP A08) | Medium |
| Task 1 (OWASP A09) | Simple |
| Task 1 (OWASP A10) | Medium |

---

## Status

**Status: COMPLETED** (2024-03-11)

All tasks implemented:
- [x] Security scan badge added to README
- [x] GitHub Actions updated with Juice Shop tests
- [x] Multi-security-level tests (test_multi_level.py)
- [x] SQLMap integration tests (test_sqlmap.py)
- [x] OWASP A02 Cryptographic Failures (test_crypto.py)
- [x] OWASP A06 Vulnerable Components (test_components.py)
- [x] OWASP A08 Software Integrity (test_integrity.py)
- [x] OWASP A09 Logging Failures (test_logging.py)
- [x] OWASP A10 SSRF (test_ssrf.py)

**Final Test Count: 170 tests (103 → 170, +67 tests)**
