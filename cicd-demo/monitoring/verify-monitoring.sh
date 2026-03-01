#!/bin/bash
# Phase 1.6 Monitoring Stack Verification Script
# Comprehensive testing of Prometheus + Grafana installation

# Don't exit on error - we want to check all tests
# set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASS=0
FAIL=0

check_pass() {
    echo -e "${GREEN}✅ PASS${NC}: $1"
    ((PASS++))
}

check_fail() {
    echo -e "${RED}❌ FAIL${NC}: $1"
    ((FAIL++))
}

check_info() {
    echo -e "${BLUE}ℹ️  INFO${NC}: $1"
}

echo "╔══════════════════════════════════════════════════════════════════════════╗"
echo "║              Phase 1.6 - Monitoring Stack Verification                  ║"
echo "╚══════════════════════════════════════════════════════════════════════════╝"
echo ""

# ==============================================================================
# Section 1: File Structure Verification
# ==============================================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}1. File Structure Verification${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check main files
if [ -f prometheus-values.yaml ]; then
    LINES=$(wc -l < prometheus-values.yaml)
    check_pass "prometheus-values.yaml exists ($LINES lines)"
else
    check_fail "prometheus-values.yaml missing"
fi

if [ -x deploy-monitoring.sh ]; then
    check_pass "deploy-monitoring.sh exists and is executable"
else
    check_fail "deploy-monitoring.sh missing or not executable"
fi

if [ -f MONITORING.md ]; then
    LINES=$(wc -l < MONITORING.md)
    check_pass "MONITORING.md exists ($LINES lines)"
else
    check_fail "MONITORING.md missing"
fi

