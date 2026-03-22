# Security Test Cases

## Overview

This document lists all security test cases implemented in this project.

## Test Summary

### DVWA Tests (Phase 1)

| Category | Test Count | OWASP Top 10 |
|----------|------------|--------------|
| XSS | 5 | A03:2021 |
| SQL Injection | 5 | A03:2021 |
| CSRF | 4 | A01:2021 |
| Authentication | 6 | A07:2021 |
| Security Headers | 5 | A05:2021 |
| **Subtotal** | **25** | |

### ZAP Integration Tests (Phase 2)

| Category | Test Count | OWASP Top 10 |
|----------|------------|--------------|
| ZAP Connection | 2 | - |
| ZAP Spider | 1 | - |
| ZAP Passive Scan | 2 | - |
| ZAP Alerts | 3 | - |
| ZAP Reports | 2 | - |
| ZAP Workflow | 3 | - |
| **Subtotal** | **13** | |

### Juice Shop Tests (Phase 4)

| Category | Test Count | OWASP Top 10 |
|----------|------------|--------------|
| API Security | 5 | A01:2021 |
| JWT Authentication | 6 | A07:2021 |
| NoSQL Injection | 5 | A03:2021 |
| Business Logic | 5 | A04:2021 |
| **Subtotal** | **21** | |

### Grand Total: **59 Tests**

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

---

## ZAP Integration Tests

### SEC-ZAP-001: ZAP Connection
- **File**: `test_zap_scan.py::TestZAPConnection::test_zap_connection`
- **Description**: Verify ZAP daemon is accessible
- **Severity**: N/A (Infrastructure)

### SEC-ZAP-002: ZAP Version
- **File**: `test_zap_scan.py::TestZAPConnection::test_zap_version`
- **Description**: Verify ZAP version is retrievable
- **Severity**: N/A (Infrastructure)

### SEC-ZAP-003: Spider Discovery
- **File**: `test_zap_scan.py::TestZAPSpider::test_spider_discovers_urls`
- **Description**: Verify spider discovers URLs on target
- **Severity**: N/A (Scanning)

### SEC-ZAP-004: Passive Scan Completion
- **File**: `test_zap_scan.py::TestZAPPassiveScan::test_passive_scan_completes`
- **Description**: Verify passive scan completes without errors
- **Severity**: N/A (Scanning)

### SEC-ZAP-005: Passive Scan Alerts
- **File**: `test_zap_scan.py::TestZAPPassiveScan::test_passive_scan_generates_alerts`
- **Description**: Verify passive scan can detect vulnerabilities
- **Severity**: N/A (Scanning)

### SEC-ZAP-006 to SEC-ZAP-013: Alert & Report Tests
- **Files**: `test_zap_scan.py::TestZAPAlerts`, `TestZAPReports`, `TestZAPBaselineScan`, `TestZAPContext`
- **Description**: Alert filtering, report generation, workflow validation, context management
- **Severity**: N/A (Infrastructure)

---

## Juice Shop API Security Tests

### SEC-API-001: Unauthorized Endpoint Access
- **File**: `test_juice_shop_api.py::TestUnauthorizedAccess::test_admin_endpoint_without_auth`
- **Description**: Verify admin endpoints require authentication
- **OWASP**: A01:2021 - Broken Access Control
- **Severity**: High

### SEC-API-002: IDOR in Basket
- **File**: `test_juice_shop_api.py::TestIDOR::test_basket_idor`
- **Description**: Test Insecure Direct Object Reference in basket access
- **OWASP**: A01:2021 - Broken Access Control
- **Severity**: High

### SEC-API-003: Error Message Disclosure
- **File**: `test_juice_shop_api.py::TestAPIInformationLeak::test_error_message_disclosure`
- **Description**: Test if error messages reveal sensitive info
- **OWASP**: A01:2021 - Broken Access Control
- **Severity**: Medium

### SEC-API-004: HTTP Method Abuse
- **File**: `test_juice_shop_api.py::TestHTTPMethodAbuse::test_options_method_disclosure`
- **Description**: Test if OPTIONS reveals too much info
- **OWASP**: A01:2021 - Broken Access Control
- **Severity**: Low

### SEC-API-005: Rate Limiting
- **File**: `test_juice_shop_api.py::TestRateLimiting::test_login_rate_limiting`
- **Description**: Test if login has rate limiting
- **OWASP**: A07:2021 - Identification Failures
- **Severity**: Medium

---

## JWT Authentication Tests

### SEC-JWT-001: JWT Signature Validation
- **File**: `test_jwt.py::TestJWTSignature::test_jwt_signature_validation`
- **Description**: Verify JWT signature is validated
- **OWASP**: A07:2021 - Identification Failures
- **Severity**: Critical

