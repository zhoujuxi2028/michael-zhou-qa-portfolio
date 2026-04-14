#!/usr/bin/env bash
# generate-summary.sh — Parse k6 JSON output and generate Markdown execution summary

set -euo pipefail

# Input validation
if [ $# -lt 1 ] || [ ! -f "$1" ]; then
  cat <<'EOF'
Usage: generate-summary.sh <k6-json-output> [output-file]

  <k6-json-output>  Path to k6 JSON output file (required, must exist)
  [output-file]     Output Markdown path (default: reports/k6-summary.md)

Example:
  k6 run smoke.k6.js --out json=reports/k6-result.json
  ./scripts/generate-summary.sh reports/k6-result.json reports/k6-summary.md
EOF
  exit 1
fi

K6_JSON="$1"
OUTPUT_FILE="${2:-reports/k6-summary.md}"
OUTPUT_DIR=$(dirname "$OUTPUT_FILE")
mkdir -p "$OUTPUT_DIR"

# Parse k6 JSON Lines format
total_reqs=$(grep -c '"metric":"http_reqs".*"type":"Point"' "$K6_JSON" 2>/dev/null || true)
total_reqs=${total_reqs:-0}
error_count=$(grep -c '"status":"[45][0-9][0-9]"' "$K6_JSON" 2>/dev/null || true)
error_count=${error_count:-0}

# Simple error rate calculation
if [ "$total_reqs" -gt 0 ]; then
  error_pct=$((error_count * 100 / total_reqs))
else
  error_pct=0
fi

# Extract unique endpoints
endpoints=$(grep '"name":"http' "$K6_JSON" 2>/dev/null | jq -r '.data.tags.name' 2>/dev/null | sort -u | head -10 || echo "N/A")

# Generate summary
cat > "$OUTPUT_FILE" <<EOF
# k6 Execution Summary

**Generated:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")

## SLA Status

| Metric | Threshold | Actual | Status |
|--------|-----------|--------|--------|
| Error Rate | < 1% | ${error_pct}% | $([ "$error_pct" -lt 1 ] && echo "✅ PASS" || echo "⚠️ CHECK") |

## Execution Statistics

- **Total Requests:** $total_reqs
- **Failed Requests:** $error_count
- **Error Rate:** ${error_pct}%

## Top Endpoints

\`\`\`
$endpoints
\`\`\`

---

**Note:** PoC summary — validates jq parsing and script execution.
EOF

echo "✅ Summary generated: $OUTPUT_FILE"
