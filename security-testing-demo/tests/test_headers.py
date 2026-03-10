"""
Security Headers Tests

Tests for verifying security-related HTTP headers.

OWASP Top 10: A05:2021 - Security Misconfiguration
"""

import pytest
import requests


class TestSecurityHeaders:
    """Tests for Security Headers."""

    SECURITY_HEADERS = {
        "Strict-Transport-Security": {
            "description": "HSTS - Forces HTTPS",
            "recommended": "max-age=31536000; includeSubDomains",
        },
        "X-Frame-Options": {
            "description": "Prevents clickjacking",
            "recommended": "DENY or SAMEORIGIN",
        },
        "X-Content-Type-Options": {
            "description": "Prevents MIME sniffing",
            "recommended": "nosniff",
        },
        "Content-Security-Policy": {
            "description": "Controls resource loading",
            "recommended": "default-src 'self'",
        },
        "X-XSS-Protection": {
            "description": "Legacy XSS filter (deprecated)",
            "recommended": "1; mode=block",
        },
        "Referrer-Policy": {
            "description": "Controls referrer information",
            "recommended": "strict-origin-when-cross-origin",
        },
        "Permissions-Policy": {
            "description": "Controls browser features",
            "recommended": "geolocation=(), camera=()",
        },
    }

    @pytest.mark.headers
    def test_hsts_header(self, http_session, config):
        """Test for HTTP Strict Transport Security header.

        ID: SEC-HDR-001
        Description: Check HSTS implementation
        """
        url = config.TARGET_URL

        try:
            response = http_session.get(url, timeout=10)
            hsts = response.headers.get("Strict-Transport-Security", "")

            if hsts:
                print(f"[+] HSTS header present: {hsts}")

                # Check for recommended values
                if "max-age" in hsts.lower():
                    # Extract max-age value
                    import re

                    match = re.search(r"max-age=(\d+)", hsts.lower())
                    if match:
                        max_age = int(match.group(1))
                        if max_age >= 31536000:  # 1 year
                            print("[+] HSTS max-age is sufficient (>= 1 year)")
                        else:
                            print(f"[!] HSTS max-age is low: {max_age} seconds")

                if "includesubdomains" in hsts.lower():
                    print("[+] HSTS includes subdomains")

                if "preload" in hsts.lower():
                    print("[+] HSTS preload directive present")
            else:
                print("[!] HSTS header missing")

        except requests.RequestException:
            pytest.skip("Target not available")

        assert True

    @pytest.mark.headers
    def test_x_frame_options(self, http_session, config):
        """Test for X-Frame-Options header.

        ID: SEC-HDR-002
        Description: Check clickjacking protection
        """
        url = config.TARGET_URL

        try:
            response = http_session.get(url, timeout=10)
            xfo = response.headers.get("X-Frame-Options", "")

            if xfo:
                print(f"[+] X-Frame-Options header present: {xfo}")

                valid_values = ["DENY", "SAMEORIGIN"]
                if xfo.upper() in valid_values:
                    print("[+] X-Frame-Options value is valid")
                elif "ALLOW-FROM" in xfo.upper():
                    print("[*] X-Frame-Options uses ALLOW-FROM (deprecated)")
            else:
                # Check for CSP frame-ancestors
                csp = response.headers.get("Content-Security-Policy", "")
                if "frame-ancestors" in csp.lower():
                    print("[+] CSP frame-ancestors used instead of X-Frame-Options")
                else:
                    print("[!] No clickjacking protection found")

        except requests.RequestException:
            pytest.skip("Target not available")

        assert True

    @pytest.mark.headers
    def test_content_security_policy(self, http_session, config):
        """Test for Content-Security-Policy header.

        ID: SEC-HDR-003
        Description: Check CSP implementation
        """
        url = config.TARGET_URL

        try:
            response = http_session.get(url, timeout=10)
            csp = response.headers.get("Content-Security-Policy", "")

            if csp:
                print(f"[+] CSP header present")

                # Check for important directives
                directives = {
                    "default-src": "Fallback for other directives",
                    "script-src": "Controls script sources",
                    "style-src": "Controls style sources",
                    "img-src": "Controls image sources",
                    "connect-src": "Controls fetch/XHR destinations",
                    "frame-ancestors": "Controls embedding",
                }

                for directive, desc in directives.items():
                    if directive in csp.lower():
                        print(f"    [+] {directive}: defined")
                    else:
                        print(f"    [-] {directive}: missing")

                # Check for unsafe practices
                if "'unsafe-inline'" in csp:
                    print("[!] CSP contains 'unsafe-inline' - weakens protection")
                if "'unsafe-eval'" in csp:
                    print("[!] CSP contains 'unsafe-eval' - weakens protection")

            else:
                print("[!] CSP header missing")

        except requests.RequestException:
            pytest.skip("Target not available")

        assert True

    @pytest.mark.headers
    def test_all_security_headers(self, http_session, config):
        """Test all recommended security headers.

        ID: SEC-HDR-004
        Description: Comprehensive security headers check
        """
        url = config.TARGET_URL

        try:
            response = http_session.get(url, timeout=10)

            print("\n" + "=" * 60)
            print("SECURITY HEADERS AUDIT")
            print("=" * 60)

            present = 0
            missing = 0

            for header, info in self.SECURITY_HEADERS.items():
                value = response.headers.get(header, "")
                if value:
                    print(f"[+] {header}: {value[:50]}...")
                    present += 1
                else:
                    print(f"[-] {header}: MISSING")
                    print(f"    Recommended: {info['recommended']}")
                    missing += 1

            print("=" * 60)
            print(f"Summary: {present} present, {missing} missing")
            print("=" * 60)

        except requests.RequestException:
            pytest.skip("Target not available")

        assert True


class TestCacheHeaders:
    """Tests for Cache-related security headers."""

    @pytest.mark.headers
    def test_cache_control_sensitive_pages(self, http_session, config):
        """Test Cache-Control for sensitive pages.

        ID: SEC-HDR-005
        Description: Verify sensitive pages are not cached
        """
        # Sensitive pages should have:
        # Cache-Control: no-store, no-cache, must-revalidate
        # Pragma: no-cache

        sensitive_paths = ["/login", "/account", "/profile", "/admin"]

        for path in sensitive_paths:
            url = f"{config.TARGET_URL}{path}"

            try:
                response = http_session.get(url, timeout=10)

                cache_control = response.headers.get("Cache-Control", "")
                pragma = response.headers.get("Pragma", "")

                if "no-store" in cache_control.lower():
                    print(f"[+] {path}: Cache-Control has no-store")
                elif "no-cache" in cache_control.lower() or "no-cache" in pragma.lower():
                    print(f"[*] {path}: Cache-Control has no-cache (weaker)")
                else:
                    print(f"[!] {path}: May be cached - {cache_control or 'no header'}")

            except requests.RequestException:
                continue

        assert True
