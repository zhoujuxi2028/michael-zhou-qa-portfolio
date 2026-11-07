# K8S Auto Testing Platform - Chaos Engineering Guide

## Overview

This guide covers the chaos engineering capabilities of the K8S Auto Testing Platform. The chaos testing framework validates system resilience by deliberately introducing failures and verifying recovery.

## Philosophy

Chaos engineering follows these principles:

1. **Hypothesis-driven**: Define expected behavior before introducing chaos
2. **Controlled blast radius**: Start small and expand
3. **Automation**: Repeatable experiments
4. **Production-like environments**: Test in realistic conditions
5. **Minimize customer impact**: Run safely with rollback capability

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Chaos Test Framework                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────┐    ┌─────────────┐    ┌────────────┐        │
│  │ ChaosTester│───>│ K8S API     │───>│ Test Pods  │        │
│  │   (tool)   │    │             │    │            │        │
│  └────────────┘    └─────────────┘    └────────────┘        │
│        │                                     │              │
│        │                                     │              │
│        v                                     v              │
│  ┌────────────┐                       ┌────────────┐        │
│  │ Pytest     │                       │    HPA     │        │
│  │ Test Cases │                       │ Controller │        │
│  └────────────┘                       └────────────┘        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Chaos Scenarios

### TC-CHAOS-001: Pod Deletion Recovery

**Objective**: Verify HPA maintains minimum replicas after pod deletion.

**Steps**:
1. Get initial pod count (expect >= 2)
2. Delete a random pod
3. Wait for recovery
4. Verify pods recovered to minimum

**Expected Result**: System recovers to minimum replicas within 2 minutes.

### TC-CHAOS-002: Random Kill Under Load

**Objective**: Verify service availability during pod failure under load.

**Steps**:
1. Verify service is available
2. Generate CPU load
3. Delete a random pod during load
4. Verify service remains available
5. Wait for recovery

**Expected Result**: Service remains available; pods recover fully.

### TC-CHAOS-003: CPU Exhaustion Scaling

**Objective**: Test HPA response to CPU exhaustion.

**Steps**:
1. Record initial HPA state
2. Generate sustained CPU load (30s)
3. Monitor HPA scaling decision
4. Verify pods remain above minimum

**Expected Result**: HPA initiates scale-up; pods stay healthy.

### TC-CHAOS-004: Memory Exhaustion Handling

**Objective**: Verify graceful handling of memory pressure.

**Steps**:
1. Record initial pod count
2. Allocate memory (100MB)
3. Verify service availability
4. Release memory
5. Verify system stability

**Expected Result**: Service remains available; no OOM kills.

### TC-CHAOS-005: Container Restart Recovery

**Objective**: Verify pod readiness after forced restart.

**Steps**:
1. Select a pod for restart
2. Delete the pod (force restart)
3. Wait for new pod to be ready
4. Verify original pod is gone
5. Verify total pod count maintained

**Expected Result**: New pod becomes ready; deployment maintains replicas.

### TC-CHAOS-006: Multi-Pod Failure

**Objective**: Test recovery from simultaneous failure of 50% of pods.

**Steps**:
1. Ensure at least 4 pods running
2. Delete 50% of pods simultaneously
3. Wait for recovery to minimum replicas
4. Verify final pod count

**Expected Result**: System recovers to minimum replicas within 3 minutes.

### TC-CHAOS-007: Rolling Chaos

**Objective**: Verify stability during sequential pod failures.

**Steps**:
1. Ensure at least 3 pods running
2. Kill 2 pods sequentially (30s interval)
3. Wait for recovery after each kill
4. Verify system stability

**Expected Result**: System remains stable; recovers between kills.

### TC-CHAOS-008: HPA Under Churn

**Objective**: Test HPA behavior during continuous pod churn.

**Steps**:
1. Record initial HPA state
2. Perform 3 iterations of:
   - Delete random pod
   - Wait 15 seconds
   - Check pod count
3. Wait for final recovery
4. Verify HPA state

**Expected Result**: HPA maintains stable state; pods recover.

## Running Chaos Tests

### Prerequisites

```bash
# Ensure cluster is running
kubectl get nodes

# Verify test deployment
kubectl get deployment test-app -n k8s-testing

# Verify HPA is configured
kubectl get hpa test-app-hpa -n k8s-testing
```

### Run All Chaos Tests

```bash
# Run all chaos tests
pytest tests/test_chaos.py -v -m chaos

# Run with detailed logging
pytest tests/test_chaos.py -v -m chaos --log-cli-level=INFO
```

### Run Specific Tests

```bash
# Run single test
pytest tests/test_chaos.py::TestChaosEngineering::test_tc_chaos_001_pod_deletion_recovery -v

# Run quick smoke test
pytest tests/test_chaos.py -v -m smoke

# Skip slow tests
pytest tests/test_chaos.py -v -m "chaos and not slow"
```

### Generate Report

```bash
# Run with HTML report
./scripts/generate-report.sh -m chaos

# View report
open reports/executive-summary.html
```

## Using the ChaosTester CLI

### Basic Commands

```bash
# Check current status
python tools/chaos_tester.py --action status

# Delete random pod
python tools/chaos_tester.py --action delete-random

# Delete 50% of pods
python tools/chaos_tester.py --action delete-percentage --percent 50

# Generate CPU load
python tools/chaos_tester.py --action cpu-load --duration 30 \
    --service-url http://localhost:8080

# Allocate memory
python tools/chaos_tester.py --action memory-load --size-mb 100 \
    --service-url http://localhost:8080

# Rolling chaos (3 sequential kills)
python tools/chaos_tester.py --action rolling-chaos --count 3
```

