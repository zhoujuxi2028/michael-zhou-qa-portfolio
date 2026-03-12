"""
SQL Injection Vulnerability Tests

Tests for detecting SQL injection vulnerabilities in web applications.
Covers Union-based, Boolean-based, Time-based, and Error-based injections.

OWASP Top 10: A03:2021 - Injection
"""

import time
import pytest
import requests


class TestSQLInjection:
    """Tests for SQL Injection vulnerabilities."""

    @pytest.mark.sqli
    @pytest.mark.xfail(reason="DVWA at low security exposes SQL error messages")
    def test_error_based_sqli(self, dvwa_session, config):
        """Test for Error-based SQL Injection.

        ID: SEC-SQLI-001
        Description: Check if SQL errors are exposed in responses
        """
        if dvwa_session is None:
            pytest.skip("DVWA not available")

        url = f"{config.DVWA_URL}/vulnerabilities/sqli/"

        # Error-inducing payloads
        payloads = [
            "'",
            "''",
            "1'",
            "1' OR '1'='1",
            "' OR ''='",
        ]

        sql_error_indicators = [
            "SQL syntax",
            "mysql_",
            "mysqli_",
            "SQLite",
            "syntax error",
            "ORA-",
            "PostgreSQL",
            "SQLSTATE",
        ]

        errors_found = []

        for payload in payloads:
            response = dvwa_session.get(url, params={"id": payload, "Submit": "Submit"})

            if "Login ::" in response.text:
                pytest.skip("DVWA session not maintained")

            for indicator in sql_error_indicators:
                if indicator.lower() in response.text.lower():
                    errors_found.append((payload, indicator))
                    break

        if errors_found:
            print(f"[!] SQL errors exposed: {errors_found}")

        assert len(errors_found) == 0, f"SQL errors should not be exposed: {errors_found}"

    @pytest.mark.sqli
    @pytest.mark.xfail(reason="DVWA at low security is vulnerable to UNION injection")
    def test_union_based_sqli(self, dvwa_session, config):
        """Test for Union-based SQL Injection.

        ID: SEC-SQLI-002
        Description: Attempt UNION-based data extraction
        """
        if dvwa_session is None:
            pytest.skip("DVWA not available")

        url = f"{config.DVWA_URL}/vulnerabilities/sqli/"

        # Union payloads to determine column count
        union_payloads = [
            "1' UNION SELECT NULL--",
            "1' UNION SELECT NULL,NULL--",
            "1' UNION SELECT NULL,NULL,NULL--",
            "1' UNION SELECT 1,2--",
            "1' UNION SELECT user(),database()--",
        ]

        successful_unions = []

        for payload in union_payloads:
            response = dvwa_session.get(url, params={"id": payload, "Submit": "Submit"})

            if "Login ::" in response.text:
                pytest.skip("DVWA session not maintained")

            # Check for signs of successful UNION
            # In vulnerable apps, the injected data appears in response
            if "UNION" not in response.text.upper():
                # Payload executed (not just echoed back)
                if len(response.text) > 100:  # Response has content
                    successful_unions.append(payload)

        if successful_unions:
            print(f"[!] UNION injection may be possible")

        assert len(successful_unions) == 0, "UNION injection should not be possible"

    @pytest.mark.sqli
    @pytest.mark.slow
    def test_time_based_blind_sqli(self, dvwa_session, config):
        """Test for Time-based Blind SQL Injection.

        ID: SEC-SQLI-003
        Description: Detect SQL injection via response time differences
        """
        if dvwa_session is None:
            pytest.skip("DVWA not available")

        url = f"{config.DVWA_URL}/vulnerabilities/sqli_blind/"

        # Baseline request
        start = time.time()
        baseline_response = dvwa_session.get(url, params={"id": "1", "Submit": "Submit"})
        baseline_time = time.time() - start

        if "Login ::" in baseline_response.text:
            pytest.skip("DVWA session not maintained")

        # Time-based payload (sleep for 3 seconds)
        time_payloads = [
            "1' AND SLEEP(3)--",
            "1' AND (SELECT SLEEP(3))--",
            "1'; WAITFOR DELAY '00:00:03'--",  # SQL Server
        ]

        time_delays = []

        for payload in time_payloads:
            start = time.time()
            time_response = dvwa_session.get(url, params={"id": payload, "Submit": "Submit"}, timeout=10)
            elapsed = time.time() - start

            if "Login ::" in time_response.text:
                pytest.skip("DVWA session not maintained")

            # If response took significantly longer, injection may be successful
            if elapsed > baseline_time + 2:
                time_delays.append((payload, elapsed))

        if time_delays:
            print(f"[!] Time-based SQL injection detected: {time_delays}")

        assert len(time_delays) == 0, "Time-based blind SQL injection should not be possible"

    @pytest.mark.sqli
    def test_boolean_based_blind_sqli(self, dvwa_session, config):
        """Test for Boolean-based Blind SQL Injection.

        ID: SEC-SQLI-004
        Description: Detect SQL injection via boolean condition differences
        """
        if dvwa_session is None:
            pytest.skip("DVWA not available")

        url = f"{config.DVWA_URL}/vulnerabilities/sqli_blind/"

        # Get baseline responses for true/false conditions
        true_response = dvwa_session.get(
            url, params={"id": "1' AND '1'='1", "Submit": "Submit"}
        )

        if "Login ::" in true_response.text:
            pytest.skip("DVWA session not maintained")

        false_response = dvwa_session.get(
            url, params={"id": "1' AND '1'='2", "Submit": "Submit"}
        )

        if "Login ::" in false_response.text:
            pytest.skip("DVWA session not maintained")

        # Compare response lengths
        true_len = len(true_response.text)
        false_len = len(false_response.text)

        # Significant difference indicates boolean injection works
        if abs(true_len - false_len) > 50:
            print(f"[!] Boolean-based blind SQL injection detected")
            print(f"    True condition response: {true_len} bytes")
            print(f"    False condition response: {false_len} bytes")

        assert abs(true_len - false_len) <= 50, "Boolean-based blind SQL injection should not be possible"


class TestSecondOrderSQLI:
    """Tests for Second-Order SQL Injection."""

    @pytest.mark.sqli
    @pytest.mark.skip(reason="Conceptual: requires multi-step manual analysis of data flow")
    def test_second_order_sqli_concept(self, http_session, config):
        """Test concept for Second-Order SQL Injection.

        ID: SEC-SQLI-005
        Description: Detect potential second-order injection points
        """
        print("[*] Second-order SQLi requires manual analysis of:")
        print("    - User registration/profile update flows")
        print("    - Data that is stored and later used in queries")
        print("    - Admin panels that display user-submitted data")
