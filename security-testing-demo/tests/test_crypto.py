"""
OWASP A02:2021 - Cryptographic Failures Tests

Tests for detecting cryptographic weaknesses including:
- Weak TLS/SSL configuration
- Sensitive data exposure
- Weak encryption algorithms
- Missing encryption

Reference: https://owasp.org/Top10/A02_2021-Cryptographic_Failures/
"""

import ssl
import socket
import pytest
import requests


pytestmark = pytest.mark.crypto


class TestTLSConfiguration:
    """Tests for TLS/SSL configuration."""

    def test_https_available(self, config):
        """
        Test if HTTPS is available.

        ID: SEC-CRYPTO-001
        Sites should support HTTPS for secure communication.
        """
        # Note: Local test environments typically don't have HTTPS
        # This test is designed for production sites

        https_url = config.TARGET_URL.replace("http://", "https://")

        try:
            response = requests.get(https_url, timeout=5, verify=False)
            print(f"[+] HTTPS available: {https_url}")
            assert True
        except requests.exceptions.SSLError as e:
            print(f"[!] SSL Error: {e}")
            assert True  # Informational
        except requests.exceptions.ConnectionError:
            print(f"[*] HTTPS not available (expected for local testing)")
            assert True

    def test_http_to_https_redirect(self, http_session, config):
        """
        Test if HTTP redirects to HTTPS.

        ID: SEC-CRYPTO-002
        Production sites should redirect HTTP to HTTPS.
        """
        try:
            # Don't follow redirects
            response = http_session.get(
                config.TARGET_URL,
                allow_redirects=False,
                timeout=5,
            )

            if response.status_code in [301, 302, 307, 308]:
                location = response.headers.get("Location", "")
                if location.startswith("https://"):
                    print(f"[+] HTTP redirects to HTTPS: {location}")
                else:
                    print(f"[*] Redirect to: {location}")
            else:
                print("[*] No HTTPS redirect (expected for local testing)")

            assert True

        except requests.RequestException:
            pytest.skip("Target not available")

    def test_hsts_header(self, http_session, config):
        """
        Test for HTTP Strict Transport Security header.

        ID: SEC-CRYPTO-003
        HSTS prevents protocol downgrade attacks.
        """
        try:
            response = http_session.get(config.TARGET_URL, timeout=5)
            hsts = response.headers.get("Strict-Transport-Security", "")

            if hsts:
                print(f"[+] HSTS enabled: {hsts}")

                # Check for recommended values
                if "max-age=31536000" in hsts or int(hsts.split("max-age=")[1].split(";")[0]) >= 31536000:
                    print("[+] HSTS max-age is at least 1 year")
                if "includeSubDomains" in hsts:
                    print("[+] HSTS includes subdomains")
                if "preload" in hsts:
                    print("[+] HSTS preload enabled")
            else:
                print("[!] HSTS header missing")

            assert True

        except requests.RequestException:
            pytest.skip("Target not available")


class TestSensitiveDataExposure:
    """Tests for sensitive data exposure."""

    def test_password_in_url(self, http_session, config):
        """
        Test if passwords are transmitted in URL.

        ID: SEC-CRYPTO-004
        Passwords should never appear in URLs.
        """
        # Check login form method
        login_url = f"{config.DVWA_URL}/login.php"

        try:
            response = http_session.get(login_url, timeout=5)

            # Check for GET method in login forms
            if 'method="get"' in response.text.lower():
                print("[!] Login form uses GET - passwords may be in URL")
            elif 'method="post"' in response.text.lower():
                print("[+] Login form uses POST")
            else:
                print("[*] Could not determine form method")

            assert True

        except requests.RequestException:
            pytest.skip("Target not available")

    def test_sensitive_data_in_response(self, dvwa_session, config):
        """
        Test for sensitive data in HTTP responses.

        ID: SEC-CRYPTO-005
        Responses should not contain sensitive data like passwords.
        """
        if dvwa_session is None:
            pytest.skip("DVWA not available")

        # Access a page and check for sensitive data patterns
        url = f"{config.DVWA_URL}/index.php"
        response = dvwa_session.get(url)

        sensitive_patterns = [
            "password=",
            "passwd=",
            "secret=",
            "api_key=",
            "apikey=",
            "token=",  # Careful - this may have false positives
        ]

        found = []
        for pattern in sensitive_patterns:
            if pattern in response.text.lower():
                found.append(pattern)

        if found:
            print(f"[!] Potential sensitive data in response: {found}")
        else:
            print("[+] No obvious sensitive data patterns found")

        assert True

    def test_autocomplete_on_sensitive_fields(self, http_session, config):
        """
        Test if autocomplete is disabled on sensitive fields.

        ID: SEC-CRYPTO-006
        Password fields should have autocomplete="off".
        """
        login_url = f"{config.TARGET_URL}/login.php"

        try:
            response = http_session.get(login_url, timeout=5)

            # Check for autocomplete settings
            if 'autocomplete="off"' in response.text.lower():
                print("[+] Autocomplete disabled on form/fields")
            elif 'autocomplete="new-password"' in response.text.lower():
                print("[+] Autocomplete set to new-password")
            else:
                print("[*] No autocomplete attribute found")

            assert True

        except requests.RequestException:
            pytest.skip("Target not available")


