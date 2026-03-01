# 🏗️ DevOps Platform - Architecture Documentation

**Complete technical reference for the DevOps Platform**

---

## 📐 System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    DevOps Platform                          │
├──────────────┬──────────────┬──────────────┬──────────────┤
│   Phase 1.1  │   Phase 1.2  │   Phase 1.3  │   Phase 1.4  │
│ Environment  │     IaC      │ Kubernetes   │   Security   │
│  (k3d)       │ (Terraform)  │ (12 pods)    │   (Trivy)    │
├──────────────┴──────────────┴──────────────┴──────────────┤
│   Phase 1.5 (GitOps - ArgoCD 7 pods)                      │
│   Phase 1.6 (Monitoring - Prometheus + Grafana 8 pods)    │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Container Runtime** | Docker | 29.2.1 | Container images |
| **Container Orchestration** | Kubernetes (k3d) | 1.35.2 | Pod scheduling, networking |
| **Infrastructure as Code** | Terraform | 1.14.6 | Cloud resource provisioning |
| **Package Manager** | Helm | 3.10+ | Kubernetes package management |
| **GitOps** | ArgoCD | 2.9+ | Declarative deployments |
| **Metrics** | Prometheus | 15.x | Time-series metrics |
| **Visualization** | Grafana | 9.x | Dashboard visualization |
| **Security Scanning** | Trivy | Latest | Vulnerability detection |
| **CI/CD** | GitHub Actions | - | Workflow automation |
| **Simulation** | Localstack | - | Local AWS |

---

## 🔧 Component Architecture

### Phase 1.1: Environment Preparation

**k3d Cluster Configuration**:
```
qa-portfolio cluster
├── 1 server node (control plane)
└── 2 agent nodes (workers)

Resources per node:
- Memory: 2GB (default)
- CPU: 2 (default)
- Total: 6GB RAM, 6 CPU cores
```

**Tools installed locally**:
- Docker: Container runtime
- kubectl: K8s CLI
- k3d: Kubernetes distribution
- Terraform: IaC
- Helm: K8s package manager

---

### Phase 1.2: Infrastructure as Code

**Terraform Structure** (11 files, ~900 lines):

```
terraform/
├── main.tf                 # Resource definitions
├── variables.tf            # Input variables
├── outputs.tf              # Output values
├── environments/           # Environment configs
│   ├── dev.tfvars
│   ├── staging.tfvars
│   └── production.tfvars
└── state/                  # State files
    └── terraform.tfstate
```

**AWS Resources Provisioned** (via Localstack):
- S3 buckets: terraform-state, test-artifacts
- DynamoDB: terraform-locks table
- VPCs: Network isolation
- Security groups: Firewall rules

**State Management**:
- Backend: S3 with DynamoDB state locking
- Encryption: Server-side encryption enabled
- Versioning: S3 versioning for rollback

---

### Phase 1.3: Kubernetes Deployment

**Namespace Structure**:

```
qa-portfolio namespace
├── Deployment: test-results-server
├── Service: test-results-api
├── ConfigMap: test-config
├── PersistentVolumeClaim: test-storage
├── Ingress: test-ingress
└── RBAC: ServiceAccount, Role, RoleBinding
```

**Kubernetes Resources** (12 manifests, ~300 lines):
- Namespace: Logical isolation
- Deployment: Test infrastructure
- Service: Internal networking
- ConfigMap: Configuration data
- PersistentVolume: Durable storage
- Ingress: External access

**Deployment Strategy**:
- Rolling updates (100% uptime)
- Resource limits: Prevents pod overload
- Health checks: Liveness and readiness probes

---

### Phase 1.4: Security Integration

**Security Scanning Pipeline**:

```
GitHub push
  ↓
GitHub Actions: security-scan.yml
  ├─ Trivy image scan
  ├─ npm audit
  ├─ GitHub secret scanning
  └─ SARIF upload
  ↓
GitHub Security tab (results visible)
```

**Scanning Components**:
- Trivy: Vulnerability + secret scanning
- npm audit: Dependency vulnerability check
- GitHub: Built-in secret detection
- .trivyignore: Suppress false positives

