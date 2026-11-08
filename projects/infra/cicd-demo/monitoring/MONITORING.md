# 📊 Monitoring with Prometheus + Grafana

**Part of**: DevOps Platform - Phase 1.6
**Technology**: Prometheus, Grafana, kube-prometheus-stack
**Target Cluster**: k3d (qa-portfolio)
**Documentation Version**: 1.0
**Last Updated**: March 1, 2026

---

## 📖 Overview

This monitoring stack provides **observability** for your Kubernetes cluster and test execution environment using:

- **Prometheus**: Time-series database for metrics collection
- **Grafana**: Visualization and dashboarding platform
- **kube-prometheus-stack**: All-in-one Helm chart combining both with pre-configured ServiceMonitors

### Why Monitoring Matters

| Benefit | Description |
|---------|-------------|
| **Real-time Visibility** | See cluster health, resource usage, and application performance instantly |
| **Proactive Alerting** | Detect issues before they affect end users (future AlertManager integration) |
| **Troubleshooting** | Use metrics to diagnose performance problems quickly |
| **Capacity Planning** | Track resource trends to plan infrastructure scaling |
| **SLO/SLA Tracking** | Monitor uptime, latency, and error rates against service level targets |

---

## 📁 Project Structure

```
monitoring/
├── prometheus-values.yaml          # Helm values for kube-prometheus-stack
│                                    # - Prometheus retention (7 days)
│                                    # - Resource limits (512Mi/1Gi)
│                                    # - Persistent storage (10Gi)
│                                    # - Grafana embedded config
│
├── deploy-monitoring.sh            # Deployment automation script
│                                    # - Pre-flight checks
│                                    # - Helm repo management
│                                    # - Namespace creation
│                                    # - Pod readiness verification
│
├── dashboards/
│   ├── cluster-overview.json       # Kubernetes cluster health dashboard
│   │                                # - Node count, pod count, namespaces
│   │                                # - CPU/memory utilization
│   │                                # - Pod status distribution
│   │
│   └── test-metrics.json           # Test execution metrics dashboard
│                                    # - Job counts (total, successful, failed)
│                                    # - Completion rates
│                                    # - Job details by namespace
│
└── MONITORING.md                   # This documentation
```

---

## 🚀 Quick Start

### Prerequisites

```bash
# Required tools
kubectl version --client          # v1.24+
helm version                       # v3.10+

# Connected Kubernetes cluster
kubectl cluster-info

# Sufficient resources (demo optimized)
kubectl top nodes                  # Should work without errors
```

### Installation (5 minutes)

```bash
# 1. Navigate to monitoring directory
cd cicd-demo/monitoring

# 2. Run deployment script
./deploy-monitoring.sh

# 3. Wait for pods to be ready (2-3 minutes)
kubectl get pods -n monitoring -w
```

**Expected output:**
- 9-10 pods running in `monitoring` namespace
- Prometheus StatefulSet ready
- Grafana Deployment ready

### Access Services

**Prometheus** (Metrics database):
```bash
kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-prometheus 9090:9090
# Open: http://localhost:9090
```

**Grafana** (Visualization):
```bash
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80
# Open: http://localhost:3000
# Login: admin / grafana-admin
```

**AlertManager** (Alert routing - optional):
```bash
kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-alertmanager 9093:9093
# Open: http://localhost:9093
```

---

## ⚙️ Configuration Reference

### prometheus-values.yaml

#### Prometheus Settings

```yaml
prometheus:
  prometheusSpec:
    retention: 7d                          # Keep data for 7 days
    retentionSize: "5GB"                   # Max 5GB storage

    resources:
      requests:
        memory: "512Mi"                    # Minimum RAM
        cpu: "250m"                        # Minimum CPU
      limits:
        memory: "1Gi"                      # Maximum RAM
        cpu: "500m"                        # Maximum CPU
```

**Why these values?**
- 7-day retention: Enough for trend analysis in demo environment
- 512Mi base: Efficient for k3d cluster (1 server + 2 agents)
- 1Gi limit: Prevents OOM while allowing bursts

#### Grafana Embedded Configuration

```yaml
grafana:
  enabled: true
  adminUser: admin
  adminPassword: "grafana-admin"

  datasources:
    datasources.yaml:
      datasources:
        - name: Prometheus
          url: http://prometheus-kube-prometheus-prometheus:9090
          isDefault: true
```

**What this does:**
- Embeds Grafana directly (no separate Helm chart)
- Auto-configures Prometheus as data source
- Pre-configures dashboard folders

