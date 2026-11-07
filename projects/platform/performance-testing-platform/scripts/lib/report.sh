#!/bin/bash

set -euo pipefail

REPORT_PASS=0
REPORT_FAIL=0
REPORT_SKIP=0

aggregate_stats() {
  local row status
  REPORT_PASS=0
  REPORT_FAIL=0
  REPORT_SKIP=0

  for row in "${EXEC_RESULTS[@]:-}"; do
    IFS='|' read -r _ status _ _ _ <<<"$row"
    case "$status" in
      PASS) REPORT_PASS=$((REPORT_PASS + 1)) ;;
      FAIL) REPORT_FAIL=$((REPORT_FAIL + 1)) ;;
      SKIP) REPORT_SKIP=$((REPORT_SKIP + 1)) ;;
    esac
  done
}

generate_markdown_report() {
  aggregate_stats

  local report_dir="${LOG_DIR:-tests/integration/logs}"
  local run_id="${RUN_ID:-$(date +%s)}"
  local output_file="$report_dir/integration-test-${run_id}.md"

  mkdir -p "$report_dir"
  {
    local total="${#EXEC_RESULTS[@]}"
    echo "# 集成测试运行报告"
    echo
    echo "**运行 ID:** ${run_id}"
    echo "**结果:** ${REPORT_PASS}/${total} PASS | ${REPORT_FAIL} FAIL | ${REPORT_SKIP} SKIP"
    echo
    echo "## 结果明细"
    echo
    echo "| Test ID | Status | Attempts | Message |"
    echo "|---------|--------|----------|---------|"
    local row test_id status duration message attempts
    for row in "${EXEC_RESULTS[@]:-}"; do
      IFS='|' read -r test_id status duration message attempts <<<"$row"
      echo "| ${test_id} | ${status} | ${attempts} | ${message} |"
    done
  } >"$output_file"

  printf '%s\n' "$output_file"
}

generate_json_report() {
  aggregate_stats

  local report_dir="${LOG_DIR:-tests/integration/logs}"
  local run_id="${RUN_ID:-$(date +%s)}"
  local output_file="$report_dir/integration-test-${run_id}.json"

  mkdir -p "$report_dir"
  {
    echo "{"
    echo "  \"run_id\": \"${run_id}\","
    echo "  \"pass\": ${REPORT_PASS},"
    echo "  \"fail\": ${REPORT_FAIL},"
    echo "  \"skip\": ${REPORT_SKIP},"
    echo "  \"results\": ["
    local first=1
    local row test_id status duration message attempts
    for row in "${EXEC_RESULTS[@]:-}"; do
      IFS='|' read -r test_id status duration message attempts <<<"$row"
      if [ "$first" -eq 0 ]; then
        echo "    ,"
      fi
      first=0
      printf '    {"test_id":"%s","status":"%s","duration_ms":"%s","message":"%s","attempts":"%s"}' \
        "$test_id" "$status" "$duration" "$message" "$attempts"
    done
    echo
    echo "  ]"
    echo "}"
  } >"$output_file"

  printf '%s\n' "$output_file"
}

capture_grafana_snapshot() {
  local run_id="${1:-${RUN_ID:-$(date +%s)}}"
  local snapshot_dir="${LOG_DIR:-tests/integration/logs}/snapshots/${run_id}"
  mkdir -p "$snapshot_dir"

  if curl -sf "http://localhost:3010/api/dashboards/uid/k6-results" >"$snapshot_dir/dashboard.json" 2>/dev/null; then
    log_info "Captured Grafana dashboard snapshot"
    return 0
  fi

  log_warn "Grafana snapshot skipped"
  return 1
}

report_phase() {
  generate_markdown_report
  generate_json_report
  prune_old_logs 3
}

prune_old_logs() {
  local keep="${1:-3}"
  local dir="${LOG_DIR:-tests/integration/logs}"

  # 收集所有 .log 的数字 run_id，按时间戳升序（最旧在前）
  local all_ids=()
  local f id
  while IFS= read -r f; do
    id="${f##*/integration-test-}"
    id="${id%.log}"
    case "$id" in
      ''|*[!0-9]*) continue ;;
    esac
    all_ids+=("$id")
  done < <(find "$dir" -maxdepth 1 -name 'integration-test-*.log' 2>/dev/null | sort)

  local total_count="${#all_ids[@]}"
  if [ "$total_count" -le "$keep" ]; then
    return 0
  fi

  local delete_count=$(( total_count - keep ))
  local i
  for (( i = 0; i < delete_count; i++ )); do
    id="${all_ids[$i]}"
    rm -f "$dir/integration-test-${id}.log" \
          "$dir/integration-test-${id}.md" \
          "$dir/integration-test-${id}.json"
    rm -rf "$dir/snapshots/${id}" 2>/dev/null || true
  done
}
