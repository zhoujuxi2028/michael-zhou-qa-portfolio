"""
OWASP A09:2021 - Security Logging and Monitoring Failures Tests

Tests for detecting logging and monitoring issues including:
- Log injection vulnerabilities
- Sensitive data in logs
- Missing security events
- Insufficient monitoring

Reference: https://owasp.org/Top10/A09_2021-Security_Logging_and_Monitoring_Failures/
"""

import pytest
import requests

pytestmark = pytest.mark.logging


class TestLogInjection:
    """Tests for log injection vulnerabilities."""

    def test_crlf_injection(self, http_session, config):
        """
        Test for CRLF injection in headers.

        ID: SEC-LOG-003
        CRLF can be used to inject log entries or headers.
        """
        # CRLF payloads
        crlf_payloads = [
            "test%0d%0aX-Injected: true",
            "test\r\nSet-Cookie: injected=true",
            "test%0d%0aContent-Length: 0%0d%0a%0d%0aInjected",
        ]

        crlf_injected = False
        checked = 0
        for payload in crlf_payloads:
            try:
                response = http_session.get(
                    f"{config.TARGET_URL}?param={payload}",
                    timeout=5,
                )
                checked += 1

                if "X-Injected" in str(response.headers):
                    print("[!] CRLF injection successful")
                    crlf_injected = True

            except requests.RequestException:
                pass

        if not checked:
            pytest.skip("Target not available")

        print("[*] CRLF injection test completed")
        assert not crlf_injected, "CRLF injection should not be possible"


class TestSensitiveDataInLogs:
    """Tests for sensitive data exposure in logs."""

    def test_password_not_in_url(self, http_session, config):
        """
        Test that passwords are not sent in URL (would appear in logs).

        ID: SEC-LOG-004
        Passwords in URLs are logged by web servers.
        """
        login_url = f"{config.DVWA_URL}/login.php"

        try:
            response = http_session.get(login_url, timeout=5)

            # Check form method
            if 'method="post"' in response.text.lower():
                print("[+] Login form uses POST (good)")
            elif 'method="get"' in response.text.lower():
                print("[!] Login form uses GET - passwords may be logged")
            else:
                print("[*] Could not determine form method")

        except requests.RequestException:
            pytest.skip("Target not available")

        uses_post = 'method="post"' in response.text.lower()
        assert uses_post, "Login form should use POST method to avoid password in URL/logs"

    def test_error_messages_not_verbose(self, dvwa_session, config):
        """
        Test that error messages don't expose sensitive info.

        ID: SEC-LOG-005
        Verbose errors can leak information.
        """
        if dvwa_session is None:
            pytest.skip("DVWA not available")

        # Trigger an error
        error_urls = [
            f"{config.DVWA_URL}/nonexistent.php",
            f"{config.DVWA_URL}/vulnerabilities/sqli/?id='",
        ]

        sensitive_patterns = [
            "/var/www",
            "/home/",
            "stack trace",
            "mysqli_",
            "file_get_contents",
            "include(",
        ]

        all_found = []
        for url in error_urls:
            try:
                response = dvwa_session.get(url, timeout=5)

                found = []
                for pattern in sensitive_patterns:
                    if pattern.lower() in response.text.lower():
                        found.append(pattern)

                if found:
                    print(f"[!] Sensitive info in error: {found}")
                    all_found.extend(found)

            except requests.RequestException:
                pass

        assert not all_found, f"Error messages should not expose sensitive info: {all_found}"


