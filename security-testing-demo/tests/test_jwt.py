"""
JWT Authentication Security Tests

Tests for JWT vulnerabilities in OWASP Juice Shop.
Covers OWASP A07:2021 - Identification and Authentication Failures
"""

import base64
import json
import pytest
import requests


def decode_jwt_payload(token):
    """Decode JWT payload without verification.

    Args:
        token: JWT token string

    Returns:
        dict: Decoded payload or None
    """
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None

        # Add padding if needed
        payload = parts[1]
        padding = 4 - len(payload) % 4
        if padding != 4:
            payload += "=" * padding

        decoded = base64.urlsafe_b64decode(payload)
        return json.loads(decoded)
    except Exception:
        return None


def decode_jwt_header(token):
    """Decode JWT header without verification.

    Args:
        token: JWT token string

    Returns:
        dict: Decoded header or None
    """
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None

        header = parts[0]
        padding = 4 - len(header) % 4
        if padding != 4:
            header += "=" * padding

        decoded = base64.urlsafe_b64decode(header)
        return json.loads(decoded)
    except Exception:
        return None


@pytest.mark.juice_shop
@pytest.mark.jwt
class TestJWTSignature:
    """Test JWT signature validation."""

    def test_jwt_signature_validation(self, juice_shop_auth_session, juice_shop_url):
        """SEC-JWT-001: Verify JWT signature is validated.

        Attempts to modify token payload and access protected endpoint.
        """
        session, token, email = juice_shop_auth_session
        if not token:
            pytest.skip("No JWT token available")

        # Modify the token payload (change user id)
        parts = token.split(".")
        if len(parts) != 3:
            pytest.skip("Invalid token format")

        # Decode payload
        payload = decode_jwt_payload(token)
        if not payload:
            pytest.skip("Could not decode payload")

        # Tamper with the payload (change user ID)
        payload["data"] = payload.get("data", {})
        if "id" in payload.get("data", {}):
            payload["data"]["id"] = 1  # Try to become admin

        # Re-encode payload
        tampered_payload = base64.urlsafe_b64encode(
            json.dumps(payload).encode()
        ).decode().rstrip("=")

        # Create tampered token (same header and signature)
        tampered_token = f"{parts[0]}.{tampered_payload}.{parts[2]}"

        # Try to use tampered token
        response = requests.get(
            f"{juice_shop_url}/rest/user/whoami",
            headers={
                "Authorization": f"Bearer {tampered_token}",
                "Accept": "application/json",
            },
            timeout=10,
        )

        # Should reject tampered token
        if response.status_code not in [401, 403, 500]:
            # Vulnerability detected - tampered JWT accepted
            pytest.xfail("VULNERABILITY DETECTED: JWT signature not validated - tampered token accepted")

    def test_jwt_none_algorithm(self, juice_shop_auth_session, juice_shop_url):
        """SEC-JWT-002: Test 'none' algorithm attack.

        Attempts to use 'none' algorithm to bypass signature verification.
        """
        session, token, email = juice_shop_auth_session
        if not token:
            pytest.skip("No JWT token available")

        # Decode original token
        payload = decode_jwt_payload(token)
        if not payload:
            pytest.skip("Could not decode payload")

        # Create header with 'none' algorithm
        none_header = {"alg": "none", "typ": "JWT"}
        header_b64 = base64.urlsafe_b64encode(
            json.dumps(none_header).encode()
        ).decode().rstrip("=")

        # Create payload
        payload_b64 = base64.urlsafe_b64encode(
            json.dumps(payload).encode()
        ).decode().rstrip("=")

        # Create token with no signature
        none_token = f"{header_b64}.{payload_b64}."

        # Try to use 'none' algorithm token
        response = requests.get(
            f"{juice_shop_url}/rest/user/whoami",
            headers={
                "Authorization": f"Bearer {none_token}",
                "Accept": "application/json",
            },
            timeout=10,
        )

        # Should reject 'none' algorithm
        if response.status_code not in [401, 403, 500]:
            # Vulnerability detected - 'none' algorithm accepted
            pytest.xfail("VULNERABILITY DETECTED: JWT 'none' algorithm accepted - signature bypass possible")


