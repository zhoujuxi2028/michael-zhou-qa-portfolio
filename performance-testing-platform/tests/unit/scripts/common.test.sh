#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$PROJECT_ROOT"

source scripts/lib/common.sh

failures=0

assert_contains() {
  local haystack="$1"
  local needle="$2"
  local name="$3"
  if printf '%s' "$haystack" | grep -q "$needle"; then
    printf '✓ %s\n' "$name"
  else
    printf '✗ %s\n' "$name"
    failures=$((failures + 1))
  fi
}

test_log_functions() {
  init_logging
  local output
  output="$({ log_info 'info message'; log_warn 'warn message'; log_error 'error message'; } 2>&1)"
  assert_contains "$output" "info message" "log_info 输出消息"
  assert_contains "$output" "warn message" "log_warn 输出消息"
  assert_contains "$output" "error message" "log_error 输出消息"
}

test_retry_with_backoff() {
  retry_with_backoff 3 1 "true"
}

test_wait_for_endpoint() {
  python3 -m http.server 18081 --bind 127.0.0.1 --directory /tmp >/tmp/common-test-http.log 2>&1 &
  local server_pid=$!
  sleep 1

  wait_for_endpoint "http://127.0.0.1:18081/" "http_code" 5
  local exit_code=$?

  kill "$server_pid" 2>/dev/null || true
  wait "$server_pid" 2>/dev/null || true
  return "$exit_code"
}

test_wait_for_endpoint_timeout() {
  if wait_for_endpoint "http://127.0.0.1:9/" "http_code" 1; then
    printf '✗ wait_for_endpoint 超时场景应失败\n'
    return 1
  fi
}

test_error_wrappers() {
  run_critical "true" "critical ok"
  run_optional "true" "optional ok"
}

main() {
  test_log_functions
  test_retry_with_backoff
  test_wait_for_endpoint
  test_wait_for_endpoint_timeout
  test_error_wrappers

  if [ "$failures" -eq 0 ]; then
    printf 'All common.sh tests passed\n'
  else
    printf '%s tests failed\n' "$failures"
    exit 1
  fi
}

main "$@"
