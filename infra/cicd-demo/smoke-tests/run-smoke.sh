#!/usr/bin/env bash
# run-smoke.sh — 部署后冒烟测试执行器
#
# 用法：
#   bash smoke-tests/run-smoke.sh [--env ENV] [--release RELEASE]
#
# 环境变量：
#   SMOKE_BASE_URL   目标服务 URL（默认：https://jsonplaceholder.typicode.com）
#   SMOKE_TIMEOUT    单个请求超时秒数（默认：10）
#   HELM_RELEASE     Helm release 名称，用于回滚（默认：qa-portfolio）
#   HELM_NAMESPACE   K8s namespace（默认：qa-portfolio-staging）
#
# 退出码：
#   0  冒烟全部通过
#   1  冒烟失败（触发回滚流程）

set -euo pipefail

SMOKE_BASE_URL="${SMOKE_BASE_URL:-https://jsonplaceholder.typicode.com}"
SMOKE_TIMEOUT="${SMOKE_TIMEOUT:-10}"
HELM_RELEASE="${HELM_RELEASE:-qa-portfolio}"
HELM_NAMESPACE="${HELM_NAMESPACE:-qa-portfolio-staging}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "======================================================"
echo "  Post-Deploy Smoke Test"
echo "  Target: $SMOKE_BASE_URL"
echo "  Start:  $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo "======================================================"

# ── Newman がなければインストール
if ! command -v newman &> /dev/null; then
  echo "Installing Newman..."
  npm install -g newman --silent
fi

# ── 冒烟测试执行
SMOKE_RESULT=0
newman run "$SCRIPT_DIR/smoke-collection.json" \
  --env-var "baseUrl=$SMOKE_BASE_URL" \
  --timeout-request "$((SMOKE_TIMEOUT * 1000))" \
  --reporters cli \
  --reporter-cli-no-banner \
  || SMOKE_RESULT=$?

echo "======================================================"
if [ "$SMOKE_RESULT" -eq 0 ]; then
  echo "  ✅ Smoke tests PASSED — deployment verified"
  echo "======================================================"
  exit 0
else
  echo "  ❌ Smoke tests FAILED — initiating rollback"
  echo "======================================================"
  echo ""
  echo "Rollback command (execute on cluster):"
  echo "  helm rollback $HELM_RELEASE --namespace $HELM_NAMESPACE --wait"
  echo ""
  echo "Verify rollback:"
  echo "  helm history $HELM_RELEASE --namespace $HELM_NAMESPACE"
  echo ""
  # 真实集群上取消注释以自动回滚：
  # if command -v helm &> /dev/null && helm status "$HELM_RELEASE" -n "$HELM_NAMESPACE" &>/dev/null; then
  #   echo "Executing rollback..."
  #   helm rollback "$HELM_RELEASE" --namespace "$HELM_NAMESPACE" --wait
  #   echo "Rollback completed."
  # fi
  exit 1
fi
