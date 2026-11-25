"""
OWASP A05:2021 - XML External Entity (XXE) Tests

Target: Juice Shop B2B complaint upload (POST /file-upload, *.xml). Juice Shop
only parses XML when its XXE challenges are enabled; in Docker they are
disabled ("XXE attacks in Docker/Heroku containers regularly cause segfault
crashes"), so the upload is rejected before parsing. These tests assert that
observed behavior instead of skipping as "Conceptual".

Replaces SEC-INTEG-002 (test_integrity.py), which only printed advice.
"""

import pytest
import requests

pytestmark = pytest.mark.integrity

XXE_PAYLOAD = (
    '<?xml version="1.0"?>'
    '<!DOCTYPE complaint [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>'
    "<complaint>&xxe;</complaint>"
)


def _upload(config, filename, content):
    try:
        return requests.post(
            f"{config.JUICE_SHOP_URL}/file-upload",
            files={"file": (filename, content, "application/xml")},
            timeout=15,
        )
    except requests.RequestException:
        pytest.skip("Juice Shop not available")


class TestXXE:
    """XML External Entity processing."""

    def test_xml_upload_interface_recognized(self, config):
        """SEC-INTEG-002a: .xml uploads reach the XML handler (410 'deprecated'), not a generic error."""
        response = _upload(config, "complaint.xml", "<complaint>ok</complaint>")
        assert (
            response.status_code == 410
        ), f"Expected XML handler (410), got {response.status_code}"
        assert (
            "B2B customer complaints via file upload have been deprecated"
            in response.text
        )

    def test_xml_external_entity(self, config):
        """SEC-INTEG-002: external entity in an uploaded XML file is NOT resolved (no /etc/passwd leak)."""
        response = _upload(config, "complaint.xml", XXE_PAYLOAD)
        assert (
            response.status_code == 410
        ), f"Expected XML upload to be rejected, got {response.status_code}"
        assert "root:x:0:0" not in response.text, "XXE resolved file:///etc/passwd"
