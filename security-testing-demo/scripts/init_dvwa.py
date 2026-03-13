#!/usr/bin/env python3
"""Initialize DVWA database for CI environment."""

import re
import requests


def init_dvwa(base_url="http://localhost"):
    session = requests.Session()

    # Load setup page to get CSRF value
    resp = session.get(f"{base_url}/setup.php", timeout=30)
    match = re.search(r"user_token'[^>]+value='([^']+)'", resp.text)
    csrf = match.group(1) if match else ""

    # Submit DB creation form
    session.post(
        f"{base_url}/setup.php",
        data={"create_db": "Create / Reset Database", "user_token": csrf},
        timeout=30,
    )
    print("DVWA database initialized")


if __name__ == "__main__":
    init_dvwa()
