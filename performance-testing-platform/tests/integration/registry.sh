#!/bin/bash

source tests/integration/phases/phase-1-grafana.sh
source tests/integration/phases/phase-2-metrics.sh
source tests/integration/phases/phase-3-auth.sh
source tests/integration/phases/phase-4-soak.sh
source tests/integration/phases/phase-5-k6-helpers.sh
source tests/integration/phases/phase-6-rate-limiter.sh
source tests/integration/phases/phase-7-ci-integration.sh

PHASE1_TESTS=("PHASE1|run_phase_1_grafana|1")
PHASE2_TESTS=("PHASE2|run_phase_2_metrics|1")
PHASE3_TESTS=("PHASE3|run_phase_3_auth|1")
PHASE4_TESTS=("PHASE4|run_phase_4_soak|1")
PHASE5_TESTS=("PHASE5|run_phase_5_k6_helpers|1")
PHASE6_TESTS=("PHASE6|run_phase_6_rate_limiter|1")
PHASE7_TESTS=("PHASE7|run_phase_7_ci_integration|1")
ALL_TESTS=("${PHASE1_TESTS[@]}" "${PHASE2_TESTS[@]}" "${PHASE3_TESTS[@]}" "${PHASE4_TESTS[@]}" "${PHASE5_TESTS[@]}" "${PHASE6_TESTS[@]}" "${PHASE7_TESTS[@]}")
