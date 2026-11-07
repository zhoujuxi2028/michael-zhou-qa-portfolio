"""Smoke test fixtures — lightweight, no project dependencies."""

import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.chrome.service import Service as ChromeService
from webdriver_manager.chrome import ChromeDriverManager


@pytest.fixture(scope="function")
def driver():
    """Headless Chrome driver for smoke tests."""
    options = ChromeOptions()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")

    service = ChromeService(executable_path=ChromeDriverManager().install())
    browser = webdriver.Chrome(service=service, options=options)

    yield browser

    browser.quit()