#### Component Control

```yaml
nodeExporter: { enabled: true }        # Per-node metrics (CPU, memory, disk)
kubeStateMetrics: { enabled: true }    # Cluster-wide object metrics
alertmanager: { enabled: true }        # Alert routing (future use)
```

### Customization

**To modify configuration:**

```bash
# 1. Edit prometheus-values.yaml
vim monitoring/prometheus-values.yaml

# 2. Upgrade Helm release
helm upgrade prometheus prometheus-community/kube-prometheus-stack \
    -n monitoring \
    -f monitoring/prometheus-values.yaml

# 3. Verify changes
kubectl get pods -n monitoring -w
```

---

## 📊 Dashboards

### Dashboard 1: Cluster Overview

**Purpose**: Real-time Kubernetes cluster health and resource utilization

**Panels:**
1. **Total Nodes** - Cluster node count
2. **Total Pods** - Running pods across namespaces
3. **Total Namespaces** - Kubernetes namespaces
4. **Cluster CPU Usage** - Overall CPU utilization percentage
5. **CPU by Node** - Per-node CPU usage over time
6. **Memory Usage by Node** - Per-node memory utilization
7. **Pod Status Distribution** - Running vs pending vs failed pods

**Key Metrics:**
```promql
count(kube_node_info)                    # Total nodes
count(kube_pod_info)                     # Total pods
100 - (avg(rate(...)))                   # CPU %
(MemTotal - MemAvailable) / MemTotal     # Memory %
count(kube_pod_status_phase) by (phase)  # Pod status breakdown
```

**Use Cases:**
- Quick cluster health check
- Identify resource bottlenecks
- Spot overloaded nodes
- Validate auto-scaling (future)

### Dashboard 2: Test Metrics

**Purpose**: Kubernetes Job execution metrics for test automation

**Panels:**
1. **Total Jobs** - All jobs created
2. **Successful Jobs** - Completed successfully
3. **Failed Jobs** - Failed jobs (red alert threshold)
4. **Active Jobs** - Currently running jobs
5. **Job Completion Rate** - Success/failure rate over time
6. **Jobs by Namespace** - Job distribution across namespaces
7. **Recent Jobs** - Table of job details

**Key Metrics:**
```promql
count(kube_job_created)                  # Total job count
sum(kube_job_status_succeeded)           # Successful count
sum(kube_job_status_failed)              # Failed count
rate(kube_job_status_succeeded[5m])      # Completion rate
```

**Use Cases:**
- Monitor CI/CD test execution
- Track job success rates
- Identify failing jobs quickly
- Correlate job metrics with cluster events

### Custom Dashboards

**To create new dashboards:**

1. **Via Grafana UI** (Recommended):
   ```bash
   # Port forward
   kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80

   # Open http://localhost:3000
   # Click: + → Dashboard → Add Panel
   # Select: Prometheus data source
   # Write PromQL query
   # Save dashboard
   ```

2. **Export to Git** (For version control):
   ```bash
   # In Grafana UI:
   # Dashboard settings (gear icon) → JSON Model
   # Copy JSON
   # Paste into dashboards/*.json

   # Recreate ConfigMap:
   kubectl create configmap grafana-dashboards \
       --from-file=monitoring/dashboards \
       -n monitoring \
       --dry-run=client -o yaml | kubectl apply -f -
   ```

---

## 📈 Common Operations

### View Prometheus UI

```bash
# Port forward
kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-prometheus 9090:9090

# Open http://localhost:9090

# In Prometheus UI:
# - Type query in search box
# - Click "Execute" to run
# - View results as table or graph
```

### Useful PromQL Queries

**Cluster Health:**
```promql
# How many nodes are ready?
count(kube_node_status_condition{condition="Ready", status="true"})

# What's the current pod count?
count(kube_pod_info)

# CPU usage percentage
100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
```

**Test Metrics:**
```promql
# Job success rate
rate(kube_job_status_succeeded[5m])

# How long do jobs take? (requires job labels)
kube_job_status_completion_time - kube_job_created

# Failed job count
sum(kube_job_status_failed)
```

**Application Health:**
```promql
# Pod crashes
rate(kube_pod_container_status_restarts_total[5m])

# Memory pressure
node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes
```

### Export Metrics

```bash
# Query Prometheus API directly
curl 'http://localhost:9090/api/v1/query?query=up'

# Get time-series data
curl 'http://localhost:9090/api/v1/query_range?query=node_cpu_seconds_total&start=1609459200&end=1609545600&step=14400'
```

