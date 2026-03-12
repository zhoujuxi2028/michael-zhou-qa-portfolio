"""
CSRF (Cross-Site Request Forgery) Vulnerability Tests

Tests for detecting CSRF vulnerabilities in web applications.

OWASP Top 10: A01:2021 - Broken Access Control
"""

import pytest
import requests


class TestCSRF:
    """Tests for CSRF vulnerabilities."""

    @pytest.mark.csrf
    @pytest.mark.xfail(reason="DVWA low security does not enforce CSRF tokens on all forms")
    def test_csrf_token_presence(self, dvwa_session, config):
        """Test if CSRF tokens are present in forms.

        ID: SEC-CSRF-001
        Description: Check for CSRF token implementation
        """
        if dvwa_session is None:
            pytest.skip("DVWA not available")

        # Check DVWA CSRF page
        url = f"{config.DVWA_URL}/vulnerabilities/csrf/"
        response = dvwa_session.get(url)

        if "Login ::" in response.text:
            pytest.skip("DVWA session not maintained")

        # Look for CSRF token indicators
        csrf_indicators = [
            "csrf_token",
            "user_token",
            "_token",
            "authenticity_token",
            "csrfmiddlewaretoken",
            "X-CSRF-TOKEN",
        ]

        has_csrf_token = False
        for indicator in csrf_indicators:
            if indicator.lower() in response.text.lower():
                has_csrf_token = True
                print(f"[+] CSRF token found: {indicator}")
                break

        if not has_csrf_token:
            print("[!] No CSRF token found in form")

        assert has_csrf_token, "Form should contain a CSRF token"

    @pytest.mark.csrf
    def test_csrf_token_validation(self, dvwa_session, config):
        """Test if CSRF tokens are properly validated.

        ID: SEC-CSRF-002
        Description: Verify that requests without valid tokens are rejected
        """
        if dvwa_session is None:
            pytest.skip("DVWA not available")

        url = f"{config.DVWA_URL}/vulnerabilities/csrf/"

        # Try to change password without proper CSRF token
        # This simulates a CSRF attack
        malicious_data = {
            "password_new": "hacked123",
            "password_conf": "hacked123",
            "Change": "Change",
            # Intentionally omitting or using invalid CSRF token
            "user_token": "invalid_token_12345",
        }

        # In a secure application, this should fail
        response = dvwa_session.post(url, data=malicious_data)

        # Check if the attack was successful or blocked
        if "Password Changed" in response.text:
            print("[!] CSRF vulnerability: Password changed without valid token")
        else:
            print("[+] CSRF protection working: Request rejected")

        assert "Password Changed" not in response.text, "Request with invalid CSRF token should be rejected"

    @pytest.mark.csrf
    @pytest.mark.xfail(reason="DVWA does not validate Referer header")
    def test_referer_header_check(self, http_session, config):
        """Test if Referer header is validated.

        ID: SEC-CSRF-003
        Description: Check if application validates Referer header
        """
        url = f"{config.TARGET_URL}"

        # Request with missing Referer
        headers_no_referer = {"Referer": ""}

        # Request with external Referer
        headers_external = {"Referer": "https://evil.com/attack.html"}

        try:
            # Normal request
            normal_response = http_session.get(url, timeout=10)

            # Request without Referer
            no_ref_response = http_session.get(url, headers=headers_no_referer, timeout=10)

            # Request with external Referer
            ext_response = http_session.get(url, headers=headers_external, timeout=10)

            # Compare responses
            all_same = (
                len(normal_response.text) == len(no_ref_response.text) == len(ext_response.text)
            )

            if all_same:
                print("[*] Application does not validate Referer header")
            else:
                print("[+] Application may validate Referer header")

        except requests.RequestException:
            pytest.skip("Target not available")

        assert not all_same, "Application should validate Referer header"


class TestSameSiteCookie:
    """Tests for SameSite cookie attribute."""

    @pytest.mark.csrf
    @pytest.mark.xfail(reason="DVWA does not set SameSite cookie attribute")
    def test_samesite_cookie_attribute(self, http_session, config):
        """Test if session cookies have SameSite attribute.

        ID: SEC-CSRF-004
        Description: Verify SameSite cookie protection
        """
        url = f"{config.TARGET_URL}"

        try:
            response = http_session.get(url, timeout=10)

            # Check Set-Cookie headers
            cookies = response.headers.get("Set-Cookie", "")

            samesite_status = {
                "has_samesite": False,
                "samesite_strict": False,
                "samesite_lax": False,
                "samesite_none": False,
            }

            if "samesite" in cookies.lower():
                samesite_status["has_samesite"] = True

                if "samesite=strict" in cookies.lower():
                    samesite_status["samesite_strict"] = True
                    print("[+] SameSite=Strict cookie found (best protection)")
                elif "samesite=lax" in cookies.lower():
                    samesite_status["samesite_lax"] = True
                    print("[+] SameSite=Lax cookie found (default protection)")
                elif "samesite=none" in cookies.lower():
                    samesite_status["samesite_none"] = True
                    print("[!] SameSite=None cookie found (requires Secure flag)")
            else:
                print("[!] No SameSite attribute found in cookies")

            has_samesite = samesite_status["has_samesite"]
            assert has_samesite, "Session cookies should have SameSite attribute"

        except requests.RequestException:
            pytest.skip("Target not available")
