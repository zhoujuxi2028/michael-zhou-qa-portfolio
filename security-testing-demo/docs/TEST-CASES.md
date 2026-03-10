# Security Test Cases

## Overview

This document lists all security test cases implemented in this project.

## Test Summary

| Category | Test Count | OWASP Top 10 |
|----------|------------|--------------|
| XSS | 5 | A03:2021 |
| SQL Injection | 5 | A03:2021 |
| CSRF | 4 | A01:2021 |
| Authentication | 6 | A07:2021 |
| Security Headers | 5 | A05:2021 |
| **Total** | **25** | |

---

## XSS (Cross-Site Scripting) Tests

### SEC-XSS-001: XSS in Search Parameter
- **File**: `test_xss.py::TestReflectedXSS::test_xss_in_search_parameter`
- **Description**: Check if search parameter reflects user input without sanitization
- **OWASP**: A03:2021 - Injection
- **Severity**: High

### SEC-XSS-002: XSS Payload Encoding
- **File**: `test_xss.py::TestReflectedXSS::test_xss_payload_encoding`
- **Description**: Verify that dangerous characters are HTML encoded
- **OWASP**: A03:2021 - Injection
- **Severity**: High

### SEC-XSS-003: DOM-based XSS
- **File**: `test_xss.py::TestReflectedXSS::test_xss_in_url_fragment`
- **Description**: Check for DOM-based XSS vulnerabilities
- **OWASP**: A03:2021 - Injection
- **Severity**: High

### SEC-XSS-004: XSS Filter Bypass
- **File**: `test_xss.py::TestReflectedXSS::test_xss_filter_bypass`
- **Description**: Test if XSS filters can be bypassed
- **OWASP**: A03:2021 - Injection
- **Severity**: High

### SEC-XSS-005: Stored XSS
- **File**: `test_xss.py::TestStoredXSS::test_stored_xss_in_comments`
- **Description**: Check if XSS payloads are stored and executed
- **OWASP**: A03:2021 - Injection
- **Severity**: Critical

---

## SQL Injection Tests

### SEC-SQLI-001: Error-based SQL Injection
- **File**: `test_sqli.py::TestSQLInjection::test_error_based_sqli`
- **Description**: Check if SQL errors are exposed in responses
- **OWASP**: A03:2021 - Injection
- **Severity**: High

### SEC-SQLI-002: Union-based SQL Injection
- **File**: `test_sqli.py::TestSQLInjection::test_union_based_sqli`
- **Description**: Attempt UNION-based data extraction
- **OWASP**: A03:2021 - Injection
- **Severity**: Critical

### SEC-SQLI-003: Time-based Blind SQL Injection
- **File**: `test_sqli.py::TestSQLInjection::test_time_based_blind_sqli`
- **Description**: Detect SQL injection via response time differences
- **OWASP**: A03:2021 - Injection
- **Severity**: High

### SEC-SQLI-004: Boolean-based Blind SQL Injection
- **File**: `test_sqli.py::TestSQLInjection::test_boolean_based_blind_sqli`
- **Description**: Detect SQL injection via boolean condition differences
- **OWASP**: A03:2021 - Injection
- **Severity**: High

### SEC-SQLI-005: Second-Order SQL Injection
- **File**: `test_sqli.py::TestSecondOrderSQLI::test_second_order_sqli_concept`
- **Description**: Detect potential second-order injection points
- **OWASP**: A03:2021 - Injection
- **Severity**: High

---

## CSRF Tests

### SEC-CSRF-001: CSRF Token Presence
- **File**: `test_csrf.py::TestCSRF::test_csrf_token_presence`
- **Description**: Check for CSRF token implementation
- **OWASP**: A01:2021 - Broken Access Control
- **Severity**: Medium

### SEC-CSRF-002: CSRF Token Validation
- **File**: `test_csrf.py::TestCSRF::test_csrf_token_validation`
- **Description**: Verify that requests without valid tokens are rejected
- **OWASP**: A01:2021 - Broken Access Control
- **Severity**: High

### SEC-CSRF-003: Referer Header Check
- **File**: `test_csrf.py::TestCSRF::test_referer_header_check`
- **Description**: Check if application validates Referer header
- **OWASP**: A01:2021 - Broken Access Control
- **Severity**: Low

### SEC-CSRF-004: SameSite Cookie Attribute
- **File**: `test_csrf.py::TestSameSiteCookie::test_samesite_cookie_attribute`
- **Description**: Verify SameSite cookie protection
- **OWASP**: A01:2021 - Broken Access Control
- **Severity**: Medium

---

## Authentication Tests

### SEC-AUTH-001: Login Rate Limiting
- **File**: `test_auth.py::TestBruteForce::test_login_rate_limiting`
- **Description**: Check for brute force protection
- **OWASP**: A07:2021 - Identification Failures
- **Severity**: High

### SEC-AUTH-002: Account Lockout
- **File**: `test_auth.py::TestBruteForce::test_account_lockout`
- **Description**: Check for account lockout mechanism
- **OWASP**: A07:2021 - Identification Failures
- **Severity**: Medium

### SEC-AUTH-003: Session Fixation
- **File**: `test_auth.py::TestSessionManagement::test_session_fixation`
- **Description**: Check if session ID changes after login
- **OWASP**: A07:2021 - Identification Failures
- **Severity**: High

### SEC-AUTH-004: Session Timeout
- **File**: `test_auth.py::TestSessionManagement::test_session_timeout`
- **Description**: Check for session timeout implementation
- **OWASP**: A07:2021 - Identification Failures
- **Severity**: Medium

### SEC-AUTH-005: Weak Password Acceptance
- **File**: `test_auth.py::TestPasswordPolicy::test_weak_password_acceptance`
- **Description**: Check password strength requirements
- **OWASP**: A07:2021 - Identification Failures
- **Severity**: Medium

### SEC-AUTH-006: Password in URL
- **File**: `test_auth.py::TestPasswordPolicy::test_password_in_url`
- **Description**: Check for password exposure in GET parameters
- **OWASP**: A07:2021 - Identification Failures
- **Severity**: High

---

## Security Headers Tests

### SEC-HDR-001: HSTS Header
- **File**: `test_headers.py::TestSecurityHeaders::test_hsts_header`
- **Description**: Check HSTS implementation
- **OWASP**: A05:2021 - Security Misconfiguration
- **Severity**: Medium

### SEC-HDR-002: X-Frame-Options
- **File**: `test_headers.py::TestSecurityHeaders::test_x_frame_options`
- **Description**: Check clickjacking protection
- **OWASP**: A05:2021 - Security Misconfiguration
- **Severity**: Medium

### SEC-HDR-003: Content-Security-Policy
- **File**: `test_headers.py::TestSecurityHeaders::test_content_security_policy`
- **Description**: Check CSP implementation
- **OWASP**: A05:2021 - Security Misconfiguration
- **Severity**: High

### SEC-HDR-004: All Security Headers
- **File**: `test_headers.py::TestSecurityHeaders::test_all_security_headers`
- **Description**: Comprehensive security headers check
- **OWASP**: A05:2021 - Security Misconfiguration
- **Severity**: Medium

### SEC-HDR-005: Cache Control
- **File**: `test_headers.py::TestCacheHeaders::test_cache_control_sensitive_pages`
- **Description**: Verify sensitive pages are not cached
- **OWASP**: A05:2021 - Security Misconfiguration
- **Severity**: Low

---

## Running Tests

```bash
# Run all tests
pytest tests/ -v

# Run by category
pytest tests/test_xss.py -v
pytest -m sqli -v
pytest -m auth -v

# Run high priority tests
pytest -m "not slow" -v
```
