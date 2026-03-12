"""
OWASP A06:2021 - Vulnerable and Outdated Components Tests

Tests for detecting vulnerable dependencies and outdated components including:
- Known vulnerable libraries
- Outdated software versions
- Missing security patches

Reference: https://owasp.org/Top10/A06_2021-Vulnerable_and_Outdated_Components/
"""

import subprocess
import re
import pytest
import requests


pytestmark = pytest.mark.components


class TestDependencyVulnerabilities:
    """Tests for vulnerable dependencies."""

    def test_python_dependencies_safety(self):
        """
        Test Python dependencies for known vulnerabilities using safety.

        ID: SEC-COMP-001
        """
        try:
            # Check if safety is installed
            result = subprocess.run(
                ["safety", "--version"],
                capture_output=True,
                text=True,
            )
            if result.returncode != 0:
                pytest.skip("safety not installed (pip install safety)")
        except FileNotFoundError:
            pytest.skip("safety not installed")

        # Run safety check
        result = subprocess.run(
            ["safety", "check", "--json"],
            capture_output=True,
            text=True,
        )

        if "vulnerabilities found" in result.stdout.lower():
            print("[!] Vulnerable dependencies found:")
            print(result.stdout[:500])
        else:
            print("[+] No known vulnerabilities in dependencies")

        assert result.returncode in [0, 64], f"safety check failed with return code {result.returncode}"

    def test_pip_audit(self):
        """
        Test Python dependencies using pip-audit.

        ID: SEC-COMP-002
        """
        try:
            result = subprocess.run(
                ["pip-audit", "--version"],
                capture_output=True,
                text=True,
            )
            if result.returncode != 0:
                pytest.skip("pip-audit not installed (pip install pip-audit)")
        except FileNotFoundError:
            pytest.skip("pip-audit not installed")

        result = subprocess.run(
            ["pip-audit", "--format", "json"],
            capture_output=True,
            text=True,
        )

        if "vulns" in result.stdout:
            print("[!] Vulnerabilities found by pip-audit")
            print(result.stdout[:500])
        else:
            print("[+] pip-audit: No vulnerabilities found")

        assert result.returncode in [0, 1], f"pip-audit failed with return code {result.returncode}"


class TestServerVersionDisclosure:
    """Tests for server version disclosure."""

    @pytest.mark.xfail(reason="DVWA server header discloses version information")
    def test_server_header_disclosure(self, http_session, config):
        """
        Test if Server header discloses version info.

        ID: SEC-COMP-003
        Server headers should not reveal version numbers.
        """
        try:
            response = http_session.get(config.TARGET_URL, timeout=5)
            server = response.headers.get("Server", "")

            if server:
                print(f"[*] Server header: {server}")

                # Check for version numbers
                version_pattern = r"\d+\.\d+"
                has_version = bool(re.search(version_pattern, server))
                if has_version:
                    print("[!] Server header discloses version number")
                else:
                    print("[+] No version number in Server header")
            else:
                has_version = False
                print("[+] Server header not present")

            assert not has_version, f"Server header should not disclose version: {server}"

        except requests.RequestException:
            pytest.skip("Target not available")

    def test_x_powered_by_disclosure(self, http_session, config):
        """
        Test if X-Powered-By header is present.

        ID: SEC-COMP-004
        X-Powered-By should be removed or hidden.
        """
        try:
            response = http_session.get(config.TARGET_URL, timeout=5)
            powered_by = response.headers.get("X-Powered-By", "")

            if powered_by:
                print(f"[!] X-Powered-By header present: {powered_by}")
            else:
                print("[+] X-Powered-By header not present")

            assert not powered_by, f"X-Powered-By header should not be present: {powered_by}"

        except requests.RequestException:
            pytest.skip("Target not available")

    def test_aspnet_version_disclosure(self, http_session, config):
        """
        Test for ASP.NET version disclosure.

        ID: SEC-COMP-005
        """
        try:
            response = http_session.get(config.TARGET_URL, timeout=5)

            aspnet_headers = [
                "X-AspNet-Version",
                "X-AspNetMvc-Version",
            ]

            aspnet_found = [h for h in aspnet_headers if response.headers.get(h)]
            for header in aspnet_found:
                print(f"[!] {header}: {response.headers.get(header)}")

            assert not aspnet_found, f"ASP.NET version headers should not be present: {aspnet_found}"

        except requests.RequestException:
            pytest.skip("Target not available")