class TestWeakCryptography:
    """Tests for weak cryptographic implementations."""

    def test_weak_session_token(self, dvwa_session, config):
        """
        Test for weak session token generation.

        ID: SEC-CRYPTO-007
        Session tokens should be sufficiently random.
        """
        if dvwa_session is None:
            pytest.skip("DVWA not available")

        session_id = dvwa_session.cookies.get("PHPSESSID", "")

        if session_id:
            # Check session ID length (should be at least 128 bits = 32 hex chars)
            if len(session_id) >= 26:  # PHP default is 26+ chars
                print(f"[+] Session ID length: {len(session_id)} chars")
            else:
                print(f"[!] Session ID may be too short: {len(session_id)} chars")

            # Check for predictable patterns
            if session_id.isdigit():
                print("[!] Session ID is numeric only - may be predictable")
            elif session_id.isalpha():
                print("[!] Session ID is alphabetic only")
            else:
                print("[+] Session ID contains mixed characters")
        else:
            print("[*] No session cookie found")

        assert True

    def test_cookie_security_flags(self, http_session, config):
        """
        Test for secure cookie flags.

        ID: SEC-CRYPTO-008
        Cookies should have Secure and HttpOnly flags.
        """
        try:
            response = http_session.get(config.TARGET_URL, timeout=5)
            set_cookie = response.headers.get("Set-Cookie", "")

            flags = {
                "Secure": "secure" in set_cookie.lower(),
                "HttpOnly": "httponly" in set_cookie.lower(),
                "SameSite": "samesite" in set_cookie.lower(),
            }

            print("\n=== Cookie Security Flags ===")
            for flag, present in flags.items():
                status = "[+]" if present else "[!]"
                print(f"{status} {flag}: {'Present' if present else 'Missing'}")

            assert True

        except requests.RequestException:
            pytest.skip("Target not available")


class TestDataInTransit:
    """Tests for data in transit protection."""

    def test_mixed_content(self, http_session, config):
        """
        Test for mixed content issues.

        ID: SEC-CRYPTO-009
        HTTPS pages should not load HTTP resources.
        """
        try:
            response = http_session.get(config.TARGET_URL, timeout=5)

            # Check for HTTP resources in HTTPS page
            http_resources = []
            patterns = [
                'src="http://',
                "src='http://",
                'href="http://',
                "href='http://",
            ]

            for pattern in patterns:
                if pattern in response.text:
                    http_resources.append(pattern)

            if http_resources:
                print(f"[!] Potential mixed content: {http_resources}")
            else:
                print("[+] No obvious mixed content found")

            assert True

        except requests.RequestException:
            pytest.skip("Target not available")

    def test_cache_control_sensitive_pages(self, http_session, config):
        """
        Test Cache-Control headers for sensitive pages.

        ID: SEC-CRYPTO-010
        Sensitive pages should not be cached.
        """
        sensitive_paths = ["/login.php", "/setup.php"]

        for path in sensitive_paths:
            url = f"{config.DVWA_URL}{path}"

            try:
                response = http_session.get(url, timeout=5)
                cache_control = response.headers.get("Cache-Control", "")
                pragma = response.headers.get("Pragma", "")

                if "no-store" in cache_control.lower():
                    print(f"[+] {path}: no-store (best)")
                elif "no-cache" in cache_control.lower() or "no-cache" in pragma.lower():
                    print(f"[*] {path}: no-cache (acceptable)")
                else:
                    print(f"[!] {path}: May be cached - {cache_control or 'no header'}")

            except requests.RequestException:
                continue

        assert True
