#!/bin/bash

# Deploy CI/CD Demo to Kubernetes
# This script deploys the test infrastructure to a Kubernetes cluster
#
# Interview Talking Point:
# "Deployment scripts automate infrastructure setup, ensuring consistency across
# environments. This script handles prerequisites, creates resources in the correct
# order, and provides clear feedback. It's idempotent - safe to run multiple times."

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  CI/CD Demo - Kubernetes Deployment${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Function: Print colored messages
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function: Check if kubectl is installed
check_prerequisites() {
    print_info "Checking prerequisites..."

    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl not found. Please install kubectl."
        exit 1
    fi

    if ! kubectl cluster-info &> /dev/null; then
        print_error "Cannot connect to Kubernetes cluster. Is your cluster running?"
        exit 1
    fi

    print_success "Prerequisites check passed"
    echo ""
}

# Function: Create namespace
create_namespace() {
    print_info "Creating namespace 'qa-portfolio'..."

    if kubectl get namespace qa-portfolio &> /dev/null; then
        print_warning "Namespace 'qa-portfolio' already exists"
    else
        kubectl apply -f "$SCRIPT_DIR/namespace.yaml"
        print_success "Namespace created"
    fi
    echo ""
}

# Function: Create ConfigMaps
create_configmaps() {
    print_info "Creating ConfigMaps..."
    kubectl apply -f "$SCRIPT_DIR/configmap.yaml"
    print_success "ConfigMaps created"
    echo ""
}

# Function: Create PersistentVolumeClaims
create_pvcs() {
    print_info "Creating PersistentVolumeClaims..."
    kubectl apply -f "$SCRIPT_DIR/pvc.yaml"

    print_info "Waiting for PVCs to be bound..."
    kubectl wait --for=jsonpath='{.status.phase}'=Bound \
        pvc/test-results-pvc \
        pvc/cypress-cache-pvc \
        -n qa-portfolio \
        --timeout=60s || print_warning "PVCs may take longer to bind"

    print_success "PersistentVolumeClaims created"
    echo ""
}

# Function: Create Deployment and Service
create_deployment() {
    print_info "Creating test results server deployment..."
    kubectl apply -f "$SCRIPT_DIR/deployment.yaml"
    kubectl apply -f "$SCRIPT_DIR/service.yaml"

    print_info "Waiting for deployment to be ready..."
    kubectl wait --for=condition=available \
        deployment/test-results-server \
        -n qa-portfolio \
        --timeout=120s

    print_success "Deployment and Service created"
    echo ""
}

# Function: Create Ingress
create_ingress() {
    print_info "Creating Ingress..."
    kubectl apply -f "$SCRIPT_DIR/ingress.yaml"
    print_success "Ingress created"
    echo ""
}

# Function: Run test jobs
run_tests() {
    print_info "Deploying test jobs..."

    # Delete old jobs if they exist
    kubectl delete job newman-test cypress-test -n qa-portfolio --ignore-not-found=true

    # Create new jobs
    kubectl apply -f "$SCRIPT_DIR/job-newman.yaml"
    kubectl apply -f "$SCRIPT_DIR/job-cypress.yaml"

    print_success "Test jobs created"
    print_info "Monitor job progress with: kubectl get jobs -n qa-portfolio -w"
    echo ""
}

# Function: Display access information
show_access_info() {
    print_success "Deployment complete!"
    echo ""
    echo -e "${GREEN}================================================${NC}"
    echo -e "${GREEN}  Access Information${NC}"
    echo -e "${GREEN}================================================${NC}"
    echo ""
    echo "View test results at:"
    echo "  http://localhost:8080/test-results (if using k3d with port forwarding)"
    echo ""
    echo "Or port-forward manually:"
    echo "  kubectl port-forward -n qa-portfolio svc/test-results-service 8080:80"
    echo ""
    echo "Monitor test jobs:"
    echo "  kubectl get jobs -n qa-portfolio -w"
    echo ""
    echo "View job logs:"
    echo "  kubectl logs -n qa-portfolio -l component=cypress -f"
    echo "  kubectl logs -n qa-portfolio -l component=newman -f"
    echo ""
    echo "Check all resources:"
    echo "  kubectl get all -n qa-portfolio"
    echo ""
}

# Function: Deploy everything
deploy_all() {
    check_prerequisites
    create_namespace
    create_configmaps
    create_pvcs
    create_deployment
    create_ingress
    show_access_info
}

# Function: Run tests only
run_tests_only() {
    print_info "Running tests only (infrastructure must already exist)..."
    run_tests
}

# Function: Clean up resources
cleanup() {
    print_warning "Cleaning up Kubernetes resources..."

    kubectl delete namespace qa-portfolio --wait=true || print_error "Failed to delete namespace"

    print_success "Cleanup complete"
}

# Main script logic
case "${1:-deploy}" in
    deploy)
        deploy_all
        ;;
    test)
        run_tests_only
        ;;
    cleanup)
        cleanup
        ;;
    *)
        echo "Usage: $0 {deploy|test|cleanup}"
        echo ""
        echo "Commands:"
        echo "  deploy   - Deploy all Kubernetes resources (default)"
        echo "  test     - Run test jobs only"
        echo "  cleanup  - Delete all resources in qa-portfolio namespace"
        exit 1
        ;;
esac