# Check dashboard files
DASHBOARD_COUNT=$(ls -1 dashboards/*.json 2>/dev/null | wc -l)
if [ "$DASHBOARD_COUNT" -eq 2 ]; then
    check_pass "2 Grafana dashboards exist (cluster-overview.json, test-metrics.json)"
else
    check_fail "Expected 2 dashboards, found $DASHBOARD_COUNT"
fi

echo ""

# ==============================================================================
# Section 2: Kubernetes Namespace Verification
# ==============================================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}2. Kubernetes Namespace Verification${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if kubectl get namespace monitoring >/dev/null 2>&1; then
    check_pass "monitoring namespace exists"
else
    check_fail "monitoring namespace not found"
fi

echo ""

# ==============================================================================
# Section 3: Pod Verification
# ==============================================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}3. Pod Verification${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

TOTAL_PODS=$(kubectl get pods -n monitoring --no-headers 2>/dev/null | wc -l)
RUNNING_PODS=$(kubectl get pods -n monitoring --no-headers 2>/dev/null | grep "Running" | wc -l)

if [ "$RUNNING_PODS" -eq "$TOTAL_PODS" ] && [ "$TOTAL_PODS" -ge 8 ]; then
    check_pass "All $TOTAL_PODS pods running"
else
    check_fail "Only $RUNNING_PODS/$TOTAL_PODS pods running"
fi

# Check specific components
if kubectl get pod -n monitoring -l app.kubernetes.io/name=prometheus 2>/dev/null | grep -q "Running"; then
    check_pass "Prometheus pod running"
else
    check_fail "Prometheus pod not running"
fi

if kubectl get pod -n monitoring -l app.kubernetes.io/name=grafana 2>/dev/null | grep -q "Running"; then
    check_pass "Grafana pod running"
else
    check_fail "Grafana pod not running"
fi

if kubectl get pod -n monitoring -l app.kubernetes.io/name=alertmanager 2>/dev/null | grep -q "Running"; then
    check_pass "AlertManager pod running"
else
    check_fail "AlertManager pod not running"
fi

NODE_EXPORTER_COUNT=$(kubectl get pods -n monitoring -l app.kubernetes.io/name=prometheus-node-exporter --no-headers 2>/dev/null | grep "Running" | wc -l)
if [ "$NODE_EXPORTER_COUNT" -eq 3 ]; then
    check_pass "Node Exporter running on all 3 nodes"
else
    check_fail "Node Exporter not on all nodes (found $NODE_EXPORTER_COUNT)"
fi

echo ""

# ==============================================================================
# Section 4: Service Verification
# ==============================================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}4. Service Verification${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if kubectl get svc -n monitoring prometheus-kube-prometheus-prometheus >/dev/null 2>&1; then
    check_pass "Prometheus service exists"
else
    check_fail "Prometheus service not found"
fi

if kubectl get svc -n monitoring prometheus-grafana >/dev/null 2>&1; then
    check_pass "Grafana service exists"
else
    check_fail "Grafana service not found"
fi

if kubectl get svc -n monitoring prometheus-kube-prometheus-alertmanager >/dev/null 2>&1; then
    check_pass "AlertManager service exists"
else
    check_fail "AlertManager service not found"
fi

echo ""

# ==============================================================================
# Section 5: ConfigMap and Storage Verification
# ==============================================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}5. ConfigMap and Storage Verification${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if kubectl get configmap -n monitoring grafana-dashboards >/dev/null 2>&1; then
    DASHBOARD_COUNT=$(kubectl get configmap grafana-dashboards -n monitoring -o jsonpath='{.data}' | grep -o 'json' | wc -l)
    check_pass "Grafana dashboard ConfigMap exists ($DASHBOARD_COUNT dashboards)"
else
    check_fail "Grafana dashboard ConfigMap not found"
fi

PVC_COUNT=$(kubectl get pvc -n monitoring --no-headers 2>/dev/null | wc -l)
if [ "$PVC_COUNT" -ge 2 ]; then
    check_pass "Persistent volumes configured ($PVC_COUNT PVCs)"
else
    check_fail "Expected 2+ PVCs, found $PVC_COUNT"
fi

BOUND_PVCs=$(kubectl get pvc -n monitoring --no-headers 2>/dev/null | grep "Bound" | wc -l)
if [ "$BOUND_PVCs" -eq "$PVC_COUNT" ]; then
    check_pass "All PVCs are Bound"
else
    check_fail "Some PVCs not Bound ($BOUND_PVCs/$PVC_COUNT)"
fi

echo ""

# ==============================================================================
# Section 6: Helm Release Verification
# ==============================================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}6. Helm Release Verification${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if helm list -n monitoring 2>/dev/null | grep -q "prometheus"; then
    VERSION=$(helm list -n monitoring 2>/dev/null | grep prometheus | awk '{print $9}')
    check_pass "Helm release 'prometheus' installed (revision $VERSION)"
else
    check_fail "Helm release 'prometheus' not found"
fi

echo ""

# ==============================================================================
# Section 7: Configuration Verification
# ==============================================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}7. Configuration Verification${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check Grafana admin password configured
if grep -q "adminPassword: \"grafana-admin\"" prometheus-values.yaml; then
    check_pass "Grafana admin password configured in values"
else
    check_fail "Grafana admin password not in values"
fi

# Check retention policy
if grep -q "retention: 7d" prometheus-values.yaml; then
    check_pass "Prometheus retention policy set to 7 days"
else
    check_fail "Prometheus retention policy not configured"
fi

# Check persistence enabled
if grep -q "enabled: true" prometheus-values.yaml | head -1; then
    check_pass "Persistent storage enabled"
else
    check_fail "Persistent storage not enabled"
fi

echo ""

# ==============================================================================
# Section 8: API Connectivity Verification
# ==============================================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}8. API Connectivity Verification${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Test Prometheus API
PROM_POD=$(kubectl get pods -n monitoring -l app.kubernetes.io/name=prometheus -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
if [ ! -z "$PROM_POD" ]; then
    if kubectl exec -n monitoring "$PROM_POD" -- curl -s http://localhost:9090/-/ready | grep -q "Prometheus Server is ready"; then
        check_pass "Prometheus API is responsive"
    else
        check_fail "Prometheus API not responding"
    fi
else
    check_fail "Could not find Prometheus pod"
fi

# Test Grafana API
GRAFANA_POD=$(kubectl get pods -n monitoring -l app.kubernetes.io/name=grafana -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
if [ ! -z "$GRAFANA_POD" ]; then
    if kubectl exec -n monitoring "$GRAFANA_POD" -- curl -s http://localhost:3000/api/health | grep -q '"database":"ok"'; then
        check_pass "Grafana API is responsive"
    else
        check_fail "Grafana API not responding"
    fi
else
    check_fail "Could not find Grafana pod"
fi

echo ""

# ==============================================================================
# Section 9: Metrics Collection Verification
# ==============================================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}9. Metrics Collection Verification${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if metrics are being collected
if [ ! -z "$PROM_POD" ]; then
    UP_METRICS=$(kubectl exec -n monitoring "$PROM_POD" -- curl -s 'http://localhost:9090/api/v1/query?query=up' 2>/dev/null | grep -o '"value"' | wc -l)
    if [ "$UP_METRICS" -gt 0 ]; then
        check_pass "Prometheus collecting metrics ($UP_METRICS targets up)"
    else
        check_fail "Prometheus not collecting metrics"
    fi
else
    check_fail "Cannot verify metrics collection"
fi

echo ""

# ==============================================================================
# Summary
# ==============================================================================

echo "╔══════════════════════════════════════════════════════════════════════════╗"
echo "║                    VERIFICATION SUMMARY                                 ║"
echo "╚══════════════════════════════════════════════════════════════════════════╝"
echo ""

TOTAL=$((PASS + FAIL))
if [ "$TOTAL" -gt 0 ]; then
    RATE=$((PASS * 100 / TOTAL))
else
    RATE=0
fi

echo -e "Total Checks:     $TOTAL"
echo -e "${GREEN}Passed:           $PASS${NC}"
echo -e "${RED}Failed:           $FAIL${NC}"
echo -e "Success Rate:     $RATE%"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                  🎉 ALL TESTS PASSED                                    ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${GREEN}✅ Phase 1.6 Monitoring Setup is production-ready!${NC}"
    echo ""
    exit 0
else
    echo -e "${YELLOW}╔══════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║                  ⚠️  SOME TESTS FAILED                                  ║${NC}"
    echo -e "${YELLOW}╚══════════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}$FAIL test(s) failed. Review the output above for details.${NC}"
    echo ""
    exit 1
fi
