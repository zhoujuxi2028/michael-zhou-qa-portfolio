#!/bin/bash

run_phase_2_metrics() {
  log_info "Phase 2: Metrics + Cluster"
  run_critical "bash scripts/server.sh stop" "Stop API before metrics phase" || return 1
  run_critical "bash scripts/server.sh start single" "Start API (single mode)" || return 1

  local metrics
  metrics="$(curl -sf http://localhost:3000/metrics)" || return 1
  echo "$metrics" | python3 -c "import sys,json; m=json.load(sys.stdin); assert m['cpu']['userPercent'] >= 0" || return 1
  echo "$metrics" | python3 -c "import sys,json; m=json.load(sys.stdin); assert m['memory']['rss'] > 0" || return 1
  echo "$metrics" | python3 -c "import sys,json; m=json.load(sys.stdin); assert m['eventLoop']['lag'] >= 0" || return 1

  rm -f reports/system-metrics-int.csv
  bash scripts/server.sh collect 3 reports/system-metrics-int.csv >/tmp/phase2-collect.log 2>&1 &
  local collector_pid=$!
  sleep 5
  bash scripts/server.sh stop-collect >/dev/null 2>&1 || true
  wait "$collector_pid" 2>/dev/null || true
  [ -f reports/system-metrics-int.csv ] || return 1
  [ "$(tail -n +2 reports/system-metrics-int.csv | wc -l | tr -d ' ')" -ge 2 ] || return 1

  bash scripts/server.sh stop >/dev/null 2>&1 || true
  bash scripts/server.sh start cluster >/dev/null 2>&1 || return 1
  curl -sf http://localhost:3000/health >/dev/null || return 1
  log_info "✅ Phase 2 complete"
}
