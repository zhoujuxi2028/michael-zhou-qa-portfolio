#!/bin/bash
# Complete DevOps Platform Verification Script
# Verifies all phases (1.1 - 1.5) are correctly implemented

# Don't exit on error - we want to check all phases
# set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PASS_COUNT=0
FAIL_COUNT=0

check_pass() {
    echo -e "${GREEN}✅ PASS${NC}: $1"
    ((PASS_COUNT++))
}

check_fail() {
    echo -e "${RED}❌ FAIL${NC}: $1"
    ((FAIL_COUNT++))
}

check_info() {
    echo -e "${BLUE}ℹ️  INFO${NC}: $1"
}

echo "╔══════════════════════════════════════════════════════════════════════════╗"
echo "║           DevOps Platform - Complete Verification                       ║"
echo "╚══════════════════════════════════════════════════════════════════════════╝"
echo ""

# ==============================================================================
# Phase 1.1: Environment Preparation
# ==============================================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Phase 1.1: Environment Preparation${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Docker
if docker version --format '{{.Server.Version}}' >/dev/null 2>&1; then
    DOCKER_VER=$(docker version --format '{{.Server.Version}}' 2>/dev/null)
    check_pass "Docker installed (v$DOCKER_VER)"
else
    check_fail "Docker not installed or not running"
fi

# kubectl
if kubectl version --client --short >/dev/null 2>&1; then
    check_pass "kubectl installed"
else
    check_fail "kubectl not installed"
fi

# k3d
if k3d version >/dev/null 2>&1; then
    check_pass "k3d installed"
else
    check_fail "k3d not installed"
fi

# Terraform
if terraform version >/dev/null 2>&1; then
    TF_VER=$(terraform version | head -1 | awk '{print $2}')
    check_pass "Terraform installed ($TF_VER)"
else
    check_fail "Terraform not installed"
fi

# Helm
if helm version >/dev/null 2>&1; then
    check_pass "Helm installed"
else
    check_fail "Helm not installed"
fi

# k3d cluster
if k3d cluster list 2>/dev/null | grep -q "qa-portfolio"; then
    check_pass "k3d cluster 'qa-portfolio' exists"
else
    check_fail "k3d cluster 'qa-portfolio' not found"
fi

# Cluster nodes
NODE_COUNT=$(kubectl get nodes --no-headers 2>/dev/null | wc -l)
if [ "$NODE_COUNT" -eq 3 ]; then
    check_pass "k3d cluster has 3 nodes (1 server + 2 agents)"
else
    check_fail "k3d cluster has $NODE_COUNT nodes (expected 3)"
fi

echo ""

# ==============================================================================
# Phase 1.2: Infrastructure as Code
# ==============================================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Phase 1.2: Infrastructure as Code${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Terraform files
if [ -f terraform/main.tf ] && [ -f terraform/variables.tf ] && [ -f terraform/outputs.tf ]; then
    check_pass "Terraform configuration files exist"
else
    check_fail "Terraform configuration files missing"
fi

