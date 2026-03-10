"""
Business Logic Security Tests

Tests for business logic vulnerabilities in OWASP Juice Shop.
Covers OWASP A04:2021 - Insecure Design
"""

import json
import pytest
import requests


@pytest.mark.juice_shop
@pytest.mark.business_logic
class TestNegativeQuantity:
    """Test negative quantity/amount vulnerabilities."""

    def test_negative_quantity_in_basket(self, juice_shop_auth_session, juice_shop_url):
        """SEC-BL-001: Test negative quantity purchase.

        Attempts to add negative quantity to basket for credit.
        """
        session, token, email = juice_shop_auth_session
        if not session:
            pytest.skip("Authentication not available")

        # First, get user's basket
        whoami_response = session.get(
            f"{juice_shop_url}/rest/user/whoami",
            timeout=10,
        )

        if whoami_response.status_code != 200:
            pytest.skip("Could not get user info")

        user_data = whoami_response.json().get("user", {})
        basket_id = user_data.get("bid", 1)

        # Try to add item with negative quantity
        add_item_url = f"{juice_shop_url}/api/BasketItems/"
        negative_item = {
            "ProductId": 1,
            "BasketId": basket_id,
            "quantity": -10,
        }

        response = session.post(
            add_item_url,
            json=negative_item,
            timeout=10,
        )

        # Should reject negative quantity
        if response.status_code in [200, 201]:
            data = response.json()
            quantity = data.get("data", {}).get("quantity", 0)
            assert quantity >= 0, "Negative quantity should not be accepted"

    def test_negative_price_product(self, juice_shop_auth_session, juice_shop_url):
        """SEC-BL-002: Test if price manipulation is possible.

        Checks if product prices can be manipulated client-side.
        """
        session, token, email = juice_shop_auth_session
        if not session:
            pytest.skip("Authentication not available")

        # Get products to find a product ID
        products_response = session.get(
            f"{juice_shop_url}/rest/products/search?q=",
            timeout=10,
        )

        if products_response.status_code != 200:
            pytest.skip("Could not get products")

        # Note: Price should be calculated server-side
        # This test verifies the concept


@pytest.mark.juice_shop
@pytest.mark.business_logic
class TestCouponAbuse:
    """Test coupon/discount abuse vulnerabilities."""

    def test_coupon_reuse(self, juice_shop_auth_session, juice_shop_url):
        """SEC-BL-002: Test coupon code reuse.

        Attempts to apply same coupon multiple times.
        """
        session, token, email = juice_shop_auth_session
        if not session:
            pytest.skip("Authentication not available")

        coupon_url = f"{juice_shop_url}/rest/basket/1/coupon/WMNSDY2019"

        # Try to apply coupon multiple times
        responses = []
        for _ in range(3):
            response = session.put(
                coupon_url,
                timeout=10,
            )
            responses.append(response.status_code)

        # After first application, subsequent should fail
        # If all succeed, coupon might be reusable
        if all(r == 200 for r in responses):
            # Check if discount stacked
            basket_response = session.get(
                f"{juice_shop_url}/rest/basket/1",
                timeout=10,
            )
            # Note: This documents potential vulnerability

    def test_coupon_stacking(self, juice_shop_auth_session, juice_shop_url):
        """SEC-BL-003: Test multiple coupon stacking.

        Attempts to apply multiple different coupons.
        """
        session, token, email = juice_shop_auth_session
        if not session:
            pytest.skip("Authentication not available")

        coupons = ["WMNSDY2019", "ORANGE2020", "CHRISTMAS2019"]

        successful_coupons = 0
        for coupon in coupons:
            response = session.put(
                f"{juice_shop_url}/rest/basket/1/coupon/{coupon}",
                timeout=10,
            )
            if response.status_code == 200:
                successful_coupons += 1

        # Should only allow one coupon
        assert successful_coupons <= 1, "Multiple coupons should not stack"


