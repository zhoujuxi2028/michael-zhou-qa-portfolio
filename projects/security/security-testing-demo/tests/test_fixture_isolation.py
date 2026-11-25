"""Guard: DVWA security level must not leak between tests.

dvwa_session is session-scoped. The security_level / set_security_level
fixtures used to leave DVWA at "high", so every later test silently ran at a
stricter level (XPASS in test_sqli / test_xss). Tests run in file order.
"""

import re

import pytest


def _current_level(dvwa_session, config):
    page = dvwa_session.get(f"{config.DVWA_URL}/security.php", timeout=10).text
    match = re.search(r"Security level is currently:\s*<em>(\w+)</em>", page)
    return match.group(1) if match else None


def test_set_security_level_changes_level(dvwa_session, config, set_security_level):
    if dvwa_session is None:
        pytest.skip("DVWA not available")
    set_security_level("high")
    assert _current_level(dvwa_session, config) == "high"


def test_level_restored_to_low_after_previous_test(dvwa_session, config):
    if dvwa_session is None:
        pytest.skip("DVWA not available")
    assert _current_level(dvwa_session, config) == "low"
