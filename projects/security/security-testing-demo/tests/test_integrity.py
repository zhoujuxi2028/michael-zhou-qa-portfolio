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
import re
from pathlib import Path

import pytest
import requests

# Real credential shapes, not bare substrings: a bare "AKIA" also appears in
# the secret-scan regex of commit-guard.yml (false positive).
SECRET_PATTERNS = {
    "aws_access_key": re.compile(r"\b(?:AKIA|ASIA)[0-9A-Z]{16}\b"),
    "literal_credential": re.compile(
        r"(?i)\b(?:password|passwd|api[_-]?key|secret|token)\s*[:=]\s*"
        r"['\"]?(?!\$\{\{)[A-Za-z0-9_\-/+]{12,}"
    ),
}


@pytest.mark.parametrize(
    "line,expected",
    [
        ("  AWS_KEY: AKIAIOSFODNN7EXAMPLE", True),
        ("  password: SuperSecret12345", True),
        ("  api_key=abcdef0123456789xyz", True),
        ("  token: ${{ secrets.GITHUB_TOKEN }}", False),
        ("          (AKIA|ASIA)[0-9A-Z]{16}", False),
        ("  password: password", False),
    ],
)
def test_secret_patterns_detect_real_shapes(line, expected):
    """Self-check SEC-INTEG-004's detector: catches real shapes, ignores refs/regex."""
    assert any(p.search(line) for p in SECRET_PATTERNS.values()) is expected


def _workflow_dir():
    """Locate the repo's .github/workflows regardless of pytest's cwd.

    CI runs pytest from the project dir, so a relative ".github/workflows"
    never existed and these tests were always skipped.
    """
    for parent in Path(__file__).resolve().parents:
        candidate = parent / ".github" / "workflows"
        if candidate.is_dir():
            return candidate
    return None


pytestmark = pytest.mark.integrity


class TestInsecureDeserialization:
    """Tests for insecure deserialization vulnerabilities."""

    @pytest.mark.xfail(reason="Juice Shop accepts malformed JSON payloads")
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

        dangerous_accepted = []
        for payload in malformed_payloads:
            try:
                response = juice_shop_session.post(
                    api_url,
                    data=payload,
                    headers={"Content-Type": "application/json"},
                    timeout=5,
                )

                if response.status_code == 500:
                    print(f"[!] Server error with payload: {payload[:50]}")
                elif response.status_code in [200, 201]:
                    print(f"[!] Payload accepted: {payload[:50]}")
                    dangerous_accepted.append(payload[:50])

            except requests.RequestException:
                pass

        assert (
            not dangerous_accepted
        ), f"Malicious JSON payloads should be rejected: {dangerous_accepted}"


class TestCICDIntegrity:
    """Tests for CI/CD pipeline integrity."""

    def test_github_actions_permissions(self):
        """
        Test GitHub Actions workflow permissions.

        ID: SEC-INTEG-003
        Every workflow should declare explicit (least-privilege) permissions,
        at workflow or job level, instead of inheriting the default token scope.
        """
        workflow_dir = _workflow_dir()
        if workflow_dir is None:
            pytest.skip("Workflow directory not found")

        workflows = sorted(workflow_dir.glob("*.y*ml"))
        assert workflows, "No workflow files found"

        missing = [
            wf.name
            for wf in workflows
            if not re.search(r"^(\s{4})?permissions:", wf.read_text(), re.MULTILINE)
        ]

        print(
            f"\n[+] {len(workflows) - len(missing)}/{len(workflows)} workflows declare permissions"
        )
        assert not missing, f"Workflows without explicit permissions: {missing}"

    def test_no_hardcoded_secrets(self):
        """
        Test for hardcoded secrets in workflow files.

        ID: SEC-INTEG-004
        Secrets should use GitHub secrets, not hardcoded values.
        """
        workflow_dir = _workflow_dir()

        if workflow_dir is None:
            pytest.skip("Workflow directory not found")

        issues = []
        for filepath in sorted(workflow_dir.glob("*.y*ml")):
            for lineno, line in enumerate(filepath.read_text().splitlines(), 1):
                for name, pattern in SECRET_PATTERNS.items():
                    if pattern.search(line):
                        issues.append((filepath.name, lineno, name))

        if issues:
            print(f"[!] Potential hardcoded secrets: {issues}")
        else:
            print("[+] No obvious hardcoded secrets found")

        assert not issues, f"Hardcoded secrets found in workflow files: {issues}"


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

            external_scripts = [
                s for s in scripts if s.startswith(("http://", "https://", "//"))
            ]

            if external_scripts:
                print(f"[*] External scripts found: {len(external_scripts)}")

                # Check for integrity attribute
                integrity_pattern = r'<script[^>]+integrity=["\']([^"\']+)["\'][^>]*>'
                scripts_with_sri = re.findall(
                    integrity_pattern, response.text, re.IGNORECASE
                )

                if scripts_with_sri:
                    print(f"[+] Scripts with SRI: {len(scripts_with_sri)}")
                else:
                    print("[!] No SRI hashes found on external scripts")

                assert len(scripts_with_sri) >= len(
                    external_scripts
                ), f"All external scripts should have SRI ({len(scripts_with_sri)}/{len(external_scripts)})"
            else:
                print("[+] No external scripts found")

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

            external_css = [
                s for s in stylesheets if s.startswith(("http://", "https://", "//"))
            ]

            if external_css:
                print(f"[*] External stylesheets: {len(external_css)}")
                # Check for integrity attribute on link tags
                integrity_pattern = r'<link[^>]+integrity=["\']([^"\']+)["\'][^>]*>'
                links_with_sri = re.findall(
                    integrity_pattern, response.text, re.IGNORECASE
                )
                assert len(links_with_sri) >= len(
                    external_css
                ), f"All external stylesheets should have SRI ({len(links_with_sri)}/{len(external_css)})"
            else:
                print("[+] No external stylesheets")

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

            assert content_type, "Content-Type header should be present"

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

            # Intentionally vulnerable target: assert the finding is detected (was xfail)
            assert not (xcto.lower() == 'nosniff'), (
                'Expected finding not detected: DVWA does not set X-Content-Type-Options header'
            )

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

        assert len(found) > 0, "Should have at least one dependency lock/version file"

    def test_pinned_versions(self):
        """
        Test that dependencies have pinned versions.

        ID: SEC-INTEG-010
        Dependencies should have specific version numbers.
        """
        if not os.path.exists("requirements.txt"):
            pytest.skip("requirements.txt not found")

        with open("requirements.txt") as f:
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

        assert (
            not unpinned
        ), f"All dependencies should have pinned versions: {unpinned[:5]}"
