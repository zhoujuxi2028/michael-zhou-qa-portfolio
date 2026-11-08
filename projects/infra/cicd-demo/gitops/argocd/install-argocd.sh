#!/bin/bash
# ArgoCD Installation Script
# This script installs ArgoCD to a Kubernetes cluster
#
# Usage:
#   ./install-argocd.sh
#
# Prerequisites:
#   - kubectl configured to access target cluster
#   - Cluster running (k3d, minikube, EKS, GKE, AKS)

set -e  # Exit on error

# ==============================================================================
# Configuration
# ==============================================================================

ARGOCD_NAMESPACE="argocd"
ARGOCD_VERSION="stable"  # Can also use specific version like v2.9.3

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ==============================================================================
# Functions
# ==============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ==============================================================================
# Pre-flight Checks
# ==============================================================================

log_info "ArgoCD Installation Script"
log_info "=========================="
echo ""

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    log_error "kubectl is not installed. Please install kubectl first."
    exit 1
fi

# Check if kubectl can access the cluster
if ! kubectl cluster-info &> /dev/null; then
    log_error "Cannot access Kubernetes cluster. Check your kubeconfig."
    exit 1
fi

log_success "kubectl configured and cluster accessible"
echo ""

# ==============================================================================
# Install ArgoCD
# ==============================================================================

log_info "Step 1: Creating ArgoCD namespace..."
kubectl create namespace ${ARGOCD_NAMESPACE} 2>/dev/null || log_warning "Namespace ${ARGOCD_NAMESPACE} already exists"
echo ""

log_info "Step 2: Installing ArgoCD ${ARGOCD_VERSION}..."
kubectl apply -n ${ARGOCD_NAMESPACE} -f https://raw.githubusercontent.com/argoproj/argo-cd/${ARGOCD_VERSION}/manifests/install.yaml
echo ""

log_info "Step 3: Waiting for ArgoCD pods to be ready (may take 1-2 minutes)..."
kubectl wait --for=condition=Ready pods --all -n ${ARGOCD_NAMESPACE} --timeout=300s 2>/dev/null || {
    log_warning "Some pods may still be initializing"
    sleep 30
}
echo ""

# ==============================================================================
# Get Admin Password
# ==============================================================================

log_info "Step 4: Retrieving ArgoCD admin password..."
ARGOCD_PASSWORD=$(kubectl -n ${ARGOCD_NAMESPACE} get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" 2>/dev/null | base64 -d)

if [ -z "$ARGOCD_PASSWORD" ]; then
    log_error "Failed to retrieve admin password"
    exit 1
fi

log_success "ArgoCD admin password retrieved"
echo ""

# ==============================================================================
# Display Access Information
# ==============================================================================

log_success "ArgoCD installed successfully!"
echo ""
echo "=========================================="
echo "  ArgoCD Access Information"
echo "=========================================="
echo ""
echo "Username: admin"
echo "Password: ${ARGOCD_PASSWORD}"
echo ""
echo "To access the ArgoCD UI:"
echo ""
echo "1. Port forward the ArgoCD server:"
echo "   kubectl port-forward svc/argocd-server -n argocd 9090:443"
echo ""
echo "2. Open your browser:"
echo "   https://localhost:9090"
echo ""
echo "3. Login with the credentials above"
echo ""
echo "=========================================="
echo ""

# Save password to file (optional)
echo "${ARGOCD_PASSWORD}" > .argocd-admin-password
log_info "Admin password saved to: .argocd-admin-password"
echo ""

# ==============================================================================
# Verify Installation
# ==============================================================================

log_info "Verifying installation..."
echo ""

kubectl get pods -n ${ARGOCD_NAMESPACE}
echo ""

log_success "Installation complete!"
echo ""
log_info "Next steps:"
echo "  1. Run: kubectl port-forward svc/argocd-server -n argocd 9090:443"
echo "  2. Visit: https://localhost:9090"
echo "  3. Login: admin / ${ARGOCD_PASSWORD}"
echo "  4. Create Applications using CRDs in gitops/argocd/applications/"
echo ""
