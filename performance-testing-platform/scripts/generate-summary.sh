#!/bin/bash
# generate-summary.sh — Parse k6 JSON output and generate Markdown execution summary
# Usage: ./scripts/generate-summary.sh <k6-result.json>
# Output: reports/k6-summary.md

set -e

# Input validation
if [[ -z "$1" ]]; then
  echo "Usage: $0 <k6-result.json>"
  echo ""
  echo "Example:"
  echo "  $0 reports/k6-result.json"
  echo "  npm run generate-summary"
  exit 1
fi

JSON_FILE="$1"

if [[ ! -f "$JSON_FILE" ]]; then
  echo "❌ Error: File not found: $JSON_FILE"
  exit 1
fi

if ! command -v jq &> /dev/null; then
  echo "❌ Error: jq is required but not installed"
  exit 1
fi

OUTPUT_DIR="$(dirname "$JSON_FILE")"
OUTPUT_FILE="${OUTPUT_DIR}/k6-summary.md"

# Initialize all variables with defaults
P95=0 P99=0 AVG=0 ERROR_RATE=0 THROUGHPUT=0 TOTAL_REQS=0 TOTAL_CHECKS=0 FAILED_CHECKS=0

# Detect file format: k6 --out json produces JSONL (multiple JSON objects)
# k6 summary output has .metrics; raw JSONL samples do not
FIRST_LINE=$(head -1 "$JSON_FILE")

# Check if first line contains a non-null .metrics field (structured summary format)
# JSONL lines return "null" for .metrics, while summary JSON returns an object
METRICS_CHECK=$(echo "$FIRST_LINE" | jq '.metrics | type' -r 2>/dev/null)

if [[ "$METRICS_CHECK" == "object" ]]; then
  # Single JSON object with metrics - extract them
  P95=$(jq '.metrics.http_req_duration.values.p95 // 0' "$JSON_FILE" 2>/dev/null | awk '{printf "%.0f", $1}')
  P99=$(jq '.metrics.http_req_duration.values.p99 // 0' "$JSON_FILE" 2>/dev/null | awk '{printf "%.0f", $1}')
  AVG=$(jq '.metrics.http_req_duration.values.avg // 0' "$JSON_FILE" 2>/dev/null | awk '{printf "%.0f", $1}')
  ERROR_RATE=$(jq '.metrics.http_req_failed.values.value // 0' "$JSON_FILE" 2>/dev/null | awk '{printf "%.4f", $1}')
  THROUGHPUT=$(jq '.metrics.http_reqs.values.rate // 0' "$JSON_FILE" 2>/dev/null | awk '{printf "%.1f", $1}')
  TOTAL_REQS=$(jq '.metrics.http_reqs.values.count // 0' "$JSON_FILE" 2>/dev/null | awk '{printf "%.0f", $1}')
  TOTAL_CHECKS=$(jq '.metrics.checks.values.count // 0' "$JSON_FILE" 2>/dev/null | awk '{printf "%.0f", $1}')
  FAILED_CHECKS=$(jq '.metrics.checks.values.fails // 0' "$JSON_FILE" 2>/dev/null | awk '{printf "%.0f", $1}')
else
  # JSONL format (raw samples) - k6 doesn't include aggregated metrics
  echo "ℹ️  Note: k6 JSONL output detected (no aggregated metrics available)"
fi

# SLA compliance
SLA_P95_OK=$(awk "BEGIN {print ($P95 < 500) ? 1 : 0}")
SLA_ERROR_OK=$(awk "BEGIN {print ($ERROR_RATE < 0.01) ? 1 : 0}")

# Calculate error rate percentage
ERROR_RATE_PCT=$(awk "BEGIN {printf \"%.2f\", $ERROR_RATE * 100}")
CHECK_RATE_PCT=$(awk "BEGIN {printf \"%.1f\", ($TOTAL_CHECKS - $FAILED_CHECKS) / ($TOTAL_CHECKS > 0 ? $TOTAL_CHECKS : 1) * 100}")

# SLA icons
SLA_P95_ICON=$([ "$SLA_P95_OK" -eq 1 ] && echo "✅" || echo "❌")
SLA_ERROR_ICON=$([ "$SLA_ERROR_OK" -eq 1 ] && echo "✅" || echo "❌")
SLA_CHECK_ICON=$([ "$FAILED_CHECKS" -eq 0 ] && echo "✅" || echo "❌")

# Determine summary
SUMMARY_TEXT="Test execution completed. "
if [ "$SLA_P95_OK" -eq 1 ] && [ "$SLA_ERROR_OK" -eq 1 ] && [ "$FAILED_CHECKS" -eq 0 ]; then
  SUMMARY_TEXT+="All SLAs met. ✅"
else
  SUMMARY_TEXT+="Some SLAs not met. ❌"
fi

# Generate Markdown
cat > "$OUTPUT_FILE" << EOF
# k6 Execution Summary

## Metrics Summary

| Metric | Value |
|--------|-------|
| **p95 Latency** | ${P95}ms |
| **p99 Latency** | ${P99}ms |
| **Avg Latency** | ${AVG}ms |
| **Error Rate** | ${ERROR_RATE_PCT}% |
| **Throughput** | ${THROUGHPUT}/s |
| **Total Requests** | ${TOTAL_REQS} |
| **Passed Checks** | $((TOTAL_CHECKS - FAILED_CHECKS))/${TOTAL_CHECKS} |

## SLA Compliance

| SLA | Target | Result | Status |
|-----|--------|--------|--------|
| p95 Latency | < 500ms | ${P95}ms | ${SLA_P95_ICON} |
| Error Rate | < 1% | ${ERROR_RATE_PCT}% | ${SLA_ERROR_ICON} |
| Check Pass Rate | 100% | ${CHECK_RATE_PCT}% | ${SLA_CHECK_ICON} |

## Summary

${SUMMARY_TEXT}

---
Generated: $(date '+%Y-%m-%d %H:%M:%S')
EOF

echo "✅ Summary generated: $OUTPUT_FILE"
