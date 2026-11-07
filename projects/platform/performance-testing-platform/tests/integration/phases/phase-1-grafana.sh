#!/bin/bash

run_phase_1_grafana() {
  log_info "Phase 1: Grafana + InfluxDB"
  run_critical "docker compose up -d influxdb grafana" "Start Grafana + InfluxDB" || return 1
  run_critical "wait_for_grafana_ready" "Wait for Grafana readiness" || return 1
  run_critical "bash scripts/server.sh start single" "Start API (single mode)" || return 1

  # JM-GRF-01: k6 → InfluxDB data-flow integration test
  # Assertion: metrics actually land in InfluxDB, NOT whether app thresholds pass.
  # Use --no-thresholds so that application-level threshold violations don't mask
  # the real infra assertion (k6 writes → InfluxDB receives).
  local baseline_query='SELECT COUNT(value) AS count FROM http_req_duration LIMIT 1'
  local influx_base="http://localhost:8086/query?db=k6&q"
  local baseline_count
  baseline_count=$(curl -s "${influx_base}=${baseline_query// /%20}" 2>/dev/null | python3 -c '
import json, sys
try:
    p = json.load(sys.stdin)
    s = p["results"][0].get("series", [])
    print(s[0]["values"][0][-1] if s and s[0].get("values") else "0")
except Exception:
    print("0")
' 2>/dev/null || echo "0")

  k6 run \
    --no-thresholds \
    --out influxdb=http://localhost:8086/k6 \
    --duration 10s \
    --vus 2 \
    tests/performance/smoke.k6.js >/tmp/phase1-k6.log 2>&1
  local k6_exit=$?

  if [ "$k6_exit" -ne 0 ]; then
    log_error "JM-GRF-01 failed: k6 execution error (exit $k6_exit)" "tail -20 /tmp/phase1-k6.log"
    return 1
  fi

  sleep 2
  local final_count
  final_count=$(curl -s "${influx_base}=${baseline_query// /%20}" 2>/dev/null | python3 -c '
import json, sys
try:
    p = json.load(sys.stdin)
    s = p["results"][0].get("series", [])
    print(s[0]["values"][0][-1] if s and s[0].get("values") else "0")
except Exception:
    print("0")
' 2>/dev/null || echo "0")

  if [ "$final_count" -gt "$baseline_count" ]; then
    log_info "JM-GRF-01: InfluxDB metric count $baseline_count → $final_count"
  else
    log_error "JM-GRF-01 failed: k6 metrics not written to InfluxDB (baseline=$baseline_count, final=$final_count)" "tail -20 /tmp/phase1-k6.log"
    return 1
  fi

  if ! curl -sf "http://localhost:3010/api/dashboards/uid/k6-results" >/tmp/phase1-grafana.json 2>&1; then
    log_error "JM-GRF-02 failed" "tail -20 /tmp/phase1-k6.log"
    return 1
  fi

  log_info "✅ Phase 1 complete"
}