### Update Prometheus Retention

```bash
# Edit values
nano monitoring/prometheus-values.yaml
# Change: retention: 7d  →  retention: 30d

# Apply update
helm upgrade prometheus prometheus-community/kube-prometheus-stack \
    -n monitoring \
    -f monitoring/prometheus-values.yaml
```

---

## 🎤 Interview Talking Points

### Q: Why Prometheus over alternatives like ELK or Datadog?

> "Prometheus is the Kubernetes standard for metrics collection. It's pull-based (Prometheus queries targets) instead of push-based (like some competitors), which is more reliable and secure - no cluster credentials in external services. It's open-source, lightweight, and integrates perfectly with Kubernetes via ServiceMonitors. For a DevOps portfolio, Prometheus demonstrates understanding of modern cloud-native observability practices."

### Q: What's the difference between metrics and logs?

> "Metrics are numeric measurements over time (CPU usage: 45%, memory: 512Mi) - great for trends and alerts. Logs are human-readable event records - useful for debugging specific issues. Metrics are more efficient (time-series storage) but less detailed. We use metrics for infrastructure health and logs for application debugging. Together they provide complete observability."

### Q: How does Prometheus scrape metrics?

> "Prometheus is pull-based: it reads a configuration, then actively scrapes /metrics endpoints on a schedule (default 30 seconds). It stores data locally as time-series. This is different from push-based monitoring where applications send data. Pull-based is simpler and more secure - applications don't need credentials, Prometheus just reads public metrics."

### Q: What's ServiceMonitor and why use it?

> "ServiceMonitor is a Kubernetes CRD (Custom Resource Definition) that tells Prometheus Operator what to monitor. Instead of editing Prometheus config files, you declare a ServiceMonitor in YAML like any K8s resource. This 'GitOps' approach to monitoring is cleaner and scales better. Example: apply a ServiceMonitor for a new microservice, Prometheus auto-discovers and scrapes it."

### Q: How would you set alerts if CPU is >80%?

> "In AlertManager (included in kube-prometheus-stack), you write rules like: 'if CPU > 80% for 5 minutes, send alert'. We'd define PrometheusRule CRDs:
> ```yaml
> - alert: HighCPU
>   expr: 'cpu_usage > 0.8'
>   for: 5m
>   annotations:
>     summary: 'Node {{ instance }} CPU is high'
> ```
> Then configure receivers (Slack, PagerDuty, email) to handle alerts. This enables production-grade incident response."

### Q: Prometheus at scale - how do you handle 10,000+ containers?

> "At scale, single Prometheus instance becomes a bottleneck. You'd use Thanos (sits on top of Prometheus) for:
> - **Querying**: Single global view across multiple Prometheus instances
> - **Storage**: Ship metrics to object storage (S3) for long-term retention
> - **Sidecar**: Compact and upload local Prometheus data
> - **Query frontend**: Cache results to reduce load
> This is federation + long-term storage pattern used at Netflix, Kubernetes.io, etc."

### Q: How to correlate metrics across your 5-phase CI/CD pipeline?

> "Each phase (Docker, K8s, Security, GitOps, Monitoring) would have its own metrics:
> - Phase 1: Docker image build time (CI metrics)
> - Phase 2: K8s pod startup time (deployment metrics)
> - Phase 3: Security scan duration (security metrics)
> - Phase 4: Git sync lag (GitOps metrics)
> - Phase 5: This dashboard (infrastructure metrics)
>
> Use shared labels (environment=dev, service=qa-portfolio) to correlate across phases. Prometheus label matching lets you find 'all metrics for service=qa-portfolio' to see end-to-end performance."

---

## 🔧 Troubleshooting

### Issue: Prometheus pod stuck in Pending

```bash
# Check events
kubectl describe pod -n monitoring prometheus-kube-prometheus-prometheus-0

# Common causes:
# 1. PVC not binding - check storage class
kubectl get pvc -n monitoring
kubectl get storageclass

# 2. Not enough disk space
df -h /var/lib/docker

# Solution: Delete and restart
kubectl delete pvc -n monitoring prometheus-kube-prometheus-prometheus-db-prometheus-kube-prometheus-prometheus-0
kubectl rollout restart statefulset/prometheus-kube-prometheus-prometheus -n monitoring
```

### Issue: Grafana shows "No data" in dashboards

