#!/bin/bash
# run_tests.sh - Test execution helper
#
# This script provides convenient shortcuts for common test execution patterns.

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to display usage
usage() {
    echo "Usage: $0 [option]"
    echo ""
    echo "Options:"
    echo "  all           Run all tests"
    echo "  ui            Run UI tests only"
    echo "  smoke         Run smoke tests only (-m smoke)"
    echo "  dev           Run development tests only"
    echo "  collect       Collect tests without running (--collect-only)"
    echo "  report        Run tests and generate HTML report"
    echo "  allure        Generate Allure report"
    echo "  clean         Clean up test outputs"
    echo "  help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 all        # Run all tests"
    echo "  $0 smoke      # Run only smoke tests"
    echo "  $0 report     # Run tests with HTML report"
}

# Check if no arguments provided
if [ $# -eq 0 ]; then
    usage
    exit 0
fi

case "$1" in
    all)
        echo -e "${BLUE}Running all tests...${NC}"
        pytest tests/ -v
        ;;
    ui)
        echo -e "${BLUE}Running UI tests...${NC}"
        pytest tests/ui/ -v
        ;;
    smoke)
        echo -e "${BLUE}Running smoke tests...${NC}"
        pytest tests/ -m smoke -v
        ;;
    dev)
        echo -e "${BLUE}Running development tests...${NC}"
        pytest tests/dev/ -v
        ;;
    collect)
        echo -e "${BLUE}Collecting tests...${NC}"
        pytest --collect-only
        ;;
    report)
        echo -e "${BLUE}Running tests with HTML report...${NC}"
        pytest tests/ -v --html=outputs/reports/report.html --self-contained-html
        echo -e "${GREEN}Report generated: outputs/reports/report.html${NC}"
        ;;
    allure)
        echo -e "${BLUE}Generating Allure report...${NC}"
        if command -v allure &> /dev/null; then
            allure generate outputs/allure-results -o outputs/allure-report --clean
            echo -e "${GREEN}Allure report generated: outputs/allure-report${NC}"
            echo -e "${YELLOW}To view report: allure open outputs/allure-report${NC}"
        else
            echo -e "${YELLOW}Allure not installed. Install with: npm install -g allure-commandline${NC}"
            exit 1
        fi
        ;;
    clean)
        echo -e "${BLUE}Cleaning up test outputs...${NC}"
        bash scripts/cleanup_outputs.sh
        ;;
    help)
        usage
        ;;
    *)
        echo "Unknown option: $1"
        echo ""
        usage
        exit 1
        ;;
esac
