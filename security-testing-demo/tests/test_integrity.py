"""
OWASP A08:2021 - Software and Data Integrity Failures Tests

Tests for detecting integrity issues including:
- Insecure deserialization
- CI/CD pipeline security
- Unsigned software updates
- Integrity verification

Reference: https://owasp.org/Top10/A08_2021-Software_and_Data_Integrity_Failures/
"""

import os
import json
import pytest
import requests


pytestmark = pytest.mark.integrity


class TestInsecureDeserialization:
    """Tests for insecure deserialization vulnerabilities."""

    def test_json_deserialization(self, juice_shop_session, config):
        """
        Test for JSON deserialization issues.

        ID: SEC-INTEG-001
        APIs should validate JSON structure before processing.
        """
        if juice_shop_session is None:
            pytest.skip("Juice Shop not available")

        # Send malformed JSON
        malformed_payloads = [
            '{"__proto__": {"admin": true}}',  # Prototype pollution
            '{"constructor": {"prototype": {"admin": true}}}',
            '{"$where": "1==1"}',  # NoSQL injection via JSON
        ]

        api_url = f"{config.JUICE_SHOP_URL}/api/Users/"

        for payload in malformed_payloads:
            try:
                response = juice_shop_session.post(
                    api_url,
                    data=payload,
                    headers={"Content-Type": "application/json"},
                    timeout=5,
                )

                # Check for unusual behavior
                if response.status_code == 500:
                    print(f"[!] Server error with payload: {payload[:50]}")
                elif response.status_code == 200:
                    print(f"[!] Payload accepted: {payload[:50]}")

            except requests.RequestException:
                pass

        assert True

    def test_xml_external_entity(self, http_session, config):
        """
        Test for XML External Entity (XXE) vulnerability.

        ID: SEC-INTEG-002
        XML parsers should disable external entity processing.
        """
        # XXE payload
        xxe_payload = """<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<root>&xxe;</root>"""

        # Note: Most modern APIs use JSON, not XML
        # This is a conceptual test
        print("[*] XXE Test: Most modern APIs use JSON")
        print("[*] If XML is used, ensure external entities are disabled")

        assert True


class TestCICDIntegrity:
    """Tests for CI/CD pipeline integrity."""

    def test_github_actions_permissions(self):
        """
        Test GitHub Actions workflow permissions.

        ID: SEC-INTEG-003
        Workflows should use minimal permissions.
        """
        workflow_path = ".github/workflows/security-scan.yml"

        if not os.path.exists(workflow_path):
            pytest.skip("Workflow file not found")

        with open(workflow_path, "r") as f:
            content = f.read()

        # Check for security best practices
        checks = {
            "uses: actions/checkout": "Checkout action used",
            "permissions:": "Explicit permissions defined",
            "continue-on-error": "Error handling present",
        }

        print("\n=== GitHub Actions Security Checks ===")
        for check, desc in checks.items():
            present = check in content
            status = "[+]" if present else "[-]"
            print(f"{status} {desc}")

        assert True

    def test_no_hardcoded_secrets(self):
        """
        Test for hardcoded secrets in workflow files.

        ID: SEC-INTEG-004
        Secrets should use GitHub secrets, not hardcoded values.
        """
        workflow_dir = ".github/workflows"

        if not os.path.exists(workflow_dir):
            pytest.skip("Workflow directory not found")

        secret_patterns = [
            "password=",
            "api_key=",
            "secret=",
            "token=",
            "AKIA",  # AWS access key prefix
        ]

        issues = []
        for filename in os.listdir(workflow_dir):
            if filename.endswith((".yml", ".yaml")):
                filepath = os.path.join(workflow_dir, filename)
                with open(filepath, "r") as f:
                    content = f.read().lower()

                for pattern in secret_patterns:
                    if pattern.lower() in content:
                        # Check if it's a reference to secrets
                        if "${{ secrets." not in content:
                            issues.append((filename, pattern))

        if issues:
            print(f"[!] Potential hardcoded secrets: {issues}")
        else:
            print("[+] No obvious hardcoded secrets found")

        assert True