### Using with Port Forwarding

```bash
# Port forward the service
kubectl port-forward svc/test-app-service 8080:8080 -n k8s-testing &

# Run chaos with service URL
python tools/chaos_tester.py --action cpu-load \
    --service-url http://localhost:8080 \
    --duration 60
```

## Python API

### Basic Usage

```python
from tools.chaos_tester import ChaosTester

# Initialize
tester = ChaosTester(
    namespace="k8s-testing",
    service_url="http://localhost:8080"
)

# Get current state
pods = tester.get_pods()
count = tester.get_pod_count()
hpa = tester.get_hpa_status()

# Delete operations
result = tester.delete_random_pod()
result = tester.delete_pod_by_name("test-app-xyz123")
results = tester.delete_percentage_pods(50)

# Resource exhaustion
result = tester.exhaust_cpu(duration=30)
result = tester.exhaust_memory(size_mb=100)
result = tester.release_memory()

# Recovery
recovered = tester.wait_for_recovery(
    expected_replicas=2,
    timeout=120
)

# Service health
available = tester.verify_service_available()
```

### Custom Chaos Scenario

```python
from tools.chaos_tester import ChaosTester
import time

def custom_chaos_scenario():
    tester = ChaosTester(
        namespace="k8s-testing",
        service_url="http://localhost:8080"
    )

    # Get baseline
    initial_pods = tester.get_pod_count()
    print(f"Starting with {initial_pods} pods")

    # Phase 1: CPU stress
    print("Phase 1: CPU stress")
    tester.exhaust_cpu(duration=30)

    # Phase 2: Kill pod during stress
    print("Phase 2: Pod kill")
    tester.delete_random_pod()

    # Phase 3: Memory pressure
    print("Phase 3: Memory pressure")
    tester.exhaust_memory(size_mb=200)

    # Wait for stabilization
    time.sleep(30)

    # Verify recovery
    recovered = tester.wait_for_recovery(initial_pods, timeout=180)

    # Cleanup
    tester.release_memory()

    return recovered

if __name__ == "__main__":
    success = custom_chaos_scenario()
    print(f"Scenario result: {'PASSED' if success else 'FAILED'}")
```

## Integration with CI/CD

### GitHub Actions Workflow

```yaml
chaos-tests:
  name: Chaos Engineering Tests
  runs-on: ubuntu-latest
  needs: [deploy]

  steps:
    - name: Setup Kind cluster
      uses: helm/kind-action@v1
      with:
        cluster_name: chaos-testing

    - name: Deploy test application
      run: kubectl apply -f k8s-manifests/

    - name: Wait for deployment
      run: |
        kubectl wait --for=condition=available \
          deployment/test-app -n k8s-testing --timeout=120s

    - name: Run chaos tests
      run: |
        pytest tests/test_chaos.py -v -m chaos \
          --junitxml=reports/chaos-results.xml

    - name: Upload chaos test results
      uses: actions/upload-artifact@v4
      if: always()
      with:
        name: chaos-test-results
        path: reports/
```

## Best Practices

### Safety Guidelines

1. **Start small**: Begin with single pod failures before multi-pod scenarios
2. **Monitor continuously**: Use Grafana during chaos tests
3. **Set timeouts**: Always configure recovery timeouts
4. **Graceful degradation**: Verify service remains available during chaos
5. **Cleanup**: Ensure tests clean up resources

### Test Design

1. **Isolation**: Each test should be independent
2. **Idempotency**: Tests should be repeatable
3. **Observability**: Log all chaos operations
4. **Assertions**: Verify both chaos injection and recovery

### Production Considerations

1. **Blast radius**: Limit chaos to non-critical paths initially
2. **Time windows**: Run chaos during low-traffic periods
3. **Rollback plan**: Have quick recovery procedures ready
4. **Communication**: Notify stakeholders before chaos runs

## Metrics and Alerts

### Key Metrics During Chaos

| Metric | Alert Threshold | Description |
|--------|-----------------|-------------|
| Pod count | < min replicas | HPA minimum violation |
| Error rate | > 5% | Service degradation |
| Latency p99 | > 5s | Performance impact |
| Recovery time | > 2m | Slow recovery |

### Grafana Dashboard Panels

The HPA dashboard includes chaos-relevant panels:
- Pod count over time
- Scaling events
- Error rate by status code
- Recovery time tracking

## Troubleshooting

### Test Failures

**Pods not recovering**:
```bash
# Check deployment events
kubectl describe deployment test-app -n k8s-testing

# Check HPA events
kubectl describe hpa test-app-hpa -n k8s-testing

# Check pod status
kubectl get pods -n k8s-testing -o wide
```

**Service unavailable**:
```bash
# Check endpoints
kubectl get endpoints test-app-service -n k8s-testing

# Check service
kubectl describe svc test-app-service -n k8s-testing
```

### Recovery Issues

**HPA not scaling**:
```bash
# Check metrics server
kubectl top pods -n k8s-testing

# Check HPA conditions
kubectl get hpa test-app-hpa -n k8s-testing -o yaml
```

## Future Enhancements

- [ ] Network chaos (using NetworkPolicy)
- [ ] Node failure simulation
- [ ] Disk pressure testing
- [ ] DNS chaos
- [ ] Integration with chaos-mesh for advanced scenarios
