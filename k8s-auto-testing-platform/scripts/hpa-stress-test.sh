#!/bin/bash

# K8S Auto Testing Platform - HPA Stress Test Script
# Demonstrates HPA auto-scaling behavior under load
#
# Usage: ./scripts/hpa-stress-test.sh [OPTIONS]
#   --duration    Load duration in seconds (default: 180)
#   --concurrency Concurrent requests (default: 20)
#   --interval    Monitoring interval in seconds (default: 10)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Proxy bypass - CRITICAL for K8S connections
export no_proxy=localhost,127.0.0.1,kubernetes.docker.internal,10.0.0.0/8
export NO_PROXY=$no_proxy

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Default parameters
DURATION=180
CONCURRENCY=20
MONITOR_INTERVAL=10
APP_URL="http://localhost:30080"
NAMESPACE="k8s-testing"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --duration) DURATION="$2"; shift 2 ;;
        --concurrency) CONCURRENCY="$2"; shift 2 ;;
        --interval) MONITOR_INTERVAL="$2"; shift 2 ;;
        -h|--help)
            echo "HPA Stress Test - Demonstrates HPA auto-scaling"
            echo ""
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --duration N     Load duration in seconds (default: 180)"
            echo "  --concurrency N  Concurrent requests (default: 20)"
            echo "  --interval N     Monitoring interval (default: 10)"
            echo "  -h, --help       Show this help"
            exit 0
            ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

print_header() {
    echo -e "\n${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC} ${CYAN}$1${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}\n"
}

print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_info() { echo -e "${CYAN}ℹ️  $1${NC}"; }

# Results file
RESULTS_DIR="$PROJECT_ROOT/reports/hpa-stress"
mkdir -p "$RESULTS_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RESULTS_FILE="$RESULTS_DIR/hpa-stress-$TIMESTAMP.log"
METRICS_FILE="$RESULTS_DIR/hpa-metrics-$TIMESTAMP.csv"

log_result() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$RESULTS_FILE"
}

# Initialize metrics CSV
echo "timestamp,replicas,cpu_percent,memory_percent,desired_replicas,current_replicas" > "$METRICS_FILE"

collect_hpa_metrics() {
    local ts=$(date '+%Y-%m-%d %H:%M:%S')
    local hpa_info=$(kubectl get hpa test-app-hpa -n $NAMESPACE -o jsonpath='{.status.currentReplicas},{.spec.minReplicas},{.spec.maxReplicas},{.status.desiredReplicas}' 2>/dev/null || echo "0,0,0,0")
    local current_replicas=$(echo "$hpa_info" | cut -d',' -f1)
    local desired_replicas=$(echo "$hpa_info" | cut -d',' -f4)

    # Get CPU metrics from HPA
    local cpu_percent=$(kubectl get hpa test-app-hpa -n $NAMESPACE -o jsonpath='{.status.currentMetrics[?(@.type=="Resource")].resource.current.averageUtilization}' 2>/dev/null | head -1 || echo "0")

    echo "$ts,$current_replicas,${cpu_percent:-0},0,$desired_replicas,$current_replicas" >> "$METRICS_FILE"
    echo -e "  ${CYAN}Replicas:${NC} $current_replicas/${desired_replicas} | ${CYAN}CPU:${NC} ${cpu_percent:-N/A}%"
}

print_header "K8S HPA Stress Test"

echo -e "${YELLOW}Configuration:${NC}"
echo -e "  Duration:    ${DURATION}s"
echo -e "  Concurrency: ${CONCURRENCY} requests"
echo -e "  Interval:    ${MONITOR_INTERVAL}s"
echo -e "  App URL:     ${APP_URL}"
echo ""

# Step 1: Pre-flight checks
print_header "Step 1: Pre-flight Checks"

# Check K8S cluster
if ! kubectl cluster-info &>/dev/null; then
    print_error "Kubernetes cluster not available"
    echo ""
    echo "Please start Kubernetes:"
    echo "  1. Open Docker Desktop"
    echo "  2. Go to Settings > Kubernetes"
    echo "  3. Check 'Enable Kubernetes'"
    echo "  4. Click 'Apply & Restart'"
    exit 1