```bash
# Check Prometheus connectivity
# In Grafana UI: Configuration → Data sources → Prometheus → Test

# From command line:
# 1. Port forward Prometheus
kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-prometheus 9090:9090

# 2. Test query
curl 'http://localhost:9090/api/v1/query?query=up'

# 3. If no results, Prometheus hasn't scraped yet (give it 2-3 minutes)
# Check targets:
# http://localhost:9090/targets
```

### Issue: High memory usage in Prometheus

```bash
# Check current size
kubectl exec -it -n monitoring prometheus-kube-prometheus-prometheus-0 -- du -sh /prometheus/

# Reduce retention in values
nano monitoring/prometheus-values.yaml
# Change: retention: 7d  →  retention: 3d

# Apply:
helm upgrade prometheus prometheus-community/kube-prometheus-stack \
    -n monitoring \
    -f monitoring/prometheus-values.yaml

# Or manually delete old data:
kubectl exec -it -n monitoring prometheus-kube-prometheus-prometheus-0 -- \
    prometheus --config.file=/etc/prometheus/prometheus.yml \
    --storage.tsdb.path=/prometheus \
    --storage.tsdb.retention.time=3d

# Restart to apply
kubectl delete pod -n monitoring prometheus-kube-prometheus-prometheus-0
```

### Issue: Dashboards don't auto-import

```bash
# Verify ConfigMap exists
kubectl get configmap -n monitoring grafana-dashboards

# If missing, create it
kubectl create configmap grafana-dashboards \
    --from-file=monitoring/dashboards \
    -n monitoring \
    --dry-run=client -o yaml | kubectl apply -f -

# Restart Grafana
kubectl rollout restart deployment/prometheus-grafana -n monitoring

# Wait 30 seconds and reload Grafana UI
```

---

## 📚 Next Steps

### Phase 1.6 Complete Features
- ✅ Prometheus collecting metrics from all cluster components
- ✅ Grafana dashboards for cluster and test metrics
- ✅ Persistent storage for 7-day metric retention
- ✅ RBAC configured with node-exporter and kube-state-metrics

### Future Enhancements (Not in Phase 1.6)

1. **AlertManager Integration**
   - Add PrometheusRule CRDs for threshold-based alerts
   - Configure receivers (Slack, email, PagerDuty)
   - Set up escalation policies for incidents

2. **Custom Metrics via Pushgateway**
   - For test framework to push custom metrics (test cases, duration)
   - Endpoint: prometheus-pushgateway:9091
   - Use: `curl -X POST http://pushgateway:9091/metrics/job/test-framework`

3. **Thanos for Long-term Storage**
   - Multi-cluster view across dev, staging, production
   - S3-compatible storage for 1-year retention
   - Efficient querying across massive datasets

4. **GitOps for Monitoring**
   - Define dashboards and rules in Git
   - ArgoCD syncs monitoring configs
   - Version-controlled alerts and dashboards

5. **Prometheus Federation**
   - Multiple Prometheus instances (one per environment)
   - Central Prometheus scrapes federated endpoints
   - Distributed monitoring for multi-cluster setups

---

## 🔗 References

### Official Documentation
- [Prometheus Docs](https://prometheus.io/docs/)
- [Grafana Docs](https://grafana.com/docs/grafana/latest/)
- [kube-prometheus-stack](https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack)

### Kubernetes Metrics
- [Kube State Metrics](https://github.com/kubernetes/kube-state-metrics)
- [Node Exporter](https://github.com/prometheus/node_exporter)
- [Kubernetes Metrics](https://kubernetes.io/docs/tasks/debug-application-cluster/resource-metrics-pipeline/)

### Interview Prep
- [Prometheus Best Practices](https://prometheus.io/docs/practices/rules/)
- [Observability Engineering (Book)](https://www.oreilly.com/library/view/observability-engineering/9781492076438/)
- [Kubernetes Observability](https://www.oreilly.com/library/view/kubernetes-observability/9781492050052/)

---

## 📝 Summary

**Phase 1.6 delivers a production-grade monitoring foundation:**

✅ Prometheus collecting metrics from Kubernetes
✅ Grafana with 2 custom dashboards
✅ Persistent storage for trend analysis
✅ Complete documentation and troubleshooting guide

**This provides the observability layer needed for:**
- Real-time cluster health visibility
- Test execution tracking
- Performance troubleshooting
- Capacity planning insights

**Ready to proceed to Phase 1.7** (Documentation) and **Phase 1.8** (Testing & Validation) for final platform completion.

---

**Last Updated**: March 1, 2026
**Version**: 1.0
**Status**: Production Ready
