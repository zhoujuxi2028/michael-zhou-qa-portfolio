#!/bin/bash

set -euo pipefail

LOCK_DIR="${LOCK_DIR:-/tmp/integration-test.lock}"

lock_acquire() {
  bash scripts/lib/lock.sh acquire "$1"
}

lock_release() {
  bash scripts/lib/lock.sh release "$1"
}

setup_phase() {
  log_info "=============================================="
  log_info " Setup Phase: Environment Initialization"
  log_info "=============================================="

  lock_acquire "$LOCK_DIR" || return 1

  run_critical "bash scripts/preflight-check.sh --stage4" "Environment preflight check" || return 1
  run_optional "rm -f data/perf.db*" "Clean stale database files"
  run_critical "docker compose up -d influxdb grafana" "Start Docker services" || return 1
  run_critical "wait_for_endpoint 'http://localhost:3010/api/health' 'json_parse' 120" "Wait for Grafana readiness" || return 1
  run_critical "bash scripts/server.sh start single" "Start API service" || return 1

  log_info "✅ Setup phase complete"
  return 0
}

setup_cleanup() {
  lock_release "$LOCK_DIR"
}
