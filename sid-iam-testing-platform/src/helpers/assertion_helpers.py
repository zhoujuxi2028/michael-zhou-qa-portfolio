import jwt as pyjwt


def assert_valid_jwt(token, secret, algorithm="HS256", required_claims=None):
    decoded = pyjwt.decode(token, secret, algorithms=[algorithm], options={"verify_aud": False})
    if required_claims:
        for claim in required_claims:
            assert claim in decoded, f"Missing required claim: {claim}"
    return decoded


def assert_contains_all(actual, expected_items):
    for item in expected_items:
        assert item in actual, f"Missing expected item: {item}"


def assert_error_response(response, expected_status=None, expected_message=None):
    if expected_status is not None:
        assert response.get("status") == expected_status or response.get("code") == expected_status, (
            f"Expected status {expected_status}, got {response}"
        )
    if expected_message is not None:
        msg = response.get("message", response.get("error", response.get("detail", "")))
        assert expected_message.lower() in msg.lower(), f"Expected message containing '{expected_message}', got '{msg}'"


def assert_response_ok(response):
    assert response.get("status") == "success" or response.get("code") == 200, f"Expected success, got {response}"


def assert_no_pii(text, pii_patterns=None):
    if pii_patterns is None:
        pii_patterns = []
    for pattern in pii_patterns:
        assert pattern not in text, f"PII leak detected: {pattern}"
