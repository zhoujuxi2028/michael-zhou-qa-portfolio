#!/bin/bash

run_phase_1_grafana() {
  log_info "Phase 1: Grafana + InfluxDB"
  run_critical "docker compose up -d influxdb grafana" "Start Grafana + InfluxDB" || return 1
  run_critical "wait_for_endpoint 'http://localhost:3010/api/health' 'json_parse' 120" "Wait for Grafana readiness" || return 1
  run_critical "bash scripts/server.sh start single" "Start API (single mode)" || return 1
  run_critical "wait_for_endpoint 'http://localhost:3000/health' 'http_code' 30" "Wait for API readiness" || return 1

  if ! k6 run --out influxdb=http://localhost:8086/k6 --duration 10s --vus 2 tests/performance/smoke.k6.js >/tmp/phase1-k6.log 2>&1; then
    log_error "JM-GRF-01 failed" "tail -20 /tmp/phase1-k6.log"
    return 1
  fi

  if ! curl -sf "http://localhost:3010/api/dashboards/uid/k6-results" >/tmp/phase1-grafana.json 2>&1; then
    log_error "JM-GRF-02 failed" "tail -20 /tmp/phase1-k6.log"
    return 1
  fi

  log_info "✅ Phase 1 complete"
}
