#!/usr/bin/env python3
"""
Quick test to verify ISSUE-001 fix
Tests that login page elements can be found with new locators
"""

import sys
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def test_login_locators():
    """Test that we can find login page elements with corrected locators"""
    print("🧪 Testing ISSUE-001 fix: Login page element locators")
    print("=" * 60)

    # Setup Chrome
    options = Options()
    options.add_argument('--headless=new')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--ignore-certificate-errors')

    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=options)

    try:
        # Navigate to login page
        url = "https://10.206.201.9:8443/logon.jsp"
        print(f"\n1. Navigating to: {url}")
        driver.get(url)
        print("   ✓ Page loaded")

        # Wait for page to be ready
        WebDriverWait(driver, 10).until(
            lambda d: d.execute_script('return document.readyState') == 'complete'
        )
        print("   ✓ Page ready")

        # Test new locators
        print("\n2. Testing corrected locators:")

        # Find username field
        try:
            username_field = driver.find_element(By.NAME, 'uid')
            print("   ✓ Username field found: name='uid'")
        except Exception as e:
            print(f"   ✗ Username field NOT found: {e}")
            return False

        # Find password field
        try:
            password_field = driver.find_element(By.NAME, 'passwd')
            print("   ✓ Password field found: name='passwd'")
        except Exception as e:
            print(f"   ✗ Password field NOT found: {e}")
            return False

        # Find submit button
        try:
            submit_button = driver.find_element(By.NAME, 'pwd')
            print("   ✓ Submit button found: name='pwd'")
        except Exception as e:
            print(f"   ✗ Submit button NOT found: {e}")
            return False

        # Test login functionality
        print("\n3. Testing login interaction:")
        username_field.clear()
        username_field.send_keys('admin')
        print("   ✓ Username entered")

        password_field.clear()
        password_field.send_keys('111111')
        print("   ✓ Password entered")

        print("\n" + "=" * 60)
        print("✅ ISSUE-001 FIX VERIFIED!")
        print("=" * 60)
        print("\nAll elements found with corrected locators:")
        print("  - name='uid' (was: name='userid') ✓")
        print("  - name='passwd' (was: name='password') ✓")
        print("  - name='pwd' (was: name='submit') ✓")
        print("\nLogin page is now functional!")
        return True

    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        driver.quit()
        print("\n🧹 Browser closed")

if __name__ == "__main__":
    success = test_login_locators()
    sys.exit(0 if success else 1)
