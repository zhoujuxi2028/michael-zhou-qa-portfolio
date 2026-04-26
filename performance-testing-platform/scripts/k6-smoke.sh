#!/bin/bash

set -euo pipefail

SKIP_AUTOSTART="${K6_SMOKE_SKIP_AUTOSTART:-false}"
STARTED_BY_SCRIPT=false
SMOKE_BASE_URL="${BASE_URL:-http://localhost:${PORT:-3000}}"
HEALTH_URL="${SMOKE_BASE_URL%/}/health"
SMOKE_PORT="${PORT:-3000}"

case "$SMOKE_BASE_URL" in
  *://*:*/*|*://*:*)
    SMOKE_PORT="${SMOKE_BASE_URL#*://}"
    SMOKE_PORT="${SMOKE_PORT%%/*}"
    SMOKE_PORT="${SMOKE_PORT##*:}"
    ;;
esac

export PORT="$SMOKE_PORT"
export BASE_URL="$SMOKE_BASE_URL"

cleanup() {
  if [ "$STARTED_BY_SCRIPT" = "true" ]; then
    bash scripts/server.sh stop
  fi
}

trap cleanup EXIT

mkdir -p reports

if [ "$SKIP_AUTOSTART" != "true" ]; then
  if ! curl -sf "$HEALTH_URL" >/dev/null 2>&1; then
    if [ "$IS_LOCAL_TARGET" != "true" ]; then
      echo "❌ Remote target not reachable on $HEALTH_URL. Autostart is disabled for non-local targets."
      exit 1
    fi

    START_OUTPUT="$(bash scripts/server.sh start single 2>&1)"
    if echo "$START_OUTPUT" | grep -q "Starting server in single mode on port"; then
      STARTED_BY_SCRIPT=true
    fi
    if ! curl -sf "$HEALTH_URL" >/dev/null 2>&1; then
      echo "❌ Server did not become healthy after autostart on $HEALTH_URL."
      exit 1
    fi
  fi
else
  curl -sf "$HEALTH_URL" >/dev/null 2>&1 || {
    echo "❌ API not reachable on $HEALTH_URL. Start it first or unset K6_SMOKE_SKIP_AUTOSTART."
    exit 1
  }
fi

export BASE_URL="$SMOKE_BASE_URL"
k6 run --out 'web-dashboard=export=reports/k6-smoke.html' tests/performance/smoke.k6.js "$@"
