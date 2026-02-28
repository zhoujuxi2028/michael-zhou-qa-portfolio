# Kubernetes Deployment - CI/CD Demo

This directory contains Kubernetes manifests for deploying the CI/CD demo project to a Kubernetes cluster (k3d, minikube, EKS, GKE, AKS, etc.).

## Overview

The Kubernetes deployment provides:
- **Test Jobs**: Cypress E2E and Newman API tests run as Kubernetes Jobs
- **Persistent Storage**: Test results (screenshots, videos, reports) stored in PVCs
- **Results Server**: Nginx deployment serves HTML reports via HTTP
- **Ingress**: External access to test results
- **ConfigMaps**: Externalized configuration for tests

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Kubernetes Cluster                       │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Namespace: qa-portfolio                   │  │
│  │                                                        │  │
│  │  ┌──────────────┐        ┌──────────────┐            │  │
│  │  │ Cypress Job  │        │ Newman Job   │            │  │
│  │  │ (E2E Tests)  │        │ (API Tests)  │            │  │
│  │  └──────┬───────┘        └──────┬───────┘            │  │
│  │         │                       │                     │  │
│  │         └───────┬───────────────┘                     │  │
│  │                 │                                     │  │
│  │                 ▼                                     │  │
│  │    ┌────────────────────────┐                        │  │
│  │    │   test-results-pvc     │                        │  │
│  │    │  (Persistent Storage)  │                        │  │
│  │    └────────┬───────────────┘                        │  │
│  │             │                                         │  │
│  │             ▼                                         │  │
│  │    ┌──────────────────┐                              │  │
│  │    │  Nginx Server    │                              │  │
│  │    │ (Results Server) │                              │  │
│  │    └────────┬─────────┘                              │  │
│  │             │                                         │  │
│  │             ▼                                         │  │
│  │    ┌──────────────────┐                              │  │
│  │    │  Service + Ingress│                             │  │
│  │    └────────┬─────────┘                              │  │
│  │             │                                         │  │
│  └─────────────┼─────────────────────────────────────── │  │
│                │                                            │
└────────────────┼────────────────────────────────────────────┘
                 │
                 ▼
         External Access
    http://localhost:8080/test-results
```

## Files

| File | Description |
|------|-------------|
| `namespace.yaml` | Creates `qa-portfolio` namespace |
| `configmap.yaml` | Configuration for Cypress and Newman |
| `pvc.yaml` | PersistentVolumeClaims for test results and cache |
| `job-cypress.yaml` | Cypress E2E test job |
| `job-newman.yaml` | Newman API test job |
| `deployment.yaml` | Nginx server for serving test results |
| `service.yaml` | Kubernetes Services for networking |
| `ingress.yaml` | Ingress for external access |
| `deploy-to-k8s.sh` | Deployment automation script |
| `README.md` | This file |

## Quick Start

### Prerequisites

1. **Kubernetes cluster running** (k3d, minikube, or cloud provider)
2. **kubectl configured** to access the cluster
3. **Ingress controller installed** (nginx-ingress recommended)

```bash
# For k3d (local development)
k3d cluster create qa-portfolio --agents 2 --port "8080:80@loadbalancer"

# For minikube
minikube start
minikube addons enable ingress
```

### Deploy Everything

```bash
# Navigate to k8s directory
cd k8s

# Deploy all resources
./deploy-to-k8s.sh deploy

# Or manually
kubectl apply -f namespace.yaml
kubectl apply -f configmap.yaml
kubectl apply -f pvc.yaml
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
kubectl apply -f ingress.yaml
```

### Run Tests

```bash
# Run test jobs
./deploy-to-k8s.sh test

# Or manually
kubectl apply -f job-cypress.yaml
kubectl apply -f job-newman.yaml
```

### Access Test Results

```bash
# Port forward to results server
kubectl port-forward -n qa-portfolio svc/test-results-service 8080:80

# Open in browser
open http://localhost:8080

# Or for k3d (if created with port mapping)
open http://localhost:8080/test-results
```

### Monitor Test Execution

```bash
# Watch job status
kubectl get jobs -n qa-portfolio -w

# View Cypress logs
kubectl logs -n qa-portfolio -l component=cypress -f

# View Newman logs
kubectl logs -n qa-portfolio -l component=newman -f

# Check all resources
kubectl get all -n qa-portfolio
```

### Clean Up

```bash
# Delete all resources
./deploy-to-k8s.sh cleanup

# Or manually
kubectl delete namespace qa-portfolio
```

## Configuration

### Environment Variables (ConfigMap)

Edit `configmap.yaml` to change test configuration:

```yaml
data:
  CYPRESS_baseUrl: "https://jsonplaceholder.typicode.com"
  CYPRESS_VIDEO: "true"
  NEWMAN_ENVIRONMENT: "staging"
