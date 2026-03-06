# CI/CD Demo — DevOps Platform

A complete CI/CD pipeline demonstration: from code push to production deployment, with monitoring, alerting, and GitOps.

## What This Project Demonstrates

```
Code Push → GitHub Actions (CI) → Docker Build & Test → Helm Package
    → ArgoCD (CD) → Kubernetes Deploy → Prometheus Monitoring → Grafana Dashboards
```

### Phase 1: Foundation (Complete)

| Component | Technology | What It Does |
|-----------|-----------|--------------|
| **CI Pipeline** | GitHub Actions | 4 workflows: PR checks, Docker tests, security scan, validation |
| **Test Automation** | Cypress + Newman | 16 E2E tests + 18 API assertions, 100% pass rate |
| **Containerization** | Docker Compose | Cypress + Newman in containers, reproducible test env |
| **Infrastructure as Code** | Terraform + Localstack | S3, DynamoDB, 3 environment configs (dev/staging/prod) |
| **Container Orchestration** | Kubernetes (k3d) | 3-node cluster, Jobs, Deployments, Services, Ingress |
| **Security Scanning** | Trivy + npm audit | 4-layer scanning (filesystem, Docker, IaC, dependencies) |
| **GitOps** | ArgoCD | 2 apps (dev auto-sync, staging manual), self-healing |
| **Monitoring** | Prometheus + Grafana | Metrics collection, 2 dashboards (14 panels) |

### Phase 2: CI/CD Pipeline Integration (Planned)

| Component | Technology | What It Adds |
|-----------|-----------|-------------|
| **Release Management** | Helm Charts | Versioned releases, parameterized deploys, rollback |
| **Pipeline Orchestration** | GitHub Actions | Multi-stage: lint → test → build → deploy dev → deploy staging |
| **Pipeline Alerting** | AlertManager + Slack | Alert on deployment failure, test failure, infra issues |
| **Pipeline Metrics** | Pushgateway | Track build times, test pass rates, deployment frequency |
| **Log Aggregation** | Loki + Promtail | Centralized logging, debug failed deployments in Grafana |

See [WBS.md](docs/WBS.md) for detailed task breakdown.

## Quick Start

### Run Tests Locally

```bash
cd cicd-demo
npm install
npm test                         # Both Cypress + Newman
npm run test:cypress:headed      # Interactive Cypress
```

### Run in Docker

```bash
npm run docker:test              # Docker containers
npm run docker:test:logs         # With detailed logs
```

### Deploy to Kubernetes (Phase 1)

```bash
# Prerequisites: docker, kubectl, k3d, terraform, helm
# Create cluster
k3d cluster create qa-portfolio --agents 2 --port "8080:80@loadbalancer"

# Deploy infrastructure
cd terraform && terraform init && terraform apply -var-file=environments/dev.tfvars

# Deploy to K8s
./scripts/deploy-to-k8s.sh

# Install ArgoCD
./gitops/argocd/install-argocd.sh

# Install monitoring
./monitoring/deploy-monitoring.sh
```

### Access Dashboards

```bash
# Grafana (metrics + dashboards)
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80
# Open http://localhost:3000 (admin / grafana-admin)

# ArgoCD (GitOps deployments)
kubectl port-forward -n argocd svc/argocd-server 9090:443
# Open https://localhost:9090

# Prometheus (raw metrics)
kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-prometheus 9091:9090
```

## Project Structure

```
cicd-demo/
├── .github/workflows/           # CI/CD pipelines
│   ├── pr-checks.yml            #   Fast PR validation (2-3 min)
│   ├── docker-tests.yml         #   Production Docker tests (5-8 min)
│   ├── security-scan.yml        #   Trivy 4-layer security scanning
│   └── validation.yml           #   Environment & permission checks
│
├── cypress/                     # Cypress E2E tests (16 tests)
├── postman/                     # Newman API tests (18 assertions)
├── docker-compose.yml           # Container orchestration
├── Dockerfile.newman            # Newman container
│
├── terraform/                   # Infrastructure as Code
│   ├── main.tf                  #   S3 buckets, DynamoDB table
│   ├── variables.tf             #   Configurable parameters
│   ├── backend.tf               #   Localstack S3 backend
│   └── environments/            #   dev / staging / production tfvars
│
├── k8s/                         # Kubernetes manifests
│   ├── namespace.yaml           #   qa-portfolio namespace
│   ├── deployment.yaml          #   Test results server (nginx)
│   ├── job-cypress.yaml         #   Cypress test job
│   ├── job-newman.yaml          #   Newman test job
│   ├── service.yaml             #   ClusterIP service
│   ├── ingress.yaml             #   External access
│   ├── configmap-*.yaml         #   Test configs, nginx config
│   └── pvc.yaml                 #   Persistent storage (5Gi)
│
├── gitops/argocd/               # GitOps configuration
│   ├── install-argocd.sh        #   ArgoCD installation script
│   ├── project.yaml             #   AppProject with RBAC
│   └── applications/            #   Dev (auto-sync) + Staging (manual)
│
├── monitoring/                  # Observability stack
│   ├── prometheus-values.yaml   #   Prometheus + Grafana Helm values
│   ├── dashboards/              #   Cluster Overview + Test Metrics JSON
│   ├── deploy-monitoring.sh     #   Automated deployment
│   └── verify-monitoring.sh     #   Health verification
│
├── security/                    # Security scanning config
│   ├── trivy-config.yaml        #   Scan rules, severity thresholds
│   └── security-report.sh       #   Consolidated report generator
│
├── scripts/                     # Automation scripts
│   ├── validate-environment.sh  #   Pre-flight checks
│   └── fix-permissions.sh       #   Docker file permission fix
│
└── docs/                        # Documentation
    ├── WBS.md                   #   Work breakdown (Phase 1 + Phase 2)
    ├── ARCHITECTURE.md          #   Technical architecture deep dive
    ├── INTERVIEW-GUIDE.md       #   35+ interview Q&A
    ├── QUICKSTART.md            #   5-minute setup guide
    └── guides/                  #   CI/CD guide, troubleshooting
```

