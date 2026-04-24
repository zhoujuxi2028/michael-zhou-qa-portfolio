#!/bin/bash

run_phase_4_soak() {
  log_info "Phase 4: Soak validation"
  local output
  output="$(bash scripts/phases/phase7-soak.sh 2>&1)" || true
  echo "$output"
  echo "$output" | grep -q "✅ K6-SOAK-INT-01:" || return 1
  echo "$output" | grep -q "✅ K6-SOAK-INT-02:" || return 1
  log_info "✅ Phase 4 complete"
}
