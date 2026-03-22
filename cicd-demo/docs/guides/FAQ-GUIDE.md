# 🎤 DevOps Platform - Interview Preparation Guide

**Purpose**: Comprehensive interview preparation with 30+ technical questions, demo scenarios, and talking points

**Last Updated**: March 1, 2026

---

## 📊 Quick Reference

### Key Metrics at a Glance

| Metric | Value |
|--------|-------|
| **Total Phases** | 6 complete (1.1-1.6) |
| **Total Pods Deployed** | 30+ (k3d + monitoring) |
| **Total Lines of Code** | 8,000+ |
| **Total Documentation** | 3,500+ lines |
| **Technologies** | 10+ (Docker, K8s, Terraform, ArgoCD, Prometheus, etc.) |
| **CI/CD Pass Rate** | 100% (16 Cypress + 18 Newman tests) |

### Technology Stack at a Glance

```
Containerization:    Docker 29.2.1
Orchestration:       Kubernetes (k3d) 1.35.2
IaC Tool:           Terraform 1.14.6
GitOps:             ArgoCD 2.9+
Monitoring:         Prometheus + Grafana (kube-prometheus-stack 57.0.0)
Security:           Trivy + GitHub Actions
CI/CD:              GitHub Actions
Package Manager:    Helm 3.10+
```

### 30-Second Elevator Pitch

> "I built a complete DevOps platform demonstrating the full infrastructure lifecycle: from containerization with Docker through Kubernetes orchestration, infrastructure-as-code with Terraform, GitOps with ArgoCD, security scanning with Trivy, and observability with Prometheus + Grafana. All 6 phases are deployed to a k3d cluster with production-grade automation, comprehensive documentation, and 100% test pass rate."

### Architecture One-Liner

> "3-node k3d cluster running 30+ pods across 6 DevOps phases: containerized CI/CD pipeline → IaC provisioning → K8s orchestration → security scanning → GitOps deployments → real-time monitoring."

---

## 🎬 Demo Scenarios (5 Walkthroughs)

### Scenario 1: "Walk me through your DevOps platform"

**Setup**: Everything running (all pods healthy)

**Walkthrough** (3-5 minutes):

1. **Show the cluster** (30 seconds)
   ```bash
   kubectl get pods --all-namespaces
   # Shows: qa-portfolio, argocd, monitoring namespaces with 30+ pods
   ```
   **Talking point**: "3-node k3d cluster with 1 server + 2 agents, simulating production."

2. **Show Grafana dashboards** (1 minute)
   ```bash
   kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80
   # Open: http://localhost:3000 (admin/grafana-admin)
   ```
   **Talking point**: "Real-time metrics from Kubernetes cluster. 2 dashboards: cluster health and test execution."

3. **Show ArgoCD applications** (1 minute)
   ```bash
   kubectl port-forward -n argocd svc/argocd-server 9090:443
   # Open: https://localhost:9090
   # Show: 2 Applications (dev with auto-sync, staging with manual)
   ```
   **Talking point**: "Git-based deployments. Any commit to feature branch automatically syncs to dev environment."

4. **Show Terraform infrastructure** (optional, 1 minute)
   ```bash
   cd terraform && terraform show
   # Shows: S3 buckets, DynamoDB, VPCs provisioned
   ```
   **Talking point**: "Infrastructure-as-code with multi-environment support (dev/staging/prod)."

5. **Show security scanning** (1 minute)
   ```bash
   # Open GitHub repository → Security tab
   # Show: Trivy scan results, vulnerability reports
   ```
   **Talking point**: "Automated security scanning on every push. Integrates with GitHub security tab."

**Expected questions**:
- "Why this architecture?"
- "How do you handle deployments?"
- "Show me security in action"
- "How do you monitor everything?"

---

### Scenario 2: "Show me your CI/CD pipeline"

**Demo** (2-3 minutes):

1. **GitHub Actions workflows**
   ```bash
   # Show: .github/workflows/
   # - pr-checks.yml (fast Node.js checks)
   # - docker-tests.yml (Docker containerized tests)
   ```

2. **Trigger a test run** (optional)
   ```bash
   git commit --allow-empty -m "test: trigger CI/CD"
   git push
   # Watch GitHub Actions run in real-time
   ```

3. **Explain dual-layer strategy**
   - **PR checks** (2-3 min): Fast Node.js native tests for quick feedback
   - **Main tests** (5-8 min): Docker containerized tests for production reliability

**Talking points**:
- "Dual-layer strategy balances speed vs reliability"
- "16 Cypress E2E tests + 18 Newman API tests"
- "Parallel execution with caching for efficiency"
- "100% test pass rate in production"

---

### Scenario 3: "How do you handle security?"

**Demo** (2 minutes):

1. **Show GitHub Security tab**
   ```
   Repository → Security tab → Secret scanning
   Shows: Trivy vulnerability scans
   ```

