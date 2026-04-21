#!/bin/bash

run_phase_6_rate_limiter() {
  log_info "Phase 6: Rate limiter + summary"
  npm stop >/dev/null 2>&1 || true
  RATE_LIMIT_ENABLED=true RATE_LIMIT_MAX=2 RATE_LIMIT_WINDOW_MS=5000 npm run k6:rate-limit 2>&1 | grep -q "rate limited (429)" || return 1
  log_info "✅ Phase 6 complete"
}