---

### Phase 1.5: GitOps Implementation

**ArgoCD Architecture** (7 pods, ~150 lines YAML):

```
ArgoCD components:
├── Application Controller (tracks Git state)
├── Repo Server (clones repos)
├── Server (UI and API)
├── Dex Server (authentication)
├── Redis (caching)
├── Notifications Controller
└── ApplicationSet Controller
```

**Application Configuration**:

```
AppProject: qa-portfolio
├── Application: qa-portfolio-dev
│   ├── Source: feature/devops-platform branch
│   ├── Sync: Auto-sync + selfHeal enabled
│   └── Destination: qa-portfolio namespace
│
└── Application: qa-portfolio-staging
    ├── Source: main branch
    ├── Sync: Manual only
    └── Destination: qa-portfolio namespace
```

**Workflow**:
1. Developer pushes to feature/devops-platform
2. ArgoCD detects change (3-min polling or webhook)
3. Auto-sync applies manifests to dev
4. Manual sync for staging (requires approval)

---

### Phase 1.6: Monitoring Setup

**Monitoring Stack** (8 pods, ~2,400 lines config):

```
kube-prometheus-stack
├── Prometheus: Metrics collection (1 pod)
├── Grafana: Visualization (1 pod)
├── AlertManager: Alert routing (1 pod)
├── Operator: Manages Prometheus/Alertmanager (1 pod)
├── KubeStateMetrics: Cluster metrics (1 pod)
└── NodeExporter: Node metrics (3 pods - 1 per node)
```

**Prometheus Configuration**:
- Retention: 7 days
- Scrape interval: 30 seconds
- Storage: 10Gi persistent volume
- ServiceMonitors: Auto-discovery enabled

**Grafana Dashboards** (2 dashboards, 14 panels):
1. **Cluster Overview**: Node health, pod status, resource usage
2. **Test Metrics**: Job counts, success rates, trends

---

## 📊 Data Flow Diagrams

### CI/CD Pipeline Flow

```
Git push
  ↓
GitHub Actions triggered
  ├─ PR checks (Node.js native, 2-3 min)
  │  ├─ npm install
  │  ├─ Cypress tests (16 tests)
  │  ├─ Newman tests (18 assertions)
  │  └─ Report artifacts
  │
  └─ Main branch (Docker, 5-8 min)
     ├─ Docker build
     ├─ Docker compose up
     ├─ Full test suite
     └─ Security scanning
  ↓
Pass/Fail status
```

### GitOps Deployment Flow

```
Git commit
  ↓
GitHub webhook (or 3-min polling)
  ↓
ArgoCD Application Controller
  ├─ Compare Git (desired) vs cluster (actual)
  └─ If different → apply manifests
  ↓
Kubernetes api-server
  ├─ Create/update resources
  └─ Monitor for drift
  ↓
selfHeal: Revert manual changes back to Git
```

### Monitoring Data Collection Flow

```
Kubernetes cluster (metrics endpoints)
  ├─ /metrics on each pod
  └─ Node exporter on each node
  ↓
Prometheus scraper (30s interval)
  ├─ Collect metrics
  └─ Store in TSDB
  ↓
Grafana dashboard
  ├─ Query Prometheus
  └─ Visualize in real-time
  ↓
AlertManager (optional)
  └─ Fire alerts on thresholds
```

---

## 🌐 Network Architecture

**Port Exposure** (for demo access):

| Service | Port | Access |
|---------|------|--------|
| Grafana | 3000 | http://localhost:3000 |
| ArgoCD | 9090 | https://localhost:9090 |
| Prometheus | 9090 | http://localhost:9090 |
| Test API | 8080 | http://localhost:8080 |

**Pod Communication**:
- Internal: Service DNS (service-name.namespace.svc.cluster.local)
- External: Port-forward for demo access
- Ingress: External HTTP/HTTPS routing

**Network Policies** (optional, documented):
- Default: Allow all pod-to-pod communication
- Production: Restrict to needed paths
- Monitoring: Scraper → metrics endpoints

---

## 🔐 Security Architecture

**Layers**:

