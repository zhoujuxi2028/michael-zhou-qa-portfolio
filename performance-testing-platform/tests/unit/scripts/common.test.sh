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

# 新增：验证 wait_for_tcp_port 能区分"端口可达"与"端口不可达超时"两种状态
# 对应 #192 修复点：分层 readiness 中的 TCP 预检
test_wait_for_tcp_port() {
  python3 -m http.server 18082 --bind 127.0.0.1 --directory /tmp >/tmp/common-test-tcp.log 2>&1 &
  local server_pid=$!
  sleep 1

  wait_for_tcp_port "127.0.0.1" 18082 5
  local ok_code=$?

  kill "$server_pid" 2>/dev/null || true
  wait "$server_pid" 2>/dev/null || true
  rm -f /tmp/common-test-tcp.log

  if [ "$ok_code" -ne 0 ]; then
    printf '✗ wait_for_tcp_port 应在端口可达时成功\n'
    failures=$((failures + 1))
    return
  fi
  printf '✓ wait_for_tcp_port 端口可达\n'

  if wait_for_tcp_port "127.0.0.1" 9 1; then
    printf '✗ wait_for_tcp_port 应在端口不可达时超时失败\n'
    failures=$((failures + 1))
    return
  fi
  printf '✓ wait_for_tcp_port 端口不可达超时失败\n'
}

main() {
  test_log_functions
  test_retry_with_backoff
  test_wait_for_endpoint
  test_wait_for_endpoint_timeout
  test_error_wrappers
  test_wait_for_tcp_port

  if [ "$failures" -eq 0 ]; then
    printf 'All common.sh tests passed\n'
  else
    printf '%s tests failed\n' "$failures"
    exit 1
  fi
}

main "$@"
