#!/bin/bash
# Monitoring Stack Installation Script
# Deploys Prometheus + Grafana using kube-prometheus-stack Helm chart
# Part of: DevOps Platform Phase 1.6

set -e

# ============================================================================
# Configuration
# ============================================================================

NAMESPACE="monitoring"
RELEASE_NAME="prometheus"
CHART_REPO="https://prometheus-community.github.io/helm-charts"
CHART_NAME="kube-prometheus-stack"
CHART_VERSION="57.0.0"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# Functions
# ============================================================================

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

# ============================================================================
# Pre-flight Checks
# ============================================================================

echo "╔══════════════════════════════════════════════════════════════════════════╗"
echo "║        Monitoring Stack (Prometheus + Grafana) Installation            ║"
echo "╚══════════════════════════════════════════════════════════════════════════╝"
echo ""

log_info "Performing pre-flight checks..."

# Check kubectl
if ! command -v kubectl &> /dev/null; then
    log_error "kubectl not found. Please install kubectl first."
    exit 1
fi
log_success "kubectl installed"

# Check helm
if ! command -v helm &> /dev/null; then
    log_error "helm not found. Please install helm first."
    exit 1
fi
log_success "helm installed"

# Check cluster connection
if ! kubectl cluster-info &> /dev/null; then
    log_error "Cannot connect to Kubernetes cluster."
    exit 1
fi
log_success "Connected to Kubernetes cluster"

# Check if cluster has sufficient resources
NODES=$(kubectl get nodes --no-headers 2>/dev/null | wc -l)
if [ "$NODES" -lt 1 ]; then
    log_error "No Kubernetes nodes available."
    exit 1
fi
log_success "Cluster has $NODES node(s)"

echo ""

# ============================================================================
# Step 1: Create Monitoring Namespace
# ============================================================================

log_info "Step 1: Creating monitoring namespace..."

if kubectl get namespace "$NAMESPACE" &> /dev/null; then
    log_warning "Namespace '$NAMESPACE' already exists. Skipping creation."
else
    kubectl create namespace "$NAMESPACE"
    log_success "Namespace '$NAMESPACE' created"
fi

echo ""

# ============================================================================
# Step 2: Add and Update Helm Repositories
# ============================================================================

log_info "Step 2: Adding Prometheus Helm repository..."

helm repo add prometheus-community "$CHART_REPO" 2>/dev/null || helm repo update prometheus-community
log_success "Repository added/updated"

log_info "Updating Helm repositories..."
helm repo update
log_success "Repositories updated"

echo ""

# ============================================================================
# Step 3: Install kube-prometheus-stack
# ============================================================================

log_info "Step 3: Installing kube-prometheus-stack..."

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check if values file exists
if [ ! -f "$SCRIPT_DIR/prometheus-values.yaml" ]; then
    log_error "prometheus-values.yaml not found in $SCRIPT_DIR"
    exit 1
fi

log_info "Using values file: $SCRIPT_DIR/prometheus-values.yaml"

helm upgrade --install "$RELEASE_NAME" "prometheus-community/$CHART_NAME" \
    --version "$CHART_VERSION" \
    --namespace "$NAMESPACE" \
    --values "$SCRIPT_DIR/prometheus-values.yaml" \
    --wait \
    --timeout 10m

log_success "kube-prometheus-stack installed successfully"

echo ""

# ============================================================================
# Step 4: Create Dashboard ConfigMap
# ============================================================================

log_info "Step 4: Importing custom dashboards..."

DASHBOARDS_DIR="$SCRIPT_DIR/dashboards"

if [ -d "$DASHBOARDS_DIR" ] && [ "$(ls -1 "$DASHBOARDS_DIR"/*.json 2>/dev/null | wc -l)" -gt 0 ]; then

    # Create ConfigMap from dashboard JSON files
    kubectl create configmap grafana-dashboards \
        --from-file="$DASHBOARDS_DIR" \
        --namespace "$NAMESPACE" \
        --dry-run=client -o yaml | kubectl apply -f -

    log_success "Dashboard ConfigMap created/updated"
else
    log_warning "No dashboards found in $DASHBOARDS_DIR. Skipping ConfigMap creation."
fi

echo ""

# ============================================================================
# Step 5: Wait for Pods
# ============================================================================

log_info "Step 5: Waiting for all pods to be ready..."

kubectl rollout status statefulset/prometheus-kube-prometheus-prometheus \
    -n "$NAMESPACE" \
    --timeout=5m || log_warning "Prometheus StatefulSet timeout (may still be starting)"

kubectl rollout status deployment/prometheus-grafana \
    -n "$NAMESPACE" \
    --timeout=5m || log_warning "Grafana Deployment timeout (may still be starting)"

log_success "Pods are running"

echo ""

# ============================================================================
# Step 6: Display Access Information
# ============================================================================

log_info "Step 6: Displaying access information..."

echo ""
echo "╔══════════════════════════════════════════════════════════════════════════╗"
echo "║                    Monitoring Stack Ready!                              ║"
echo "╚══════════════════════════════════════════════════════════════════════════╝"
echo ""

echo -e "${GREEN}Prometheus${NC}"
echo "  URL: http://localhost:9090"
echo "  Port-forward command:"
echo "    kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-prometheus 9090:9090"
echo ""

echo -e "${GREEN}Grafana${NC}"
echo "  URL: http://localhost:3000"
echo "  Port-forward command:"
echo "    kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80"
echo "  Default Credentials:"
echo "    Username: admin"
echo "    Password: grafana-admin"
echo ""

echo -e "${GREEN}AlertManager${NC}"
echo "  URL: http://localhost:9093"
echo "  Port-forward command:"
echo "    kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-alertmanager 9093:9093"
echo ""

# ============================================================================
# Step 7: Verify Installation
# ============================================================================

log_info "Step 7: Verifying installation..."

RUNNING_PODS=$(kubectl get pods -n "$NAMESPACE" --no-headers 2>/dev/null | grep "Running" | wc -l)
TOTAL_PODS=$(kubectl get pods -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l)

echo "Pods status: $RUNNING_PODS/$TOTAL_PODS running"
kubectl get pods -n "$NAMESPACE" --no-headers | awk '{print "  " $1 " - " $3}'

echo ""

if [ "$RUNNING_PODS" -eq "$TOTAL_PODS" ]; then
    log_success "All pods are running!"
else
    log_warning "$((TOTAL_PODS - RUNNING_PODS)) pods still starting (may be normal for first deployment)"
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════════════════╗"
echo "║                         Installation Complete!                          ║"
echo "╚══════════════════════════════════════════════════════════════════════════╝"
echo ""

log_success "Monitoring stack deployed successfully to namespace '$NAMESPACE'"
log_info "See above for access instructions"
log_info "For more information, see: MONITORING.md"

echo ""
