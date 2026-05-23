# CI/CD Demo — DevOps Infrastructure Platform

**Category: DevOps 基础设施演示**

A complete DevOps infrastructure platform: Terraform IaC, Kubernetes orchestration, ArgoCD GitOps, Trivy security scanning, and Prometheus + Grafana observability. Includes CI/CD pipelines and basic test automation as validation layer.

## What This Project Demonstrates

```
Code Push → GitHub Actions (CI) → Docker Build & Test → Helm Package
    → ArgoCD (CD) → Kubernetes Deploy → Prometheus Monitoring → Grafana Dashboards
```

### Phase 1: Foundation (Complete)

| Component | Technology | What It Does |
|-----------|-----------|--------------|
| **Infrastructure as Code** | Terraform + Localstack | S3, DynamoDB, 3 environment configs (dev/staging/prod) |
| **Container Orchestration** | Kubernetes (k3d) | 3-node cluster, Jobs, Deployments, Services, Ingress |
| **GitOps** | ArgoCD | 2 apps (dev auto-sync, staging manual), self-healing |
| **Security Scanning** | Trivy + npm audit | 4-layer scanning (filesystem, Docker, IaC, dependencies) |
| **Monitoring** | Prometheus + Grafana | Metrics collection, 2 dashboards (14 panels) |
| **CI Pipeline** | GitHub Actions | 2 active workflows: Docker regression + security scan |
| **Validation Layer** | Cypress + Newman | 16 E2E tests + 18 API assertions (pipeline validation) |
| **Containerization** | Docker Compose | Cypress + Newman in containers, reproducible test env |

### Phase 2: CI/CD Pipeline Integration (Planned)

| Component | Technology | What It Adds |
|-----------|-----------|-------------|
| **Release Management** | Helm Charts | Versioned releases, parameterized deploys, rollback |
| **Pipeline Orchestration** | GitHub Actions | Multi-stage: lint → test → build → deploy dev → deploy staging |
| **Pipeline Alerting** | AlertManager + Slack | Alert on deployment failure, test failure, infra issues |
| **Pipeline Metrics** | Pushgateway | Track build times, test pass rates, deployment frequency |
| **Log Aggregation** | Loki + Promtail | Centralized logging, debug failed deployments in Grafana |

See [WBS.md](docs/project-management/WBS.md) for detailed task breakdown.

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
├── .github/workflows/           # Active root workflows
│   ├── docker-tests.yml         #   Nightly / manual Docker regression tests
│   └── security-scan.yml        #   Push / PR / daily security scanning
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
    ├── FAQ-GUIDE.md             #   35+ Q&A
    ├── QUICKSTART.md            #   5-minute setup guide
    └── guides/                  #   CI/CD guide, troubleshooting
```

## Security Scanning Strategy

### 4-Layer Defense in Depth

| Layer | Tool | Scope | Severity Gate |
|-------|------|-------|---------------|
| Dependency | `npm audit` | JS packages (prod only) | `--audit-level=moderate` → **pipeline fails** |
| Filesystem | Trivy `fs` | Source code + deps | CRITICAL → **pipeline fails** (via Quality Gate job) |
| Container | Trivy `image` | Docker image layers + OS pkgs | Report only (SARIF → GitHub Security Tab) |
| IaC | Trivy `config` | Terraform + K8s manifests | CRITICAL → **pipeline fails** (via Quality Gate job) |

### Quality Gate Design

```
npm-audit ──┐
trivy-fs ───┤ (report mode, exit-code: 0)
trivy-docker┤ → all artifacts uploaded regardless
trivy-iac ──┘
                                ↓
              security-quality-gate (exit-code: 1, CRITICAL only)
              ↓ FAIL on CRITICAL vulnerabilities
```

- **Report jobs** use `exit-code: '0'` — always collect full SARIF artifacts
- **Quality Gate job** uses `exit-code: '1'` for CRITICAL severity only
- Scan results visible in **GitHub Security Tab** (Code scanning alerts) and **Workflow Artifacts**

### Suppressing Known / Accepted Risks

Add entries to `cicd-demo/.trivyignore`:

```
# Format: CVE-ID  # reason | expires: YYYY-MM-DD
CVE-2024-12345  # false positive - not exploitable in our context | expires: 2025-06-01
```



### Current (Phase 1): CI with Manual CD

```
Nightly / Manual ──→ docker-tests.yml ──→ Docker Build + Test ──→ Artifacts
Push / PR / Daily / Manual ──→ security-scan.yml ──→ Trivy + npm audit ──→ SARIF → GitHub Security
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

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `cicd-demo-pr.yml` | PR to main (`cicd-demo/**`) | **PR Gate**: lint + unit/contract tests + Docker build + quick security scan (< 5 min) |
| `cicd-demo-deploy.yml` | Push to main (`cicd-demo/**`), manual | **Deploy Pipeline**: Helm package → staging (auto) → production (manual approval) |
| `docker-tests.yml` | Nightly (02:00 UTC), manual | Docker container regression tests (Cypress + Newman) |
| `security-scan.yml` | Push/PR to main (`cicd-demo/**`), daily (03:00 UTC), manual | Trivy filesystem / Docker / IaC + npm audit → SARIF |

### PR → Merge → Deploy 流程

