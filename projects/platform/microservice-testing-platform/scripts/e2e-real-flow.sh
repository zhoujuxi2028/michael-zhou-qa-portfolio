#!/usr/bin/env bash
# Real (non-mocked) async event-flow smoke test.
#
# Verifies the full Redis Pub/Sub path that the jest E2E suite mocks:
#   Order (POST /api/orders) -> publish order.created ->
#   Payment (subscriber) -> callback PATCH order status ->
#   Payment (publish payment.completed) -> Order paid
#
# Requires Docker (builds the 3 services + Redis via docker-compose.yml).
# Usage: bash scripts/e2e-real-flow.sh
#   KEEP_UP=1   leave the stack running after the check
set -euo pipefail

cd "$(dirname "$0")/.."

ORDER_URL="${ORDER_URL:-http://localhost:3003}"
INVENTORY_URL="${INVENTORY_URL:-http://localhost:3004}"
PAYMENT_URL="${PAYMENT_URL:-http://localhost:3005}"
PRODUCT_ID="${PRODUCT_ID:-PROD-001}"
POLL_ATTEMPTS="${POLL_ATTEMPTS:-15}"

cleanup() {
  if [ "${KEEP_UP:-0}" != "1" ]; then
    docker compose down -v >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

echo "== starting stack =="
docker compose up -d --build

echo "== waiting for health =="
for svc_url in "$ORDER_URL" "$INVENTORY_URL" "$PAYMENT_URL"; do
  healthy=0
  for _ in $(seq 1 30); do
    if curl -sf "$svc_url/health" >/dev/null 2>&1; then
      healthy=1
      break
    fi
    sleep 1
  done
  if [ "$healthy" -ne 1 ]; then
    echo "FAIL: $svc_url did not become healthy"
    exit 1
  fi
  echo "  healthy: $svc_url"
done

echo "== creating order =="
CREATE=$(curl -sf -X POST "$ORDER_URL/api/orders" \
  -H 'Content-Type: application/json' \
  -d "{\"productId\":\"$PRODUCT_ID\",\"quantity\":1,\"unitPrice\":10}")
ORDER_ID=$(printf '%s' "$CREATE" | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")
echo "  order: $ORDER_ID"

echo "== polling for paid (async via Redis) =="
STATUS=""
for i in $(seq 1 "$POLL_ATTEMPTS"); do
  STATUS=$(curl -sf "$ORDER_URL/api/orders/$ORDER_ID" | python3 -c "import sys,json;print(json.load(sys.stdin)['status'])")
  echo "  attempt $i: $STATUS"
  if [ "$STATUS" = "paid" ]; then
    break
  fi
  sleep 1
done

if [ "$STATUS" != "paid" ]; then
  echo "FAIL: order did not reach 'paid' (status=$STATUS)"
  docker compose logs --no-color --tail=40 payment-service || true
  exit 1
fi

echo "== payment record =="
curl -sf "$PAYMENT_URL/api/payments/$ORDER_ID" | python3 -m json.tool

echo "PASS: real async flow reached 'paid'"