# Environment files
ENV_COUNT=$(ls -1 terraform/environments/*.tfvars 2>/dev/null | wc -l)
if [ "$ENV_COUNT" -eq 3 ]; then
    check_pass "3 environment files exist (dev, staging, production)"
else
    check_fail "Expected 3 environment files, found $ENV_COUNT"
fi

# Terraform state (optional)
if [ -f terraform/terraform.tfstate ]; then
    check_pass "Terraform state file exists (configuration applied)"
else
    check_info "Terraform state file not found (not yet applied - OK)"
fi

echo ""

# ==============================================================================
# Phase 1.3: Kubernetes Deployment
# ==============================================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Phase 1.3: Kubernetes Deployment${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# K8s manifests
K8S_FILES=$(ls -1 k8s/*.yaml 2>/dev/null | wc -l)
if [ "$K8S_FILES" -ge 8 ]; then
    check_pass "K8s manifest files exist ($K8S_FILES files)"
else
    check_fail "K8s manifest files missing (found $K8S_FILES, expected 8+)"
fi

# Namespace
if kubectl get namespace qa-portfolio >/dev/null 2>&1; then
    check_pass "qa-portfolio namespace exists"
else
    check_fail "qa-portfolio namespace not found"
fi

# Pods
RUNNING_PODS=$(kubectl get pods -n qa-portfolio --no-headers 2>/dev/null | grep "Running" | wc -l)
if [ "$RUNNING_PODS" -ge 1 ]; then
    check_pass "Pods running in qa-portfolio namespace ($RUNNING_PODS pods)"
else
    check_fail "No running pods in qa-portfolio namespace"
fi

# Services
if kubectl get svc -n qa-portfolio >/dev/null 2>&1; then
    check_pass "Services exist in qa-portfolio namespace"
else
    check_fail "No services found in qa-portfolio namespace"
fi

# Deploy script
if [ -x k8s/deploy-to-k8s.sh ]; then
    check_pass "Deployment script is executable"
else
    check_fail "Deployment script missing or not executable"
fi

echo ""

# ==============================================================================
# Phase 1.4: Security Integration
# ==============================================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Phase 1.4: Security Integration${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# trivy-config.yaml
if [ -f security/trivy-config.yaml ]; then
    check_pass "trivy-config.yaml exists"
else
    check_fail "trivy-config.yaml missing"
fi

# security-report.sh
if [ -x security/security-report.sh ]; then
    check_pass "security-report.sh exists and is executable"
else
    check_fail "security-report.sh missing or not executable"
fi

# Security workflow
if [ -f .github/workflows/security-scan.yml ]; then
    check_pass "GitHub security-scan workflow exists"
else
    check_fail "GitHub security-scan workflow missing"
fi

# NPM security scripts
SECURITY_SCRIPTS=$(grep -c '"security:' package.json 2>/dev/null || echo "0")
if [ "$SECURITY_SCRIPTS" -ge 4 ]; then
    check_pass "NPM security scripts added to package.json ($SECURITY_SCRIPTS scripts)"
else
    check_fail "NPM security scripts missing (found $SECURITY_SCRIPTS, expected 4)"
fi

# SECURITY.md
if [ -f SECURITY.md ]; then
    check_pass "SECURITY.md policy exists"
else
    check_fail "SECURITY.md policy missing"
fi

# .trivyignore
if [ -f .trivyignore ]; then
    check_pass ".trivyignore configuration exists"
else
    check_fail ".trivyignore configuration missing"
fi

echo ""

# ==============================================================================
# Phase 1.5: GitOps Implementation
# ==============================================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Phase 1.5: GitOps Implementation${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# install-argocd.sh
if [ -x gitops/argocd/install-argocd.sh ]; then
    check_pass "install-argocd.sh exists and is executable"
else
    check_fail "install-argocd.sh missing or not executable"
fi

# project.yaml
if [ -f gitops/argocd/project.yaml ]; then
    check_pass "AppProject CRD (project.yaml) exists"
else
    check_fail "AppProject CRD (project.yaml) missing"
fi

# Application CRDs
APP_YAMLS=$(ls -1 gitops/argocd/applications/*.yaml 2>/dev/null | wc -l)
if [ "$APP_YAMLS" -eq 2 ]; then
    check_pass "Application CRDs exist (2 files)"
else
    check_fail "Application CRDs missing (found $APP_YAMLS, expected 2)"
fi

# ArgoCD namespace
if kubectl get namespace argocd >/dev/null 2>&1; then
    check_pass "ArgoCD namespace exists"
else
    check_fail "ArgoCD namespace not found"
fi

# ArgoCD pods
ARGOCD_PODS=$(kubectl get pods -n argocd --no-headers 2>/dev/null | grep "Running" | wc -l)
if [ "$ARGOCD_PODS" -ge 7 ]; then
    check_pass "ArgoCD pods running ($ARGOCD_PODS/7)"
else
    check_fail "ArgoCD pods not all running ($ARGOCD_PODS/7)"
fi

# AppProject
if kubectl get appproject qa-portfolio -n argocd >/dev/null 2>&1; then
    check_pass "AppProject 'qa-portfolio' created"
else
    check_fail "AppProject 'qa-portfolio' not found"
fi

# Applications
APP_COUNT=$(kubectl get applications -n argocd --no-headers 2>/dev/null | wc -l)
if [ "$APP_COUNT" -ge 2 ]; then
    check_pass "Applications created ($APP_COUNT applications)"
else
    check_fail "Applications missing (found $APP_COUNT, expected 2)"
fi

# Application health
DEV_HEALTH=$(kubectl get application qa-portfolio-dev -n argocd -o jsonpath='{.status.health.status}' 2>/dev/null || echo "Unknown")
STAGING_HEALTH=$(kubectl get application qa-portfolio-staging -n argocd -o jsonpath='{.status.health.status}' 2>/dev/null || echo "Unknown")

if [ "$DEV_HEALTH" = "Healthy" ]; then
    check_pass "qa-portfolio-dev application is Healthy"
else
    check_fail "qa-portfolio-dev application is $DEV_HEALTH"
fi

if [ "$STAGING_HEALTH" = "Healthy" ]; then
    check_pass "qa-portfolio-staging application is Healthy"
else
    check_fail "qa-portfolio-staging application is $STAGING_HEALTH"
fi

# GitOps README
if [ -f gitops/README.md ]; then
    README_LINES=$(wc -l < gitops/README.md)
    check_pass "GitOps README.md exists ($README_LINES lines)"
else
    check_fail "GitOps README.md missing"
fi

echo ""

# ==============================================================================
# Summary
# ==============================================================================

echo "╔══════════════════════════════════════════════════════════════════════════╗"
echo "║                         VERIFICATION SUMMARY                             ║"
echo "╚══════════════════════════════════════════════════════════════════════════╝"
echo ""

TOTAL=$((PASS_COUNT + FAIL_COUNT))
PASS_RATE=$((PASS_COUNT * 100 / TOTAL))

echo -e "Total Checks:     $TOTAL"
echo -e "${GREEN}Passed:           $PASS_COUNT${NC}"
echo -e "${RED}Failed:           $FAIL_COUNT${NC}"
echo -e "Success Rate:     $PASS_RATE%"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                  🎉 ALL CHECKS PASSED                                    ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${GREEN}✅ All phases (1.1 - 1.5) are successfully implemented and verified!${NC}"
    echo ""
    exit 0
else
    echo -e "${YELLOW}╔══════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║                  ⚠️  SOME CHECKS FAILED                                  ║${NC}"
    echo -e "${YELLOW}╚══════════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}$FAIL_COUNT check(s) failed. Review the output above for details.${NC}"
    echo ""
    echo "For detailed troubleshooting, see:"
    echo "  - docs/MANUAL-VERIFICATION-GUIDE.md"
    echo "  - docs/PHASE-*-COMPLETION.md files"
    echo ""
    exit 1
fi