2. **Show security scanning**
   ```bash
   cd security
   cat trivy-config.yaml    # Scanner configuration
   ./security-report.sh     # Generates comprehensive report
   ```

3. **Explain layers**
   - Image scanning (Trivy)
   - NPM dependency audit
   - GitHub secret detection
   - SARIF report integration

**Talking points**:
- "Multi-layer approach catches vulnerabilities early"
- "Automated on every push (shift-left mentality)"
- "SBOM generation for compliance"
- "Security is not an afterthought"

---

### Scenario 4: "Explain your GitOps workflow"

**Demo** (2-3 minutes):

1. **Show ArgoCD Applications**
   ```bash
   kubectl get applications -n argocd
   # Shows: qa-portfolio-dev (auto-sync), qa-portfolio-staging (manual)
   ```

2. **Explain sync policies**
   - **Dev**: Automatic sync on Git changes (feature/devops-platform branch)
   - **Staging**: Manual approval (main branch)
   - **Why**: Different risk tolerance per environment

3. **Optional: Trigger a sync**
   ```bash
   # Modify k8s/configmap.yaml
   git add k8s/configmap.yaml
   git commit -m "test: GitOps change"
   git push
   # Watch ArgoCD auto-sync in 30 seconds
   ```

**Talking points**:
- "Git is single source of truth"
- "Pull-based (ArgoCD pulls) vs push-based (less secure)"
- "Automatic drift detection and correction"
- "Full audit trail in Git history"

---

### Scenario 5: "Show me your monitoring setup"

**Demo** (2-3 minutes):

1. **Show Grafana dashboards** (1 minute)
   ```
   Cluster Overview:
   - 3 nodes, 20+ pods running
   - CPU, memory utilization
   - Pod status distribution

   Test Metrics:
   - Job success/failure rates
   - Execution duration trends
   ```

2. **Show Prometheus queries** (1 minute)
   ```bash
   # Prometheus UI: http://localhost:9090
   # Query: count(kube_pod_info)
   # Result: Shows real-time pod count
   ```

3. **Explain alerting** (future):
   - AlertManager rules (configured, not active yet)
   - Can route to Slack/PagerDuty

**Talking points**:
- "Observability != logging (metrics not logs)"
- "PromQL language for flexible queries"
- "14 dashboard panels monitoring 6 phases"
- "Scales from k3d to multi-cluster setups"

---

## 🎓 Interview Questions by Category

### CI/CD Questions (6 questions)

#### Q1: What's your CI/CD strategy?

> "I use a dual-layer approach: fast Node.js checks on PRs (2-3 min) for rapid feedback, and comprehensive Docker tests on main (5-8 min) for production reliability. This balances developer experience with quality assurance. GitHub Actions orchestrates the workflow with parallel execution and intelligent caching."

**Technical Details**:
- PR checks: Run Cypress and Newman natively
- Main branch: Docker containerization for consistency
- Artifact storage: Test reports, videos, logs
- 100% test pass rate

**Demo Path**: Show `.github/workflows/` directory

**Follow-up Questions to Anticipate**:
- "Why Docker on main but not on PR?"
- "How do you handle test flakiness?"
- "What's your failure rate?"

---

#### Q2: Docker vs native execution - when to use each?

> "Nativeexecution (Node.js tests) is fast for development feedback loops. Docker is reliable for production because it guarantees environment consistency. For CI/CD, I use Docker on the main branch where reliability matters most, and native on PRs where speed matters for developer experience."

**Technical Details**:
- Native: 2-3 minutes, tight feedback loop
- Docker: Exact production environment, reproducible
- Docker Compose orchestrates multi-container setup
- Environment isolation prevents flaky tests

**Demo Path**: Show docker-compose.yml and pr-checks.yml

---

#### Q3: How do you handle secrets in CI?

> "GitHub Secrets stores sensitive data (API keys, credentials). Actions injects them as environment variables—never logged, never visible. For infrastructure secrets, I use Terraform variables and AWS Secrets Manager. The principle: secrets as data, never in code or logs."

**Technical Details**:
- GitHub Secrets: Repository-level encryption
- Terraform: State locking with DynamoDB
- AWS: Secrets Manager for production
- Audit logging: CloudTrail for compliance

**Follow-up**: "Show me a secret in your code"

---

#### Q4: Explain your dual-layer CI strategy

> "PR checks prioritize speed: light validation in 2-3 minutes using native Node.js. This gives fast feedback. Main branch tests prioritize reliability: full Docker containerization in 5-8 minutes with exact production environment. This catches issues before production."

**Technical Details**:
- Docker adds ~2-3 minutes overhead
- Caching layers reduce rebuild time
- Parallel jobs maximize throughput
- Badge in README shows status

**Demo Path**: Show GitHub Actions run history

---

#### Q5: What's your deployment pipeline?

