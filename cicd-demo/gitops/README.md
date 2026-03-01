# GitOps with ArgoCD - CI/CD Demo

This directory contains GitOps configuration using ArgoCD for continuous deployment of the QA Portfolio CI/CD Demo.

## Overview

**GitOps** is a paradigm where Git serves as the single source of truth for declarative infrastructure and applications. ArgoCD continuously monitors Git repositories and automatically syncs changes to Kubernetes clusters.

### Benefits of GitOps

| Benefit | Description |
|---------|-------------|
| **Declarative** | Entire system state described in Git |
| **Versioned & Immutable** | Complete audit trail via Git history |
| **Automated** | Changes automatically applied to clusters |
| **Auditable** | Every change has a Git commit with author, timestamp, and description |
| **Rollback** | Easy rollback using Git revert or ArgoCD history |
| **Security** | Pull-based deployment (cluster pulls from Git, not push from CI) |

---

## Project Structure

```
gitops/
├── README.md                           # This file
└── argocd/
    ├── install-argocd.sh               # ArgoCD installation script
    ├── project.yaml                    # AppProject CRD
    ├── applications/
    │   ├── qa-portfolio-dev.yaml       # Dev environment Application
    │   └── qa-portfolio-staging.yaml   # Staging environment Application
    └── .argocd-admin-password          # Admin password (gitignored)
```

---

## Quick Start

### Prerequisites

- Kubernetes cluster running (k3d, minikube, EKS, GKE, AKS)
- `kubectl` configured to access the cluster
- `helm` installed (optional, for advanced features)

### Installation

```bash
# Navigate to the gitops directory
cd cicd-demo/gitops/argocd

# Run the installation script
./install-argocd.sh

# The script will:
# 1. Create argocd namespace
# 2. Install ArgoCD
# 3. Wait for pods to be ready
# 4. Retrieve and display admin password
```

### Accessing ArgoCD UI

```bash
# Port forward ArgoCD server
kubectl port-forward svc/argocd-server -n argocd 9090:443

# Open browser to https://localhost:9090
# Login with:
#   Username: admin
#   Password: (from .argocd-admin-password or script output)
```

---

## ArgoCD Components

### 1. AppProject (`project.yaml`)

Defines the `qa-portfolio` project with:
- **Source repos**: Allowed Git repositories
- **Destinations**: Target clusters and namespaces
- **Roles**: RBAC for developers and admins
- **Sync windows**: When deployments are allowed
- **Resource whitelists**: What can be deployed

```bash
# Apply the AppProject
kubectl apply -f gitops/argocd/project.yaml

# Verify
kubectl get appprojects -n argocd
```

### 2. Applications

#### Dev Environment (`applications/qa-portfolio-dev.yaml`)

- **Source**: `feature/devops-platform` branch
- **Auto-sync**: Enabled with self-heal
- **Prune**: Automatically delete removed resources
- **Target**: `qa-portfolio` namespace

```bash
# Apply dev Application
kubectl apply -f gitops/argocd/applications/qa-portfolio-dev.yaml

# Check status
kubectl get applications -n argocd qa-portfolio-dev
```

#### Staging Environment (`applications/qa-portfolio-staging.yaml`)

- **Source**: `main` branch (more stable)
- **Auto-sync**: Disabled (manual approval required)
- **Prune**: Enabled
- **Target**: `qa-portfolio` namespace

```bash
# Apply staging Application
kubectl apply -f gitops/argocd/applications/qa-portfolio-staging.yaml

# Manual sync required for staging
```

---

## GitOps Workflow

### Development Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│  Developer Workflow (Dev Environment)                            │
└─────────────────────────────────────────────────────────────────┘

1. Developer updates Kubernetes manifests in cicd-demo/k8s/
2. Developer commits and pushes to feature/devops-platform branch
3. ArgoCD detects changes (polling every 3 minutes by default)
4. ArgoCD automatically syncs changes to cluster
5. selfHeal ensures cluster matches Git (prevents drift)
6. Developer verifies deployment in ArgoCD UI
```

### Staging Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│  QA Workflow (Staging Environment)                               │
└─────────────────────────────────────────────────────────────────┘

1. Feature branch merged to main
2. ArgoCD detects changes
3. **Manual sync required** (click "Sync" in UI)
4. QA approves and triggers sync
5. ArgoCD applies changes to staging
6. QA verifies deployment
```

