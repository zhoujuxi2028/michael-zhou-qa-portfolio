#!/bin/bash
# deploy-helm.sh — Helm release management for QA Portfolio
#
# Usage:
#   ./scripts/deploy-helm.sh install [env]     Install chart (default: dev)
#   ./scripts/deploy-helm.sh upgrade [env]     Upgrade existing release
#   ./scripts/deploy-helm.sh rollback          Rollback to previous revision
#   ./scripts/deploy-helm.sh status            Show release status
#   ./scripts/deploy-helm.sh template [env]    Render templates locally
#   ./scripts/deploy-helm.sh lint              Lint the chart
#   ./scripts/deploy-helm.sh uninstall         Remove the release

set -euo pipefail

CHART_DIR="$(cd "$(dirname "$0")/../helm/qa-portfolio" && pwd)"
RELEASE_NAME="qa-portfolio"
NAMESPACE="qa-portfolio"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC} $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }

# Get values files for environment
get_values_args() {
    local env="${1:-dev}"
    local args="-f ${CHART_DIR}/values.yaml"

    case "$env" in
        staging)
            args="$args -f ${CHART_DIR}/values-staging.yaml"
            ;;
        production)
            args="$args -f ${CHART_DIR}/values-production.yaml"
            ;;
        dev)
            # dev uses default values.yaml only
            ;;
        *)
            log_error "Unknown environment: $env (use dev, staging, or production)"
            exit 1
            ;;
    esac
    echo "$args"
}

cmd_install() {
    local env="${1:-dev}"
    local values_args
    values_args=$(get_values_args "$env")

    log_info "Installing qa-portfolio (environment: $env)"
    log_info "Chart: $CHART_DIR"

    helm install "$RELEASE_NAME" "$CHART_DIR" \
        $values_args \
        --namespace "$NAMESPACE" \
        --create-namespace \
        --wait \
        --timeout 5m

    log_info "Install complete. Checking status..."
    cmd_status
}

cmd_upgrade() {
    local env="${1:-dev}"
    local values_args
    values_args=$(get_values_args "$env")

    log_info "Upgrading qa-portfolio (environment: $env)"

    helm upgrade "$RELEASE_NAME" "$CHART_DIR" \
        $values_args \
        --namespace "$NAMESPACE" \
        --wait \
        --timeout 5m

    log_info "Upgrade complete. Checking status..."
    cmd_status
}

cmd_rollback() {
    log_info "Rolling back qa-portfolio to previous revision"

    helm rollback "$RELEASE_NAME" \
        --namespace "$NAMESPACE" \
        --wait \
        --timeout 5m

    log_info "Rollback complete. Checking status..."
    cmd_status
}

cmd_status() {
    log_info "Release status:"
    helm status "$RELEASE_NAME" --namespace "$NAMESPACE" 2>/dev/null || \
        log_warn "Release '$RELEASE_NAME' not found in namespace '$NAMESPACE'"

    echo ""
    log_info "Release history:"
    helm history "$RELEASE_NAME" --namespace "$NAMESPACE" 2>/dev/null || true
}

cmd_template() {
    local env="${1:-dev}"
    local values_args
    values_args=$(get_values_args "$env")

    log_info "Rendering templates (environment: $env)"

    helm template "$RELEASE_NAME" "$CHART_DIR" \
        $values_args \
        --namespace "$NAMESPACE"
}

cmd_lint() {
    log_info "Linting Helm chart: $CHART_DIR"
    helm lint "$CHART_DIR" -f "${CHART_DIR}/values.yaml"

    log_info "Linting with staging values..."
    helm lint "$CHART_DIR" -f "${CHART_DIR}/values.yaml" -f "${CHART_DIR}/values-staging.yaml"

    log_info "Linting with production values..."
    helm lint "$CHART_DIR" -f "${CHART_DIR}/values.yaml" -f "${CHART_DIR}/values-production.yaml"

    log_info "All lint checks passed"
}

cmd_uninstall() {
    log_warn "Uninstalling qa-portfolio release"
    helm uninstall "$RELEASE_NAME" --namespace "$NAMESPACE"
    log_info "Release uninstalled"
}

# Main
case "${1:-help}" in
    install)   cmd_install "${2:-dev}" ;;
    upgrade)   cmd_upgrade "${2:-dev}" ;;
    rollback)  cmd_rollback ;;
    status)    cmd_status ;;
    template)  cmd_template "${2:-dev}" ;;
    lint)      cmd_lint ;;
    uninstall) cmd_uninstall ;;
    help|*)
        echo "Usage: $0 {install|upgrade|rollback|status|template|lint|uninstall} [environment]"
        echo ""
        echo "Commands:"
        echo "  install [env]    Install chart (env: dev, staging, production)"
        echo "  upgrade [env]    Upgrade existing release"
        echo "  rollback         Rollback to previous revision"
        echo "  status           Show release status and history"
        echo "  template [env]   Render templates locally (dry-run)"
        echo "  lint             Lint chart with all value files"
        echo "  uninstall        Remove the release"
        ;;
esac