```
┌───────────────────────────────────────────────────────────────────────┐
│  Developer pushes feature branch → opens PR to main                   │
└───────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌───────────────────────────────────────────────────────────────────────┐
│  cicd-demo-pr.yml (on: pull_request)                                  │
│                                                                       │
│   ┌────────┐  ┌────────────┐  ┌───────┐  ┌──────────────┐             │
│   │  lint  │  │ unit-tests │  │ build │  │ security-scan│  (parallel) │
│   └───┬────┘  └─────┬──────┘  └───┬───┘  └──────┬───────┘             │
│       └─────────────┴─────────────┴─────────────┘                     │
│                          │                                            │
│                          ▼                                            │
│                  ┌───────────────┐                                    │
│                  │   pr-gate     │ ◄── Branch Protection 唯一 Required│
│                  │ (aggregator)  │     Check                          │
│                  └───────┬───────┘                                    │
└──────────────────────────┼────────────────────────────────────────────┘
                           │ ✅ all green
                           ▼
                  ┌────────────────┐
                  │  Squash merge  │
                  │   into main    │
                  └───────┬────────┘
                          │
                          ▼
┌───────────────────────────────────────────────────────────────────────┐
│  cicd-demo-deploy.yml (on: push to main)                              │
│                                                                       │
│   ┌──────────────────┐                                                │
│   │ build-and-package│  (helm lint × 3 envs, helm package)            │
│   └────────┬─────────┘                                                │
│            ▼                                                          │
│   ┌──────────────────┐                                                │
│   │  deploy-staging  │  Environment: staging  (auto)                  │
│   └────────┬─────────┘                                                │
│            ▼                                                          │
│   ┌──────────────────┐                                                │
│   │ deploy-production│  Environment: production  (👤 manual approval) │
│   └────────┬─────────┘                                                │
│            ▼                                                          │
│   ┌──────────────────┐                                                │
│   │  deploy-summary  │  (写入 GITHUB_STEP_SUMMARY)                    │
│   └──────────────────┘                                                │
└───────────────────────────────────────────────────────────────────────┘
```

```mermaid
flowchart LR
    PR[Open PR] --> Lint[lint]
    PR --> UT[unit-tests]
    PR --> Build[build]
    PR --> Sec[security-scan]
    Lint --> Gate[pr-gate]
    UT --> Gate
    Build --> Gate
    Sec --> Gate
    Gate -->|all green| Merge[Squash merge → main]
    Merge --> Pkg[build-and-package]
    Pkg --> Stg[deploy-staging<br/>auto]
    Stg --> Prd[deploy-production<br/>manual approval]
    Prd --> Sum[deploy-summary]
```

### Branch Protection 配置（Settings → Branches → `main`）

为保证 PR 必须通过 PR Pipeline 才能合并，需在仓库设置中启用以下规则：

| 设置 | 取值 |
|------|------|
| Require a pull request before merging | ✅ 开启 |
| Require approvals | ≥ 1 |
| Require status checks to pass before merging | ✅ 开启 |
| Required status check | `CICD Demo / PR Gate` |
| Require branches to be up to date before merging | ✅ 开启 |
| Require conversation resolution before merging | ✅ 开启 |

> `pr-gate` 是 `cicd-demo-pr.yml` 中 `needs: [lint, unit-tests, build, security-scan]` 的聚合 job，一处配置即可守住所有 PR 校验。任何子 job 失败时 `pr-gate` 也会失败。

### GitHub Environments 配置（Settings → Environments）

部署流水线使用 GitHub Environments 控制 staging / production 的访问与审批：

| Environment | 配置建议 |
|-------------|----------|
| `staging` | 自动部署；可选 secrets：`STAGING_KUBECONFIG` |
| `production` | Required reviewers ≥ 1（手动审批）；wait timer 可选；secrets：`PROD_KUBECONFIG` |

> 在 GitHub-hosted runner 上 deploy job 默认执行 dry-run（`helm template` 渲染产物作为 artifact 上传）。如需真实集群部署，请取消脚本中注释的 `helm upgrade --install` 行，并在 self-hosted runner 上配置 `KUBECONFIG`。

## Documentation

| Document | What It Covers |
|----------|---------------|
| [WBS.md](docs/project-management/WBS.md) | Phase 1 (complete) + Phase 2 (planned) task breakdown |
| [ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md) | Technical architecture, design decisions, scaling |
| [FAQ-GUIDE.md](docs/guides/FAQ-GUIDE.md) | 35+ Q&A across 6 technology areas |
| [QUICKSTART.md](docs/guides/QUICKSTART.md) | 5-minute setup from zero to running cluster |
| [CI-CD-GUIDE.md](docs/guides/CI-CD-GUIDE.md) | CI/CD pipeline setup and integration |
| [azure-pipelines.yml](azure-pipelines.yml) | GitHub Actions → Azure Pipelines translation |
| [Azure vs GitHub Actions](docs/AZURE-VS-GITHUB-ACTIONS.md) | Cross-platform CI/CD FAQ |

## FAQ

### 30-Second Pitch

> "I built a complete DevOps platform demonstrating the full CI/CD lifecycle: GitHub Actions pipelines, Docker containerization, Kubernetes orchestration, Terraform IaC, ArgoCD GitOps, security scanning with Trivy, and Prometheus + Grafana monitoring. All deployed to a k3d cluster with 30+ pods across 3 namespaces."

### Key Skills Demonstrated

- **Terraform IaC**: Multi-environment (dev/staging/prod) with Localstack
- **Kubernetes**: Deployments, Jobs, Services, Ingress, PVCs, ConfigMaps, 3-node k3d
- **GitOps**: ArgoCD with auto-sync, self-heal, manual approval gate
- **Security Scanning**: Trivy 4-layer (filesystem, Docker, IaC, deps) + SARIF → GitHub Security
- **Monitoring**: Prometheus metrics, Grafana dashboards (14 panels), PromQL, AlertManager
- **CI/CD Pipeline Design**: security scan 持续检查 + nightly/manual Docker regression
- **Docker**: Multi-container orchestration, custom images, volume caching

### Pre-Demo Checklist

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

See [FAQ-GUIDE.md](docs/guides/FAQ-GUIDE.md) for 35+ Q&A with detailed answers.
