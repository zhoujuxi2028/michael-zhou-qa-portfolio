#!/bin/bash

run_phase_3_auth() {
  log_info "Phase 3: Auth Integration"
  bash scripts/server.sh stop >/dev/null 2>&1 || true
  docker compose down >/dev/null 2>&1 || true
  rm -f data/perf.db*
  AUTH_ENABLED=true bash scripts/server.sh start single >/dev/null 2>&1 || return 1

  local reg_status login_resp token order_status noauth_status
  reg_status="$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/auth/register -H "Content-Type: application/json" -d '{"username":"inttest","email":"int@test.com","password":"pass123"}')"
  login_resp="$(curl -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"username":"inttest","password":"pass123"}')"
  token="$(echo "$login_resp" | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])" 2>/dev/null || true)"
  [ "$reg_status" = "201" ] || return 1
  [ -n "$token" ] || return 1

  order_status="$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/orders -H "Content-Type: application/json" -H "Authorization: Bearer ${token}" -d '{"product_id":1,"quantity":1}')"
  [ "$order_status" = "201" ] || return 1
  noauth_status="$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/orders -H "Content-Type: application/json" -d '{"product_id":1,"quantity":1}')"
  [ "$noauth_status" = "401" ] || return 1
  log_info "✅ Phase 3 complete"
}