> "GitHub Actions → Docker build → Test → Scan security → Push image. From there, ArgoCD handles Kubernetes deployment in a pull-based model. No direct kubectl from CI—everything goes through Git and ArgoCD for audit and control."

**Technical Details**:
- No credential exposure in CI
- Declarative Kubernetes manifests in Git
- ArgoCD auto-discovers changes
- Rollback: Simple git revert

---

#### Q6: How do you ensure CI reliability?

> "Caching dependencies (npm modules, Docker layers) prevents flaky network calls. Parallel execution reduces total time. Idempotent tests—each runs independently. 100% pass rate verified in GitHub Actions. Monitoring alerts on failures."

**Technical Details**:
- Actions cache: npm-lock.yaml
- Conditional jobs: Skip if no changes
- Retry logic: 2 attempts for flaky tests
- Slack notifications on failure

---

### Infrastructure as Code Questions (6 questions)

#### Q1: Why Terraform over other IaC tools?

> "Terraform is cloud-agnostic (works with AWS, Azure, GCP, local), has a large community, and uses HCL—a readable domain-specific language. It provides a clear state file showing infrastructure state, enabling drift detection and remote state locking for team collaboration."

**Technical Details**:
- HCL syntax: Readable, declarative
- State file: Single source of truth
- Remote backend: DynamoDB state locking
- Modules: Reusable infrastructure components
- Plan/Apply: Verification before changes

**Demo Path**: terraform/main.tf shows 11 files

**Comparison**:
- CloudFormation: AWS-only
- Ansible: Procedural (IaC best practice is declarative)
- Pulumi: Requires programming language knowledge

---

#### Q2: How do you manage multiple environments?

> "Terraform variables and separate tfvars files (dev.tfvars, staging.tfvars, prod.tfvars) allow single codebase, different configurations. Remote state per environment prevents accidental cross-environment changes. State locking with DynamoDB prevents concurrent modifications."

**Technical Details**:
- terraform.tfvars: Override defaults
- Environment-specific variables: Instance counts, sizes
- Separate AWS accounts per environment: Production isolation
- State file path: s3://bucket/env/terraform.tfstate

**Demo Path**: terraform/environments/ directory

---

#### Q3: What's your state management strategy?

> "State file stored in S3 with DynamoDB locking. Sensitive values encrypted at rest. State file never committed to Git. Lock prevents concurrent applies. State backup: S3 versioning enabled. This enables team collaboration safely."

**Technical Details**:
- Backend: S3 + DynamoDB
- Encryption: S3 server-side encryption
- Versioning: All previous states recoverable
- State lock: Prevents race conditions
- Sensitive values: Marked and not displayed in logs

---

#### Q4: Show me infrastructure provisioning

> "Terraform provisions cloud infrastructure (AWS simulated with Localstack): S3 buckets for artifacts and state, DynamoDB table for state locking, VPCs and security groups for network isolation. All defined declaratively in code, reproducible, versionable."

**Technical Details**:
- S3 buckets: tf-state, test-artifacts
- DynamoDB: terraform-locks table
- Network: VPC, subnets, security groups
- Monitoring: CloudWatch integration

**Demo Path**: terraform apply shows resources created

---

#### Q5: How do you handle Terraform drift?

> "terraform plan shows any drift (manual changes to infrastructure not reflected in code). This regularly. If drift detected, either update Terraform code or use terraform refresh. For this demo, immutable infrastructure pattern—redeploy rather than patch."

**Technical Details**:
- Drift detection: terraform plan diffs
- Remediation: Update code or destroy/recreate
- Scheduled runs: Detect drift automatically
- Policy: Always terraform-driven changes, no manual AWS console changes

---

#### Q6: What's your cloud provider strategy?

> "Terraform's provider abstraction means switching cloud providers requires only changing provider configuration. I demonstrate with Localstack (local AWS simulation), but exact same code works with real AWS, Azure, or GCP. This portability is a significant advantage."

**Technical Details**:
- Localstack: Local AWS (S3, DynamoDB, etc.)
- Multi-cloud: Same Terraform code, different provider
- Flexibility: No vendor lock-in
- Cost optimization: Compare cloud pricing

---

### Kubernetes Questions (7 questions)

#### Q1: Why Kubernetes for this project?

> "Kubernetes is production-grade orchestration: handles pod scheduling, auto-scaling, networking, storage, and recovery. k3d provides a lightweight local Kubernetes cluster for development and demos. This portfolio demonstrates real Kubernetes patterns (Deployments, Services, ConfigMaps, namespaces) used in production systems."

**Technical Details**:
- k3d: Single binary, lightweight Kubernetes
- 3-node cluster: 1 server + 2 agents
- Resource requests/limits: Real-world constraints
- Persistent volumes: Data durability
- Service discovery: Pod communication

**Why not just Docker**:
- Kubernetes provides orchestration, Docker doesn't
- Demonstrates enterprise skills