---

## Common Operations

### 1. View Applications

```bash
# List all applications
kubectl get applications -n argocd

# Get detailed info
kubectl describe application qa-portfolio-dev -n argocd

# Check health and sync status
kubectl get applications -n argocd -o wide
```

### 2. Manual Sync

```bash
# Sync via kubectl
kubectl patch application qa-portfolio-staging -n argocd \
  --type merge -p '{"operation":{"initiatedBy":{"username":"admin"},"sync":{}}}'

# Or use ArgoCD CLI
argocd app sync qa-portfolio-staging

# Or use ArgoCD UI (recommended)
# Navigate to application → Click "Sync" button
```

### 3. Rollback

```bash
# Via ArgoCD UI:
# 1. Navigate to Application
# 2. Click "History" tab
# 3. Select previous version
# 4. Click "Rollback"

# Or via Git:
git revert <commit-hash>
git push
# ArgoCD will auto-sync the revert
```

### 4. Pause Auto-Sync

```bash
# Disable auto-sync for maintenance
kubectl patch application qa-portfolio-dev -n argocd \
  --type merge -p '{"spec":{"syncPolicy":{"automated":null}}}'

# Re-enable auto-sync
kubectl patch application qa-portfolio-dev -n argocd \
  --type merge -p '{"spec":{"syncPolicy":{"automated":{"selfHeal":true,"prune":true}}}}'
```

### 5. Check Sync Status

```bash
# Via kubectl
kubectl get applications -n argocd -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.sync.status}{"\t"}{.status.health.status}{"\n"}{end}'

# Expected output:
# qa-portfolio-dev      Synced    Healthy
# qa-portfolio-staging  OutOfSync Healthy
```

---

## ArgoCD CLI

### Installation

```bash
# macOS
brew install argocd

# Linux
curl -sSL -o /usr/local/bin/argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64
chmod +x /usr/local/bin/argocd
```

### Usage

```bash
# Login
argocd login localhost:9090 --insecure

# List applications
argocd app list

# Get application details
argocd app get qa-portfolio-dev

# Sync application
argocd app sync qa-portfolio-dev

# Watch sync progress
argocd app wait qa-portfolio-dev --sync

# Diff (show what will change)
argocd app diff qa-portfolio-dev
```

---

## Troubleshooting

### Application Status: OutOfSync

**Cause**: Git repository differs from cluster state

**Solution**:
```bash
# Check diff
argocd app diff qa-portfolio-dev

# Sync manually
argocd app sync qa-portfolio-dev
```

### Application Status: Unknown

**Cause**: ArgoCD hasn't completed initial sync yet

**Solution**: Wait 1-2 minutes, or trigger manual sync

### Application Status: Degraded

**Cause**: One or more resources are unhealthy (e.g., pod crash-looping)

**Solution**:
```bash
# Check pod status
kubectl get pods -n qa-portfolio

# Check application details
argocd app get qa-portfolio-dev

# Check logs
kubectl logs -n qa-portfolio <pod-name>
```

### Sync Fails with Validation Errors

**Cause**: Invalid Kubernetes manifests

**Solution**:
```bash
# Validate manifests locally
kubectl apply --dry-run=client -f cicd-demo/k8s/

# Fix errors in Git
# Push changes
# ArgoCD will auto-retry
```

### ArgoCD UI Not Accessible

```bash
# Check if port-forward is running
ps aux | grep "port-forward"

# Restart port-forward
kubectl port-forward svc/argocd-server -n argocd 9090:443

# Check ArgoCD pods
kubectl get pods -n argocd

# Check service
kubectl get svc -n argocd argocd-server
```

---

## Configuration Files Reference

### project.yaml

Defines the `qa-portfolio` AppProject:
- Allowed source repositories
- Destination clusters and namespaces
- RBAC roles (developer, admin)
- Sync windows (business hours, maintenance windows)
- Resource whitelists and blacklists

### applications/qa-portfolio-dev.yaml

