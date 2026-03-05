#!/bin/bash
# K8S Auto Testing Platform - Performance Test Runner
# Runs Locust load tests and generates reports

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
REPORTS_DIR="${PROJECT_ROOT}/reports/performance"
LOCUST_FILE="${PROJECT_ROOT}/tests/locustfile.py"

# Default parameters
HOST="${HOST:-http://localhost:8080}"
USERS="${USERS:-10}"
SPAWN_RATE="${SPAWN_RATE:-2}"
RUN_TIME="${RUN_TIME:-60s}"
USER_CLASS="${USER_CLASS:-TestAppUser}"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --host)
            HOST="$2"
            shift 2
            ;;
        --users)
            USERS="$2"
            shift 2
            ;;
        --spawn-rate)
            SPAWN_RATE="$2"
            shift 2
            ;;
        --duration)
            RUN_TIME="${2}s"
            shift 2
            ;;
        --user-class)
            USER_CLASS="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --host URL        Target host (default: http://localhost:8080)"
            echo "  --users N         Number of concurrent users (default: 10)"
            echo "  --spawn-rate N    User spawn rate per second (default: 2)"
            echo "  --duration N      Test duration in seconds (default: 60)"
            echo "  --user-class NAME Locust user class to use (default: TestAppUser)"
            echo "                    Options: TestAppUser, CPULoadUser, MemoryLoadUser, HPAStressUser"
            echo ""
            echo "Examples:"
            echo "  $0 --users 20 --duration 120"
            echo "  $0 --user-class HPAStressUser --users 50 --duration 300"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Create reports directory
mkdir -p "$REPORTS_DIR"

# Generate timestamp for report names
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_PREFIX="${REPORTS_DIR}/locust_${TIMESTAMP}"

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  K8S Auto Testing Platform${NC}"
echo -e "${BLUE}  Performance Test Runner${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo -e "${YELLOW}Configuration:${NC}"
echo "  Host:        $HOST"
echo "  Users:       $USERS"
echo "  Spawn Rate:  $SPAWN_RATE users/sec"
echo "  Duration:    $RUN_TIME"
echo "  User Class:  $USER_CLASS"
echo "  Reports:     $REPORTS_DIR"
echo ""

# Check if locust is installed
if ! command -v locust &> /dev/null; then
    echo -e "${RED}Error: Locust is not installed${NC}"
    echo "Install with: pip install locust"
    exit 1
fi

# Check if target is reachable
echo -e "${YELLOW}Checking target availability...${NC}"
if curl -s --max-time 5 "${HOST}/health" > /dev/null 2>&1; then
    echo -e "${GREEN}Target is reachable${NC}"
else
    echo -e "${RED}Warning: Target may not be reachable at ${HOST}${NC}"
    echo "Continuing anyway..."
fi

echo ""
echo -e "${GREEN}Starting Locust performance test...${NC}"
echo ""

# Run Locust in headless mode
locust \
    -f "$LOCUST_FILE" \
    --host "$HOST" \
    --users "$USERS" \
    --spawn-rate "$SPAWN_RATE" \
    --run-time "$RUN_TIME" \
    --headless \
    --only-summary \
    --html "${REPORT_PREFIX}_report.html" \
    --csv "${REPORT_PREFIX}" \
    ${USER_CLASS:+--class-picker}

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Performance Test Completed!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "${YELLOW}Reports generated:${NC}"
echo "  HTML Report:  ${REPORT_PREFIX}_report.html"
echo "  CSV Stats:    ${REPORT_PREFIX}_stats.csv"
echo "  CSV History:  ${REPORT_PREFIX}_stats_history.csv"
echo "  CSV Failures: ${REPORT_PREFIX}_failures.csv"
echo ""

# Generate summary
if [[ -f "${REPORT_PREFIX}_stats.csv" ]]; then
    echo -e "${YELLOW}Quick Summary:${NC}"
    echo ""
    # Parse and display key metrics from CSV
    tail -n 1 "${REPORT_PREFIX}_stats.csv" | awk -F',' '{
        print "  Total Requests:     " $3
        print "  Failures:           " $4
        print "  Median Response:    " $6 " ms"
        print "  95th Percentile:    " $9 " ms"
        print "  Requests/sec:       " $10
    }' 2>/dev/null || echo "  (Summary parsing unavailable)"
fi

echo ""
echo -e "${BLUE}To view the HTML report, open:${NC}"
echo "  open ${REPORT_PREFIX}_report.html"