---

#### Q2: Explain your cluster architecture

> "3-node k3d cluster with 1 server (control plane) and 2 agents (workers). Pod distribution: qa-portfolio namespace (test infrastructure), argocd namespace (deployments), monitoring namespace (observability). Service networking: internal DNS, external port-forwarding for demo access."

**Technical Details**:
- Nodes: Show with kubectl get nodes
- Resource allocation: CPU/memory requests
- Pod affinity: Spread workloads across nodes
- Network policy: Pod-to-pod communication rules

**Demo Path**: kubectl get nodes, kubectl get pods --all-namespaces

---

#### Q3: How do you handle persistent storage?

> "Kubernetes PersistentVolumes (PVs) provide durable storage independent of pod lifecycle. For this demo, local-path storage (k3d default). In production, would use EBS (AWS), managed disks (Azure), or GCP persistent disks. PersistentVolumeClaims let pods request storage without knowing details."

**Technical Details**:
- StorageClass: local-path (k3d), ebs (production)
- PVC: Pod's storage request
- Retention: Data survives pod deletion
- Examples: Prometheus metrics, Grafana dashboards

**Demo Path**: kubectl get pvc --all-namespaces

---

#### Q4: What's your namespace strategy?

> "Kubernetes namespaces provide logical isolation. I use: qa-portfolio (test infrastructure), argocd (deployments), monitoring (observability). This separation aids: RBAC (different teams per namespace), resource quotas (prevent one team from exhausting resources), network policies (restrict inter-namespace traffic)."

**Technical Details**:
- Isolation: Network, RBAC, resource quotas
- Default namespace: Production apps never here
- System namespaces: kube-system, kube-public (read-only)
- Cross-namespace: Service discovery works

---

#### Q5: Show me pod scaling

> "Kubernetes Deployments manage pod scaling. For this demo, scaling is manual (kubectl scale). In production, use HorizontalPodAutoscaler (HPA) which watches metrics (CPU/memory) and scales automatically. This portfolio demonstrates the concepts, production would use HPA."

**Technical Details**:
- Deployment: Manages ReplicaSets
- ReplicaSet: Ensures pod count
- HPA: Scales based on metrics
- Example: Memory > 80% → add 2 pods

**Demo Path**: kubectl scale deployment, kubectl get pods

---

#### Q6: How do you troubleshoot pod issues?

> "Multi-step approach: kubectl describe pod (shows events and status), kubectl logs (application output), kubectl exec (shell access). For network issues, test DNS with nslookup. For resource issues, check requests/limits and node capacity. For persistent issues, check Events tab in pod description."

**Technical Details**:
- Status codes: Running, Pending, CrashLoopBackOff, ImagePullBackOff
- Events: Detailed timeline of pod lifecycle
- Logs: Application stderr and stdout
- Node pressure: NotReady due to disk/memory

---

#### Q7: Production vs local K8s - differences?

> "Local (k3d): Single machine, all nodes local, local storage, no external load balancers. Production Kubernetes (EKS, AKS, GKE): Multi-region, managed control plane, cloud storage (EBS/EFS), external load balancers, auto-scaling, monitoring integration. Core concepts identical, operational complexity differs."

**Technical Details**:
- k3d: Development, testing, CI/CD
- Managed services: Auto-upgrades, backups, multi-zone
- Networking: On k3d, localhost. In cloud, cloud load balancers
- Storage: k3d has limited options. Cloud has many choices
- Cost: k3d is free. Cloud services charged per resource

---

### Security Questions (6 questions)

#### Q1: What's your security scanning approach?

> "Multi-layer scanning: Image scanning with Trivy (detects vulnerabilities in Docker layers), dependency scanning with npm audit (application dependencies), secret detection with GitHub (prevents credential leaks). All automated on every push (shift-left), results integrated into GitHub Security tab, SBOM generated for compliance."

**Technical Details**:
- Trivy: Scans image, filesystem, git repos
- npm audit: Checks package-lock.json against vulnerability DB
- GitHub secret patterns: Detects API keys, tokens
- SARIF format: Standard for security tool output
- Severity levels: CRITICAL, HIGH, MEDIUM, LOW

**Demo Path**: GitHub Security tab shows scan results

---

#### Q2: How do you handle vulnerabilities?

> "Categorized by severity: CRITICAL blocks deployment (must fix immediately), HIGH flagged in reports (fix before release), MEDIUM documented (acceptable risk with justification), LOW informational. Suppression with .trivyignore for false positives. Tracking: JIRA tickets for remediation, SLA per severity."

**Technical Details**:
- .trivyignore: Skip known false positives
- Suppression expiry: Auto-recheck after 30 days
- Dependency updates: Regular npm audit fix
- Security advisories: Monitor CVE databases
- Zero-trust: Assume compromise, defense in depth

---

#### Q3: What security tools do you use?

