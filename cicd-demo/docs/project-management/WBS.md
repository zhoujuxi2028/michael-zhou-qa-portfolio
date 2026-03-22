# DevOps Platform - WBS

**Project**: CI/CD Demo - DevOps Platform
**Status**: Phase 1 ✅ Complete | Phase 2 ⬜ Planned
**Phase 1**: 16h completed (2026-02-27 ~ 2026-03-01)
**Phase 2**: 20h planned (3 days)

---

## Phase 1: Foundation (✅ Complete — 80/80 tasks)

| Phase | What Was Built | Hours | Status |
|-------|---------------|-------|--------|
| **1.1** | **Environment** — k3d cluster (3 nodes), Docker, kubectl, Terraform, Helm | 1h | ✅ |
| **1.2** | **Terraform IaC** — S3, DynamoDB, Localstack, 3 env configs (11 files, 900 lines) | 4h | ✅ |
| **1.3** | **Kubernetes** — Namespace, Jobs (Cypress/Newman), Deployment, Service, Ingress, PVCs | 2.5h | ✅ |
| **1.4** | **Security** — Trivy 4-layer scanning, npm audit, SARIF, GitHub Security tab | 1.5h | ✅ |
| **1.5** | **GitOps** — ArgoCD, 2 apps (dev auto-sync, staging manual), AppProject RBAC | 4h | ✅ |
| **1.6** | **Monitoring** — Prometheus + Grafana, 2 dashboards (14 panels), AlertManager (baseline) | 4h | ✅ |
| **1.7** | **Documentation** — INTERVIEW-GUIDE (35+ Q&A), QUICKSTART, ARCHITECTURE (3,500+ lines) | 2h | ✅ |
| **1.8** | **Validation** — E2E testing 18/19 passed (94%), demo rehearsal, sign-off | 1h | ✅ |

---

## Phase 2: CI/CD Pipeline Integration (⬜ Planned)

### Design Principle

Phase 1 built the infrastructure pieces. Phase 2 **connects them into a real CI/CD pipeline**:

```
Developer Push → GitHub Actions CI → Build & Test → Helm Package
    → ArgoCD CD → K8s Deploy → Alerts on failure → Logs for debug
    → Metrics feedback → Dashboard visibility
```

Every task in Phase 2 must answer: **"How does this connect to the pipeline?"**

### What's Missing (CI/CD gaps from Phase 1)

| Gap | Impact |
|-----|--------|
| No CD workflow — GitHub Actions runs tests but doesn't deploy | CI works, CD is manual |
| AlertManager unconfigured — pipeline failures are silent | No one knows when things break |
| No Helm chart — can't do versioned releases or rollbacks from CI | No release management |
| No pipeline metrics — can't track build times, flaky tests, trends | No visibility into CI health |
| No log aggregation — can't debug failed deployments | Blind troubleshooting |
| ArgoCD not triggered by CI — Git push doesn't flow to deployment | CI and CD are disconnected |

---

### 2.1 Helm Chart + Release Pipeline — 4h

**CI/CD Skill**: Packaging applications for automated, versioned deployment.

**The pipeline connection**: CI builds → Helm packages → ArgoCD deploys → Helm manages rollback.

| ID | Task | Time | Status |
|----|------|------|--------|
| 2.1.1 | Create Helm chart scaffold from existing K8s manifests | 15m | ✅ |
| 2.1.2 | Template all K8s resources (deployment, jobs, service, ingress, pvc, configmap) | 1h | ✅ |
| 2.1.3 | Write _helpers.tpl (labels, selectors, naming) | 15m | ✅ |
| 2.1.4 | Write values.yaml (dev), values-staging.yaml, values-production.yaml | 30m | ✅ |
| 2.1.5 | Test: helm lint → template → install → upgrade → rollback | 30m | ✅ |
| 2.1.6 | Update ArgoCD Application to use Helm chart as source | 20m | ✅ |
| 2.1.7 | Create `helm-deploy.yml` GitHub Actions workflow | 45m | ✅ |
| 2.1.8 | Test: git push → CI passes → Helm chart updated → ArgoCD syncs | 15m | ⬜ |
| 2.1.9 | Write Chart README with release procedures | 10m | ⬜ |

**Key Workflow** (`helm-deploy.yml`):
```yaml
# Triggered after tests pass on main branch
# 1. Lint Helm chart
# 2. Package chart (helm package)
# 3. Update chart version in Chart.yaml
# 4. Push to repo → ArgoCD auto-syncs
```

**Files**:
```
helm/qa-portfolio/
├── Chart.yaml, values.yaml, values-staging.yaml, values-production.yaml
├── templates/ (8 templates + _helpers.tpl + NOTES.txt)
└── README.md
.github/workflows/
└── helm-deploy.yml          # NEW — CD pipeline
```

