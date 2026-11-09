#!/bin/bash
# Track test execution times and generate performance metrics
# Part of Phase 3: Performance Monitoring

set -e

# Configuration
METRICS_DIR="test-metrics"
METRICS_FILE="$METRICS_DIR/execution-times.json"
HISTORY_FILE="$METRICS_DIR/history.jsonl"

# Create metrics directory if it doesn't exist
mkdir -p "$METRICS_DIR"

# Initialize metrics file if it doesn't exist
if [ ! -f "$METRICS_FILE" ]; then
  echo '{"testRuns": []}' > "$METRICS_FILE"
fi

echo "⏱️  Starting test execution with time tracking..."
echo ""

# Record start time
start_time=$(date +%s)
start_timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Run Cypress tests and capture output
echo "🧪 Running Cypress E2E tests..."
cypress_start=$(date +%s)
cypress_output=$(npm run test:cypress 2>&1 || true)
cypress_end=$(date +%s)
cypress_duration=$((cypress_end - cypress_start))
cypress_exit_code=$?

# Parse Cypress results from the summary line
# Example: "✔  All specs passed!                        00:08       16       16        -        -        -"
cypress_total=$(echo "$cypress_output" | grep "All specs passed!" | awk '{for(i=1;i<=NF;i++) if($i ~ /^[0-9]+$/) {print $i; exit}}' | head -1 || echo "16")
cypress_passed=$(echo "$cypress_output" | grep "All specs passed!" | awk '{for(i=1;i<=NF;i++) if($i ~ /^[0-9]+$/) {getline; print $i; exit}}' | tail -1 || echo "$cypress_total")
# If all passed, failed is 0
if echo "$cypress_output" | grep -q "All specs passed!"; then
  cypress_failed=0
else
  cypress_failed=$(echo "$cypress_output" | grep -oP '\d+ of \d+ failed' | grep -oP '^\d+' || echo "0")
fi

echo "✅ Cypress completed in ${cypress_duration}s"
echo "   Tests: $cypress_total, Passed: $cypress_passed, Failed: $cypress_failed"
echo ""

# Run Newman tests and capture output
echo "🔧 Running Newman API tests..."
newman_start=$(date +%s)
newman_output=$(npm run test:newman 2>&1 || true)
newman_end=$(date +%s)
newman_duration=$((newman_end - newman_start))
newman_exit_code=$?

# Parse Newman results
newman_requests=$(echo "$newman_output" | grep -oP 'requests\s+│\s+\K\d+' | head -1 || echo "0")
newman_assertions=$(echo "$newman_output" | grep -oP 'assertions\s+│\s+\K\d+' | head -1 || echo "0")
newman_failed=$(echo "$newman_output" | grep -oP 'assertions\s+│\s+\d+\s+│\s+\K\d+' | head -1 || echo "0")

echo "✅ Newman completed in ${newman_duration}s"
echo "   Requests: $newman_requests, Assertions: $newman_assertions, Failed: $newman_failed"
echo ""

# Calculate total duration
end_time=$(date +%s)
total_duration=$((end_time - start_time))

# Determine overall status
if [ $cypress_exit_code -eq 0 ] && [ $newman_exit_code -eq 0 ]; then
  overall_status="PASS"
else
  overall_status="FAIL"
fi

# Get artifact sizes
cypress_videos_size=0
cypress_screenshots_size=0
newman_reports_size=0

if [ -d "cypress/videos" ]; then
  cypress_videos_size=$(du -sb cypress/videos 2>/dev/null | cut -f1 || echo "0")
fi

if [ -d "cypress/screenshots" ]; then
  cypress_screenshots_size=$(du -sb cypress/screenshots 2>/dev/null | cut -f1 || echo "0")
fi

if [ -d "newman" ]; then
  newman_reports_size=$(du -sb newman 2>/dev/null | cut -f1 || echo "0")
fi

# Create metrics JSON
metrics_json=$(cat <<EOF
{
  "timestamp": "$start_timestamp",
  "totalDuration": $total_duration,
  "status": "$overall_status",
  "cypress": {
    "duration": $cypress_duration,
    "total": $cypress_total,
    "passed": $cypress_passed,
    "failed": $cypress_failed,
    "videosSize": $cypress_videos_size,
    "screenshotsSize": $cypress_screenshots_size
  },
  "newman": {
    "duration": $newman_duration,
    "requests": $newman_requests,
    "assertions": $newman_assertions,
    "failed": $newman_failed,
    "reportsSize": $newman_reports_size
  }
}
EOF
)

# Append to history file (JSONL format)
echo "$metrics_json" >> "$HISTORY_FILE"

# Update current metrics file
echo "$metrics_json" | jq '.' > "$METRICS_FILE"

# Generate summary report
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "📊 Test Execution Summary"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Timestamp:       $start_timestamp"
echo "Total Duration:  ${total_duration}s ($(date -u -d @${total_duration} +%M:%S))"
echo "Overall Status:  $overall_status"
echo ""
echo "Cypress E2E Tests:"
echo "  Duration:      ${cypress_duration}s"
echo "  Tests:         $cypress_total (Passed: $cypress_passed, Failed: $cypress_failed)"
echo "  Videos Size:   $(numfmt --to=iec $cypress_videos_size)"
echo "  Screenshots:   $(numfmt --to=iec $cypress_screenshots_size)"
echo ""
echo "Newman API Tests:"
echo "  Duration:      ${newman_duration}s"
echo "  Requests:      $newman_requests"
echo "  Assertions:    $newman_assertions (Failed: $newman_failed)"
echo "  Reports Size:  $(numfmt --to=iec $newman_reports_size)"
echo ""
echo "Metrics saved to: $METRICS_FILE"
echo "History appended to: $HISTORY_FILE"
echo "═══════════════════════════════════════════════════════════"

# Exit with appropriate code
if [ "$overall_status" = "PASS" ]; then
  exit 0
else
  exit 1
fi
