"""
OWASP A06:2021 - Vulnerable and Outdated Components Tests

Tests for detecting vulnerable dependencies and outdated components including:
- Known vulnerable libraries
- Outdated software versions
- Missing security patches

Reference: https://owasp.org/Top10/A06_2021-Vulnerable_and_Outdated_Components/
"""

import json
import re
import shutil
import subprocess
from pathlib import Path

import pytest
import requests

pytestmark = pytest.mark.components


class TestDependencyVulnerabilities:
    """Tests for vulnerable dependencies."""

    def test_pip_audit(self):
        """
        Test this project's pinned Python dependencies with pip-audit.

        ID: SEC-COMP-002
        Scans requirements.txt (not the whole runner environment) and fails on
        any known vulnerability - same gate as the dependency-scan CI job.
        SEC-COMP-001 (safety) was removed: safety scanned its own dependency
        tree and was replaced by pip-audit in SEC-DEF-002 (#901).
        """
        if shutil.which("pip-audit") is None:
            pytest.skip("pip-audit not installed (pip install pip-audit)")

        requirements = Path(__file__).resolve().parent.parent / "requirements.txt"
        result = subprocess.run(
            ["pip-audit", "-r", str(requirements), "--format", "json", "--progress-spinner", "off"],
            capture_output=True,
            text=True,
            timeout=600,
        )

        assert result.returncode in (0, 1), f"pip-audit error (rc={result.returncode}): {result.stderr[-500:]}"
        report = json.loads(result.stdout)
        vulnerable = {
            dep["name"]: [v["id"] for v in dep["vulns"]] for dep in report["dependencies"] if dep.get("vulns")
        }
        print(f"[+] pip-audit scanned {len(report['dependencies'])} dependencies")
        assert not vulnerable, f"Vulnerable dependencies in requirements.txt: {vulnerable}"


class TestServerVersionDisclosure:
    """Tests for server version disclosure."""

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

            # Intentionally vulnerable target: assert the finding is detected (was xfail)
            assert has_version, 'Expected finding not detected: DVWA server header discloses version information'

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
                assert major > 3 or (major == 3 and minor >= 5), (
                    f"jQuery {jquery_version} has known XSS vulnerabilities (need >= 3.5.0)"
                )

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
                assert major > 4 or (major == 4 and minor > 3) or (major == 4 and minor == 3 and patch >= 1), (
                    f"Bootstrap {bootstrap_version} has known XSS vulnerabilities (need >= 4.3.1)"
                )

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
            ["trivy", "image", "--severity", "CRITICAL,HIGH", "--timeout", "5m", "vulnerables/web-dvwa"],
            capture_output=True,
            text=True,
            timeout=300,
        )

        output = result.stdout
        if "CRITICAL" in output or "HIGH" in output:
            print("[!] Vulnerabilities found in DVWA image (expected)")
        else:
            print("[+] No critical vulnerabilities")

        assert "CRITICAL" in output or "HIGH" in output, (
            "DVWA image should have known vulnerabilities (intentionally vulnerable)"
        )


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