## CI/CD Pipeline Architecture

### Current (Phase 1): CI with Manual CD

```
PR opened ──→ pr-checks.yml ──→ Lint + Test (2-3 min) ──→ PR status
Push to main ──→ docker-tests.yml ──→ Docker Build + Test (5-8 min) ──→ Artifacts
Any push ──→ security-scan.yml ──→ Trivy + npm audit ──→ SARIF → GitHub Security
```

ArgoCD watches the Git repo and syncs K8s manifests, but there's no automated CI → CD handoff.

### Target (Phase 2): Full CI/CD Pipeline

```
Push ──→ Stage 1: Lint + Unit Test ──→ Stage 2: Build + Security Scan (parallel)
     ──→ Stage 3: E2E Tests ──→ Stage 4: Deploy Dev (auto, Helm)
     ──→ Stage 5: Deploy Staging (manual approval gate)

Pipeline failure ──→ AlertManager ──→ Slack notification
Pipeline metrics ──→ Pushgateway ──→ Prometheus ──→ Grafana dashboard
Pod logs ──→ Promtail ──→ Loki ──→ Grafana log explorer
```

## Test Coverage

### Cypress E2E Tests (16 tests)

| Category | Tests | What's Covered |
|----------|-------|---------------|
| API Tests | 8 | GET, POST, PUT, DELETE, error handling, response validation |
| UI Tests | 8 | Page load, links, responsive design, performance budgets |

### Newman API Tests (18 assertions)

| Category | Assertions | What's Covered |
|----------|-----------|---------------|
| User API | 6 | CRUD operations, schema validation |
| Post API | 6 | Create, read, filter, pagination |
| Error Cases | 6 | 404 handling, invalid input, edge cases |

## Infrastructure Overview

### Kubernetes Cluster (k3d)

```
Nodes: 3 (1 server + 2 agents)
Namespaces: qa-portfolio, argocd, monitoring, kube-system
Total Pods: 30+
```

### Namespace Breakdown

| Namespace | Pods | Purpose |
|-----------|------|---------|
| qa-portfolio | 1 | Test results server (nginx) |
| argocd | 7 | GitOps controller, repo server, UI |
| monitoring | 8 | Prometheus, Grafana, AlertManager, Node Exporter |
| kube-system | 9 | CoreDNS, Traefik, Metrics Server |

## GitHub Actions Workflows

| Workflow | Trigger | Duration | Purpose |
|----------|---------|----------|---------|
| `pr-checks.yml` | PR open/sync | 2-3 min | Fast developer feedback |
| `docker-tests.yml` | Push to main, nightly | 5-8 min | Production-grade Docker tests |
| `security-scan.yml` | Push, PR, daily, manual | 10-15 min | 4-layer security scanning |
| `validation.yml` | Push/PR to main | 1-2 min | Environment validation |

## Documentation

| Document | What It Covers |
|----------|---------------|
| [WBS.md](docs/WBS.md) | Phase 1 (complete) + Phase 2 (planned) task breakdown |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Technical architecture, design decisions, scaling |
| [INTERVIEW-GUIDE.md](docs/INTERVIEW-GUIDE.md) | 35+ interview Q&A across 6 technology areas |
| [QUICKSTART.md](docs/QUICKSTART.md) | 5-minute setup from zero to running cluster |
| [CI-CD-GUIDE.md](docs/guides/CI-CD-GUIDE.md) | CI/CD pipeline setup and integration |

## Interview Preparation

### 30-Second Pitch

> "I built a complete DevOps platform demonstrating the full CI/CD lifecycle: GitHub Actions pipelines, Docker containerization, Kubernetes orchestration, Terraform IaC, ArgoCD GitOps, security scanning with Trivy, and Prometheus + Grafana monitoring. All deployed to a k3d cluster with 30+ pods across 3 namespaces."

### Key Skills Demonstrated

- **CI/CD Pipeline Design**: Dual-layer strategy (fast PR checks + production Docker tests)
- **Docker**: Multi-container orchestration, custom images, volume caching
- **Kubernetes**: Deployments, Jobs, Services, Ingress, PVCs, ConfigMaps
- **Terraform**: Multi-environment IaC with Localstack
- **GitOps**: ArgoCD with auto-sync, self-heal, manual approval
- **Security**: Trivy container/filesystem/IaC scanning, npm audit, SARIF
- **Monitoring**: Prometheus metrics, Grafana dashboards, PromQL

### Pre-Interview Checklist

```bash
# Verify cluster
kubectl get nodes                              # 3 nodes
kubectl get pods --all-namespaces | grep -c Running  # 25+ running

# Verify dashboards
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80 &
kubectl port-forward -n argocd svc/argocd-server 9090:443 &

# Verify tests
npm test                                        # All pass
```

See [INTERVIEW-GUIDE.md](docs/INTERVIEW-GUIDE.md) for 35+ Q&A with detailed answers.