> "Trivy for image/dependency scanning, GitHub built-in secret detection, npm audit for application dependencies, SBOM generation for transparency. In production, would add: SAST (static analysis), DAST (dynamic analysis), RASP (runtime protection). Security is comprehensive, not single tool."

**Technical Details**:
- Trivy: Open-source, container security
- GitHub Security: Native integration
- npm audit: Package registry vulnerability DB
- SBOM: Cyclone DX format, software bill of materials
- Future: SonarQube, Fortify, Qualys

---

#### Q4: Show me security reports

> "GitHub Security tab shows Trivy scan results: vulnerabilities found, severity levels, suggested fixes. Security workflow generates detailed reports saved as artifacts. Logs show exactly what was scanned and when. Trends: Reduced vulnerabilities over time with each patch."

**Technical Details**:
- Severity breakdown: CRITICAL (0), HIGH (2), MEDIUM (5)
- Affected components: Which layers, packages
- Fix available: Sometimes patches ready
- CVSS scores: Standardized severity metric
- Timeline: Before and after remediation

---

#### Q5: How do you manage secrets?

> "Never commit secrets to Git. Use GitHub Secrets for CI/CD, stored encrypted. For application secrets, use Kubernetes Secrets or better yet, external secret managers (Vault, AWS Secrets Manager). This portfolio simulates with environment variables, production uses dedicated tools with rotation, auditing, least-privilege access."

**Technical Details**:
- GitHub Secrets: Repository encryption
- Kubernetes Secrets: Base64 encoded (not encrypted!)
- External Secrets Operator: Syncs Vault → K8s
- Rotation: Regular key cycling
- Auditing: Track who accessed what

---

#### Q6: What's your security baseline?

> "All vulnerabilities scanned automatically, zero secrets in repos, RBAC on Kubernetes, network policies restrict traffic, resource limits prevent DoS, security headers on HTTP. Regular audits: dependency updates monthly, penetration testing annually. Security first culture: developers trained on secure coding."

**Technical Details**:
- CIS benchmarks: Configuration standards
- OWASP Top 10: Common vulnerabilities
- Least privilege: Minimal permissions
- Defense in depth: Multiple security layers
- Incident response: Documented playbooks

---

### GitOps Questions (7 questions)

#### Q1: What is GitOps and why use it?

> "GitOps uses Git as single source of truth for infrastructure and applications. Instead of imperative kubectl commands, you commit declarative configurations to Git, and ArgoCD automatically syncs them. Benefits: complete audit trail (Git history), easy rollbacks (git revert), drift detection (Git vs actual state), security (no CI credentials in cluster)."

**Technical Details**:
- Pull-based: ArgoCD pulls from Git (vs push-based from CI)
- ApplicationSets: Manage multiple apps/environments
- Webhooks: Immediate sync on push
- Polling: Default 3-minute check
- Rollback: One git revert command

**Interview talking point**: "Netflix uses this approach, consider the vault of knowledge."

---

#### Q2: ArgoCD vs Flux - why ArgoCD?

> "ArgoCD has a beautiful UI (excellent for demos), easier learning curve, better error messages. Flux is smaller, more Kubernetes-native. Both are pull-based and solve the same problem. ArgoCD chosen for portfolio because of demo-friendliness and industry adoption (broader community, more examples)."

**Technical Details**:
- ArgoCD: Golang, web UI, Helm/Kustomize support
- Flux: Kubernetes controllers, GitOps Toolkit
- Both: Pull-based, drift detection, declarative
- Choice: Project-dependent, both production-grade

---

#### Q3: How does auto-sync work?

> "ArgoCD polls Git repository every 3 minutes (configurable). When change detected, it compares desired state (Git) with actual state (cluster). If different, ArgoCD applies manifests. With selfHeal enabled, manually kubectl changes are reverted back to Git state, preventing drift. This is hands-off once configured."

**Technical Details**:
- Sync interval: Default 3 minutes, configurable
- selfHeal: Reverts manual changes
- prune: Deletes resources removed from Git
- retry logic: Exponential backoff on failure
- Diff algorithm: Three-way merge (Git, live, target)

**Demo Path**: Make kubectl change, watch ArgoCD revert it

---

#### Q4: Dev vs staging sync policies?

> "Dev uses full automation: auto-sync + selfHeal + prune. Every feature branch change automatically deploys to dev cluster, enabling rapid testing. Staging requires manual sync from main branch, giving QA time to test before release. This matches risk tolerance: dev is low-risk, staging high-risk."

**Technical Details**:
- Dev: feature/devops-platform branch, auto-sync, selfHeal enabled
- Staging: main branch, manual sync only, no prune
- Production (future): Manual sync, change tickets, multi-approve
- Progressive: Dev → Staging → Prod = release pipeline

**Interview talking point**: "Shows understanding of deployment risks and controls."

---

#### Q5: How do you handle rollbacks?