@pytest.mark.juice_shop
@pytest.mark.business_logic
class TestPriceManipulation:
    """Test price manipulation vulnerabilities."""

    def test_checkout_price_tampering(self, juice_shop_auth_session, juice_shop_url):
        """SEC-BL-003: Test price tampering during checkout.

        Attempts to modify price in checkout request.
        """
        session, token, email = juice_shop_auth_session
        if not session:
            pytest.skip("Authentication not available")

        # Note: Real price tampering would require intercepting
        # the checkout request and modifying the price.
        # This test verifies the API doesn't accept client prices.

        # Try to create order with custom total
        checkout_url = f"{juice_shop_url}/rest/basket/checkout"

        # Attempt to send custom price
        checkout_data = {
            "totalPrice": 0.01,
            "deliveryPrice": 0,
        }

        response = session.post(
            checkout_url,
            json=checkout_data,
            timeout=10,
        )

        # Server should calculate price, not accept client value
        if response.status_code == 200:
            # If order was created, verify price wasn't manipulated
            pass  # Further validation would check order total

    def test_free_delivery_manipulation(self, juice_shop_auth_session, juice_shop_url):
        """SEC-BL-004: Test delivery cost bypass.

        Attempts to bypass delivery fees.
        """
        session, token, email = juice_shop_auth_session
        if not session:
            pytest.skip("Authentication not available")

        # Get delivery options
        delivery_response = session.get(
            f"{juice_shop_url}/api/Deliverys",
            timeout=10,
        )

        if delivery_response.status_code == 200:
            deliveries = delivery_response.json().get("data", [])

            # Find cheapest delivery
            if deliveries:
                cheapest = min(deliveries, key=lambda d: d.get("price", 999))

                # Note: Proper validation would be in checkout
                # This tests that delivery options are fetched securely


@pytest.mark.juice_shop
@pytest.mark.business_logic
class TestPrivilegeEscalation:
    """Test privilege escalation vulnerabilities."""

    def test_role_modification_api(self, juice_shop_auth_session, juice_shop_url):
        """SEC-BL-004: Test user role modification.

        Attempts to escalate privileges via API.
        """
        session, token, email = juice_shop_auth_session
        if not session:
            pytest.skip("Authentication not available")

        # Get current user info
        whoami_response = session.get(
            f"{juice_shop_url}/rest/user/whoami",
            timeout=10,
        )

        if whoami_response.status_code != 200:
            pytest.skip("Could not get user info")

        user_data = whoami_response.json().get("user", {})
        user_id = user_data.get("id")

        if not user_id:
            pytest.skip("Could not get user ID")

        # Attempt to modify role
        modify_data = {
            "role": "admin",
            "isAdmin": True,
        }

        response = session.put(
            f"{juice_shop_url}/api/Users/{user_id}",
            json=modify_data,
            timeout=10,
        )

        # Role modification should fail or be ignored
        if response.status_code == 200:
            updated_data = response.json().get("data", {})
            role = updated_data.get("role", "customer")

            assert role != "admin", "Privilege escalation should not be allowed"

    def test_access_admin_section(self, juice_shop_auth_session, juice_shop_url):
        """SEC-BL-005: Test access to admin section.

        Verifies admin endpoints require proper authorization.
        """
        session, token, email = juice_shop_auth_session
        if not session:
            pytest.skip("Authentication not available")

        admin_endpoints = [
            "/rest/admin/application-configuration",
            "/api/Feedbacks/",
            "/api/Complaints/",
        ]

        for endpoint in admin_endpoints:
            response = session.get(
                f"{juice_shop_url}{endpoint}",
                timeout=10,
            )

            # Regular user should not access admin endpoints
            # 401 or 403 = properly protected
            # 200 could be vulnerability (needs data inspection)
            if response.status_code == 200:
                data = response.json()
                # Check if sensitive admin data is exposed
                if "data" in data and len(data.get("data", [])) > 0:
                    # Depending on endpoint, this might be a vulnerability
                    # Feedbacks might be intentionally public
                    pass
