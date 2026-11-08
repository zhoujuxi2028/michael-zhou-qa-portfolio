# 🚀 DevOps Platform - Quick Start Guide

**Get the platform running in 5 minutes!**

---

## ✅ Prerequisites

- Docker Desktop (or Docker Engine) v29.0+
- kubectl v1.24+
- Helm v3.10+
- Git
- 8GB RAM minimum, 4 CPU cores
- ~20GB disk space

**Verify installation:**
```bash
docker --version   && echo "✅ Docker"
kubectl version    && echo "✅ kubectl"
helm version       && echo "✅ Helm"
```

---

## 🚀 5-Minute Quick Start

### Step 1: Clone Repository (30 seconds)

```bash
git clone https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio.git
cd michael-zhou-qa-portfolio/cicd-demo
```

### Step 2: Start k3d Cluster (2 minutes)

```bash
# Create 3-node cluster (1 server + 2 agents)
k3d cluster create qa-portfolio --servers 1 --agents 2 -p "9000:80@loadbalancer" -p "9001:443@loadbalancer"

# Verify cluster is running
kubectl cluster-info
kubectl get nodes              # Should show 3 nodes
```

### Step 3: Deploy Full Stack (2 minutes)

```bash
# Infrastructure as Code (optional)
cd terraform && terraform init && terraform apply -auto-approve && cd ..

# Kubernetes infrastructure
cd k8s && ./deploy-to-k8s.sh && cd ..

# GitOps (ArgoCD)
cd gitops/argocd && ./install-argocd.sh && cd ../..

# Monitoring (Prometheus + Grafana)
cd monitoring && ./deploy-monitoring.sh && cd ..
```

### Step 4: Verify Everything (1 minute)

```bash
# Check all pods running
kubectl get pods --all-namespaces

# Expected output: 30+ pods across 3 namespaces
# qa-portfolio, argocd, monitoring
```

---

## 📊 Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                 DevOps Platform                  │
├─────────────────────────────────────────────────┤
│                                                  │
│  Phase 1.1: Environment (k3d 3-node cluster)    │
│  Phase 1.2: IaC (Terraform + Localstack)        │
│  Phase 1.3: Kubernetes (10 manifests)           │
│  Phase 1.4: Security (Trivy scanning)           │
│  Phase 1.5: GitOps (ArgoCD 7 pods)              │
│  Phase 1.6: Monitoring (Prometheus + Grafana)   │
│                                                  │
└─────────────────────────────────────────────────┘
```

**Result**: 30+ pods, 6 complete phases, production-grade platform

---

## 🎛️ Common Commands Reference

### Kubernetes

```bash
# View all pods
kubectl get pods --all-namespaces

# Check pod status
kubectl describe pod <pod-name> -n <namespace>

# View logs
kubectl logs <pod-name> -n <namespace>

# Port forward for access
kubectl port-forward svc/<service> <local>:<remote> -n <namespace>

# Scale deployment
kubectl scale deployment <name> --replicas=3 -n <namespace>
```

### Helm

```bash
# List releases
helm list -A

# Upgrade release
helm upgrade <release> <chart> -f values.yaml -n <namespace>

# Delete release
helm uninstall <release> -n <namespace>
```

### k3d

```bash
# List clusters
k3d cluster list

# Start cluster
k3d cluster start qa-portfolio

# Stop cluster
k3d cluster stop qa-portfolio

# Delete cluster
k3d cluster delete qa-portfolio
```

### Git & ArgoCD

```bash
# Make change and push (triggers ArgoCD sync)
git add .
git commit -m "Change description"
git push origin feature/devops-platform

# Check ArgoCD sync status
kubectl get applications -n argocd

# Manual sync
kubectl patch application qa-portfolio-staging -n argocd \
  --type merge -p '{"operation":{"initiatedBy":{"username":"admin"},"sync":{}}}'
```

---

## ✅ Verification Checklist

Run this to verify everything is working:

```bash
#!/bin/bash
echo "🔍 Verification Checklist"
echo ""

# Pods
PODS=$(kubectl get pods --all-namespaces --no-headers | grep Running | wc -l)
[ "$PODS" -ge 20 ] && echo "✅ Pods running: $PODS" || echo "❌ Pods: $PODS (need 20+)"

# Namespaces
kubectl get ns qa-portfolio &>/dev/null && echo "✅ qa-portfolio namespace" || echo "❌ qa-portfolio namespace"
kubectl get ns argocd &>/dev/null && echo "✅ argocd namespace" || echo "❌ argocd namespace"
kubectl get ns monitoring &>/dev/null && echo "✅ monitoring namespace" || echo "❌ monitoring namespace"

