#!/bin/bash
#
# K8S Auto Testing Platform - Test Report Generator
#
# Usage:
#   ./scripts/generate-report.sh              # Run all tests and generate report
#   ./scripts/generate-report.sh -m smoke     # Run only smoke tests
#   ./scripts/generate-report.sh --no-run     # Generate from existing JUnit XML
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
REPORTS_DIR="${PROJECT_DIR}/reports"
TESTS_DIR="${PROJECT_DIR}/tests"

# Parse arguments
RUN_TESTS=true
MARKERS=""
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -m|--markers)
            MARKERS="$2"
            shift 2
            ;;
        --no-run)
            RUN_TESTS=false
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -m, --markers MARKERS  Pytest markers to filter tests"
            echo "  --no-run               Generate report from existing JUnit XML"
            echo "  -v, --verbose          Verbose output"
            echo "  -h, --help             Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                     # Run all tests and generate report"
            echo "  $0 -m smoke            # Run only smoke tests"
            echo "  $0 -m 'not slow'       # Run all except slow tests"
            echo "  $0 --no-run            # Generate from existing results"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Ensure reports directory exists
mkdir -p "$REPORTS_DIR"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}K8S Auto Testing Platform - Report Generator${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

cd "$PROJECT_DIR"

if [ "$RUN_TESTS" = true ]; then
    echo -e "${YELLOW}Running tests...${NC}"
    echo ""

    # Build pytest command
    PYTEST_CMD="python -m pytest ${TESTS_DIR} -v"
    PYTEST_CMD+=" --junitxml=${REPORTS_DIR}/junit-results.xml"
    PYTEST_CMD+=" --html=${REPORTS_DIR}/test-report.html"
    PYTEST_CMD+=" --self-contained-html"

    if [ -n "$MARKERS" ]; then
        PYTEST_CMD+=" -m '${MARKERS}'"
        echo -e "${BLUE}Markers: ${MARKERS}${NC}"
    fi

    echo -e "${BLUE}Command: ${PYTEST_CMD}${NC}"
    echo ""

    # Run tests (allow failure for report generation)
    set +e
    eval $PYTEST_CMD
    TEST_EXIT_CODE=$?
    set -e

    echo ""
    if [ $TEST_EXIT_CODE -eq 0 ]; then
        echo -e "${GREEN}Tests passed!${NC}"
    else
        echo -e "${RED}Some tests failed (exit code: ${TEST_EXIT_CODE})${NC}"
    fi
    echo ""
fi

# Generate enhanced report
echo -e "${YELLOW}Generating enhanced reports...${NC}"

if [ -f "${REPORTS_DIR}/junit-results.xml" ]; then
    python "${PROJECT_DIR}/tools/report_generator.py" \
        --junit-xml "${REPORTS_DIR}/junit-results.xml" \
        --output-dir "${REPORTS_DIR}"
else
    echo -e "${RED}Error: No JUnit XML found at ${REPORTS_DIR}/junit-results.xml${NC}"
    echo -e "${YELLOW}Run tests first or check if tests completed successfully${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Reports Generated Successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Reports available at:"
echo -e "  ${BLUE}HTML Report:${NC}      ${REPORTS_DIR}/test-report.html"
echo -e "  ${BLUE}Executive Summary:${NC} ${REPORTS_DIR}/executive-summary.html"
echo -e "  ${BLUE}JSON Report:${NC}      ${REPORTS_DIR}/test-results.json"
echo -e "  ${BLUE}JUnit XML:${NC}        ${REPORTS_DIR}/junit-results.xml"
echo ""

# Open report in browser (macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo -e "${YELLOW}Opening report in browser...${NC}"
    open "${REPORTS_DIR}/executive-summary.html"
fi

if [ "$RUN_TESTS" = true ]; then
    exit $TEST_EXIT_CODE
else
    exit 0
fi
