# K8S Auto Testing Platform - Monitoring Guide

## Overview

This guide covers the Prometheus and Grafana monitoring setup for the K8S Auto Testing Platform. The monitoring stack provides real-time visibility into HPA scaling behavior, resource utilization, and application performance.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    K8S Testing Namespace                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐       ┌────────────┐       ┌──────────┐       │
│  │ Test App │──────>│ Prometheus │──────>│ Grafana  │       │
│  │ (Pods)   │metrics│            │query  │          │       │
│  └──────────┘       └────────────┘       └──────────┘       │
│       │                   │                    │            │
│       │                   │                    │            │
│       v                   v                    v            │
│  ┌──────────┐       ┌────────────┐       ┌──────────┐       │
│  │  /metrics│       │   Alerts   │       │Dashboard │       │
│  │ endpoint │       │   Rules    │       │   UI     │       │
│  └──────────┘       └────────────┘       └──────────┘       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### Deploy Monitoring Stack

```bash
# Deploy Prometheus and Grafana
kubectl apply -f k8s-manifests/prometheus.yaml
kubectl apply -f k8s-manifests/grafana.yaml

# Verify deployments
kubectl get pods -n k8s-testing | grep -E "prometheus|grafana"
```

### Access Dashboards

```bash
# Port-forward Prometheus
kubectl port-forward svc/prometheus 9090:9090 -n k8s-testing &

# Port-forward Grafana
kubectl port-forward svc/grafana 3000:3000 -n k8s-testing &

# Access dashboards
open http://localhost:9090  # Prometheus
open http://localhost:3000  # Grafana (admin/admin)
```

## Application Metrics

The test application exposes the following Prometheus metrics at `/metrics`:

### Request Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `http_requests_total` | Counter | Total HTTP requests by method, endpoint, status |
| `http_request_duration_seconds` | Histogram | Request latency distribution |
| `http_active_requests` | Gauge | Number of in-flight requests |

### Resource Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `app_cpu_usage_percent` | Gauge | Application CPU usage |
| `app_memory_usage_percent` | Gauge | Application memory usage |
| `app_memory_allocated_mb` | Gauge | Memory allocated for load tests |

### Scaling Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `app_scaling_events_total` | Counter | Scaling events by type |
| `app_pod_info` | Gauge | Pod information (hostname, namespace, IP) |

### Event Types

The `app_scaling_events_total` metric tracks these event types:
- `cpu_load_started` - CPU load test initiated
- `cpu_load_completed` - CPU load test completed
- `memory_load_started` - Memory load test initiated
- `memory_allocated` - Memory successfully allocated
- `memory_released` - Memory released

## Grafana Dashboard

### Dashboard Panels

1. **Overview Section**
   - CPU Usage Gauge (0-100%, thresholds at 50% and 80%)
   - Memory Usage Gauge (0-100%, thresholds at 60% and 85%)
   - Active Pod Count
   - Request Rate (req/s)

2. **HPA Scaling Section**
   - Pod Count Over Time (line chart with min/max thresholds)
   - Scaling Events (bar chart by event type)

3. **Resource Utilization Section**
   - CPU Usage by Pod (per-pod breakdown)
   - Memory Usage by Pod (per-pod breakdown)

4. **Request Metrics Section**
   - Request Latency Percentiles (p50, p95, p99)
   - Request Rate by Status Code

### Importing the Dashboard

1. Open Grafana at http://localhost:3000
2. Go to Dashboards > Import
3. Upload `monitoring/grafana-dashboard.json`
4. Select Prometheus as the data source
5. Click Import

## Alert Rules

### Health Alerts

| Alert | Condition | Severity |
|-------|-----------|----------|
| TestAppDown | App not responding | Critical |
| TestAppHighErrorRate | >5% error rate | Warning |

### HPA Alerts

| Alert | Condition | Severity |
|-------|-----------|----------|
| HighCPUUtilization | CPU > 80% for 2m | Warning |
| CriticalCPUUtilization | CPU > 95% for 1m | Critical |
| HighMemoryUtilization | Memory > 85% for 2m | Warning |
| CriticalMemoryUtilization | Memory > 95% for 1m | Critical |
| HPAScalingTooFrequent | >10 events in 10m | Info |
| HPAMaxReplicasReached | Pods >= 10 | Warning |

