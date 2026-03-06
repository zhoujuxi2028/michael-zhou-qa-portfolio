#!/bin/bash

# K8S Auto Testing Platform - Automated Test Runner
# Runs all tests with proper proxy bypass and generates reports

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Proxy bypass - CRITICAL for K8S and local connections
export no_proxy=localhost,127.0.0.1,kubernetes.docker.internal,10.0.0.0/8
export NO_PROXY=$no_proxy

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

# Parse arguments
RUN_SMOKE=false
RUN_FULL=true
GENERATE_REPORT=false
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --smoke) RUN_SMOKE=true; RUN_FULL=false ;;
        --full) RUN_FULL=true ;;
        --report) GENERATE_REPORT=true ;;
        -v|--verbose) VERBOSE=true ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --smoke      Run smoke tests only"
            echo "  --full       Run full test suite (default)"
            echo "  --report     Generate HTML report"
            echo "  -v,--verbose Verbose output"
            echo "  -h,--help    Show this help"
            exit 0
            ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
    shift
done

print_header "K8S Auto Testing Platform - Test Runner"

# Step 1: Pre-flight checks
print_info "Running pre-flight checks..."

# Check K8S cluster
if ! kubectl cluster-info &>/dev/null; then
    print_error "Kubernetes cluster not available"
    echo "Please enable Kubernetes in Docker Desktop"
    exit 1
fi
print_success "Kubernetes cluster is running"

# Check namespace exists
if ! kubectl get namespace k8s-testing &>/dev/null; then
    print_warning "Namespace k8s-testing not found, creating..."
    kubectl apply -f k8s-manifests/namespace.yaml
fi
print_success "Namespace k8s-testing exists"

# Check deployment
if ! kubectl get deployment test-app -n k8s-testing &>/dev/null; then
    print_warning "Deployment not found, deploying..."
    kubectl apply -f k8s-manifests/
    sleep 30
fi
print_success "Deployment test-app exists"

# Check pods ready
READY_PODS=$(kubectl get pods -n k8s-testing --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l | tr -d ' ')
if [[ "$READY_PODS" -lt 2 ]]; then
    print_warning "Waiting for pods to be ready..."
    kubectl wait --for=condition=ready pod -l app=test-app -n k8s-testing --timeout=120s
fi
print_success "Pods are running ($READY_PODS pods)"

# Check application health
if ! curl -s http://localhost:30080/health &>/dev/null; then
    print_error "Application health check failed"
    exit 1
fi
print_success "Application is healthy"

# Step 2: Activate virtual environment
print_info "Activating Python virtual environment..."
if [[ -f "venv/bin/activate" ]]; then
    source venv/bin/activate
    print_success "Virtual environment activated"
else
    print_error "Virtual environment not found. Run: python -m venv venv && pip install -r requirements.txt"
    exit 1
fi

# Step 3: Run tests
print_header "Running Tests"

PYTEST_ARGS="-v"

if $RUN_SMOKE; then
    print_info "Running smoke tests only..."
    PYTEST_ARGS="$PYTEST_ARGS -m smoke"
fi

if $VERBOSE; then
    PYTEST_ARGS="$PYTEST_ARGS -s"
fi

if $GENERATE_REPORT; then
    REPORT_DIR="$PROJECT_ROOT/reports"
    mkdir -p "$REPORT_DIR"
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    PYTEST_ARGS="$PYTEST_ARGS --html=$REPORT_DIR/test-report-$TIMESTAMP.html --self-contained-html"
    print_info "Report will be saved to: $REPORT_DIR/test-report-$TIMESTAMP.html"
fi

echo ""
echo "Running: pytest tests/ $PYTEST_ARGS"
echo ""

if pytest tests/ $PYTEST_ARGS; then
    print_header "Test Results"
    print_success "All tests passed!"

    if $GENERATE_REPORT; then
        print_info "HTML report generated: $REPORT_DIR/test-report-$TIMESTAMP.html"
    fi

    # Show summary
    echo ""
    print_info "K8S Resources Summary:"
    kubectl get hpa,deployment,pods -n k8s-testing

    exit 0
else
    print_header "Test Results"
    print_error "Some tests failed"
    exit 1
fi