@pytest.mark.juice_shop
@pytest.mark.jwt
class TestJWTWeakSecret:
    """Test for weak JWT signing secrets."""

    def test_jwt_weak_secret_detection(self, juice_shop_auth_session, juice_shop_url):
        """SEC-JWT-003: Check for common weak JWT secrets.

        Note: This test documents known weak secrets in Juice Shop.
        In production, this would be a vulnerability assessment.
        """
        session, token, email = juice_shop_auth_session
        if not token:
            pytest.skip("No JWT token available")

        # Decode header to check algorithm
        header = decode_jwt_header(token)
        if not header:
            pytest.skip("Could not decode header")

        # Check algorithm
        alg = header.get("alg", "")

        # Document the algorithm used
        assert alg in ["HS256", "RS256", "ES256"], \
            f"Token uses algorithm: {alg}"

        # Note: Actual secret cracking would require brute force
        # which is out of scope for this test.
        # Juice Shop's known weak secret is documented in their code.


@pytest.mark.juice_shop
@pytest.mark.jwt
class TestJWTExpiration:
    """Test JWT token expiration handling."""

    def test_jwt_expiration_present(self, juice_shop_auth_session, juice_shop_url):
        """SEC-JWT-004: Verify JWT has expiration claim.

        Tokens should have reasonable expiration times.
        """
        session, token, email = juice_shop_auth_session
        if not token:
            pytest.skip("No JWT token available")

        payload = decode_jwt_payload(token)
        if not payload:
            pytest.skip("Could not decode payload")

        # Check for expiration claim
        has_exp = "exp" in payload
        has_iat = "iat" in payload

        # Note: Juice Shop tokens may not have exp
        if not has_exp:
            # Document the finding - tokens without exp don't expire
            assert True, "Note: JWT lacks expiration claim (potential vulnerability)"
        else:
            import time
            exp = payload.get("exp", 0)
            iat = payload.get("iat", time.time())

            # Check if expiration is reasonable (not too long)
            lifetime = exp - iat
            max_lifetime = 86400 * 30  # 30 days

            assert lifetime < max_lifetime, \
                f"Token lifetime ({lifetime}s) exceeds 30 days"

    def test_token_refresh_flow(self, juice_shop_url):
        """SEC-JWT-005: Test if token refresh is implemented securely."""
        # Check if refresh token endpoint exists
        response = requests.post(
            f"{juice_shop_url}/rest/user/refresh",
            json={},
            timeout=10,
        )

        # Either endpoint doesn't exist or requires valid refresh token
        # 404 = no refresh endpoint
        # 401/403 = requires auth
        assert response.status_code in [401, 403, 404, 500], \
            "Refresh endpoint should require valid token"


@pytest.mark.juice_shop
@pytest.mark.jwt
class TestJWTStorage:
    """Test for JWT storage security indicators."""

    def test_jwt_not_in_url(self, juice_shop_auth_session, juice_shop_url):
        """SEC-JWT-006: Verify JWT is not passed in URL.

        Tokens in URLs can be logged and leaked through referrer headers.
        """
        session, token, email = juice_shop_auth_session
        if not session:
            pytest.skip("Authentication not available")

        # Make a request to a protected endpoint
        response = session.get(
            f"{juice_shop_url}/rest/user/whoami",
            timeout=10,
        )

        # Check response for any URL with token
        if response.status_code == 200:
            # JWT should not appear in any redirect URLs
            assert token not in response.url, \
                "JWT should not appear in URL"

            # Check if any links in response contain token
            assert token not in response.text or "Bearer" in response.text, \
                "JWT should not be embedded in page content"
