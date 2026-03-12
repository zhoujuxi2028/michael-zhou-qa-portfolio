"""
OWASP A02:2021 - Cryptographic Failures Tests

Tests for detecting cryptographic weaknesses in DVWA including:
- Missing HTTPS / TLS configuration
- Sensitive data exposure
- Weak session token generation
- Missing secure cookie flags

Reference: https://owasp.org/Top10/A02_2021-Cryptographic_Failures/
"""

import re
import pytest
import requests


pytestmark = pytest.mark.crypto


class TestTLSConfiguration:
    """Tests for TLS/SSL configuration against DVWA."""

    @pytest.mark.xfail(reason="DVWA does not support HTTPS")
    def test_https_available(self, config):
        """
        SEC-CRYPTO-001: Site should support HTTPS.

        All web applications should be accessible over HTTPS.
        DVWA only serves HTTP - this is a cryptographic failure.
        """
        https_url = config.TARGET_URL.replace("http://", "https://")

        try:
            response = requests.get(https_url, timeout=5, verify=False)
        except (requests.exceptions.ConnectionError, requests.exceptions.SSLError) as e:
            pytest.fail(f"HTTPS not available: {e}")

        assert response.status_code < 500, f"HTTPS returned server error: {response.status_code}"

    @pytest.mark.xfail(reason="DVWA does not redirect HTTP to HTTPS")
    def test_http_to_https_redirect(self, http_session, config):
        """
        SEC-CRYPTO-002: HTTP should redirect to HTTPS.

        Production sites must redirect all HTTP traffic to HTTPS.
        DVWA does not redirect, which is a vulnerability.
        """
        try:
            response = http_session.get(
                config.TARGET_URL,
                allow_redirects=False,
                timeout=5,
            )
        except requests.RequestException:
            pytest.skip("Target not available")

        location = response.headers.get("Location", "")
        assert location.startswith("https://"), (
            f"No HTTPS redirect (status={response.status_code}, location='{location}')"
        )

    @pytest.mark.xfail(reason="DVWA does not set HSTS header")
    def test_hsts_header_present(self, http_session, config):
        """
        SEC-CRYPTO-003: Site should set HSTS header.

        HSTS (Strict-Transport-Security) prevents protocol downgrade attacks.
        DVWA does not set this header.
        """
        try:
            response = http_session.get(config.TARGET_URL, timeout=5)
        except requests.RequestException:
            pytest.skip("Target not available")

        hsts = response.headers.get("Strict-Transport-Security")
        assert hsts is not None, "HSTS header missing"
        assert "max-age=" in hsts, f"HSTS missing max-age directive: {hsts}"


class TestSensitiveDataExposure:
    """Tests for sensitive data exposure in DVWA."""

    def test_login_form_uses_post(self, http_session, config):
        """
        SEC-CRYPTO-004: Verify login form uses POST, not GET.

        GET would expose credentials in URL / server logs / browser history.
        """
        login_url = f"{config.DVWA_URL}/login.php"

        try:
            response = http_session.get(login_url, timeout=5)
        except requests.RequestException:
            pytest.skip("Target not available")

        html_lower = response.text.lower()
        assert 'method="get"' not in html_lower, "Login form uses GET - passwords exposed in URL"
        assert 'method="post"' in html_lower, "Login form should explicitly use POST"

    def test_password_field_not_in_query_params(self, dvwa_session, config):
        """
        SEC-CRYPTO-005: Verify login does not leak password in URL.

        After POST login, the response/redirect should not contain password in URL.
        """
        if dvwa_session is None:
            pytest.skip("DVWA not available")

        response = dvwa_session.get(f"{config.DVWA_URL}/index.php", timeout=5)
        assert "password=" not in response.url, f"Password leaked in URL: {response.url}"

    def test_autocomplete_on_password_fields(self, http_session, config):
        """
        SEC-CRYPTO-006: Password fields should have autocomplete="off".

        Prevents browsers from caching credentials.
        """
        login_url = f"{config.TARGET_URL}/login.php"

        try:
            response = http_session.get(login_url, timeout=5)
        except requests.RequestException:
            pytest.skip("Target not available")

        html_lower = response.text.lower()
        password_inputs = re.findall(r'<input[^>]*type=["\']password["\'][^>]*>', html_lower)
        assert len(password_inputs) > 0, "No password field found on login page"

        has_autocomplete_off = any(
            'autocomplete="off"' in inp or 'autocomplete="new-password"' in inp
            for inp in password_inputs
        )
        assert has_autocomplete_off, (
            f"Password field missing autocomplete='off': {password_inputs}"
        )


class TestWeakCryptography:
    """Tests for weak cryptographic implementations in DVWA."""

    def test_session_token_length(self, dvwa_session, config):
        """
        SEC-CRYPTO-007: Verify session token has sufficient length.

        Session tokens should be at least 26 characters (PHP default)
        to resist brute-force attacks.
        """
        if dvwa_session is None:
            pytest.skip("DVWA not available")

        session_id = dvwa_session.cookies.get("PHPSESSID", "")
        assert session_id, "No PHPSESSID cookie found"
        assert len(session_id) >= 26, (
            f"Session ID too short ({len(session_id)} chars), vulnerable to brute-force"
        )

    def test_session_token_not_predictable(self, dvwa_session, config):
        """
        SEC-CRYPTO-008: Verify session token is not purely numeric or sequential.

        Predictable tokens can be guessed by attackers.
        """
        if dvwa_session is None:
            pytest.skip("DVWA not available")

        session_id = dvwa_session.cookies.get("PHPSESSID", "")
        assert session_id, "No PHPSESSID cookie found"
        assert not session_id.isdigit(), "Session ID is numeric only - predictable"
        assert not session_id.isalpha(), "Session ID is alphabetic only - weak entropy"

    @pytest.mark.xfail(reason="DVWA does not set Secure flag on cookies (HTTP only)")
    def test_cookie_secure_flag(self, http_session, config):
        """
        SEC-CRYPTO-009: Cookies should have Secure flag.

        The Secure flag ensures cookies are only sent over HTTPS.
        DVWA runs on HTTP so it does not set this flag.
        """
        try:
            response = http_session.get(f"{config.DVWA_URL}/login.php", timeout=5)
        except requests.RequestException:
            pytest.skip("Target not available")

        set_cookie = response.headers.get("Set-Cookie", "")
        assert set_cookie, "No Set-Cookie header returned from login.php"
        assert "secure" in set_cookie.lower(), (
            f"Cookie missing Secure flag: {set_cookie}"
        )


class TestDataInTransit:
    """Tests for data-in-transit protection."""

    @pytest.mark.xfail(reason="DVWA does not set Cache-Control: no-store on sensitive pages")
    def test_sensitive_pages_cache_headers(self, http_session, config):
        """
        SEC-CRYPTO-010: Sensitive pages should set Cache-Control: no-store.

        Prevents credential caching by browsers and proxies.
        DVWA does not set proper cache headers.
        """
        sensitive_paths = ["/login.php", "/setup.php"]
        results = {}

        for path in sensitive_paths:
            url = f"{config.DVWA_URL}{path}"
            try:
                response = http_session.get(url, timeout=5)
                cache_control = response.headers.get("Cache-Control", "")
                results[path] = cache_control
            except requests.RequestException:
                continue

        assert results, "Could not reach any sensitive page"

        missing_no_store = [
            path for path, cc in results.items()
            if "no-store" not in cc.lower()
        ]
        assert not missing_no_store, (
            f"Sensitive pages cacheable (missing no-store): {missing_no_store}"
        )
