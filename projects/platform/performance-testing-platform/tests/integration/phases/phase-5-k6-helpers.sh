#!/bin/bash

run_phase_5_k6_helpers() {
  log_info "Phase 5: k6 helpers"
  bash scripts/server.sh stop >/dev/null 2>&1 || true
  bash scripts/server.sh start single >/dev/null 2>&1 || return 1

  local out
  out="$(k6 run --duration 5s --vus 1 tests/performance/helpers-test.k6.js 2>&1)" || return 1
  echo "$out" | grep -q "checks_succeeded.*100.00%" || return 1
  log_info "✅ Phase 5 complete"
}