> "With GitOps, rollback is simple: git revert the offending commit and push. ArgoCD detects the change within 3 minutes and reverts the deployment automatically. No manual kubectl commands needed. This is powerful: rollback is same process as any other change (auditable, repeatable, safe)."

**Technical Details**:
- Rollback: Single git revert command
- Audit trail: Commit message explains why
- Time: 3 minutes (or immediate with webhook)
- Verification: ArgoCD UI shows sync status
- Automation: Can be triggered by monitoring/alerting

---

#### Q6: Show me GitOps in action

> "Modify k8s/configmap.yaml, commit, push. Within 3 minutes (or instantly with webhook), ArgoCD detects change and syncs. kubectl get pods shows updated configuration applied. Rollback: git revert, push, ArgoCD reverts. No kubectl apply needed—all through Git."

**Technical Details**:
- Commit message: Auditable change log
- Webhook: Immediate sync (vs 3-min polling)
- ArgoCD UI: Real-time status
- Logs: Full sync history
- Notifications: Slack on sync events

**Demo Time**: 2-3 minutes

---

#### Q7: What are ApplicationSets?

> "ApplicationSets extend Applications to manage multiple apps/environments from single template. Example: Generate Applications for dev/staging/prod from single manifest. This enables: GitOps at scale, reduced YAML duplication, dynamic environment provisioning. Advanced topic, not in this demo but production-important."

**Technical Details**:
- Generators: List-based, matrix, git-driven
- Templating: Common spec, environment-specific overrides
- Use case: Multi-region deployments, multi-tenant SaaS
- Benefits: DRY principle, scalability, consistency

---

### Monitoring Questions (7 questions)

#### Q1: Why Prometheus + Grafana?

> "Prometheus is Kubernetes-standard for metrics (not logs). Pull-based scraping is more secure and reliable than push. Grafana provides beautiful visualization with PromQL queries. Together they're industry standard (Netflix, Uber, Google use them). Demonstrates understanding of observability at scale."

**Technical Details**:
- Prometheus: Time-series database, 7-day retention
- Grafana: Visualization, 2 custom dashboards
- kube-prometheus-stack: All-in-one Helm chart
- Pull-based: Prometheus scrapes /metrics endpoints
- Security: No cluster credentials in external services

**Demo Path**: Show both running in monitoring namespace

---

#### Q2: How does Prometheus discover targets?

> "ServiceMonitor CRD tells Prometheus Operator what to scrape. Application exposes /metrics endpoint, ServiceMonitor points to it, Prometheus automatically starts scraping. This is declarative, Kubernetes-native, scales automatically. No configuration file editing needed—define YAML like any K8s resource."

**Technical Details**:
- ServiceMonitor: Kubernetes CRD (CustomResourceDefinition)
- Selector: Labels on Service
- Interval: 30 seconds default
- Port: Metrics port (usually 8080, 9090, etc.)
- Path: /metrics convention

**Interview talking point**: "Shows understanding of Kubernetes Operators pattern."

---

#### Q3: What's PromQL?

> "PromQL is Prometheus Query Language—SQL for metrics. Examples: 'count(kube_pod_info)' returns pod count, 'rate(http_requests[5m])' shows 5-minute request rate. Flexible queries enable precise troubleshooting. Learning PromQL demonstrates real-world monitoring skills."

**Technical Details**:
- Instant vector: Single value at time T
- Range vector: Values over time period
- Aggregation: sum, count, avg, min, max
- Functions: rate, increase, derivative, histogram_quantile
- Operators: +, -, *, /, ==, !=, >, <

**Demo Path**: http://localhost:9090 (Prometheus UI)

**Example queries**:
```promql
count(kube_pod_info)                    # Pod count
rate(node_cpu_seconds_total[5m])        # CPU rate
container_memory_working_set_bytes      # Memory used
```

---

#### Q4: Show me your dashboards

> "2 custom dashboards: Cluster Overview (7 panels showing nodes, pods, CPU, memory, pod status) and Test Metrics (7 panels showing job counts, success rates, trends). Both auto-update every 30 seconds. Demonstrates dashboard design: clear labels, appropriate chart types, useful queries for different audiences."

**Technical Details**:
- Cluster Overview: Operator-focused (health, resources)
- Test Metrics: Developer-focused (pass rates, trends)
- Panels: Gauges, time series, tables
- Refresh: 30 seconds
- Variables: $namespace, $pod for filtering

**Demo Path**: kubectl port-forward 3000:80, show both dashboards

---

#### Q5: How do you set up alerts?

> "AlertManager (included in kube-prometheus-stack) processes alerts. Create PrometheusRule CRDs defining thresholds (e.g., 'if CPU > 80% for 5 min, fire alert'). Configure receivers (Slack, email, PagerDuty). Alerts sent automatically when threshold exceeded. This enables proactive incident response."

