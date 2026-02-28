#!/bin/bash

# Run All API Tests
# This script runs the complete test suite against the specified environment

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
COLLECTION="collections/API-Test-Collection.postman_collection.json"
ENVIRONMENT="${1:-dev}"
ENV_FILE="environments/${ENVIRONMENT}.postman_environment.json"
REPORT_DIR="reports"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Running API Tests${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if Newman is installed
if ! command -v newman &> /dev/null; then
    echo -e "${RED}Error: Newman is not installed${NC}"
    echo "Install it with: npm install -g newman"
    exit 1
fi

# Check if collection exists
if [ ! -f "$COLLECTION" ]; then
    echo -e "${RED}Error: Collection file not found: $COLLECTION${NC}"
    exit 1
fi

# Check if environment file exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}Error: Environment file not found: $ENV_FILE${NC}"
    exit 1
fi

# Create reports directory if it doesn't exist
mkdir -p "$REPORT_DIR"

# Run tests
echo -e "${YELLOW}Environment: $ENVIRONMENT${NC}"
echo -e "${YELLOW}Collection: $COLLECTION${NC}"
echo -e "${YELLOW}Running tests...${NC}"
echo ""

newman run "$COLLECTION" \
    -e "$ENV_FILE" \
    -r cli,html,json \
    --reporter-html-export "$REPORT_DIR/newman-report-$ENVIRONMENT.html" \
    --reporter-json-export "$REPORT_DIR/newman-report-$ENVIRONMENT.json" \
    --color on \
    --bail

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo -e "Report: $REPORT_DIR/newman-report-$ENVIRONMENT.html"
else
    echo ""
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}✗ Tests failed!${NC}"
    echo -e "${RED}========================================${NC}"
    echo -e "Check report: $REPORT_DIR/newman-report-$ENVIRONMENT.html"
    exit 1
fi
