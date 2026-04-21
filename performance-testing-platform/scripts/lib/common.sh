#!/bin/bash

set -euo pipefail

RUN_ID=""
LOG_FILE=""
DEBUG_MODE="${DEBUG_MODE:-0}"
LOG_DIR="${LOG_DIR:-tests/integration/logs}"

_timestamp() {
  date '+%Y-%m-%d %H:%M:%S'
}

_ensure_log_file() {
  mkdir -p "$LOG_DIR/snapshots"
  if [ -z "$LOG_FILE" ]; then
    RUN_ID="$(date +%s)"
    LOG_FILE="$LOG_DIR/integration-test-${RUN_ID}.log"
  fi
  mkdir -p "$(dirname "$LOG_FILE")"
  touch "$LOG_FILE"
}

init_logging() {
  RUN_ID="${RUN_ID:-$(date +%s)}"
  LOG_FILE="$LOG_DIR/integration-test-${RUN_ID}.log"
  _ensure_log_file
  {
    echo "========================================"
    echo "Integration Test Run: ${RUN_ID}"
    echo "Started: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "========================================"
    echo
  } >>"$LOG_FILE"
}

_log() {
  local level="$1"
  local message="$2"
  local stream="stdout"
  local line

  _ensure_log_file
  line="[$(_timestamp)] [$level] $message"
  printf '%s\n' "$line" >>"$LOG_FILE"

  case "$level" in
    ERROR|WARN)
      stream="stderr"
      ;;
    DEBUG)
      [ "$DEBUG_MODE" = "1" ] || return 0
      stream="stderr"
      ;;
  esac

  if [ "$stream" = "stderr" ]; then
    printf '%s\n' "$line" >&2
  else
    printf '%s\n' "$line"
  fi
}

log_info() {
  _log "INFO" "$1"
}

log_warn() {
  _log "WARN" "$1"
}

log_error() {
  local message="$1"
  local diagnostic_cmd="${2:-}"
  _log "ERROR" "$message"

  if [ -n "$diagnostic_cmd" ]; then
    _log "ERROR" "Diagnostic: $diagnostic_cmd"
    local output
    output="$(bash -lc "$diagnostic_cmd" 2>&1 || true)"
    while IFS= read -r line; do
      [ -n "$line" ] && _log "ERROR" "  | $line"
    done <<EOF
$output
EOF
  fi
}

log_debug() {
  _log "DEBUG" "$1"
}

enable_debug() {
  DEBUG_MODE=1
}

retry_with_backoff() {
  local max_attempts="$1"
  local initial_delay="$2"
  shift 2
  local command="$*"
  local attempt=1
  local delay="$initial_delay"
  local exit_code=1

  while [ "$attempt" -le "$max_attempts" ]; do
    log_debug "Attempt $attempt/$max_attempts: $command"
    if eval "$command"; then
      log_info "Success after $attempt attempt(s)"
      return 0
    fi

    exit_code=$?
    if [ "$attempt" -lt "$max_attempts" ]; then
      log_warn "Attempt $attempt failed (exit $exit_code), retrying in ${delay}s"
      sleep "$delay"
      delay=$((delay * 2))
    fi
    attempt=$((attempt + 1))
  done

  log_error "All $max_attempts attempts failed (last exit code: $exit_code)"
  return "$exit_code"
}

wait_for_endpoint() {
  local url="$1"
  local verification_type="$2"
  local timeout_seconds="$3"
  local expected_substring="${4:-}"
  local start_time
  start_time=$(date +%s)

  while true; do
    case "$verification_type" in
      http_code)
        if curl -sf -o /dev/null "$url"; then
          log_info "Endpoint ready: $url"
          return 0
        fi
        ;;
      json_parse)
        if curl -sf "$url" | python3 -m json.tool >/dev/null 2>&1; then
          log_info "Endpoint ready: $url"
          return 0
        fi
        ;;
      contains)
        if curl -sf "$url" | grep -q "$expected_substring"; then
          log_info "Endpoint ready: $url"
          return 0
        fi
        ;;
      *)
        log_error "Unknown verification type: $verification_type"
        return 1
        ;;
    esac

    if [ $(( $(date +%s) - start_time )) -ge "$timeout_seconds" ]; then
      log_error "Endpoint timeout after ${timeout_seconds}s: $url"
      return 1
    fi

    sleep 0.5
  done
}

run_critical() {
  local command="$1"
  local description="$2"
  log_debug "Running critical: $description"
  if eval "$command"; then
    log_info "✅ $description"
    return 0
  fi
  local exit_code=$?
  log_error "CRITICAL FAILURE: $description (exit code $exit_code)"
  return "$exit_code"
}

run_optional() {
  local command="$1"
  local description="$2"
  log_debug "Running optional: $description"
  if eval "$command"; then
    log_info "✅ $description"
    return 0
  fi
  local exit_code=$?
  log_warn "OPTIONAL FAILED (non-blocking): $description (exit code $exit_code)"
  return "$exit_code"
}