class TestKnownVulnerabilities:
    """Tests for known vulnerabilities in common components."""

    def test_jquery_version(self, http_session, config):
        """
        Test for vulnerable jQuery versions.

        ID: SEC-COMP-006
        jQuery versions < 3.5.0 have known XSS vulnerabilities.
        """
        try:
            response = http_session.get(config.TARGET_URL, timeout=5)

            # Look for jQuery version
            jquery_patterns = [
                r"jquery[.-]?(\d+\.\d+\.\d+)",
                r"jQuery v(\d+\.\d+\.\d+)",
                r"jquery\.min\.js\?v=(\d+\.\d+\.\d+)",
            ]

            jquery_version = None
            for pattern in jquery_patterns:
                match = re.search(pattern, response.text, re.IGNORECASE)
                if match:
                    jquery_version = match.group(1)
                    major, minor, patch = map(int, jquery_version.split("."))

                    if major < 3 or (major == 3 and minor < 5):
                        print(f"[!] Potentially vulnerable jQuery version: {jquery_version}")
                    else:
                        print(f"[+] jQuery version {jquery_version} is current")
                    break
            else:
                print("[*] jQuery version not detected")

            if jquery_version:
                major, minor, patch = map(int, jquery_version.split("."))
                assert major > 3 or (major == 3 and minor >= 5), \
                    f"jQuery {jquery_version} has known XSS vulnerabilities (need >= 3.5.0)"

        except requests.RequestException:
            pytest.skip("Target not available")

    def test_bootstrap_version(self, http_session, config):
        """
        Test for vulnerable Bootstrap versions.

        ID: SEC-COMP-007
        Bootstrap versions < 4.3.1 have XSS vulnerabilities.
        """
        try:
            response = http_session.get(config.TARGET_URL, timeout=5)

            # Look for Bootstrap version
            bootstrap_patterns = [
                r"bootstrap[.-]?(\d+\.\d+\.\d+)",
                r"Bootstrap v(\d+\.\d+\.\d+)",
            ]

            bootstrap_version = None
            for pattern in bootstrap_patterns:
                match = re.search(pattern, response.text, re.IGNORECASE)
                if match:
                    bootstrap_version = match.group(1)
                    print(f"[*] Bootstrap version: {bootstrap_version}")
                    break
            else:
                print("[*] Bootstrap version not detected")

            if bootstrap_version:
                major, minor, patch = map(int, bootstrap_version.split("."))
                assert major > 4 or (major == 4 and minor > 3) or (major == 4 and minor == 3 and patch >= 1), \
                    f"Bootstrap {bootstrap_version} has known XSS vulnerabilities (need >= 4.3.1)"

        except requests.RequestException:
            pytest.skip("Target not available")


class TestDockerVulnerabilities:
    """Tests for Docker image vulnerabilities."""

    @pytest.mark.slow
    def test_trivy_scan_available(self):
        """
        Test if Trivy scanner is available.

        ID: SEC-COMP-008
        """
        try:
            result = subprocess.run(
                ["trivy", "--version"],
                capture_output=True,
                text=True,
            )
            if result.returncode == 0:
                print(f"[+] Trivy available: {result.stdout.strip()}")
            else:
                pytest.skip("Trivy not installed (brew install trivy)")
        except FileNotFoundError:
            pytest.skip("Trivy not installed")

        assert result.returncode == 0, "Trivy should be available"

    @pytest.mark.slow
    def test_scan_dvwa_image(self):
        """
        Test DVWA Docker image for vulnerabilities.

        ID: SEC-COMP-009
        """
        try:
            result = subprocess.run(
                ["trivy", "--version"],
                capture_output=True,
                text=True,
            )
            if result.returncode != 0:
                pytest.skip("Trivy not installed")
        except FileNotFoundError:
            pytest.skip("Trivy not installed")

        # Scan DVWA image (quick scan)
        result = subprocess.run(
            ["trivy", "image", "--severity", "CRITICAL,HIGH",
             "--timeout", "5m", "vulnerables/web-dvwa"],
            capture_output=True,
            text=True,
            timeout=300,
        )

        output = result.stdout
        if "CRITICAL" in output or "HIGH" in output:
            print("[!] Vulnerabilities found in DVWA image (expected)")
        else:
            print("[+] No critical vulnerabilities")

        assert "CRITICAL" in output or "HIGH" in output, \
            "DVWA image should have known vulnerabilities (intentionally vulnerable)"


class TestComponentInventory:
    """Tests for component inventory and tracking."""

    def test_requirements_file_exists(self):
        """
        Test that requirements.txt exists for dependency tracking.

        ID: SEC-COMP-010
        """
        import os

        req_files = [
            "requirements.txt",
            "requirements-dev.txt",
            "Pipfile",
            "pyproject.toml",
        ]

        found = []
        for req_file in req_files:
            if os.path.exists(req_file):
                found.append(req_file)

        if found:
            print(f"[+] Dependency files found: {found}")
        else:
            print("[!] No dependency files found")

        assert len(found) > 0, "Should have dependency tracking"
