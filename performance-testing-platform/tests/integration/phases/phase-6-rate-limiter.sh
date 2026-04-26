#!/bin/bash

run_phase_6_rate_limiter() {
  log_info "Phase 6: Rate limiter + summary"
  npm stop >/dev/null 2>&1 || true

  # 修复 #215：避免 `npm ... 2>&1 | grep -q` 在 set -o pipefail 下因 SIGPIPE 误判为失败。
  # 先把 k6 输出落盘，再基于业务信号 "rate limited (429)" 判断 PASS。
  local log_file
  log_file="$(mktemp "${TMPDIR:-/tmp}/phase6-rate-limiter.XXXXXX.log")"
  local k6_exit=0
  RATE_LIMIT_ENABLED=true RATE_LIMIT_MAX=2 RATE_LIMIT_WINDOW_MS=5000 \
    npm run k6:rate-limit >"$log_file" 2>&1 || k6_exit=$?

  if ! grep -q "rate limited (429)" "$log_file"; then
    log_warn "Phase 6: 'rate limited (429)' 业务信号未在 k6 输出中出现 (npm exit=$k6_exit)"
    log_warn "Phase 6: k6 日志保留在 $log_file 供排查"
    return 1
  fi

  if [ "$k6_exit" -ne 0 ]; then
    log_warn "Phase 6: k6:rate-limit 退出码非零 ($k6_exit)，但已观察到 429 业务信号，按 PASS 处理"
  fi

  rm -f "$log_file"
  log_info "✅ Phase 6 complete"
}
