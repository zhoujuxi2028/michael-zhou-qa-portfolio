"""Smoke test — verify Selenium WebDriver initializes and can load a page."""

import pytest
from selenium.webdriver.common.by import By


@pytest.mark.smoke
class TestWebDriverSmoke:
    """Minimal WebDriver smoke tests for CI validation."""

    def test_driver_starts_and_loads_page(self, driver):
        """WebDriver can start headless Chrome and load a data URI."""
        driver.get(
            "data:text/html,<html><head><title>Smoke</title></head>"
            "<body><h1>OK</h1></body></html>"
        )

        assert driver.title == "Smoke"
        h1 = driver.find_element(By.TAG_NAME, "h1")
        assert h1.text == "OK"
