#!/usr/bin/env bash
# scripts/jmeter-dryrun.sh — JMeter dry-run: 1 thread x 10s, verify all requests pass
#
# Purpose: Catch field name mismatches, wrong endpoints, or broken assertions
#          BEFORE running full load/stress/spike tests (postmortem lesson from #50)
#
# Usage:
#   bash scripts/jmeter-dryrun.sh [jmx_file]
#   npm run jmeter:dryrun              # runs smoke.jmx with dryrun config
#   npm run jmeter:dryrun:auth         # runs auth-load.jmx with dryrun config
#
# Exit codes:
#   0 — all requests passed, safe to run full tests
#   1 — errors detected, fix before proceeding

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

JMX_FILE="${1:-tests/jmeter/smoke.jmx}"
DRYRUN_PROPS="tests/jmeter/config/dryrun.properties"
RESULT_FILE="results/jmeter-dryrun.jtl"
PORT="${PORT:-3000}"
HOST="${HOST:-localhost}"

cd "$PROJECT_DIR"

echo "=================================================="
echo "  JMeter Dry-run Verification"
echo "=================================================="
echo "  JMX:  $JMX_FILE"
echo "  Config: $DRYRUN_PROPS"
echo ""

# Clean previous results
mkdir -p results
rm -f "$RESULT_FILE"

# Run JMeter in non-GUI mode with minimal config
export JVM_ARGS="${JVM_ARGS:--Dhttp.proxyHost= -Dhttps.proxyHost=}"
jmeter -n -t "$JMX_FILE" \
  -q "$DRYRUN_PROPS" \
  -Jport="$PORT" \
  -Jbase_url="$HOST" \
  -l "$RESULT_FILE" \
  2>&1 | grep -E "summary|Err:" || true

echo ""
echo "=================================================="

# Parse .jtl for errors (CSV format: ...success field is column 8)
if [ ! -f "$RESULT_FILE" ]; then
  echo "  ❌ No results file generated"
  exit 1
fi

TOTAL=$(tail -n +2 "$RESULT_FILE" | wc -l | tr -dc '0-9')
ERRORS=$(tail -n +2 "$RESULT_FILE" | awk -F',' '{if ($8 == "false") print}' | wc -l | tr -dc '0-9')

echo "  Total requests: $TOTAL"
echo "  Failed requests: $ERRORS"
echo ""

if [ "$TOTAL" -eq 0 ]; then
  echo "  ❌ Dry-run produced 0 requests — check JMX file"
  exit 1
fi

if [ "$ERRORS" -gt 0 ]; then
  echo "  ❌ Dry-run FAILED — $ERRORS/$TOTAL requests returned errors"
  echo ""
  echo "  Failed requests:"
  tail -n +2 "$RESULT_FILE" | awk -F',' '$8 == "false" {print "    " $3 " → " $4 " (status: " $5 ")"}' | head -20
  echo ""
  echo "  Fix the errors above before running full tests."
  echo "=================================================="
  exit 1
fi

echo "  ✅ Dry-run passed — $TOTAL/$TOTAL requests successful"
echo "  Safe to proceed with full tests."
echo "=================================================="
rm -f "$RESULT_FILE"
exit 0
