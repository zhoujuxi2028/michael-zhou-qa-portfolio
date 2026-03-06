#!/bin/bash
###############################################################################
# Test Environment Verification Script
#
# Purpose: Verify test environment setup before running tests
# Usage: ./scripts/verify-test-environment.sh [--verbose]
#
# This script prevents issues like ISSUE-003 by verifying current system state
# rather than relying on old logs or assumptions.
#
# Author: Michael Zhou
# Date: 2026-02-11
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Verbose mode
VERBOSE=false
if [[ "$1" == "--verbose" ]]; then
    VERBOSE=true
fi

# Counters
CHECKS_PASSED=0
CHECKS_FAILED=0
CHECKS_WARNED=0

# Report file
REPORT_FILE="outputs/reports/environment-check-$(date +%Y%m%d-%H%M%S).txt"
mkdir -p outputs/reports

echo "================================================================"
echo "   Test Environment Verification"
echo "   $(date)"
echo "================================================================"
echo ""

# Function to print check result
check_result() {
    local status=$1
    local message=$2
    local detail=$3

    if [ "$status" == "PASS" ]; then
        echo -e "${GREEN}✓${NC} $message"
        [ "$VERBOSE" == "true" ] && [ -n "$detail" ] && echo "  → $detail"
        ((CHECKS_PASSED++))
    elif [ "$status" == "FAIL" ]; then
        echo -e "${RED}✗${NC} $message"
        [ -n "$detail" ] && echo "  → $detail"
        ((CHECKS_FAILED++))
    elif [ "$status" == "WARN" ]; then
        echo -e "${YELLOW}⚠${NC} $message"
        [ -n "$detail" ] && echo "  → $detail"
        ((CHECKS_WARNED++))
    fi

    # Log to report file
    echo "[$status] $message" >> "$REPORT_FILE"
    [ -n "$detail" ] && echo "  Detail: $detail" >> "$REPORT_FILE"
}

echo "1. Python Environment"
echo "----------------------------------------------------------------"

# Check Python version
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version 2>&1 | cut -d' ' -f2)
    check_result "PASS" "Python installed" "Version: $PYTHON_VERSION"
else
    check_result "FAIL" "Python not found" "Install Python 3.8+"
fi

# Check pip
if command -v pip3 &> /dev/null; then
    PIP_VERSION=$(pip3 --version 2>&1 | cut -d' ' -f2)
    check_result "PASS" "pip installed" "Version: $PIP_VERSION"
else
    check_result "FAIL" "pip not found" "Install pip3"
fi

echo ""
echo "2. Browser Environment"
echo "----------------------------------------------------------------"

# Check Chrome
if command -v google-chrome &> /dev/null; then
    CHROME_VERSION=$(google-chrome --version 2>&1 | cut -d' ' -f3)
    check_result "PASS" "Google Chrome installed" "Version: $CHROME_VERSION"

    # Verify Chrome can start
    if timeout 5 google-chrome --headless --disable-gpu --dump-dom about:blank &> /dev/null; then
        check_result "PASS" "Chrome can start in headless mode"
    else
        check_result "WARN" "Chrome installed but may have issues starting"
    fi
else
    check_result "WARN" "Google Chrome not found" "Will need to use Firefox"
fi

# Check Firefox
if command -v firefox &> /dev/null; then
    FIREFOX_VERSION=$(firefox --version 2>&1 | cut -d' ' -f3)
    check_result "PASS" "Firefox installed" "Version: $FIREFOX_VERSION"
else
    check_result "WARN" "Firefox not found" "Install Firefox as backup"
fi

# Check configured browser
if [ -f .env ]; then
    CONFIGURED_BROWSER=$(grep "^BROWSER=" .env | cut -d'=' -f2)
    if [ "$CONFIGURED_BROWSER" == "chrome" ]; then
        if command -v google-chrome &> /dev/null; then
            check_result "PASS" "Configured browser (chrome) is available"
        else
            check_result "FAIL" "Configured browser (chrome) is NOT available" "Update .env or install Chrome"
        fi
    elif [ "$CONFIGURED_BROWSER" == "firefox" ]; then
        if command -v firefox &> /dev/null; then
            check_result "PASS" "Configured browser (firefox) is available"
        else
            check_result "FAIL" "Configured browser (firefox) is NOT available" "Update .env or install Firefox"
        fi
    fi
else
    check_result "WARN" ".env file not found" "Copy .env.example to .env"
fi

echo ""
echo "3. WebDriver Environment"
echo "----------------------------------------------------------------"

# Check ChromeDriver cache
if [ -d "$HOME/.wdm/drivers/chromedriver" ]; then
    CHROMEDRIVER_CACHED=$(find "$HOME/.wdm/drivers/chromedriver" -name "chromedriver" -type f 2>/dev/null | head -1)
    if [ -n "$CHROMEDRIVER_CACHED" ]; then
        CHROMEDRIVER_VERSION=$(basename $(dirname $(dirname "$CHROMEDRIVER_CACHED")))
        check_result "PASS" "ChromeDriver cached" "Version: $CHROMEDRIVER_VERSION"
    else
        check_result "WARN" "ChromeDriver not cached" "Will download on first run"
    fi