---

### 2.2 CI/CD Pipeline Orchestration — 3.5h

**CI/CD Skill**: Multi-stage pipeline design, environment promotion, deployment gates.

**The pipeline connection**: Ties all workflows into a coherent CI → Test → Build → Deploy → Verify pipeline.

| ID | Task | Time | Status |
|----|------|------|--------|
| 2.2.1 | Create `pipeline.yml` — unified orchestration workflow | 1h | ✅ |
| 2.2.2 | Stage 1: Lint + Unit test (fast gate, <2min) | 20m | ✅ |
| 2.2.3 | Stage 2: Build Docker images + Security scan (parallel) | 20m | ✅ |
| 2.2.4 | Stage 3: Integration test (Cypress + Newman in Docker) | 20m | ✅ |
| 2.2.5 | Stage 4: Deploy to dev (Helm upgrade, auto) | 20m | ✅ |
| 2.2.6 | Stage 5: Deploy to staging (manual approval gate) | 20m | ✅ |
| 2.2.7 | Add environment protection rules (GitHub Environments) | 15m | ✅ |
| 2.2.8 | Add pipeline status badges to README | 10m | ⬜ |
| 2.2.9 | Test: full pipeline run end-to-end | 15m | ⬜ |

**Pipeline Design**:
```
                    ┌─────────────┐
                    │  Git Push    │
                    └──────┬──────┘
                           ▼
              ┌────────────────────────┐
              │ Stage 1: Lint + Test   │  ← Fast fail (<2min)
              └────────────┬───────────┘
                           ▼
         ┌─────────────────┴─────────────────┐
         ▼                                   ▼
┌─────────────────┐              ┌───────────────────┐
│ Stage 2a: Build │              │ Stage 2b: Security│  ← Parallel
└────────┬────────┘              └─────────┬─────────┘
         └─────────────┬───────────────────┘
                       ▼
            ┌──────────────────────┐
            │ Stage 3: E2E Tests   │  ← Cypress + Newman
            └──────────┬───────────┘
                       ▼
            ┌──────────────────────┐
            │ Stage 4: Deploy Dev  │  ← Auto (Helm + ArgoCD)
            └──────────┬───────────┘
                       ▼
            ┌──────────────────────┐
            │ Stage 5: Deploy Stg  │  ← Manual approval gate
            └──────────────────────┘
```

**Files**:
```
.github/workflows/
├── pr-checks.yml            # Existing (fast PR gate)
├── docker-tests.yml         # Existing (production tests)
├── security-scan.yml        # Existing (Trivy)
├── validation.yml           # Existing
├── helm-deploy.yml          # From 2.1 (CD)
└── pipeline.yml             # NEW — full orchestration
```

---

### 2.3 Pipeline Alerting & Notifications — 3h

**CI/CD Skill**: Alerting on pipeline failures, incident response, on-call notification.

**The pipeline connection**: CI/CD failure → AlertManager → Slack notification → engineer responds.

| ID | Task | Time | Status |
|----|------|------|--------|
| 2.3.1 | Configure AlertManager Slack receiver | 20m | ⬜ |
| 2.3.2 | Configure routing rules (severity-based, grouping, inhibition) | 20m | ⬜ |
| 2.3.3 | Create PrometheusRule — K8s deployment alerts (pod crash, restart, OOM) | 30m | ⬜ |
| 2.3.4 | Create PrometheusRule — test job alerts (failure, stuck, timeout) | 30m | ⬜ |
| 2.3.5 | Create PrometheusRule — infrastructure alerts (CPU, memory, disk) | 20m | ⬜ |
| 2.3.6 | Add Slack notification step to `pipeline.yml` (on failure) | 20m | ⬜ |
| 2.3.7 | Add GitHub Actions failure → webhook → AlertManager integration | 20m | ⬜ |
| 2.3.8 | Test: break a test → pipeline fails → Slack alert fires | 15m | ⬜ |
| 2.3.9 | Write alert runbook (who to notify, how to triage, escalation) | 15m | ⬜ |

**Two alert paths**:
```
Path 1 (K8s-level):  Pod crash → Prometheus → AlertManager → Slack
Path 2 (CI-level):   GitHub Actions fails → workflow step → Slack webhook
```

**Files**:
```
monitoring/alerts/
├── deployment-alerts.yaml
├── test-pipeline-alerts.yaml
└── infrastructure-alerts.yaml
monitoring/prometheus-values.yaml     # Updated with receivers
docs/ALERT-RUNBOOK.md                 # NEW
```

---

### 2.4 Pipeline Metrics & Dashboards — 3h

**CI/CD Skill**: Measuring pipeline health, identifying bottlenecks, tracking test reliability.

