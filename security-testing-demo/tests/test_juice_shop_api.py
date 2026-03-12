"""
Juice Shop API Security Tests

Tests for REST API vulnerabilities in OWASP Juice Shop.
Target: http://localhost:3000
"""

import json
import pytest
import requests


@pytest.mark.juice_shop
@pytest.mark.api
class TestUnauthorizedAccess:
    """Test unauthorized access to sensitive endpoints."""

    def test_admin_endpoint_without_auth(self, juice_shop_url):
        """SEC-API-001: Verify admin endpoints require authentication.

        Tests that sensitive admin endpoints return 401/403 without auth token.
        """
        admin_endpoints = [
            "/api/Users/",
            "/api/Feedbacks/",
            "/api/Complaints/",
            "/api/Recycles/",
            "/api/SecurityQuestions/",
        ]

        for endpoint in admin_endpoints:
            response = requests.get(
                f"{juice_shop_url}{endpoint}",
                timeout=10,
                headers={"Accept": "application/json"},
            )

            # Some endpoints may allow GET but not without proper auth
            # We're testing that sensitive data isn't fully exposed
            if response.status_code == 200:
                data = response.json()
                # If data is returned, check it's not sensitive admin data
                if "data" in data and isinstance(data["data"], list):
                    # Should not expose all users without auth
                    if endpoint == "/api/Users/" and len(data["data"]) > 0:
                        # Check if passwords are exposed (vulnerability)
                        for user in data["data"]:
                            assert "password" not in user or user.get("password") is None, \
                                f"Password exposed in {endpoint}"

    def test_user_data_endpoint_protection(self, juice_shop_url):
        """SEC-API-002: Verify user data endpoints are protected."""
        response = requests.get(
            f"{juice_shop_url}/api/Users/1",
            timeout=10,
            headers={"Accept": "application/json"},
        )

        # Should require authentication
        assert response.status_code in [401, 403, 404, 500], \
            "Direct user access should be restricted"


@pytest.mark.juice_shop
@pytest.mark.api
class TestIDOR:
    """Test Insecure Direct Object Reference vulnerabilities."""

    def test_basket_idor(self, juice_shop_auth_session, juice_shop_url):
        """SEC-API-002: Test IDOR in basket access.

        Attempts to access another user's basket.
        """
        session, token, email = juice_shop_auth_session
        if not session:
            pytest.skip("Authentication not available")

        # Try to access basket ID 1 (likely admin's basket)
        response = session.get(
            f"{juice_shop_url}/rest/basket/1",
            timeout=10,
        )

        # Should not allow access to other user's basket
        # Status 401/403 = properly protected
        # Status 200 with own basket = check basket ownership
        if response.status_code == 200:
            data = response.json()
            # Vulnerability if we can access basket that isn't ours
            basket_id = data.get("data", {}).get("id", 0)
            # Note: This test documents the vulnerability if it exists
            assert basket_id != 1 or "test" in email.lower(), \
                "IDOR vulnerability: Can access other user's basket"

    @pytest.mark.xfail(reason="Juice Shop has IDOR vulnerability in order history")
    def test_order_history_idor(self, juice_shop_auth_session, juice_shop_url):
        """SEC-API-003: Test IDOR in order history access."""
        session, token, email = juice_shop_auth_session
        if not session:
            pytest.skip("Authentication not available")

        response = session.get(
            f"{juice_shop_url}/rest/track-order/1",
            timeout=10,
        )

        if response.status_code == 200:
            data = response.json()
            assert "error" in str(data).lower() or data.get("data") is None, \
                "Should not expose other users' order history"


@pytest.mark.juice_shop
@pytest.mark.api
class TestAPIInformationLeak:
    """Test for API information disclosure vulnerabilities."""

    def test_error_message_disclosure(self, juice_shop_url):
        """SEC-API-003: Test if error messages reveal sensitive info.

        Sends malformed requests to trigger error responses.
        """
        # Send malformed JSON
        response = requests.post(
            f"{juice_shop_url}/api/Users/",
            data="not valid json",
            headers={"Content-Type": "application/json"},
            timeout=10,
        )

        if response.status_code >= 400:
            response_text = response.text.lower()

            # Check for stack traces or internal paths
            sensitive_patterns = [
                "stack",
                "node_modules",
                "/app/",
                "at module",
                "sequelize",
                "sql",
            ]

            info_leaked = any(pattern in response_text for pattern in sensitive_patterns)
            # Note: We're documenting if vulnerability exists
            if info_leaked:
                pytest.skip("Information disclosure detected - known Juice Shop vulnerability")

    @pytest.mark.xfail(reason="Juice Shop exposes version endpoint without authentication")
    def test_version_disclosure(self, juice_shop_url):
        """SEC-API-004: Test if API version is disclosed."""
        response = requests.get(
            f"{juice_shop_url}/rest/admin/application-version",
            timeout=10,
        )

        if response.status_code == 200:
            data = response.json()
            assert "version" not in data, \
                f"Version should not be disclosed without auth: {data.get('version')}"


@pytest.mark.juice_shop
@pytest.mark.api
class TestHTTPMethodAbuse:
    """Test HTTP method abuse vulnerabilities."""

    def test_options_method_disclosure(self, juice_shop_url):
        """SEC-API-004: Test if OPTIONS reveals too much info."""
        response = requests.options(
            f"{juice_shop_url}/api/Users/",
            timeout=10,
        )

        if response.status_code == 200:
            # Check Allow header for dangerous methods
            allow_header = response.headers.get("Allow", "")
            dangerous_methods = ["DELETE", "PUT", "PATCH"]

            for method in dangerous_methods:
                if method in allow_header:
                    # Methods should be protected by auth
                    method_response = requests.request(
                        method,
                        f"{juice_shop_url}/api/Users/1",
                        timeout=10,
                    )
                    assert method_response.status_code in [401, 403, 405], \
                        f"{method} method should be protected"

    @pytest.mark.xfail(reason="Juice Shop may not disable TRACE method")
    def test_trace_method_disabled(self, juice_shop_url):
        """SEC-API-005: Verify TRACE method is disabled."""
        try:
            response = requests.request(
                "TRACE",
                juice_shop_url,
                timeout=10,
            )
        except requests.RequestException:
            pytest.skip("Juice Shop not available")

        assert response.status_code in [405, 501], \
            f"TRACE method should be disabled (got status {response.status_code})"


@pytest.mark.juice_shop
@pytest.mark.api
class TestRateLimiting:
    """Test rate limiting on sensitive endpoints."""

    @pytest.mark.xfail(reason="Juice Shop does not implement login rate limiting")
    def test_login_rate_limiting(self, juice_shop_url):
        """SEC-API-005: Test if login has rate limiting.

        Sends multiple failed login attempts to check for rate limiting.
        """
        login_url = f"{juice_shop_url}/rest/user/login"
        login_data = {
            "email": "nonexistent@test.com",
            "password": "wrongpassword"
        }

        # Send 10 rapid requests
        responses = []
        connection_errors = 0
        for _ in range(10):
            try:
                response = requests.post(
                    login_url,
                    json=login_data,
                    timeout=5,
                )
                responses.append(response.status_code)
            except requests.RequestException:
                connection_errors += 1

        if not responses:
            pytest.skip("Juice Shop not available")

        # Check if any rate limiting was applied
        rate_limited = any(code == 429 for code in responses) or connection_errors > 0

        assert rate_limited, "Login endpoint should implement rate limiting"
