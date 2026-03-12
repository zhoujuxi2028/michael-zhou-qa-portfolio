"""
SQLMap Integration Tests

Automated SQL injection testing using sqlmap.
Tests will skip if sqlmap is not installed.

OWASP Top 10: A03:2021 - Injection
"""

import os
import subprocess
import pytest


pytestmark = pytest.mark.sqlmap


def is_sqlmap_available():
    """Check if sqlmap is installed and available."""
    try:
        result = subprocess.run(
            ["sqlmap", "--version"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        return result.returncode == 0
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return False


class TestSQLMapAvailability:
    """Tests for SQLMap installation and availability."""

    def test_sqlmap_installed(self):
        """
        Test that sqlmap is installed.

        ID: SEC-SQLMAP-001
        """
        if not is_sqlmap_available():
            pytest.skip("sqlmap not installed (brew install sqlmap)")

        result = subprocess.run(
            ["sqlmap", "--version"],
            capture_output=True,
            text=True,
        )

        # sqlmap outputs version number directly
        output = result.stdout + result.stderr
        # Version format is like "1.10.3#stable"
        assert output.strip(), "SQLMap should return version"
        print(f"[+] SQLMap version: {output.strip()}")

    def test_sqlmap_help(self):
        """
        Test sqlmap help output.

        ID: SEC-SQLMAP-002
        """
        if not is_sqlmap_available():
            pytest.skip("sqlmap not installed")

        result = subprocess.run(
            ["sqlmap", "-h"],
            capture_output=True,
            text=True,
        )

        assert "Usage:" in result.stdout or "usage:" in result.stdout.lower()


class TestSQLMapDetection:
    """Tests for SQL injection detection using sqlmap."""

    @pytest.mark.slow
    @pytest.mark.xfail(reason="sqlmap session cookie may not maintain DVWA authentication")
    def test_sqlmap_detect_dvwa(self, dvwa_session, config):
        """
        Test sqlmap detection on DVWA.

        ID: SEC-SQLMAP-003
        """
        if not is_sqlmap_available():
            pytest.skip("sqlmap not installed")

        if dvwa_session is None:
            pytest.skip("DVWA not available")

        # Get session cookie
        session_cookie = dvwa_session.cookies.get("PHPSESSID", "")
        if not session_cookie:
            pytest.skip("Could not get DVWA session cookie")

        # Target URL
        target_url = f"{config.DVWA_URL}/vulnerabilities/sqli/?id=1&Submit=Submit"

        # Run sqlmap in batch mode (non-interactive)
        cmd = [
            "sqlmap",
            "-u", target_url,
            "--cookie", f"PHPSESSID={session_cookie}; security=low",
            "--batch",  # Non-interactive
            "--level", "1",  # Basic level
            "--risk", "1",  # Low risk
            "--technique", "BEU",  # Boolean, Error, Union
            "--timeout", "10",
            "--retries", "1",
            "--threads", "1",
        ]

        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=60,  # 1 minute timeout
            )

            # Check for injection detection
            output = result.stdout + result.stderr
            is_injectable = "is vulnerable" in output.lower() or "injectable" in output.lower()

            print(f"[*] SQLMap output (truncated):\n{output[:500]}")

            if is_injectable:
                print("[!] SQL injection detected by sqlmap")

            assert is_injectable, "sqlmap should detect SQL injection in DVWA"

        except subprocess.TimeoutExpired:
            pytest.skip("sqlmap timed out")

    @pytest.mark.slow
    @pytest.mark.xfail(reason="sqlmap session cookie may not maintain DVWA authentication")
    def test_sqlmap_enumerate_dbs(self, dvwa_session, config):
        """
        Test sqlmap database enumeration.

        ID: SEC-SQLMAP-004
        """
        if not is_sqlmap_available():
            pytest.skip("sqlmap not installed")

        if dvwa_session is None:
            pytest.skip("DVWA not available")

        session_cookie = dvwa_session.cookies.get("PHPSESSID", "")
        if not session_cookie:
            pytest.skip("Could not get DVWA session cookie")

        target_url = f"{config.DVWA_URL}/vulnerabilities/sqli/?id=1&Submit=Submit"

        # Run sqlmap to enumerate databases
        cmd = [
            "sqlmap",
            "-u", target_url,
            "--cookie", f"PHPSESSID={session_cookie}; security=low",
            "--batch",
            "--dbs",  # Enumerate databases
            "--timeout", "10",
            "--retries", "1",
        ]

        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=120,  # 2 minute timeout
            )

            output = result.stdout + result.stderr

            # Check for database enumeration
            has_dbs = "available databases" in output.lower() or "dvwa" in output.lower()

            print(f"[*] Database enumeration result:\n{output[:500]}")

            if has_dbs:
                print("[!] Databases enumerated successfully")

            assert has_dbs, "sqlmap should enumerate databases on DVWA"

        except subprocess.TimeoutExpired:
            pytest.skip("sqlmap timed out")


class TestSQLMapOptions:
    """Tests for different sqlmap options and risk levels."""

    def test_sqlmap_risk_levels(self):
        """
        Test sqlmap risk level options.

        ID: SEC-SQLMAP-005
        """
        if not is_sqlmap_available():
            pytest.skip("sqlmap not installed")

        # Document risk levels
        risk_levels = {
            1: "Default - safe, unlikely to cause issues",
            2: "Heavy queries - may cause delays",
            3: "OR-based - may modify data (use with caution)",
        }

        print("\n=== SQLMap Risk Levels ===")
        for level, desc in risk_levels.items():
            print(f"Risk {level}: {desc}")

        # Verify sqlmap accepts risk parameter
        result = subprocess.run(
            ["sqlmap", "-h"],
            capture_output=True,
            text=True,
        )

        assert "--risk" in result.stdout

    def test_sqlmap_techniques(self):
        """
        Test sqlmap injection techniques.

        ID: SEC-SQLMAP-006
        """
        if not is_sqlmap_available():
            pytest.skip("sqlmap not installed")

        # Document techniques
        techniques = {
            "B": "Boolean-based blind",
            "E": "Error-based",
            "U": "Union query-based",
            "S": "Stacked queries",
            "T": "Time-based blind",
            "Q": "Inline queries",
        }

        print("\n=== SQLMap Injection Techniques ===")
        for code, desc in techniques.items():
            print(f"{code}: {desc}")

        # Verify sqlmap accepts technique parameter
        result = subprocess.run(
            ["sqlmap", "-h"],
            capture_output=True,
            text=True,
        )

        assert "--technique" in result.stdout


class TestSQLMapReporting:
    """Tests for sqlmap output and reporting."""

    @pytest.mark.slow
    def test_sqlmap_output_format(self):
        """
        Test sqlmap output formats.

        ID: SEC-SQLMAP-007
        """
        if not is_sqlmap_available():
            pytest.skip("sqlmap not installed")

        # Document output options
        output_options = [
            "--output-dir",  # Output directory
            "-o",  # Turn on optimization
            "--forms",  # Parse forms
            "--crawl",  # Crawl website
            "--dump",  # Dump data
            "--dump-all",  # Dump all data
        ]

        print("\n=== SQLMap Output Options ===")
        for opt in output_options:
            print(f"  {opt}")

        # Verify help includes output options
        result = subprocess.run(
            ["sqlmap", "-hh"],  # Extended help
            capture_output=True,
            text=True,
        )

        assert "--output-dir" in result.stdout or "output" in result.stdout.lower()
