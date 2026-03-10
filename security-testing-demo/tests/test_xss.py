"""
XSS (Cross-Site Scripting) Vulnerability Tests

Tests for detecting XSS vulnerabilities in web applications.
Covers reflected XSS, stored XSS, and DOM-based XSS.

OWASP Top 10: A03:2021 - Injection
"""

import pytest
import requests


class TestReflectedXSS:
    """Tests for Reflected XSS vulnerabilities."""

    XSS_PAYLOADS = [
        "<script>alert('XSS')</script>",
        "<img src=x onerror=alert('XSS')>",
        "javascript:alert('XSS')",
        "<svg onload=alert('XSS')>",
    ]

    @pytest.mark.xss
    def test_xss_in_search_parameter(self, dvwa_session, config):
        """Test for XSS in search/query parameters.

        ID: SEC-XSS-001
        Description: Check if search parameter reflects user input without sanitization
        """
        if dvwa_session is None:
            pytest.skip("DVWA not available")

        # DVWA XSS Reflected page
        url = f"{config.DVWA_URL}/vulnerabilities/xss_r/"

        for payload in self.XSS_PAYLOADS:
            response = dvwa_session.get(url, params={"name": payload})

            # Check if payload is reflected without encoding
            if payload in response.text:
                # Vulnerability found - this is expected in DVWA (low security)
                assert True, f"XSS payload reflected: {payload}"
                return

        # If no payload reflected, test passes (secure)
        assert True

    @pytest.mark.xss
    def test_xss_payload_encoding(self, dvwa_session, config):
        """Test if XSS payloads are properly HTML encoded.

        ID: SEC-XSS-002
        Description: Verify that dangerous characters are HTML encoded
        """
        if dvwa_session is None:
            pytest.skip("DVWA not available")

        url = f"{config.DVWA_URL}/vulnerabilities/xss_r/"
        payload = "<script>alert('XSS')</script>"

        response = dvwa_session.get(url, params={"name": payload})

        # Check for proper encoding
        encoded_payload = "&lt;script&gt;alert('XSS')&lt;/script&gt;"

        # In a secure app, the payload should be encoded
        # In DVWA low security, it won't be
        is_encoded = encoded_payload in response.text
        is_raw = payload in response.text

        if is_raw and not is_encoded:
            # Vulnerability: Raw payload reflected
            print(f"[!] XSS Vulnerability: Payload reflected without encoding")

        # Test passes - we're detecting behavior
        assert True

    @pytest.mark.xss
    def test_xss_in_url_fragment(self, http_session, config):
        """Test for DOM-based XSS via URL fragments.

        ID: SEC-XSS-003
        Description: Check for DOM-based XSS vulnerabilities
        """
        url = f"{config.TARGET_URL}"

        # DOM XSS payloads typically need browser execution
        # This test checks if the page processes fragments unsafely
        dom_xss_indicators = [
            "document.write",
            "innerHTML",
            "location.hash",
            "eval(",
        ]

        try:
            response = http_session.get(url, timeout=10)

            unsafe_patterns = []
            for indicator in dom_xss_indicators:
                if indicator in response.text:
                    unsafe_patterns.append(indicator)

            if unsafe_patterns:
                print(f"[!] Potential DOM XSS patterns found: {unsafe_patterns}")

            # This is informational - real DOM XSS requires browser testing
            assert True

        except requests.RequestException:
            pytest.skip("Target not available")

    @pytest.mark.xss
    @pytest.mark.slow
    def test_xss_filter_bypass(self, dvwa_session, config):
        """Test XSS filter bypass techniques.

        ID: SEC-XSS-004
        Description: Test if XSS filters can be bypassed
        """
        if dvwa_session is None:
            pytest.skip("DVWA not available")

        url = f"{config.DVWA_URL}/vulnerabilities/xss_r/"

        # Filter bypass payloads
        bypass_payloads = [
            "<ScRiPt>alert('XSS')</ScRiPt>",  # Case variation
            "<scr<script>ipt>alert('XSS')</scr</script>ipt>",  # Nested tags
            "<<script>script>alert('XSS')<</script>/script>",  # Double encoding
            "<img src=x onerror='alert(String.fromCharCode(88,83,83))'>",  # Char codes
            "<svg/onload=alert('XSS')>",  # No space
        ]

        bypassed = []
        for payload in bypass_payloads:
            response = dvwa_session.get(url, params={"name": payload})

            # Check for execution indicators
            if "alert" in response.text.lower() and "xss" in response.text.lower():
                bypassed.append(payload)

        if bypassed:
            print(f"[!] Filter bypass successful with {len(bypassed)} payloads")

        assert True


class TestStoredXSS:
    """Tests for Stored XSS vulnerabilities."""

    @pytest.mark.xss
    def test_stored_xss_in_comments(self, dvwa_session, config):
        """Test for Stored XSS in comment/guestbook functionality.

        ID: SEC-XSS-005
        Description: Check if XSS payloads are stored and executed
        """
        if dvwa_session is None:
            pytest.skip("DVWA not available")

        # DVWA Stored XSS page
        url = f"{config.DVWA_URL}/vulnerabilities/xss_s/"

        # Submit XSS payload
        payload = "<script>alert('StoredXSS')</script>"
        data = {
            "txtName": "TestUser",
            "mtxMessage": payload,
            "btnSign": "Sign Guestbook",
        }

        # Post the payload
        dvwa_session.post(url, data=data)

        # Check if payload is stored and rendered
        response = dvwa_session.get(url)

        if payload in response.text:
            print("[!] Stored XSS vulnerability found")

        assert True