fi
print_success "Kubernetes cluster is running"

# Check namespace and deployment
if ! kubectl get namespace $NAMESPACE &>/dev/null; then
    print_warning "Creating namespace $NAMESPACE..."
    kubectl apply -f k8s-manifests/namespace.yaml
fi

if ! kubectl get deployment test-app -n $NAMESPACE &>/dev/null; then
    print_warning "Deploying test application..."
    kubectl apply -f k8s-manifests/
    print_info "Waiting for pods to be ready..."
    kubectl wait --for=condition=ready pod -l app=test-app -n $NAMESPACE --timeout=120s
fi
print_success "Test application is deployed"

# Check HPA
if ! kubectl get hpa test-app-hpa -n $NAMESPACE &>/dev/null; then
    print_error "HPA not found. Please ensure HPA is configured."
    exit 1
fi
print_success "HPA is configured"

# Show initial state
echo ""
print_info "Initial HPA State:"
kubectl get hpa test-app-hpa -n $NAMESPACE

echo ""
print_info "Initial Pods:"
kubectl get pods -n $NAMESPACE -l app=test-app

# Get initial replica count
INITIAL_REPLICAS=$(kubectl get deployment test-app -n $NAMESPACE -o jsonpath='{.status.readyReplicas}')
log_result "Initial replicas: $INITIAL_REPLICAS"

# Check application health
if ! curl --noproxy '*' -s "$APP_URL/health" &>/dev/null; then
    print_error "Application health check failed at $APP_URL"
    exit 1
fi
print_success "Application is healthy"

# Step 2: Generate Load
print_header "Step 2: Generating CPU Load"

log_result "Starting HPA stress test"
log_result "Parameters: duration=$DURATION, concurrency=$CONCURRENCY"

echo -e "${YELLOW}Generating sustained CPU load...${NC}"
echo -e "This will trigger HPA to scale up pods"
echo ""

# Start load generation in background
(
    END_TIME=$(($(date +%s) + DURATION))
    while [ $(date +%s) -lt $END_TIME ]; do
        for i in $(seq 1 $CONCURRENCY); do
            curl --noproxy '*' -s "$APP_URL/cpu-load?duration=5" &>/dev/null &
        done
        sleep 1
    done
    wait
) &
LOAD_PID=$!

# Step 3: Monitor HPA
print_header "Step 3: Monitoring HPA Scaling"

echo -e "${YELLOW}Monitoring HPA behavior every ${MONITOR_INTERVAL}s...${NC}"
echo ""

SCALE_UP_TIME=""
SCALE_DOWN_TIME=""
MAX_REPLICAS=0
MONITORING_START=$(date +%s)

# Monitor during load
while kill -0 $LOAD_PID 2>/dev/null; do
    ELAPSED=$(($(date +%s) - MONITORING_START))
    echo -e "[${ELAPSED}s] ${CYAN}HPA Status:${NC}"
    collect_hpa_metrics

    CURRENT_REPLICAS=$(kubectl get hpa test-app-hpa -n $NAMESPACE -o jsonpath='{.status.currentReplicas}' 2>/dev/null || echo "0")

    if [ "$CURRENT_REPLICAS" -gt "$MAX_REPLICAS" ]; then
        MAX_REPLICAS=$CURRENT_REPLICAS
        if [ -z "$SCALE_UP_TIME" ] && [ "$CURRENT_REPLICAS" -gt "$INITIAL_REPLICAS" ]; then
            SCALE_UP_TIME=$ELAPSED
            log_result "Scale-up detected at ${ELAPSED}s: $INITIAL_REPLICAS -> $CURRENT_REPLICAS"
            print_success "Scale-up detected! Replicas: $INITIAL_REPLICAS -> $CURRENT_REPLICAS"
        fi
    fi

    sleep $MONITOR_INTERVAL
done

echo ""
print_success "Load generation completed"

# Step 4: Monitor Scale-down
print_header "Step 4: Monitoring Scale-down"

