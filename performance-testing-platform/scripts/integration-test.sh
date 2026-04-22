#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

PHASE="all"

while [ $# -gt 0 ]; do
  case "$1" in
    --phase)
      PHASE="${2:-all}"
      shift 2
      ;;
    --phase=*)
      PHASE="${1#*=}"
      shift
      ;;
    --verbose)
      DEBUG_MODE=1
      shift
      ;;
    *)
      shift
      ;;
  esac
done

source scripts/lib/common.sh
source scripts/lib/setup.sh
source scripts/lib/execute.sh
source scripts/lib/report.sh

main() {
  init_logging
  if [ "$PHASE" = "soak" ]; then
    bash scripts/integration-test-phase7-soak.sh
    return
  fi
  setup_phase
  execute_phase "$PHASE"
  report_phase
}

main
