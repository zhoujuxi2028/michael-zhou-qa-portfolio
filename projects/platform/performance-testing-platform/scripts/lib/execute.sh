#!/bin/bash

set -euo pipefail

EXEC_RESULTS=()
EXEC_PASS=0
EXEC_FAIL=0
EXEC_SKIP=0

record_result() {
  local test_id="$1"
  local status="$2"
  local duration_ms="${3:-0}"
  local message="${4:-}"
  local attempts="${5:-1}"

  EXEC_RESULTS+=("$test_id|$status|$duration_ms|$message|$attempts")
  case "$status" in
    PASS) EXEC_PASS=$((EXEC_PASS + 1)) ;;
    FAIL) EXEC_FAIL=$((EXEC_FAIL + 1)) ;;
    SKIP) EXEC_SKIP=$((EXEC_SKIP + 1)) ;;
  esac
}

execute_test_with_retry() {
  local test_id="$1"
  local test_func="$2"
  local max_attempts="${3:-1}"
  local attempt=1
  local exit_code=1
  local start end duration_ms

  while [ "$attempt" -le "$max_attempts" ]; do
    start=$(($(date +%s) * 1000))
    if "$test_func"; then
      end=$(($(date +%s) * 1000))
      duration_ms=$((end - start))
      record_result "$test_id" "PASS" "$duration_ms" "passed" "$attempt"
      return 0
    else
      exit_code=$?
    fi

    if [ "$attempt" -lt "$max_attempts" ]; then
      log_warn "Test $test_id attempt $attempt/$max_attempts failed, retrying"
      sleep 1
    fi
    attempt=$((attempt + 1))
  done

  end=$(($(date +%s) * 1000))
  duration_ms=$((end - start))
  record_result "$test_id" "FAIL" "$duration_ms" "exit code $exit_code" "$max_attempts"
  return "$exit_code"
}

execute_phase() {
  local phase="$1"
  phase="$(printf '%s' "$phase" | tr '[:upper:]' '[:lower:]')"
  source tests/integration/registry.sh
  local spec test_id test_func attempts
  local phase_exit_code=0

  local tests_array=()
  case "$phase" in
    1|phase1) tests_array=("${PHASE1_TESTS[@]}") ;;
    2|phase2) tests_array=("${PHASE2_TESTS[@]}") ;;
    3|phase3) tests_array=("${PHASE3_TESTS[@]}") ;;
    4|phase4) tests_array=("${PHASE4_TESTS[@]}") ;;
    5|phase5) tests_array=("${PHASE5_TESTS[@]}") ;;
    6|phase6) tests_array=("${PHASE6_TESTS[@]}") ;;
    7|phase7) tests_array=("${PHASE7_TESTS[@]}") ;;
    all) tests_array=("${ALL_TESTS[@]}") ;;
    *) return 1 ;;
  esac

  for spec in "${tests_array[@]}"; do
    IFS='|' read -r test_id test_func attempts <<<"$spec"
    [ -n "$test_id" ] || continue
    if ! execute_test_with_retry "$test_id" "$test_func" "$attempts"; then
      phase_exit_code=1
    fi
  done

  return "$phase_exit_code"
}