```

### Resource Limits

Adjust resource requests/limits in job files:

```yaml
resources:
  requests:
    memory: "1Gi"
    cpu: "500m"
  limits:
    memory: "2Gi"
    cpu: "1000m"
```

### Storage Size

Modify PVC storage size in `pvc.yaml`:

```yaml
resources:
  requests:
    storage: 5Gi  # Change as needed
```

## Troubleshooting

### PVCs Not Binding

```bash
# Check PVC status
kubectl get pvc -n qa-portfolio

# Check events
kubectl describe pvc test-results-pvc -n qa-portfolio

# For local clusters, ensure dynamic provisioning is enabled
kubectl get storageclass
```

### Jobs Failing

```bash
# Check job status
kubectl describe job cypress-test -n qa-portfolio

# View pod logs
kubectl logs -n qa-portfolio -l component=cypress

# Check pod events
kubectl get events -n qa-portfolio --sort-by='.lastTimestamp'
```

### Cannot Access Results Server

```bash
# Check deployment status
kubectl get deployment -n qa-portfolio

# Check service
kubectl get svc -n qa-portfolio

# Check ingress
kubectl get ingress -n qa-portfolio

# Port forward directly to pod
kubectl port-forward -n qa-portfolio deployment/test-results-server 8080:80
```

### Image Pull Errors

For Newman (custom image):

```bash
# Build image locally (for k3d/minikube)
cd ..
docker build -t qa-newman-demo:latest -f Dockerfile.newman .

# For k3d, import image
k3d image import qa-newman-demo:latest -c qa-portfolio

# For production, push to registry
docker tag qa-newman-demo:latest your-registry/qa-newman-demo:latest
docker push your-registry/qa-newman-demo:latest

# Update job-newman.yaml image reference
```

## Interview Talking Points

### 1. Jobs vs Deployments
> "We use Jobs for tests because they're one-time executions with a defined completion state. Deployments are for long-running services. Jobs retry on failure, track completion, and clean up automatically with TTL."

### 2. Persistent Volumes
> "PVCs provide persistent storage for test artifacts. Screenshots and videos survive pod restarts, enabling post-mortem debugging. This is critical in CI/CD where pods are ephemeral."

### 3. Resource Management
> "Cypress containers need more resources (1-2GB RAM) for browser execution, while Newman is lightweight (256MB). Right-sizing resources maximizes cluster utilization and reduces costs."

### 4. ConfigMaps
> "Externalizing configuration via ConfigMaps follows twelve-factor app principles. We can change test parameters without rebuilding images, supporting multiple environments."

### 5. Ingress
> "Ingress provides cost-effective HTTP routing. Instead of multiple LoadBalancers, one Ingress Controller routes traffic by hostname/path, reducing cloud provider costs."

### 6. Init Containers
> "Init containers prepare the environment before main containers start. We create directories, set permissions, and validate prerequisites, ensuring clean test execution."

### 7. Health Checks
> "Liveness and readiness probes ensure Kubernetes routes traffic only to healthy pods. This prevents serving stale or corrupted test results."

### 8. Namespace Isolation
> "Namespaces provide logical isolation and resource quotas. The qa-portfolio namespace keeps test infrastructure separate from production workloads."

## Production Considerations

For production deployments, consider:

1. **TLS/HTTPS**: Enable TLS in Ingress with cert-manager
2. **Resource Quotas**: Set namespace resource quotas
3. **Network Policies**: Restrict pod-to-pod communication
4. **RBAC**: Implement least-privilege access controls
5. **Monitoring**: Add Prometheus metrics and alerts
6. **Logging**: Ship logs to centralized logging (ELK, Loki)
7. **Secrets**: Use Kubernetes Secrets for credentials
8. **Image Registry**: Push images to private registry (ECR, GCR, ACR)
9. **Backup**: Backup PVCs with Velero or similar
10. **Autoscaling**: Consider HPA for results server if needed

## Next Steps

- **ArgoCD**: Implement GitOps deployment (Phase 1.5)
- **Monitoring**: Add Prometheus + Grafana (Phase 1.6)
- **CronJobs**: Schedule automated test runs
- **Slack Integration**: Send test results to Slack
- **Multi-cluster**: Deploy to dev/staging/prod clusters

## Related Documentation

- [Terraform IaC](../terraform/README.md) - Infrastructure as Code
- [GitOps/ArgoCD](../gitops/README.md) - GitOps deployment (Phase 1.5)
- [Monitoring](../monitoring/README.md) - Prometheus + Grafana (Phase 1.6)
- [CI/CD Guide](../docs/guides/CI-CD-GUIDE.md) - GitHub Actions integration
- [WBS](../docs/WBS-SIMPLE.md) - Project work breakdown

## License

Part of Michael Zhou's QA Portfolio - Demonstration purposes only
