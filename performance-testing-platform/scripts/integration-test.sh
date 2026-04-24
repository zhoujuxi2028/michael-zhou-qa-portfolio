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
      export DEBUG_MODE=1
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
  local exit_code=0
  init_logging
  trap setup_cleanup EXIT

  if [ "$PHASE" = "soak" ]; then
    bash scripts/phases/phase7-soak.sh
    return $?
  fi

  if setup_phase; then
    :
  else
    return $?
  fi

  if execute_phase "$PHASE"; then
    :
  else
    exit_code=$?
  fi

  report_phase
  return "$exit_code"
}

main