**The pipeline connection**: Every pipeline run pushes metrics → Prometheus stores → Grafana visualizes → team spots trends.

| ID | Task | Time | Status |
|----|------|------|--------|
| 2.4.1 | Enable Pushgateway in prometheus-values.yaml + Helm upgrade | 15m | ⬜ |
| 2.4.2 | Create push-metrics.sh (reusable metric push script) | 20m | ⬜ |
| 2.4.3 | Add metric push step to `pipeline.yml` (duration, pass/fail, test count) | 20m | ⬜ |
| 2.4.4 | Add metric push to Cypress K8s job (post-test) | 20m | ⬜ |
| 2.4.5 | Add metric push to Newman K8s job (post-test) | 15m | ⬜ |
| 2.4.6 | Create CI/CD Pipeline Grafana dashboard | 30m | ⬜ |
| 2.4.7 | Create Test Reliability Grafana dashboard | 30m | ⬜ |
| 2.4.8 | Create alert rules for pipeline health (build time > threshold, flaky rate) | 15m | ⬜ |
| 2.4.9 | Verify: pipeline run → metrics pushed → dashboard shows data | 15m | ⬜ |

**Metrics pushed per pipeline run**:
```
cicd_pipeline_duration_seconds{stage="lint|test|build|deploy"}
cicd_pipeline_status{result="success|failure"}
cicd_test_total{suite="cypress|newman", result="passed|failed|skipped"}
cicd_test_duration_seconds{suite="cypress|newman"}
cicd_deploy_timestamp{environment="dev|staging"}
```

**Dashboards**:
```
monitoring/dashboards/
├── cluster-overview.json        # Phase 1
├── test-metrics.json            # Phase 1 (updated)
├── cicd-pipeline.json           # NEW — build times, success rate, stage breakdown
└── test-reliability.json        # NEW — flaky tests, failure trends, duration trends
```

---

### 2.5 Log Aggregation for Pipeline Debugging — 3h

**CI/CD Skill**: Centralized logging, debugging failed deployments, correlating logs with metrics.

**The pipeline connection**: Deployment fails → engineer opens Grafana → queries logs by job/pod/time → finds root cause.

| ID | Task | Time | Status |
|----|------|------|--------|
| 2.5.1 | Deploy Loki via Helm (single-binary, lightweight) | 30m | ⬜ |
| 2.5.2 | Deploy Promtail DaemonSet (collect all pod logs) | 30m | ⬜ |
| 2.5.3 | Configure Loki datasource in Grafana | 10m | ⬜ |
| 2.5.4 | Create Pipeline Logs dashboard (filter by job, namespace, log level) | 30m | ⬜ |
| 2.5.5 | Create Test Failure Investigation dashboard (Cypress errors, Newman failures) | 30m | ⬜ |
| 2.5.6 | Link logs to alerts (AlertManager annotation includes Grafana log URL) | 15m | ⬜ |
| 2.5.7 | Write deploy-loki.sh automation | 15m | ⬜ |
| 2.5.8 | Verify: run failing test → find error in Grafana logs → fix → redeploy | 10m | ⬜ |

**The debugging workflow this enables**:
```
1. Slack alert: "Test job failed in dev"
2. Click Grafana link in alert
3. Switch to Loki datasource
4. Query: {namespace="qa-portfolio", job_name=~"cypress.*"} |= "error"
5. See exact error message and stack trace
6. Fix code → push → pipeline redeploys automatically
```

**Files**:
```
monitoring/loki/
├── loki-values.yaml
└── promtail-values.yaml
monitoring/dashboards/
├── pipeline-logs.json            # NEW
└── test-failure-investigation.json  # NEW
```

---

### 2.6 Documentation & Validation — 3.5h

**CI/CD Skill**: Documenting pipeline architecture, writing runbooks, interview readiness.

| ID | Task | Time | Status |
|----|------|------|--------|
| 2.6.1 | Write PIPELINE-GUIDE.md (full pipeline architecture, stages, promotion) | 30m | ⬜ |
| 2.6.2 | Write HELM-CHART-GUIDE.md (chart structure, release management) | 25m | ⬜ |
| 2.6.3 | Write ALERT-RUNBOOK.md (triage, escalation, silence procedures) | 25m | ⬜ |
| 2.6.4 | Update INTERVIEW-GUIDE.md (+15 CI/CD focused Q&A) | 20m | ⬜ |
| 2.6.5 | Update ARCHITECTURE.md (pipeline flow diagram) | 15m | ⬜ |
| 2.6.6 | E2E test: full pipeline (push → CI → CD → alert → log → metric) | 20m | ⬜ |
| 2.6.7 | Validate all 6 dashboards show live data | 10m | ⬜ |
| 2.6.8 | Validate all documentation links and examples | 10m | ⬜ |
| 2.6.9 | Demo rehearsal: 10-min pipeline walkthrough | 15m | ⬜ |
| 2.6.10 | Write PHASE-2-COMPLETION.md | 10m | ⬜ |

