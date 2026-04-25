#!/bin/bash

set -euo pipefail

LOCK_DIR="${LOCK_DIR:-/tmp/integration-test.lock}"

# Grafana readiness 总超时（秒）。可通过环境变量覆盖。
# 历史上固定 60s 在慢启动环境（macOS 冷启动 / CI runner 抢占）会偶发超时（见 #192）。
GRAFANA_READY_TIMEOUT="${GRAFANA_READY_TIMEOUT:-120}"
# Grafana 容器 TCP 端口（host 侧映射）就绪超时
GRAFANA_TCP_TIMEOUT="${GRAFANA_TCP_TIMEOUT:-60}"

lock_acquire() {
  bash scripts/lib/lock.sh acquire "$1"
}

lock_release() {
  bash scripts/lib/lock.sh release "$1"
}

# 分层等待 Grafana 真正就绪：
#   1) host 侧 TCP 端口 3010 可连接（说明容器进程已起来）
#   2) /api/health 返回合法 JSON（说明 Grafana HTTP 子系统初始化完成）
# 任一阶段失败时自动 dump grafana / influxdb 容器日志，便于排查 #192 / #194 类问题。
wait_for_grafana_ready() {
  if ! wait_for_tcp_port "localhost" 3010 "$GRAFANA_TCP_TIMEOUT"; then
    log_error "Grafana TCP port 3010 not reachable; container may have failed to start"
    dump_container_logs "grafana" 120
    dump_container_logs "influxdb" 60
    return 1
  fi

  if ! wait_for_endpoint "http://localhost:3010/api/health" "json_parse" "$GRAFANA_READY_TIMEOUT"; then
    log_error "Grafana /api/health did not become healthy within ${GRAFANA_READY_TIMEOUT}s"
    dump_container_logs "grafana" 120
    dump_container_logs "influxdb" 60
    return 1
  fi

  return 0
}

setup_phase() {
  log_info "=============================================="
  log_info " Setup Phase: Environment Initialization"
  log_info "=============================================="

  lock_acquire "$LOCK_DIR" || return 1

  run_critical "bash scripts/preflight-check.sh --stage4" "Environment preflight check" || return 1
  run_optional "rm -f data/perf.db*" "Clean stale database files"
  run_critical "docker compose up -d influxdb grafana" "Start Docker services" || return 1
  run_critical "wait_for_grafana_ready" "Wait for Grafana readiness" || return 1
  run_critical "bash scripts/server.sh start single" "Start API service" || return 1

  log_info "✅ Setup phase complete"
  return 0
}

setup_cleanup() {
  lock_release "$LOCK_DIR"
}
