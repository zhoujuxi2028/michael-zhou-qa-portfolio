#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$PROJECT_ROOT"

source scripts/lib/common.sh
source scripts/lib/setup.sh

calls=()

lock_acquire() { calls+=("lock:$1"); return 0; }
lock_release() { calls+=("unlock:$1"); return 0; }
run_critical() { calls+=("critical:$1|$2"); return 0; }
run_optional() { calls+=("optional:$2"); return 0; }
wait_for_grafana_ready() { calls+=("grafana-ready"); return 0; }
wait_for_endpoint() { calls+=("legacy-endpoint:$1:$2:$3"); return 0; }

assert_call() {
  local expected="$1"
  local call
  for call in "${calls[@]}"; do
    if [ "$call" = "$expected" ]; then
      printf '✓ %s\n' "$expected"
      return 0
    fi
  done
  printf '✗ missing call: %s\n' "$expected"
  return 1
}

setup_phase

assert_call "lock:/tmp/integration-test.lock"
assert_call "critical:bash scripts/preflight-check.sh --stage4|Environment preflight check"
assert_call "critical:docker compose up -d influxdb grafana|Start Docker services"
assert_call "critical:wait_for_grafana_ready|Wait for Grafana readiness"

if printf '%s\n' "${calls[@]}" | grep -q '^legacy-endpoint:'; then
  printf '✗ legacy wait_for_endpoint should not be called\n'
  exit 1
fi
