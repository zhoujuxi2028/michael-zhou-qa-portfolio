#!/bin/bash
# Phase 6: Rate Limiter Integration Tests (RL-INT-01~03)
# Tests rate limiter middleware: normal requests, burst rejection (429), window recovery
# Usage: bash scripts/integration-test-phase6.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PORT="${PORT:-3000}"

# Test configuration (matching test-plan.md)
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX=3
RATE_LIMIT_WINDOW_MS=5000

# Counters
PASS=0
FAIL=0

log_result() {
  local id="$1" status="$2" detail="$3"
  if [ "$status" = "PASS" ]; then
    PASS=$((PASS + 1))
    echo "✅ ${id}: ${detail}"
  else
    FAIL=$((FAIL + 1))
    echo "❌ ${id}: ${detail}"
  fi
}

cleanup() {
  echo ""
  echo "Cleaning up..."
  bash "$SCRIPT_DIR/server.sh" stop 2>/dev/null || true
}
trap cleanup EXIT

cd "$PROJECT_DIR"

echo "=========================================="
echo " Phase 6: Rate Limiter Integration Tests"
echo "=========================================="
echo ""

# Prepare fresh state
echo "Starting API with rate limiting enabled..."
bash scripts/server.sh stop 2>/dev/null || true
sleep 1
RATE_LIMIT_ENABLED="$RATE_LIMIT_ENABLED" \
RATE_LIMIT_MAX="$RATE_LIMIT_MAX" \
RATE_LIMIT_WINDOW_MS="$RATE_LIMIT_WINDOW_MS" \
bash scripts/server.sh start single 2>/dev/null
sleep 2

# Verify server is running
if ! curl -sf "http://localhost:$PORT/health" > /dev/null 2>&1; then
  echo "❌ ERROR: Server failed to start"
  exit 1
fi
echo "✅ Server started with RATE_LIMIT_ENABLED=true, RATE_LIMIT_MAX=3, RATE_LIMIT_WINDOW_MS=5000"
echo ""

# ============================================================
# RL-INT-01: First 3 requests return 200, 4th returns 429
# ============================================================
echo "Test RL-INT-01: Rate limit burst (3 allowed, 4th denied)..."

STATUS_1=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/api/products")
STATUS_2=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/api/products")
STATUS_3=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/api/products")
STATUS_4=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/api/products")

if [ "$STATUS_1" = "200" ] && [ "$STATUS_2" = "200" ] && [ "$STATUS_3" = "200" ] && [ "$STATUS_4" = "429" ]; then
  log_result "RL-INT-01" "PASS" "Requests 1-3: 200, Request 4: 429 ✅"
else
  log_result "RL-INT-01" "FAIL" "Expected [200,200,200,429], got [$STATUS_1,$STATUS_2,$STATUS_3,$STATUS_4]"
fi

# ============================================================
# RL-INT-02: RateLimit headers present and decrement
# ============================================================
echo "Test RL-INT-02: RateLimit headers (Remaining should decrement)..."

# Wait for window to reset and server to be ready
bash scripts/server.sh stop 2>/dev/null || true
sleep 1
RATE_LIMIT_ENABLED="$RATE_LIMIT_ENABLED" \
RATE_LIMIT_MAX="$RATE_LIMIT_MAX" \
RATE_LIMIT_WINDOW_MS="$RATE_LIMIT_WINDOW_MS" \
bash scripts/server.sh start single 2>/dev/null
sleep 2

# Make requests and capture headers
RESP_1=$(curl -s -i "http://localhost:$PORT/api/products" 2>&1)
REMAINING_1=$(echo "$RESP_1" | grep -i "ratelimit-remaining" | grep -oE "[0-9]+" | head -1)

RESP_2=$(curl -s -i "http://localhost:$PORT/api/products" 2>&1)
REMAINING_2=$(echo "$RESP_2" | grep -i "ratelimit-remaining" | grep -oE "[0-9]+" | head -1)

RESP_3=$(curl -s -i "http://localhost:$PORT/api/products" 2>&1)
REMAINING_3=$(echo "$RESP_3" | grep -i "ratelimit-remaining" | grep -oE "[0-9]+" | head -1)

# Verify headers present and decrement: 2 → 1 → 0
if [ -n "$REMAINING_1" ] && [ -n "$REMAINING_2" ] && [ -n "$REMAINING_3" ]; then
  if [ "$REMAINING_1" = "2" ] && [ "$REMAINING_2" = "1" ] && [ "$REMAINING_3" = "0" ]; then
    log_result "RL-INT-02" "PASS" "RateLimit-Remaining: 2 → 1 → 0 ✅"
  else
    log_result "RL-INT-02" "FAIL" "RateLimit-Remaining incorrect: $REMAINING_1 → $REMAINING_2 → $REMAINING_3 (expected 2 → 1 → 0)"
  fi
else
  log_result "RL-INT-02" "FAIL" "RateLimit-Remaining header missing (R1=$REMAINING_1, R2=$REMAINING_2, R3=$REMAINING_3)"
fi

# ============================================================
# RL-INT-03: Window expiry allows recovery
# ============================================================
echo "Test RL-INT-03: Window expiry recovery (sleep 6s, expect 200)..."

# At this point, rate limit window is exhausted (3 requests made)
# Sleep 6s to exceed the 5s window (accounts for timing variations)
sleep 6

# Make new request, should succeed as window expired
STATUS_RECOVERY=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/api/products")

if [ "$STATUS_RECOVERY" = "200" ]; then
  log_result "RL-INT-03" "PASS" "Window expired after 6s: request returned 200 ✅"
else
  log_result "RL-INT-03" "FAIL" "Expected 200 after window expiry, got $STATUS_RECOVERY"
fi

# ============================================================
# Summary
# ============================================================
echo ""
echo "=========================================="
echo " Phase 6 Summary"
echo "=========================================="
TOTAL=$((PASS + FAIL))
echo "Total: ${TOTAL} | ✅ Pass: ${PASS} | ❌ Fail: ${FAIL}"
echo "=========================================="

[ "$FAIL" -eq 0 ] && exit 0 || exit 1