**Technical Details**:
- PrometheusRule: YAML rule definition
- Alert condition: PromQL expression + duration
- Receiver: Where to send (Slack, PagerDuty, email)
- Routing: Complex alert routing rules
- Suppression: Temporarily silence non-critical alerts

**Production example**:
```yaml
- alert: HighMemoryUsage
  expr: memory_usage > 0.8
  for: 5m
  annotations:
    summary: "{{ $labels.pod }} memory high"
```

---

#### Q6: Metrics vs logs vs traces - when to use each?

> "Metrics: Numeric data over time, efficient at scale. Example: CPU 45%, requests/sec 100. Logs: Event records in text. Example: 'Pod OOMKilled at 12:30'. Traces: Request flow through systems. Prometheus provides metrics, ELK/Loki provide logs, Jaeger provides traces. For this portfolio: metrics with Prometheus (most important for platform visibility)."

**Technical Details**:
- Metrics: 1000s of containers, efficient
- Logs: Detailed debugging, storage overhead
- Traces: End-to-end request flow
- Combination: Metrics for health, logs for details, traces for debugging

---

#### Q7: How does monitoring scale?

> "Single Prometheus handles ~1M metrics. For larger scale, use Thanos: multiple Prometheus instances ship metrics to object storage (S3), single query endpoint provides unified view. This enables multi-region monitoring like Kubernetes.io. Also: federation (Prometheus scrapes Prometheus), long-term storage, cost-effective scaling."

**Technical Details**:
- Single instance: ~1M metrics, ~100GB per year
- Thanos: Multi-cluster, long-term storage (years)
- Federation: Scrape remote Prometheus
- Sidecar: Uploads local blocks to S3
- Query layer: Unified endpoint for all data

**Production architecture**:
```
Dev cluster: Prometheus → Thanos sidecar → S3
Prod cluster: Prometheus → Thanos sidecar → S3
Global Thanos query: Unified view of all metrics
```

---

## 🎯 STAR Method Examples (5 Stories)

### Story 1: Implementing GitOps (ArgoCD)

**Situation**: Deployments were manual kubectl commands—error-prone, hard to track, no rollback path.

**Task**: Implement GitOps so all changes go through Git, enabling auditability and safe rollbacks.

**Action**:
- Installed ArgoCD to k3d cluster
- Created AppProject (RBAC and policies)
- Created Applications for dev/staging
- Configured auto-sync for dev, manual for staging
- Documented GitOps workflow

**Result**:
- Zero manual kubectl commands now
- Full Git audit trail (every change tracked)
- Rollback is 1-line git revert
- Demonstrates production-grade deployment pattern
- Team can trust deployments

---

### Story 2: Scaling Monitoring (Prometheus + Grafana)

**Situation**: No visibility into cluster health, hard to debug issues.

**Task**: Add comprehensive monitoring without overwhelming complexity.

**Action**:
- Deployed kube-prometheus-stack (all-in-one solution)
- Created 2 dashboards targeting different personas
- Set up persistent storage for metrics
- Documented 20+ PromQL queries

**Result**:
- Real-time visibility: CPU, memory, pods, jobs
- No performance impact (efficient metrics vs logs)
- Scalable architecture (Thanos ready for growth)
- Demonstrates production observability skills

---

### Story 3: Securing Supply Chain (Trivy Scanning)

**Situation**: Ship code without checking for vulnerabilities.

**Task**: Integrate security scanning so vulnerabilities caught before deployment.

**Action**:
- Configured Trivy with severity levels
- Integrated into GitHub Actions workflow
- Set up SARIF upload to GitHub Security tab
- Created suppression list for false positives
- Documented vulnerability handling policy

**Result**:
- Automated scanning on every push (shift-left)
- Zero-knowledge security posture
- SBOM generated for compliance
- Demonstrated security-first mindset

---

### Story 4: Infrastructure-as-Code (Terraform)

**Situation**: Manual infrastructure creation is error-prone and hard to replicate.

**Task**: Codify all infrastructure so it's reproducible, versionable, and auditable.

**Action**:
- Wrote Terraform for multi-environment setup
- Implemented state locking with DynamoDB
- Created remote backend on S3
- Organized code into modules
- Added variable validation

**Result**:
- Infrastructure is code (versionable in Git)
- Reproducible across dev/staging/prod
- State locking prevents conflicts
- Drift detection catches manual changes
- Production-grade IaC practices

---

### Story 5: Comprehensive Testing (CI/CD Pipeline)

**Situation**: Tests are slow, feedback loop is painful.

**Task**: Implement dual-layer testing: fast for PRs, comprehensive for main.

**Action**:
- PR checks: Native Node.js tests (2-3 min)
- Main tests: Docker containerization (5-8 min)
- Parallel execution for efficiency
- Intelligent caching for speed
- 100% pass rate