```
Layer 1: Image Scanning (Trivy)
  ├─ Vulnerability detection
  └─ Secret detection

Layer 2: Dependency Audit (npm audit)
  ├─ Known vulnerabilities
  └─ Version mismatch alerts

Layer 3: GitHub Secret Scanning
  └─ Prevents credential leaks

Layer 4: Kubernetes RBAC
  ├─ ServiceAccounts per namespace
  ├─ Roles: Minimal permissions
  └─ RoleBindings: Attach roles to accounts

Layer 5: Network Policies (optional)
  ├─ Restrict pod-to-pod traffic
  └─ Ingress/egress rules

Layer 6: Runtime Monitoring
  └─ AlertManager: Anomaly detection
```

**Secrets Management**:
- GitHub Secrets: CI/CD credentials
- Kubernetes Secrets: Application secrets (not encrypted by default)
- Production: Use external vaults (HashiCorp, AWS Secrets Manager)

---

## 🎯 Design Decisions

### Why Kubernetes?
- Production-grade orchestration
- Auto-healing, auto-scaling capabilities
- Industry standard (used by Netflix, Google, Uber)
- Demonstrates enterprise skills

### Why Terraform over CloudFormation?
- Cloud-agnostic (works on AWS, Azure, GCP)
- HCL: More readable than JSON
- Large community and ecosystem
- State management for drift detection

### Why ArgoCD over Flux?
- Beautiful UI (excellent for demos)
- Easier learning curve
- Better error messages
- Broader industry adoption

### Why Prometheus + Grafana?
- Kubernetes standard for metrics
- Pull-based scraping (more secure than push)
- Time-series database for efficiency
- PromQL for flexible querying
- Industry standard (Netflix, Uber use them)

### Why k3d for local development?
- Lightweight, single binary
- Fast startup (seconds vs minutes)
- Multi-node support (1 server + 2 agents)
- Perfect for CI/CD and local testing

---

## 📈 Scalability Considerations

**Current Setup**:
- Single k3d cluster
- Single Prometheus instance (~1M metrics capacity)
- Single Grafana instance
- Local Terraform state

**Scaling to Production**:

```
Multi-region:
  Dev cluster → ArgoCD → Shared monitoring
  Staging cluster → ArgoCD → Shared monitoring
  Prod cluster → ArgoCD → Shared monitoring

  Thanos for unified metrics across regions

Data retention:
  Dev: 7 days (current)
  Prod: 1 year (Thanos + S3)

Multi-Prometheus:
  Dev: 100K metrics
  Prod: 1M metrics (single Prometheus)
  Hyper-scale: Thanos + federation (10M+ metrics)
```

---

## ✅ Production Readiness

**What would change for production**:

| Aspect | Dev | Production |
|--------|-----|-----------|
| **Cluster** | Single k3d | Multi-AZ managed (EKS/GKE) |
| **Storage** | Local volumes | EBS/Persistent disks |
| **Monitoring** | 7-day retention | Thanos + 1-year retention |
| **Secrets** | Kubernetes Secrets | AWS Secrets Manager + Sealed Secrets |
| **RBAC** | Simple roles | Complex multi-team RBAC |
| **Scaling** | Manual | HorizontalPodAutoscaler + cluster autoscaler |
| **Backup** | Optional | Daily automated backups |
| **High Availability** | Single point of failure | Multi-region, multi-zone |
| **Monitoring** | Single Prometheus | Distributed Prometheus federation |
| **Compliance** | None | RBAC audit logging, data encryption |

---

## 🔍 Key Metrics

| Metric | Value |
|--------|-------|
| Cluster nodes | 3 (1 server + 2 agents) |
| Running pods | 30+ |
| Kubernetes resources | 12 manifests |
| Terraform resources | 11 files, ~900 lines |
| Git commits | 10+ phases |
| Monitoring panels | 14 |
| PromQL queries | 20+ |
| Interview Q&A | 35+ |
| Total code/docs | 8,000+ lines |

---

**Architecture Status**: Production patterns demonstrated ✅
**Scalability**: Documented path to multi-region ✅
**Documentation**: Comprehensive with rationale ✅