else
    check_result "WARN" "ChromeDriver not cached" "Will download on first run"
fi

# Check GeckoDriver cache
if [ -d "$HOME/.wdm/drivers/geckodriver" ]; then
    GECKODRIVER_CACHED=$(find "$HOME/.wdm/drivers/geckodriver" -name "geckodriver" -type f 2>/dev/null | head -1)
    if [ -n "$GECKODRIVER_CACHED" ]; then
        GECKODRIVER_VERSION=$(basename $(dirname "$GECKODRIVER_CACHED"))
        check_result "PASS" "GeckoDriver cached" "Version: $GECKODRIVER_VERSION"
    else
        check_result "WARN" "GeckoDriver not cached" "Will download on first run"
    fi
else
    check_result "WARN" "GeckoDriver not cached" "Will download on first run"
fi

echo ""
echo "4. Python Dependencies"
echo "----------------------------------------------------------------"

# Check key packages
REQUIRED_PACKAGES=("selenium" "pytest" "python-dotenv" "webdriver-manager")

for package in "${REQUIRED_PACKAGES[@]}"; do
    if pip3 show "$package" &> /dev/null; then
        VERSION=$(pip3 show "$package" 2>/dev/null | grep "Version:" | cut -d' ' -f2)
        check_result "PASS" "$package installed" "Version: $VERSION"
    else
        check_result "FAIL" "$package not installed" "Run: pip install $package"
    fi
done

echo ""
echo "5. Configuration Files"
echo "----------------------------------------------------------------"

# Check .env file
if [ -f .env ]; then
    check_result "PASS" ".env file exists"

    # Check required variables
    REQUIRED_VARS=("BASE_URL" "USERNAME" "PASSWORD" "BROWSER")
    for var in "${REQUIRED_VARS[@]}"; do
        if grep -q "^${var}=" .env; then
            VALUE=$(grep "^${var}=" .env | cut -d'=' -f2)
            if [ -n "$VALUE" ]; then
                check_result "PASS" "$var configured" "${var}=${VALUE}"
            else
                check_result "FAIL" "$var is empty" "Set value in .env"
            fi
        else
            check_result "FAIL" "$var not found in .env" "Add to .env file"
        fi
    done
else
    check_result "FAIL" ".env file not found" "Copy .env.example to .env"
fi

# Check pytest.ini
if [ -f pytest.ini ]; then
    check_result "PASS" "pytest.ini exists"
else
    check_result "WARN" "pytest.ini not found" "May affect test configuration"
fi

echo ""
echo "6. Network Connectivity"
echo "----------------------------------------------------------------"

# Check if BASE_URL is accessible (if configured)
if [ -f .env ]; then
    BASE_URL=$(grep "^BASE_URL=" .env | cut -d'=' -f2)
    if [ -n "$BASE_URL" ]; then
        HOST=$(echo "$BASE_URL" | sed -e 's|https\?://||' -e 's|:.*||')
        PORT=$(echo "$BASE_URL" | grep -oP ':\K[0-9]+' || echo "443")

        # Ping test
        if ping -c 1 -W 2 "$HOST" &> /dev/null; then
            check_result "PASS" "Server is reachable" "Host: $HOST"
        else
            check_result "WARN" "Server ping failed" "Check network or VPN"
        fi

        # HTTPS test
        if timeout 5 curl -k -s -o /dev/null -w "%{http_code}" "$BASE_URL" | grep -q "[23].."; then
            check_result "PASS" "HTTPS endpoint accessible" "URL: $BASE_URL"
        else
            check_result "WARN" "HTTPS endpoint not accessible" "Server may be down or require VPN"
        fi
    fi
fi

echo ""
echo "7. Directory Structure"
echo "----------------------------------------------------------------"

# Check required directories
REQUIRED_DIRS=("src/tests" "src/frameworks/pages" "src/core/config" "outputs/logs" "outputs/reports" "outputs/screenshots")

for dir in "${REQUIRED_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        check_result "PASS" "Directory exists: $dir"
    else
        check_result "WARN" "Directory missing: $dir" "Will be created automatically"
        mkdir -p "$dir" 2>/dev/null || true
    fi
done

echo ""
echo "================================================================"
echo "   Summary"
echo "================================================================"
echo ""
echo -e "${GREEN}Passed:${NC}  $CHECKS_PASSED"
echo -e "${YELLOW}Warnings:${NC} $CHECKS_WARNED"
echo -e "${RED}Failed:${NC}  $CHECKS_FAILED"
echo ""
echo "Report saved to: $REPORT_FILE"
echo ""

if [ $CHECKS_FAILED -gt 0 ]; then
    echo -e "${RED}⚠ Environment verification FAILED${NC}"
    echo "Please fix the failed checks before running tests."
    echo ""
    exit 1
elif [ $CHECKS_WARNED -gt 0 ]; then
    echo -e "${YELLOW}⚠ Environment verification PASSED with warnings${NC}"
    echo "Tests may run, but some features might be unavailable."
    echo ""
    exit 0
else
    echo -e "${GREEN}✓ Environment verification PASSED${NC}"
    echo "All checks passed. Ready to run tests!"
    echo ""
    exit 0
fi