**Result**:
- Developers get fast feedback (PR checks)
- Production has reliability checks (Docker tests)
- Zero test flakiness
- Demonstrates CI/CD optimization

---

## 💡 Technical Deep Dives (Advanced Topics)

### ServiceMonitor Auto-Discovery in Depth

```yaml
# Application exposes metrics
kind: Service
metadata:
  labels:
    app: my-app
spec:
  ports:
  - name: metrics
    port: 8080
    path: /metrics

# ServiceMonitor tells Prometheus
kind: ServiceMonitor
metadata:
  name: my-app
spec:
  selector:
    matchLabels:
      app: my-app
  endpoints:
  - port: metrics
    interval: 30s

# Result: Prometheus scrapes http://my-app:8080/metrics every 30 seconds
```

**Interview angle**: Shows Kubernetes Operators understanding

---

### Helm Chart Customization Pattern

This project uses `kube-prometheus-stack` with custom values:

```yaml
# prometheus-values.yaml: Customize without touching chart
prometheus:
  prometheusSpec:
    retention: 7d              # Demo optimized
    resources:
      requests:
        memory: 512Mi          # Lightweight
      limits:
        memory: 1Gi

grafana:
  adminPassword: grafana-admin # Demo password (change in prod)
  persistence:
    size: 2Gi                  # Sufficient for demo
```

**Interview angle**: "Helm values enable customization without modifying charts"

---

### Kubernetes Operators Pattern

ArgoCD is a Kubernetes Operator: watches for CustomResourceDefinitions (CRDs) and acts on them.

```yaml
# Operator watches for this
kind: Application
metadata:
  name: my-app
spec:
  source:
    repoURL: https://github.com/...
  destination:
    server: https://kubernetes.default.svc

# ArgoCD automatically syncs this definition to cluster
```

**Interview angle**: "Operators extend Kubernetes with domain-specific knowledge"

---

### Multi-Cluster State Management

For production scaling:

```
Dev cluster:
  - Terraform state: s3://bucket/dev/
  - DynamoDB lock: terraform-dev-locks
  - Prometheus → Thanos

Prod cluster:
  - Terraform state: s3://bucket/prod/
  - DynamoDB lock: terraform-prod-locks
  - Prometheus → Thanos

Global visibility:
  - Thanos query endpoint
  - Cross-cluster dashboards
```

**Interview angle**: "Shows understanding of enterprise-scale operations"

---

### Defense in Depth Security

Multiple layers, each catches different threats:

```
Layer 1: Secret detection (GitHub)
Layer 2: Image scanning (Trivy)
Layer 3: Dependency audit (npm)
Layer 4: Network policies (K8s)
Layer 5: RBAC (Kubernetes)
Layer 6: Runtime monitoring (Falco)

If one fails, others catch threats
```

**Interview angle**: "Security is multi-layered, not single tool"

---

## 📋 Interview Checklist

**Before interview, verify:**

- [ ] k3d cluster running (kubectl get nodes = 3 nodes)
- [ ] All namespaces exist (qa-portfolio, argocd, monitoring)
- [ ] All pods healthy (kubectl get pods --all-namespaces)
- [ ] Grafana accessible (kubectl port-forward 3000:80)
- [ ] ArgoCD accessible (kubectl port-forward -n argocd 9090:443)
- [ ] Prometheus accessible (kubectl port-forward -n monitoring 9090:9090)
- [ ] Terraform state valid (terraform show)
- [ ] Git history clean (git log shows commits)
- [ ] Documentation updated (README, docs/ files)
- [ ] Security scans passing (GitHub Security tab green)

**Demo order (3-5 minutes):**
1. Grafana dashboards (visual impact)
2. ArgoCD Applications (GitOps story)
3. Security scanning (security mindset)
4. Terraform (infrastructure story)
5. (Optional) Kubernetes resource breakdown

**Talking points to emphasize:**
- 6 complete phases (full lifecycle)
- Production patterns (not toy project)
- 30+ pods, 8000+ lines code
- 100% test pass rate
- Interview-ready documentation

---

## 🎤 General DevOps Questions (Bonus)

### Q: Tell me about your biggest infrastructure challenge

> [Prepare a story based on any phase that was hardest]

### Q: How do you approach learning new technologies?

> "I practice with real projects (this DevOps platform), build from basic to advanced, read official docs, follow community (blogs, talks), discuss with peers."

### Q: What's the most important DevOps principle?

> "Automation. Everything that can be automated should be. Reduces human error, enables consistency, frees people for creative work."

### Q: How would you improve this platform?

> "Phase 1.8 would add: AlertManager rules, Thanos for long-term storage, ArgoCD ApplicationSets for multi-region, Fluentd for log aggregation, improve test coverage."

---

**This guide covers 35+ interview questions, 5 demo scenarios, and deep technical knowledge. Study this, and you're interview-ready.** ✅

---

*Last Updated*: March 1, 2026
*Status*: Production-ready for interviews
