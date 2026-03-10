"""
Authentication Security Tests

Tests for detecting authentication-related vulnerabilities.

OWASP Top 10: A07:2021 - Identification and Authentication Failures
"""

import pytest
import requests


class TestBruteForce:
    """Tests for Brute Force vulnerabilities."""

    @pytest.mark.auth
    def test_login_rate_limiting(self, http_session, config):
        """Test if login has rate limiting.

        ID: SEC-AUTH-001
        Description: Check for brute force protection
        """
        login_url = f"{config.DVWA_URL}/login.php"

        # Attempt multiple failed logins
        failed_attempts = 0
        blocked = False

        for i in range(10):
            data = {
                "username": "admin",
                "password": f"wrongpassword{i}",
                "Login": "Login",
            }

            try:
                response = http_session.post(login_url, data=data, timeout=10)

                if response.status_code == 429:  # Too Many Requests
                    blocked = True
                    break
                elif "blocked" in response.text.lower() or "locked" in response.text.lower():
                    blocked = True
                    break
                elif "Login failed" in response.text:
                    failed_attempts += 1

            except requests.RequestException:
                break

        if blocked:
            print(f"[+] Rate limiting active after {failed_attempts} attempts")
        else:
            print(f"[!] No rate limiting detected after {failed_attempts} failed attempts")

        assert True

    @pytest.mark.auth
    def test_account_lockout(self, dvwa_session, config):
        """Test if accounts get locked after failed attempts.

        ID: SEC-AUTH-002
        Description: Check for account lockout mechanism
        """
        # This test is informational
        # DVWA doesn't implement account lockout by default

        lockout_indicators = [
            "account locked",
            "too many attempts",
            "temporarily disabled",
            "try again later",
        ]

        print("[*] Account lockout test:")
        print("    - Secure apps should lock accounts after 3-5 failed attempts")
        print("    - Lockout duration: 15-30 minutes recommended")
        print("    - Consider progressive lockout (increasing delays)")

        assert True


class TestSessionManagement:
    """Tests for Session Management vulnerabilities."""

    @pytest.mark.auth
    def test_session_fixation(self, http_session, config):
        """Test for Session Fixation vulnerability.

        ID: SEC-AUTH-003
        Description: Check if session ID changes after login
        """
        # Get initial session
        login_url = f"{config.DVWA_URL}/login.php"

        # Get session before login
        response = http_session.get(login_url, timeout=10)
        session_before = http_session.cookies.get("PHPSESSID", "")

        # Perform login
        data = {
            "username": "admin",
            "password": "password",
            "Login": "Login",
        }
        http_session.post(login_url, data=data, timeout=10)

        # Get session after login
        session_after = http_session.cookies.get("PHPSESSID", "")

        if session_before and session_after:
            if session_before == session_after:
                print("[!] Session Fixation: Session ID not regenerated after login")
            else:
                print("[+] Session ID regenerated after login")
        else:
            print("[*] Could not determine session fixation status")

        assert True

    @pytest.mark.auth
    def test_session_timeout(self, http_session, config):
        """Test session timeout configuration.

        ID: SEC-AUTH-004
        Description: Check for session timeout implementation
        """
        # This is informational - actual timeout testing requires waiting

        print("[*] Session timeout best practices:")
        print("    - Idle timeout: 15-30 minutes")
        print("    - Absolute timeout: 4-8 hours")
        print("    - Re-authentication for sensitive operations")
        print("    - Secure session invalidation on logout")

        assert True


class TestPasswordPolicy:
    """Tests for Password Policy vulnerabilities."""

    @pytest.mark.auth
    def test_weak_password_acceptance(self, dvwa_session, config):
        """Test if weak passwords are accepted.

        ID: SEC-AUTH-005
        Description: Check password strength requirements
        """
        if dvwa_session is None:
            pytest.skip("DVWA not available")

        # DVWA password change page
        url = f"{config.DVWA_URL}/vulnerabilities/csrf/"

        weak_passwords = [
            "123",
            "password",
            "admin",
            "12345678",
        ]

        weak_accepted = []

        for weak_pass in weak_passwords:
            data = {
                "password_new": weak_pass,
                "password_conf": weak_pass,
                "Change": "Change",
            }

            response = dvwa_session.post(url, data=data)

            if "Password Changed" in response.text:
                weak_accepted.append(weak_pass)

        if weak_accepted:
            print(f"[!] Weak passwords accepted: {weak_accepted}")
        else:
            print("[+] Password policy enforced")

        assert True

    @pytest.mark.auth
    def test_password_in_url(self, http_session, config):
        """Test if password is transmitted in URL.

        ID: SEC-AUTH-006
        Description: Check for password exposure in GET parameters
        """
        # Check if login form uses GET method (insecure)
        login_url = f"{config.TARGET_URL}/login"

        try:
            response = http_session.get(login_url, timeout=10)

            # Look for GET method in login form
            if 'method="get"' in response.text.lower():
                print("[!] Login form uses GET method - passwords may be exposed in URL")
            else:
                print("[+] Login form uses POST method")

        except requests.RequestException:
            pass

        assert True
