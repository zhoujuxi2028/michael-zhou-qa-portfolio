#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$PROJECT_ROOT"

source scripts/lib/common.sh
source scripts/lib/setup.sh
source scripts/lib/execute.sh

results=()
rm -f /tmp/execute-test-marker

record_result() {
  results+=("$1|$2|$3|$4|$5")
}

sample_test() {
  if [ ! -f /tmp/execute-test-marker ]; then
    touch /tmp/execute-test-marker
    return 1
  fi
  return 0
}

execute_test_with_retry "E-01" sample_test 3

if [ "${#results[@]}" -ne 1 ]; then
  printf '✗ expected one recorded result, got %s\n' "${#results[@]}"
  exit 1
fi

if printf '%s' "${results[0]}" | grep -q 'E-01|PASS'; then
  printf '✓ execute_test_with_retry retries and records PASS\n'
else
  printf '✗ execute_test_with_retry did not record PASS\n'
  exit 1
fi
