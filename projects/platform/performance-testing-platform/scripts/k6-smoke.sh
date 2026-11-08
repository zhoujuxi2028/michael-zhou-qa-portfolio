#!/bin/bash

set -euo pipefail

SKIP_AUTOSTART="${K6_SMOKE_SKIP_AUTOSTART:-false}"
STARTED_BY_SCRIPT=false
SMOKE_PORT="${PORT:-3000}"
BASE_URL_INPUT="${BASE_URL:-}"

SMOKE_SCHEME="http"
BASE_URL_NO_SCHEME="$BASE_URL_INPUT"
if [[ "$BASE_URL_INPUT" == *"://"* ]]; then
  SMOKE_SCHEME="${BASE_URL_INPUT%%://*}"
  BASE_URL_NO_SCHEME="${BASE_URL_INPUT#*://}"
fi

SMOKE_AUTHORITY="$BASE_URL_NO_SCHEME"
SMOKE_PATH=""
if [[ "$BASE_URL_NO_SCHEME" == */* ]]; then
  SMOKE_AUTHORITY="${BASE_URL_NO_SCHEME%%/*}"
  SMOKE_PATH="/${BASE_URL_NO_SCHEME#*/}"
fi

if [ -z "$BASE_URL_INPUT" ]; then
  SMOKE_AUTHORITY="localhost"
fi

SMOKE_HOST="$SMOKE_AUTHORITY"
EXPLICIT_PORT=""
if [[ "$SMOKE_AUTHORITY" == \[*\]* ]]; then
  SMOKE_HOST="${SMOKE_AUTHORITY%%]*}]"
  PORT_SUFFIX="${SMOKE_AUTHORITY#"$SMOKE_HOST"}"
  if [[ "$PORT_SUFFIX" == :* ]]; then
    EXPLICIT_PORT="${PORT_SUFFIX#:}"
  fi
else
  SMOKE_HOST="${SMOKE_AUTHORITY%%:*}"
  if [ "$SMOKE_HOST" != "$SMOKE_AUTHORITY" ]; then
    EXPLICIT_PORT="${SMOKE_AUTHORITY##*:}"
  fi
fi

if [ -n "$EXPLICIT_PORT" ]; then
  SMOKE_PORT="$EXPLICIT_PORT"
  SMOKE_HOST_PORT="$SMOKE_AUTHORITY"
else
  SMOKE_HOST_PORT="${SMOKE_HOST}:${SMOKE_PORT}"
fi

SMOKE_BASE_URL="${SMOKE_SCHEME}://${SMOKE_HOST_PORT}${SMOKE_PATH}"
HEALTH_URL="${SMOKE_BASE_URL%/}/health"
IS_LOCAL_TARGET=false

case "$SMOKE_HOST" in
  localhost|127.0.0.1|::1|\[::1\])
    IS_LOCAL_TARGET=true
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

k6 run --out 'web-dashboard=export=reports/k6-smoke.html' tests/performance/smoke.k6.js "$@"