**New Interview Q&A Topics**:
```
- How do you design a multi-stage CI/CD pipeline?
- Explain environment promotion (dev → staging → production)
- How do you implement deployment gates and manual approvals?
- What happens when a deployment fails? Walk me through the debugging flow.
- How do you track pipeline health and identify bottlenecks?
- Explain Helm release management (install/upgrade/rollback)
- How does ArgoCD implement GitOps-style CD?
- How do you handle secrets in CI/CD pipelines?
- What metrics do you track for CI/CD reliability?
- How do you set up alerting for pipeline failures?
- Explain the difference between CI and CD
- How do you handle flaky tests in CI?
- What's your strategy for rolling back a bad deployment?
- How do you implement blue-green or canary deployments?
- Explain how Loki + Promtail helps debug production issues
```

---

## Schedule

### Day 1 (7.5h): Pipeline + Helm

| Time | Task | Hours |
|------|------|-------|
| 09:00-13:00 | 2.1 Helm Chart + Release Pipeline | 4h |
| 14:00-17:30 | 2.2 CI/CD Pipeline Orchestration | 3.5h |

### Day 2 (6h): Alerting + Metrics

| Time | Task | Hours |
|------|------|-------|
| 09:00-12:00 | 2.3 Pipeline Alerting & Notifications | 3h |
| 13:00-16:00 | 2.4 Pipeline Metrics & Dashboards | 3h |

### Day 3 (6.5h): Logging + Docs + Validation

| Time | Task | Hours |
|------|------|-------|
| 09:00-12:00 | 2.5 Log Aggregation for Pipeline Debugging | 3h |
| 13:00-16:30 | 2.6 Documentation & Validation | 3.5h |

---

## Dependencies

```
Phase 1 (done) ──┬── 2.1 Helm + Release ──┬── 2.2 Pipeline Orchestration ──┐
                 │                         │                                │
                 ├── 2.3 Alerting ─────────┤                                ├── 2.6 Docs + Validation
                 │                         │                                │
                 ├── 2.4 Metrics ──────────┘                                │
                 │                                                          │
                 └── 2.5 Logging ───────────────────────────────────────────┘
```

**Day 1 parallel**: 2.1 first (Helm), then 2.2 (uses Helm chart)
**Day 2 parallel**: 2.3 (Alerting) and 2.4 (Metrics) are independent
**Day 3**: 2.5 (Logging) then 2.6 (Docs ties everything together)

---

## Progress

| Phase | Tasks | Done | Hours | Status |
|-------|-------|------|-------|--------|
| **Phase 1** | **80** | **80** | **16h** | **✅ Complete** |
| 2.1 Helm + Release Pipeline | 9 | 7 | 4h | 🚧 |
| 2.2 Pipeline Orchestration | 9 | 7 | 3.5h | 🚧 |
| 2.3 Pipeline Alerting | 9 | 0 | 3h | ⬜ |
| 2.4 Pipeline Metrics | 9 | 0 | 3h | ⬜ |
| 2.5 Pipeline Logging | 8 | 0 | 3h | ⬜ |
| 2.6 Docs & Validation | 10 | 0 | 3.5h | ⬜ |
| **Phase 2** | **54** | **14** | **20h** | **🚧 In Progress** |
| **Total** | **134** | **94** | **36h** | 🚧 70% |

---

## CI/CD Skills Learned

| Skill | Phase 1 | After Phase 2 |
|-------|---------|---------------|
| CI Pipeline (GitHub Actions) | ✅ 4 workflows | ✅ 6 workflows (+ orchestration) |
| CD Pipeline (ArgoCD + Helm) | Partial (manual) | ✅ Automated (CI triggers CD) |
| Environment Promotion | None | ✅ Dev (auto) → Staging (approval gate) |
| Release Management (Helm) | None | ✅ Install/Upgrade/Rollback |
| Pipeline Alerting | None | ✅ Slack + AlertManager |
| Pipeline Metrics | None | ✅ Pushgateway → Prometheus → Grafana |
| Pipeline Debugging (Logs) | None | ✅ Loki + Promtail → Grafana |
| Pipeline Dashboards | 2 basic | ✅ 6 (pipeline, tests, alerts, logs) |
| Interview Q&A | 35 | 50+ (CI/CD focused) |

**After Phase 2**: A complete CI/CD pipeline from code push to production deploy, with alerting, metrics, and logging at every stage.

---

**Last Updated**: 2026-03-03
**Version**: 2.1 (CI/CD focused)
