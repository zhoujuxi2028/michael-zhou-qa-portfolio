"""
NoSQL Injection Security Tests

Tests for NoSQL injection vulnerabilities in OWASP Juice Shop.
Covers OWASP A03:2021 - Injection
"""

import json
import pytest
import requests


@pytest.mark.juice_shop
@pytest.mark.nosql
class TestMongoDBInjection:
    """Test MongoDB query injection vulnerabilities."""

    def test_login_nosql_injection(self, juice_shop_url):
        """SEC-NOSQL-001: Test NoSQL injection in login.

        Attempts MongoDB operator injection in login endpoint.
        """
        login_url = f"{juice_shop_url}/rest/user/login"

        # NoSQL injection payload using $ne operator
        nosql_payloads = [
            # Operator injection
            {"email": {"$ne": ""}, "password": {"$ne": ""}},
            {"email": {"$gt": ""}, "password": {"$gt": ""}},
            {"email": {"$regex": ".*"}, "password": {"$ne": ""}},
        ]

        for payload in nosql_payloads:
            response = requests.post(
                login_url,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=10,
            )

            # Should not authenticate with injection payload
            # Proper handling: 400 (bad request) or 401 (unauthorized)
            if response.status_code == 200:
                data = response.json()
                # If authentication succeeded, it's a vulnerability
                if "authentication" in data and data["authentication"].get("token"):
                    pytest.fail("NoSQL injection allowed authentication bypass")

    def test_search_nosql_injection(self, juice_shop_url):
        """SEC-NOSQL-002: Test NoSQL injection in search.

        Attempts injection in product search functionality.
        """
        # NoSQL injection payloads in search
        payloads = [
            "'; return true; var x='",
            "' || '1'=='1",
            "{$where: 'this.name.length > 0'}",
            "[$ne]=test",
        ]

        for payload in payloads:
            response = requests.get(
                f"{juice_shop_url}/rest/products/search",
                params={"q": payload},
                timeout=10,
            )

            # Should handle safely - either error or no results
            if response.status_code == 200:
                data = response.json()
                # Check if injection returned all products unexpectedly
                products = data.get("data", [])
                # Note: This tests for obvious injection success
                # Real testing would compare against known product count


@pytest.mark.juice_shop
@pytest.mark.nosql
class TestJSONInjection:
    """Test JSON injection vulnerabilities."""

    def test_json_injection_in_review(self, juice_shop_auth_session, juice_shop_url):
        """SEC-NOSQL-002: Test JSON injection in review submission.

        Attempts to inject additional fields via JSON.
        """
        session, token, email = juice_shop_auth_session
        if not session:
            pytest.skip("Authentication not available")

        # Try to inject additional fields
        malicious_review = {
            "message": "Test review",
            "author": "hacker",  # Try to override author
            "$set": {"rating": 5},  # MongoDB operator
            "__proto__": {"isAdmin": True},  # Prototype pollution
        }

        response = session.post(
            f"{juice_shop_url}/rest/products/1/reviews",
            json=malicious_review,
            timeout=10,
        )

        # The request should either fail or sanitize input
        if response.status_code == 201:
            data = response.json()
            # Check if injection fields were stored
            review_data = data.get("data", {})

            # Author should be the authenticated user, not "hacker"
            author = review_data.get("author", "")
            assert author != "hacker", "JSON injection allowed author override"

    def test_nested_json_injection(self, juice_shop_url):
        """SEC-NOSQL-003: Test nested JSON object injection."""
        login_url = f"{juice_shop_url}/rest/user/login"

        # Nested injection attempts
        nested_payloads = [
            {
                "email": "test@test.com",
                "password": {"$gt": ""},
            },
            {
                "email": {"email": {"$ne": ""}},
                "password": "test",
            },
        ]

        for payload in nested_payloads:
            response = requests.post(
                login_url,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=10,
            )

            # Should properly validate input types
            if response.status_code == 200:
                data = response.json()
                assert "token" not in str(data), \
                    "Nested JSON injection should not succeed"


@pytest.mark.juice_shop
@pytest.mark.nosql
class TestOperatorInjection:
    """Test MongoDB operator injection vulnerabilities."""

    def test_ne_operator_injection(self, juice_shop_url):
        """SEC-NOSQL-003: Test $ne (not equal) operator injection.

        Uses $ne operator to bypass authentication.
        """
        login_url = f"{juice_shop_url}/rest/user/login"

        # $ne operator injection - "password not equal to empty"
        payload = {
            "email": "admin@juice-sh.op",
            "password": {"$ne": ""}
        }

        response = requests.post(
            login_url,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10,
        )

        # Should not allow operator injection
        if response.status_code == 200:
            data = response.json()
            assert "token" not in str(data), \
                "$ne operator injection allowed authentication"

    def test_gt_operator_injection(self, juice_shop_url):
        """SEC-NOSQL-004: Test $gt (greater than) operator injection."""
        login_url = f"{juice_shop_url}/rest/user/login"

        # $gt operator injection
        payload = {
            "email": {"$gt": ""},
            "password": {"$gt": ""}
        }

        response = requests.post(
            login_url,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10,
        )

        # Should reject operator injection
        if response.status_code == 200:
            data = response.json()
            assert "token" not in str(data), \
                "$gt operator injection allowed authentication"

    def test_regex_operator_injection(self, juice_shop_url):
        """SEC-NOSQL-005: Test $regex operator injection."""
        login_url = f"{juice_shop_url}/rest/user/login"

        # $regex operator to match any email
        payload = {
            "email": {"$regex": ".*@.*"},
            "password": {"$ne": ""}
        }

        response = requests.post(
            login_url,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10,
        )

        # Should reject regex operator
        if response.status_code == 200:
            data = response.json()
            assert "token" not in str(data), \
                "$regex operator injection allowed authentication"