echo -e "${YELLOW}Waiting for HPA to scale down (this may take 5-10 minutes)...${NC}"
echo ""

SCALE_DOWN_WAIT=300  # 5 minutes
SCALE_DOWN_START=$(date +%s)

while [ $(($(date +%s) - SCALE_DOWN_START)) -lt $SCALE_DOWN_WAIT ]; do
    ELAPSED=$(($(date +%s) - MONITORING_START))
    echo -e "[${ELAPSED}s] ${CYAN}HPA Status:${NC}"
    collect_hpa_metrics

    CURRENT_REPLICAS=$(kubectl get hpa test-app-hpa -n $NAMESPACE -o jsonpath='{.status.currentReplicas}' 2>/dev/null || echo "0")

    if [ -z "$SCALE_DOWN_TIME" ] && [ "$CURRENT_REPLICAS" -lt "$MAX_REPLICAS" ]; then
        SCALE_DOWN_TIME=$ELAPSED
        log_result "Scale-down detected at ${ELAPSED}s: $MAX_REPLICAS -> $CURRENT_REPLICAS"
        print_success "Scale-down detected! Replicas: $MAX_REPLICAS -> $CURRENT_REPLICAS"
    fi

    if [ "$CURRENT_REPLICAS" -le "$INITIAL_REPLICAS" ]; then
        print_success "Scaled back to initial state"
        break
    fi

    sleep $MONITOR_INTERVAL
done

# Step 5: Generate Report
print_header "Step 5: Test Results"

FINAL_REPLICAS=$(kubectl get hpa test-app-hpa -n $NAMESPACE -o jsonpath='{.status.currentReplicas}' 2>/dev/null || echo "0")

echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}                    HPA STRESS TEST RESULTS                     ${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${YELLOW}Test Parameters:${NC}"
echo -e "    Load Duration:     ${DURATION}s"
echo -e "    Concurrency:       ${CONCURRENCY} requests"
echo ""
echo -e "  ${YELLOW}Scaling Results:${NC}"
echo -e "    Initial Replicas:  ${INITIAL_REPLICAS}"
echo -e "    Max Replicas:      ${MAX_REPLICAS}"
echo -e "    Final Replicas:    ${FINAL_REPLICAS}"
echo ""
echo -e "  ${YELLOW}Timing:${NC}"
if [ -n "$SCALE_UP_TIME" ]; then
    echo -e "    Scale-up Time:     ${SCALE_UP_TIME}s"
else
    echo -e "    Scale-up Time:     Not triggered"
fi
if [ -n "$SCALE_DOWN_TIME" ]; then
    echo -e "    Scale-down Time:   ${SCALE_DOWN_TIME}s"
else
    echo -e "    Scale-down Time:   Not completed"
fi
echo ""
echo -e "  ${YELLOW}Reports:${NC}"
echo -e "    Log File:          ${RESULTS_FILE}"
echo -e "    Metrics CSV:       ${METRICS_FILE}"
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"

# Final HPA state
echo ""
print_info "Final HPA State:"
kubectl get hpa test-app-hpa -n $NAMESPACE

echo ""
print_info "Final Pods:"
kubectl get pods -n $NAMESPACE -l app=test-app

# Log final results
log_result "Test completed"
log_result "Initial: $INITIAL_REPLICAS, Max: $MAX_REPLICAS, Final: $FINAL_REPLICAS"
log_result "Scale-up: ${SCALE_UP_TIME:-N/A}s, Scale-down: ${SCALE_DOWN_TIME:-N/A}s"

# Determine test result
if [ "$MAX_REPLICAS" -gt "$INITIAL_REPLICAS" ]; then
    echo ""
    print_success "HPA STRESS TEST PASSED - Auto-scaling verified!"
    log_result "RESULT: PASSED"
    exit 0
else
    echo ""
    print_warning "HPA did not scale up. This may be due to:"
    echo "  - Low load (increase --concurrency)"
    echo "  - Short duration (increase --duration)"
    echo "  - HPA stabilization window"
    log_result "RESULT: NO SCALE-UP DETECTED"
    exit 0
fi