### Performance Alerts

| Alert | Condition | Severity |
|-------|-----------|----------|
| HighRequestLatency | p95 > 1s | Warning |
| CriticalRequestLatency | p99 > 5s | Critical |

## Metrics Collection Tool

### CLI Usage

```bash
# Collect single snapshot
python tools/metrics_collector.py --action snapshot

# Watch metrics for 60 seconds
python tools/metrics_collector.py --action watch --duration 60 --interval 5

# Generate HPA scaling report
python tools/metrics_collector.py --action report

# Export to JSON
python tools/metrics_collector.py --action watch --duration 120 -o metrics.json
```

### Python API Usage

```python
from tools.metrics_collector import MetricsCollector

# Initialize collector
collector = MetricsCollector(
    prometheus_url="http://localhost:9090",
    namespace="k8s-testing"
)

# Collect snapshot
snapshot = collector.collect_snapshot()
print(f"CPU: {snapshot.cpu_usage}%")
print(f"Pods: {snapshot.pod_count}")

# Wait for scaling
collector.wait_for_pod_count(4, comparison=">=", timeout=120)

# Generate report
from datetime import datetime, timedelta
end = datetime.now()
start = end - timedelta(minutes=15)
report = collector.get_hpa_scaling_report(start, end)
```

## PromQL Examples

### Basic Queries

```promql
# Average CPU usage across all pods
avg(app_cpu_usage_percent)

# Pod count
count(app_pod_info)

# Request rate per second
sum(rate(http_requests_total[1m]))

# 95th percentile latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

### Scaling Analysis

```promql
# Scaling events in last hour
increase(app_scaling_events_total[1h])

# CPU usage by pod
app_cpu_usage_percent{pod=~"test-app.*"}

# Memory trend
avg_over_time(app_memory_usage_percent[5m])
```

### Alert Conditions

```promql
# High CPU (used for alerting)
avg(app_cpu_usage_percent) > 80

# Multiple pod failures
count(app_pod_info) < 2

# Error rate > 5%
sum(rate(http_requests_total{status=~"5.."}[5m])) /
sum(rate(http_requests_total[5m])) > 0.05
```

## Integration with Tests

### Using Metrics in Tests

```python
import pytest
from tools.metrics_collector import MetricsCollector

@pytest.fixture
def metrics():
    return MetricsCollector(prometheus_url="http://prometheus:9090")

def test_hpa_scaling_with_metrics(metrics):
    # Get initial state
    initial = metrics.collect_snapshot()
    assert initial.pod_count >= 2

    # Trigger scaling (e.g., generate CPU load)
    # ...

    # Wait for scale up
    assert metrics.wait_for_pod_count(4, comparison=">=", timeout=180)

    # Verify scaling
    final = metrics.collect_snapshot()
    assert final.pod_count > initial.pod_count
```

## Troubleshooting

### Prometheus Not Scraping

```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets | jq

# Verify test app metrics endpoint
kubectl exec -it deploy/test-app -n k8s-testing -- curl localhost:8080/metrics
```

### Grafana Dashboard Empty

1. Check Prometheus data source configuration
2. Verify time range includes data
3. Check that metrics are being collected:
   ```bash
   curl 'http://localhost:9090/api/v1/query?query=up'
   ```

### Alerts Not Firing

```bash
# Check alert rules
curl http://localhost:9090/api/v1/rules | jq

# Check alert state
curl http://localhost:9090/api/v1/alerts | jq
```

## Best Practices

1. **Set Appropriate Thresholds**: Adjust alert thresholds based on your application's baseline
2. **Use Labels**: Add labels to metrics for better filtering and grouping
3. **Retention**: Configure appropriate retention for Prometheus data
4. **Dashboard Annotations**: Use Grafana annotations to mark scaling events
5. **Regular Reviews**: Periodically review and tune alert rules

## Cleanup

```bash
# Remove monitoring stack
kubectl delete -f k8s-manifests/grafana.yaml
kubectl delete -f k8s-manifests/prometheus.yaml

# Remove ServiceMonitor (if using Prometheus Operator)
kubectl delete -f k8s-manifests/servicemonitor.yaml
```
