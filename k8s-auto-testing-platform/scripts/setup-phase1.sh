#!/bin/bash

# K8S Auto Testing Platform - Phase 1 Setup Script
# 环境部署与验证

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

print_header "Phase 1: 环境部署与验证 (Environment Deployment & Verification)"

# Step 1: Check Prerequisites
print_header "Step 1: Checking Prerequisites"

# Check Docker
if command_exists docker; then
    if docker info >/dev/null 2>&1; then
        print_success "Docker is running"
        DOCKER_VERSION=$(docker --version)
        print_info "Docker version: $DOCKER_VERSION"
    else
        print_error "Docker is not running. Please start Docker Desktop."
        exit 1
    fi
else
    print_error "Docker is not installed"
    exit 1
fi

# Check kubectl
if command_exists kubectl; then
    print_success "kubectl is installed"
    KUBECTL_VERSION=$(kubectl version --client -o yaml 2>/dev/null | grep gitVersion | head -1 | awk '{print $2}')
    print_info "kubectl version: $KUBECTL_VERSION"
else
    print_error "kubectl is not installed"
    exit 1
fi

# Check Python
if command_exists python3; then
    print_success "Python3 is installed"
    PYTHON_VERSION=$(python3 --version)
    print_info "Python version: $PYTHON_VERSION"
else
    print_error "Python3 is not installed"
    exit 1
fi

# Step 2: Check Kubernetes Cluster
print_header "Step 2: Checking Kubernetes Cluster"

if kubectl cluster-info >/dev/null 2>&1; then
    print_success "Kubernetes cluster is running"
    kubectl cluster-info
else
    print_error "Kubernetes cluster is not running"
    echo ""
    echo "Please enable Kubernetes in Docker Desktop:"
    echo "1. Open Docker Desktop"
    echo "2. Go to Settings (gear icon)"
    echo "3. Select 'Kubernetes' from the left menu"
    echo "4. Check 'Enable Kubernetes'"
    echo "5. Click 'Apply & Restart'"
    echo "6. Wait for Kubernetes to start (2-3 minutes)"
    echo ""
    echo "After Kubernetes is running, re-run this script."
    exit 1
fi

# Step 3: Install Metrics Server
print_header "Step 3: Installing Metrics Server"

if kubectl get deployment metrics-server -n kube-system >/dev/null 2>&1; then
    print_success "Metrics Server is already installed"
else
    print_info "Installing Metrics Server..."
    kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

    print_info "Patching Metrics Server for Docker Desktop..."
    kubectl patch deployment metrics-server -n kube-system --type='json' \
        -p='[{"op": "add", "path": "/spec/template/spec/containers/0/args/-", "value": "--kubelet-insecure-tls"}]' || true

    print_info "Waiting for Metrics Server to be ready..."
    kubectl rollout status deployment metrics-server -n kube-system --timeout=120s
    print_success "Metrics Server installed successfully"
fi

# Step 4: Build Docker Image
print_header "Step 4: Building Docker Image"

cd "$PROJECT_ROOT/app"

print_info "Building test-app:latest..."
docker build -t test-app:latest .

if [ $? -eq 0 ]; then
    print_success "Docker image built successfully"
    docker images test-app:latest
else
    print_error "Failed to build Docker image"
    exit 1
fi

cd "$PROJECT_ROOT"

# Step 5: Deploy Kubernetes Resources
print_header "Step 5: Deploying Kubernetes Resources"

print_info "Deploying all K8S manifests..."
kubectl apply -f k8s-manifests/

print_success "K8S resources deployed"

# Step 6: Wait for Deployments
print_header "Step 6: Waiting for Deployments to be Ready"

print_info "Waiting for deployment to be ready..."
kubectl rollout status deployment test-app -n k8s-testing --timeout=120s

if [ $? -eq 0 ]; then
    print_success "Deployment is ready"
else
    print_error "Deployment failed to become ready"
    kubectl describe deployment test-app -n k8s-testing
    exit 1
fi

# Step 7: Verify Deployment
print_header "Step 7: Verifying Deployment"

echo "Namespace:"
kubectl get namespace k8s-testing

echo ""
echo "Deployment:"
kubectl get deployment -n k8s-testing

echo ""
echo "Pods:"
kubectl get pods -n k8s-testing

echo ""
echo "Services:"
kubectl get svc -n k8s-testing

echo ""
echo "HPA:"
kubectl get hpa -n k8s-testing

# Step 8: Test Application Access
print_header "Step 8: Testing Application Access"

# Get a pod name
POD_NAME=$(kubectl get pods -n k8s-testing -l app=test-app -o jsonpath='{.items[0].metadata.name}')

if [ -n "$POD_NAME" ]; then
    print_info "Testing health endpoint via kubectl exec..."
    kubectl exec -n k8s-testing "$POD_NAME" -- curl -s http://localhost:8080/health
    echo ""
    print_success "Application is responding"
fi

# Test via NodePort
print_info "Testing NodePort access..."
NODEPORT=$(kubectl get svc test-app-nodeport -n k8s-testing -o jsonpath='{.spec.ports[0].nodePort}')
if curl -s --noproxy localhost --connect-timeout 5 http://localhost:$NODEPORT/health >/dev/null 2>&1; then
    print_success "NodePort access working (http://localhost:$NODEPORT)"
else
    print_warning "NodePort access may not be available directly"
fi

# Step 9: Setup Python Virtual Environment
print_header "Step 9: Setting Up Python Environment"

cd "$PROJECT_ROOT"

if [ ! -d "venv" ]; then
    print_info "Creating virtual environment..."
    python3 -m venv venv
    print_success "Virtual environment created"
fi

print_info "Installing Python dependencies..."
source venv/bin/activate
pip install -r requirements.txt --quiet

print_success "Python dependencies installed"

# Step 10: Run Smoke Tests
print_header "Step 10: Running Smoke Tests"

print_info "Running deployment tests..."
python -m pytest tests/test_deployment.py -v --tb=short 2>&1 | head -50

print_info "Running service tests..."
python -m pytest tests/test_service.py -v --tb=short 2>&1 | head -50

print_info "Running HPA tests..."
python -m pytest tests/test_hpa.py -v --tb=short 2>&1 | head -50

# Final Summary
print_header "Phase 1 Summary"

echo "Kubernetes Cluster Status:"
kubectl get nodes

echo ""
echo "Namespace Resources:"
kubectl get all -n k8s-testing

echo ""
echo "HPA Status:"
kubectl get hpa -n k8s-testing -o wide

echo ""
print_success "Phase 1: Environment Deployment & Verification Complete!"
echo ""
echo "Next Steps:"
echo "1. Run full test suite: pytest tests/ -v"
echo "2. Test HPA scaling: python tools/load_generator.py"
echo "3. Monitor pods: kubectl get pods -n k8s-testing -w"

deactivate 2>/dev/null || true