class TestSecurityEventLogging:
    """Tests for security event logging."""

    def test_failed_login_response(self, http_session, config):
        """
        Test response to failed login attempts.

        ID: SEC-LOG-006
        Failed logins should be logged (we test the response).
        """
        login_url = f"{config.DVWA_URL}/login.php"

        try:
            # Send failed login
            response = http_session.post(
                login_url,
                data={"username": "admin", "password": "wrongpassword", "Login": "Login"},
                timeout=5,
            )

            # Check response - DVWA shows login form again on failure
            if "login failed" in response.text.lower():
                print("[+] Failed login detected: explicit error message")
                detected = True
            elif response.status_code == 401:
                print("[+] Failed login detected: 401 status")
                detected = True
            elif "login" in response.text.lower() and "password" in response.text.lower():
                # Login form shown again = login was rejected
                print("[+] Failed login detected: login form re-displayed")
                detected = True
            else:
                print("[*] Failed login handling unclear")
                detected = False

        except requests.RequestException:
            pytest.skip("Target not available")

        assert detected, "Failed login should be detected in response"

    def test_brute_force_detection(self, http_session, config):
        """
        Test for brute force detection.

        ID: SEC-LOG-007
        Multiple failed logins should trigger protection.
        """
        login_url = f"{config.DVWA_URL}/login.php"

        blocked = False
        for i in range(5):
            try:
                response = http_session.post(
                    login_url,
                    data={"username": "admin", "password": f"wrong{i}", "Login": "Login"},
                    timeout=5,
                )

                if response.status_code == 429:
                    blocked = True
                    break
                if "blocked" in response.text.lower() or "locked" in response.text.lower():
                    blocked = True
                    break

            except requests.RequestException:
                break

        if blocked:
            print("[+] Brute force protection detected")
        else:
            print("[!] No brute force protection after 5 attempts")

        # Intentionally vulnerable target: assert the finding is detected (was xfail)
        assert not blocked, 'Expected finding not detected: DVWA does not implement brute force protection'


class TestMonitoringCapabilities:
    """Tests for monitoring capabilities."""

    def test_response_time_consistency(self, http_session, config):
        """
        Test response time consistency (timing attacks).

        ID: SEC-LOG-008
        Inconsistent timing can indicate vulnerabilities.
        """
        import time

        login_url = f"{config.DVWA_URL}/login.php"

        times = []
        for _ in range(3):
            try:
                start = time.time()
                http_session.post(
                    login_url,
                    data={"username": "admin", "password": "wrongpassword", "Login": "Login"},
                    timeout=5,
                )
                elapsed = time.time() - start
                times.append(elapsed)
            except requests.RequestException:
                pass

        if times:
            avg_time = sum(times) / len(times)
            variance = max(times) - min(times)

            print(f"[*] Average response time: {avg_time:.3f}s")
            print(f"[*] Time variance: {variance:.3f}s")

            if variance > 0.5:
                print("[!] High timing variance - potential timing attack vector")

        if not times:
            pytest.skip("Target not available")
        assert variance < 1.0, f"Response time variance too high: {variance:.3f}s"

    def test_security_headers_present(self, http_session, config):
        """
        Test for security headers that aid monitoring.

        ID: SEC-LOG-009
        Security headers help with monitoring and protection.
        """
        try:
            response = http_session.get(config.TARGET_URL, timeout=5)

            monitoring_headers = {
                "X-Request-Id": "Request tracking",
                "X-Correlation-Id": "Request correlation",
                "Report-To": "CSP reporting",
                "NEL": "Network Error Logging",
            }

            print("\n=== Monitoring-Related Headers ===")
            for header, desc in monitoring_headers.items():
                value = response.headers.get(header, "")
                if value:
                    print(f"[+] {header}: {value[:50]}")
                else:
                    print(f"[-] {header}: Not present ({desc})")

            present_headers = [h for h in monitoring_headers if response.headers.get(h)]

        except requests.RequestException:
            pytest.skip("Target not available")

        # Intentionally vulnerable target: assert the finding is detected (was xfail)
        assert not present_headers, 'Expected finding not detected: DVWA does not set monitoring-related headers'


class TestAuditCapabilities:
    """Tests for audit trail capabilities."""

    def test_session_tracking(self, dvwa_session, config):
        """
        Test session tracking capabilities.

        ID: SEC-LOG-010
        Sessions should be trackable for audit purposes.
        """
        if dvwa_session is None:
            pytest.skip("DVWA not available")

        session_id = dvwa_session.cookies.get("PHPSESSID", "")

        if session_id:
            print(f"[+] Session ID: {session_id[:10]}...")
            print("[*] Session can be tracked for audit purposes")
        else:
            print("[!] No session cookie found")

        assert session_id, "Session cookie should be present for audit tracking"
