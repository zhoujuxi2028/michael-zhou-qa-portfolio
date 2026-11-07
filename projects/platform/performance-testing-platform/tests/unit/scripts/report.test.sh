#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$PROJECT_ROOT"

source scripts/lib/common.sh
source scripts/lib/execute.sh
source scripts/lib/report.sh

RUN_ID="test-run"
LOG_DIR="/tmp/integration-report-test"
mkdir -p "$LOG_DIR"

EXEC_RESULTS=(
  "A-01|PASS|12|passed|1"
  "A-02|FAIL|20|exit code 1|3"
  "A-03|SKIP|0|not ready|1"
)
EXEC_PASS=1
EXEC_FAIL=1
EXEC_SKIP=1

generate_markdown_report

REPORT_FILE="$LOG_DIR/integration-test-${RUN_ID}.md"
if [ ! -f "$REPORT_FILE" ]; then
  printf '✗ missing report file: %s\n' "$REPORT_FILE"
  exit 1
fi

if grep -q '1/3 PASS' "$REPORT_FILE" && grep -q 'A-02' "$REPORT_FILE"; then
  printf '✓ markdown report generated\n'
else
  printf '✗ markdown report missing expected content\n'
  exit 1
fi