# Services
kubectl get svc -n monitoring prometheus-grafana &>/dev/null && echo "✅ Grafana service" || echo "❌ Grafana"
kubectl get svc -n argocd argocd-server &>/dev/null && echo "✅ ArgoCD service" || echo "❌ ArgoCD"
kubectl get svc -n monitoring prometheus-kube-prometheus-prometheus &>/dev/null && echo "✅ Prometheus service" || echo "❌ Prometheus"

# Applications
kubectl get applications -n argocd &>/dev/null && echo "✅ ArgoCD Applications" || echo "❌ ArgoCD Applications"

# Storage
PVC=$(kubectl get pvc --all-namespaces --no-headers | wc -l)
[ "$PVC" -ge 1 ] && echo "✅ Persistent volumes: $PVC" || echo "❌ Persistent volumes"

echo ""
echo "🎉 Verification complete!"
```

---

## 🎯 What to Demo First

**Recommended 5-minute demo path:**

1. **Show the cluster** (30 sec)
   ```bash
   kubectl get pods --all-namespaces | head -20
   # Shows: 30+ pods running across 3 namespaces
   ```

2. **Show Grafana dashboards** (1.5 min)
   ```bash
   kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80
   # Open: http://localhost:3000
   # Login: admin / grafana-admin
   # Browse: Dashboards → DevOps folder
   # Show: Cluster Overview (real-time metrics)
   ```

3. **Show ArgoCD** (1.5 min)
   ```bash
   kubectl port-forward -n argocd svc/argocd-server 9090:443
   # Open: https://localhost:9090
   # Show: 2 Applications (dev and staging)
   # Explain: Auto-sync vs manual sync
   ```

4. **Show Git integration** (1 min)
   ```bash
   # Explain: Any commit to feature/devops-platform
   # auto-syncs to dev environment
   # Staging requires manual approval
   ```

5. **Discuss architecture** (1 min)
   - 6 complete phases
   - 30+ pods
   - Production patterns
   - Interview talking points in INTERVIEW-GUIDE.md

---

## 🔧 Troubleshooting

### Pods not starting

```bash
# Check events
kubectl describe pod <pod-name> -n <namespace>

# Common issues:
# - Pending: Insufficient resources or waiting for volume
# - CrashLoopBackOff: Application error, check logs
# - ImagePullBackOff: Image not found

# Check logs
kubectl logs <pod-name> -n <namespace>
```

### Service not accessible

```bash
# Verify service exists
kubectl get svc <name> -n <namespace>

# Check endpoints
kubectl get endpoints <name> -n <namespace>

# Port forward might already be running
lsof -i :3000  # Check port 3000
kill -9 <PID>  # Kill if needed
```

### ArgoCD password forgotten

```bash
# Get default password
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d

# Or retrieve saved password
cat gitops/argocd/.argocd-admin-password
```

### Grafana shows "No data"

```bash
# Prometheus needs time to scrape
# Wait 2-3 minutes after deployment

# Verify Prometheus is scraping
kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-prometheus 9090:9090
# Open: http://localhost:9090/targets
# Should show targets in "UP" state
```

---

## 📚 Next Steps

1. **Read comprehensive docs**
   - `docs/INTERVIEW-GUIDE.md` - 35+ interview questions
   - `docs/ARCHITECTURE.md` - Deep technical reference

2. **Explore each phase**
   - `k8s/README.md` - Kubernetes setup
   - `gitops/README.md` - ArgoCD configuration
   - `monitoring/MONITORING.md` - Prometheus + Grafana
   - `security/README.md` - Security scanning

3. **Try GitOps in action**
   ```bash
   # Edit a file
   vim k8s/configmap.yaml

   # Commit and push
   git add k8s/configmap.yaml
   git commit -m "demo: test GitOps change"
   git push origin feature/devops-platform

   # Watch ArgoCD sync (3 minutes)
   kubectl get applications -n argocd -w
   ```

4. **Prepare for interviews**
   - Study `docs/INTERVIEW-GUIDE.md`
   - Practice demo scenarios
   - Verify all systems running before interview

---

## 🎓 Learning Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [ArgoCD Documentation](https://argo-cd.readthedocs.io/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Terraform Documentation](https://www.terraform.io/docs/)
- [k3d Documentation](https://k3d.io/)

---

**Status**: Production-ready ✅
**Complexity**: Full DevOps pipeline ✅
**Interview-ready**: Yes ✅

**Ready to demo? Let's go!** 🚀

