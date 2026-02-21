#!/bin/bash

# Run Smoke Tests Only
# This script runs only smoke tests for quick validation

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

COLLECTION="collections/API-Test-Collection.postman_collection.json"
ENVIRONMENT="${1:-dev}"
ENV_FILE="environments/${ENVIRONMENT}.postman_environment.json"
FOLDER="Smoke Tests"

echo -e "${GREEN}Running Smoke Tests on $ENVIRONMENT environment${NC}"
echo ""

newman run "$COLLECTION" \
    -e "$ENV_FILE" \
    --folder "$FOLDER" \
    -r cli \
    --color on

echo ""
echo -e "${GREEN}✓ Smoke tests completed${NC}"