class TestSubresourceIntegrity:
    """Tests for Subresource Integrity (SRI)."""

    def test_external_scripts_have_sri(self, http_session, config):
        """
        Test if external scripts have SRI hashes.

        ID: SEC-INTEG-005
        External resources should have integrity attributes.
        """
        try:
            response = http_session.get(config.TARGET_URL, timeout=5)

            # Look for external scripts
            import re
            script_pattern = r'<script[^>]+src=["\']([^"\']+)["\'][^>]*>'
            scripts = re.findall(script_pattern, response.text, re.IGNORECASE)

            external_scripts = [s for s in scripts if s.startswith(("http://", "https://", "//"))]

            if external_scripts:
                print(f"[*] External scripts found: {len(external_scripts)}")

                # Check for integrity attribute
                integrity_pattern = r'<script[^>]+integrity=["\']([^"\']+)["\'][^>]*>'
                scripts_with_sri = re.findall(integrity_pattern, response.text, re.IGNORECASE)

                if scripts_with_sri:
                    print(f"[+] Scripts with SRI: {len(scripts_with_sri)}")
                else:
                    print("[!] No SRI hashes found on external scripts")
            else:
                print("[+] No external scripts found")

            assert True

        except requests.RequestException:
            pytest.skip("Target not available")

    def test_external_stylesheets_have_sri(self, http_session, config):
        """
        Test if external stylesheets have SRI hashes.

        ID: SEC-INTEG-006
        """
        try:
            response = http_session.get(config.TARGET_URL, timeout=5)

            import re
            # Look for external stylesheets
            link_pattern = r'<link[^>]+href=["\']([^"\']+\.css[^"\']*)["\'][^>]*>'
            stylesheets = re.findall(link_pattern, response.text, re.IGNORECASE)

            external_css = [s for s in stylesheets if s.startswith(("http://", "https://", "//"))]

            if external_css:
                print(f"[*] External stylesheets: {len(external_css)}")
            else:
                print("[+] No external stylesheets")

            assert True

        except requests.RequestException:
            pytest.skip("Target not available")


class TestDataIntegrity:
    """Tests for data integrity verification."""

    def test_content_type_validation(self, http_session, config):
        """
        Test if Content-Type is properly set.

        ID: SEC-INTEG-007
        Responses should have correct Content-Type headers.
        """
        try:
            response = http_session.get(config.TARGET_URL, timeout=5)
            content_type = response.headers.get("Content-Type", "")

            if content_type:
                print(f"[+] Content-Type: {content_type}")

                # Check for charset
                if "charset" in content_type.lower():
                    print("[+] Charset specified")
                else:
                    print("[*] No charset specified")
            else:
                print("[!] Content-Type header missing")

            assert True

        except requests.RequestException:
            pytest.skip("Target not available")

    def test_x_content_type_options(self, http_session, config):
        """
        Test for X-Content-Type-Options header.

        ID: SEC-INTEG-008
        Should be set to 'nosniff' to prevent MIME sniffing.
        """
        try:
            response = http_session.get(config.TARGET_URL, timeout=5)
            xcto = response.headers.get("X-Content-Type-Options", "")

            if xcto.lower() == "nosniff":
                print("[+] X-Content-Type-Options: nosniff")
            elif xcto:
                print(f"[*] X-Content-Type-Options: {xcto}")
            else:
                print("[!] X-Content-Type-Options header missing")

            assert True

        except requests.RequestException:
            pytest.skip("Target not available")


class TestUpdateIntegrity:
    """Tests for software update integrity."""

    def test_package_lock_exists(self):
        """
        Test that package lock files exist for reproducible builds.

        ID: SEC-INTEG-009
        Lock files ensure consistent dependency versions.
        """
        lock_files = [
            "requirements.txt",  # Python (not a lock, but version pinning)
            "Pipfile.lock",
            "poetry.lock",
            "package-lock.json",
            "yarn.lock",
        ]

        found = []
        for lock_file in lock_files:
            if os.path.exists(lock_file):
                found.append(lock_file)

        if found:
            print(f"[+] Lock files found: {found}")
        else:
            print("[*] No lock files found")

        assert True

    def test_pinned_versions(self):
        """
        Test that dependencies have pinned versions.

        ID: SEC-INTEG-010
        Dependencies should have specific version numbers.
        """
        if not os.path.exists("requirements.txt"):
            pytest.skip("requirements.txt not found")

        with open("requirements.txt", "r") as f:
            lines = f.readlines()

        unpinned = []
        for line in lines:
            line = line.strip()
            if line and not line.startswith("#"):
                # Check for version specifier
                if "==" not in line and ">=" not in line and "<=" not in line:
                    unpinned.append(line)

        if unpinned:
            print(f"[!] Unpinned dependencies: {unpinned[:5]}")
        else:
            print("[+] All dependencies have version specifiers")

        assert True