### SEC-JWT-002: None Algorithm Attack
- **File**: `test_jwt.py::TestJWTSignature::test_jwt_none_algorithm`
- **Description**: Test 'none' algorithm bypass attack
- **OWASP**: A07:2021 - Identification Failures
- **Severity**: Critical

### SEC-JWT-003: Weak Secret Detection
- **File**: `test_jwt.py::TestJWTWeakSecret::test_jwt_weak_secret_detection`
- **Description**: Check for common weak JWT secrets
- **OWASP**: A07:2021 - Identification Failures
- **Severity**: High

### SEC-JWT-004: Token Expiration
- **File**: `test_jwt.py::TestJWTExpiration::test_jwt_expiration_present`
- **Description**: Verify JWT has expiration claim
- **OWASP**: A07:2021 - Identification Failures
- **Severity**: Medium

### SEC-JWT-005: Token Refresh Flow
- **File**: `test_jwt.py::TestJWTExpiration::test_token_refresh_flow`
- **Description**: Test if token refresh is implemented securely
- **OWASP**: A07:2021 - Identification Failures
- **Severity**: Medium

### SEC-JWT-006: JWT Not in URL
- **File**: `test_jwt.py::TestJWTStorage::test_jwt_not_in_url`
- **Description**: Verify JWT is not passed in URL
- **OWASP**: A07:2021 - Identification Failures
- **Severity**: High

---

## NoSQL Injection Tests

### SEC-NOSQL-001: Login NoSQL Injection
- **File**: `test_nosql_injection.py::TestMongoDBInjection::test_login_nosql_injection`
- **Description**: Test NoSQL injection in login endpoint
- **OWASP**: A03:2021 - Injection
- **Severity**: Critical

### SEC-NOSQL-002: Search NoSQL Injection
- **File**: `test_nosql_injection.py::TestMongoDBInjection::test_search_nosql_injection`
- **Description**: Test NoSQL injection in search
- **OWASP**: A03:2021 - Injection
- **Severity**: High

### SEC-NOSQL-003: $ne Operator Injection
- **File**: `test_nosql_injection.py::TestOperatorInjection::test_ne_operator_injection`
- **Description**: Test $ne operator injection bypass
- **OWASP**: A03:2021 - Injection
- **Severity**: Critical

### SEC-NOSQL-004: $gt Operator Injection
- **File**: `test_nosql_injection.py::TestOperatorInjection::test_gt_operator_injection`
- **Description**: Test $gt operator injection
- **OWASP**: A03:2021 - Injection
- **Severity**: High

### SEC-NOSQL-005: JSON Injection
- **File**: `test_nosql_injection.py::TestJSONInjection::test_json_injection_in_review`
- **Description**: Test JSON injection in review submission
- **OWASP**: A03:2021 - Injection
- **Severity**: Medium

---

## Business Logic Tests

### SEC-BL-001: Negative Quantity Purchase
- **File**: `test_business_logic.py::TestNegativeQuantity::test_negative_quantity_in_basket`
- **Description**: Test negative quantity purchase for credit
- **OWASP**: A04:2021 - Insecure Design
- **Severity**: High

### SEC-BL-002: Coupon Reuse
- **File**: `test_business_logic.py::TestCouponAbuse::test_coupon_reuse`
- **Description**: Test coupon code reuse
- **OWASP**: A04:2021 - Insecure Design
- **Severity**: Medium

### SEC-BL-003: Price Manipulation
- **File**: `test_business_logic.py::TestPriceManipulation::test_checkout_price_tampering`
- **Description**: Test price tampering during checkout
- **OWASP**: A04:2021 - Insecure Design
- **Severity**: Critical

### SEC-BL-004: Privilege Escalation
- **File**: `test_business_logic.py::TestPrivilegeEscalation::test_role_modification_api`
- **Description**: Test user role modification
- **OWASP**: A04:2021 - Insecure Design
- **Severity**: Critical

### SEC-BL-005: Admin Section Access
- **File**: `test_business_logic.py::TestPrivilegeEscalation::test_access_admin_section`
- **Description**: Verify admin endpoints require proper authorization
- **OWASP**: A04:2021 - Insecure Design
- **Severity**: High

---

## Running Tests

```bash
# Run all tests
pytest tests/ -v

# Run by category
pytest tests/test_xss.py -v
pytest -m sqli -v
pytest -m auth -v

# Run Juice Shop tests
pytest -m juice_shop -v
pytest tests/test_juice_shop_api.py tests/test_jwt.py -v

# Run ZAP integration tests
pytest -m zap -v

# Run high priority tests
pytest -m "not slow" -v

# Run tests by OWASP category
pytest -m "api or jwt" -v  # A07 tests
pytest -m "nosql" -v        # A03 tests
pytest -m "business_logic" -v  # A04 tests
```
