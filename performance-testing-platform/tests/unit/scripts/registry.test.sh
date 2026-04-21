#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$PROJECT_ROOT"

source tests/integration/registry.sh

[ "${#PHASE1_TESTS[@]}" -eq 1 ]
[ "${PHASE1_TESTS[0]}" = "PHASE1|run_phase_1_grafana|1" ]
[ "${#ALL_TESTS[@]}" -eq 7 ]
printf '✓ registry exports 7 phase entries\n'