Dev environment configuration:
- **Branch**: `feature/devops-platform`
- **Auto-sync**: Enabled
- **Self-heal**: Enabled (prevents drift)
- **Prune**: Enabled (auto-delete removed resources)

### applications/qa-portfolio-staging.yaml

Staging environment configuration:
- **Branch**: `main`
- **Auto-sync**: Disabled (manual approval)
- **Self-heal**: Disabled
- **Prune**: Enabled

---

## Interview Talking Points

### Q: What is GitOps?

> "GitOps is a paradigm where Git serves as the single source of truth for infrastructure and applications. Instead of running kubectl or terraform apply from CI, we commit declarative configurations to Git and ArgoCD automatically syncs them to Kubernetes. This provides complete audit trails, easy rollbacks, and prevents configuration drift."

### Q: Why use ArgoCD instead of traditional CI/CD?

> "Traditional CI/CD uses push-based deployment where CI pushes changes to clusters. ArgoCD uses pull-based deployment where the cluster pulls from Git. Benefits include:
> 1. **Security**: No cluster credentials in CI
> 2. **Drift detection**: ArgoCD continuously monitors and corrects drift
> 3. **Rollback**: Simple git revert, no need to re-run pipelines
> 4. **Audit**: Every change has a Git commit
> 5. **Multi-cluster**: Manage multiple clusters from single control plane"

### Q: How does auto-sync work?

> "ArgoCD polls Git repositories every 3 minutes by default (configurable). When it detects changes, it compares the desired state (Git) with actual state (cluster). If they differ, ArgoCD applies the changes. With selfHeal enabled, ArgoCD also reverts manual kubectl changes back to Git state."

### Q: What's the difference between dev and staging sync policies?

> "Dev uses full automation (auto-sync + selfHeal) for fast iteration. Staging requires manual approval for controlled releases. This gives QA time to review changes before deployment. Production would have even stricter controls, potentially requiring multi-person approval and change management tickets."

### Q: How do you handle secrets in GitOps?

> "Secrets should never be committed to Git plain text. Options include:
> 1. **Sealed Secrets**: Encrypt secrets, commit encrypted version
> 2. **External Secrets Operator**: Pull from vault (AWS Secrets Manager, HashiCorp Vault)
> 3. **Helm secrets**: Encrypt values files
> 4. **SOPS**: Encrypt YAML files with PGP/KMS
> In this demo, we use Kubernetes ConfigMaps for non-sensitive config."

---

## Monitoring and Metrics

ArgoCD provides Prometheus metrics:

```bash
# Access Prometheus metrics
kubectl port-forward -n argocd svc/argocd-metrics 8082:8082
curl http://localhost:8082/metrics
```

Key metrics:
- `argocd_app_sync_total`: Total syncs
- `argocd_app_health_status`: Application health
- `argocd_app_sync_status`: Sync status

---

## Security Best Practices

1. **Use RBAC**: Define AppProject roles for developers vs admins
2. **Restrict source repos**: Limit to trusted Git repositories
3. **Enable sync windows**: Prevent deployments during maintenance
4. **Use signed commits**: Require GPG-signed commits (optional)
5. **Rotate secrets**: Change ArgoCD admin password regularly
6. **Enable audit logs**: Track all ArgoCD operations

---

## Next Steps

1. **Add more environments**: Create production Application
2. **Implement Kustomize overlays**: Environment-specific configurations
3. **Set up notifications**: Slack/email alerts for sync failures
4. **Configure SSO**: Integrate with GitHub/Google OAuth
5. **Multi-cluster**: Manage dev, staging, prod in separate clusters

---

## References

- [ArgoCD Documentation](https://argo-cd.readthedocs.io/)
- [GitOps Principles](https://opengitops.dev/)
- [ArgoCD Best Practices](https://argo-cd.readthedocs.io/en/stable/user-guide/best_practices/)
- [Application CRD Spec](https://argo-cd.readthedocs.io/en/stable/operator-manual/application.yaml)
- [ArgoCD Tutorial](https://argo-cd.readthedocs.io/en/stable/getting_started/)

---

**Last Updated**: March 1, 2026
**Maintained by**: DevOps Team
