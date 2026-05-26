# Manual Verification Guide - DevOps Platform (Phases 1.1-1.5)

This guide provides step-by-step instructions to manually verify all implemented phases of the DevOps Platform.

**Last Updated**: March 1, 2026
**Phases Covered**: 1.1 - 1.5

---

## Table of Contents

1. [Phase 1.1: Environment Preparation](#phase-11-environment-preparation)
2. [Phase 1.2: Infrastructure as Code](#phase-12-infrastructure-as-code)
3. [Phase 1.3: Kubernetes Deployment](#phase-13-kubernetes-deployment)
4. [Phase 1.4: Security Integration](#phase-14-security-integration)
5. [Phase 1.5: GitOps Implementation](#phase-15-gitops-implementation)

---

## Phase 1.1: Environment Preparation

### Verification Steps

#### 1. Verify Docker Installation

```bash
# Check Docker version
docker version

# Expected output: Server version (e.g., 29.2.1)
```

**✅ Pass Criteria**: Docker version displays without errors

#### 2. Verify kubectl Installation

```bash
# Check kubectl version
kubectl version --client

# Expected output: Client Version v1.x.x
```

**✅ Pass Criteria**: kubectl version displays

#### 3. Verify k3d Installation

```bash
# Check k3d version
k3d version

# Expected output: k3d version v5.x.x
```

**✅ Pass Criteria**: k3d version displays

#### 4. Verify Terraform Installation

```bash
# Check Terraform version
terraform version

# Expected output: Terraform v1.x.x
```

**✅ Pass Criteria**: Terraform version displays

#### 5. Verify Helm Installation

```bash
# Check Helm version
helm version

# Expected output: version.BuildInfo{Version:"v3.x.x"...}
```

**✅ Pass Criteria**: Helm version displays

#### 6. Verify k3d Cluster

```bash
# List k3d clusters
k3d cluster list

# Expected output:
# NAME           SERVERS   AGENTS   LOADBALANCER
# qa-portfolio   1/1       2/2      true
```

**✅ Pass Criteria**: qa-portfolio cluster shows 1 server, 2 agents, loadbalancer enabled

#### 7. Verify Cluster Access

```bash
# Check cluster nodes
kubectl get nodes

# Expected output: 3 nodes (1 server, 2 agents) in Ready status
```

**✅ Pass Criteria**: All 3 nodes show STATUS = Ready

### Phase 1.1 Checklist

- [ ] Docker installed and running
- [ ] kubectl installed
- [ ] k3d installed
- [ ] Terraform installed
- [ ] Helm installed
- [ ] k3d cluster created (qa-portfolio)
- [ ] 3 nodes running (1 server + 2 agents)
- [ ] All nodes in Ready status

---

## Phase 1.2: Infrastructure as Code

### Verification Steps

#### 1. Verify Terraform Directory Structure

```bash
cd cicd-demo/terraform

# List directory structure
ls -R

# Expected structure:
# .
# ├── backend.tf
# ├── environments/
# │   ├── dev.tfvars
# │   ├── production.tfvars
# │   └── staging.tfvars
# ├── main.tf
# ├── modules/
# ├── outputs.tf
# ├── provider.tf
# └── variables.tf
```

**✅ Pass Criteria**: All files present

#### 2. Verify Terraform Configuration

```bash
# Initialize Terraform
terraform init

# Expected output: "Terraform has been successfully initialized!"
```

**✅ Pass Criteria**: Initialization successful

#### 3. Validate Terraform Configuration

```bash
# Validate configuration
terraform validate

# Expected output: "Success! The configuration is valid."
```

**✅ Pass Criteria**: Validation successful

#### 4. Review Terraform Plan

```bash
# Generate plan for dev environment
terraform plan -var-file=environments/dev.tfvars

# Expected output: Shows resources to be created (S3, IAM, CloudWatch, etc.)
```

**✅ Pass Criteria**: Plan completes without errors, shows expected resources

#### 5. Verify Environment Files

```bash
# Check each environment file exists
ls -l environments/

# Expected output: 3 files (dev.tfvars, staging.tfvars, production.tfvars)
```

**✅ Pass Criteria**: All 3 environment files present

#### 6. Check Terraform State (if applied)

```bash
# List resources in state
terraform state list

# Expected output: List of AWS resources (if applied)
```

**✅ Pass Criteria**: Resources match expected configuration

### Phase 1.2 Checklist

- [ ] Terraform directory structure correct
- [ ] All .tf files present (main, variables, outputs, provider, backend)
- [ ] 3 environment files present (dev, staging, production)
- [ ] `terraform init` successful
- [ ] `terraform validate` successful
- [ ] `terraform plan` runs without errors
- [ ] Provider configured for Localstack

---

## Phase 1.3: Kubernetes Deployment

### Verification Steps

#### 1. Verify K8s Directory Structure

```bash
cd cicd-demo/k8s

# List all files
ls -l

# Expected files:
# - namespace.yaml
# - configmap.yaml
# - deployment.yaml
# - service.yaml
# - ingress.yaml
# - pvc.yaml
# - job-cypress.yaml
# - job-newman.yaml
# - deploy-to-k8s.sh
# - README.md
```

**✅ Pass Criteria**: All 10 files present

#### 2. Verify Namespace

```bash
# Check if qa-portfolio namespace exists
kubectl get namespace qa-portfolio

# Expected output: qa-portfolio namespace in Active status
```

**✅ Pass Criteria**: Namespace exists and is Active

#### 3. Verify Deployments

```bash
# List deployments in qa-portfolio namespace
kubectl get deployments -n qa-portfolio

# Expected output: test-results-server deployment
```

**✅ Pass Criteria**: Deployment exists and READY shows 1/1

#### 4. Verify Pods

```bash
# List pods
kubectl get pods -n qa-portfolio

# Expected output: test-results-server pod in Running status
```

**✅ Pass Criteria**: Pod status is Running, READY shows 1/1

#### 5. Verify Services

```bash
# List services
kubectl get svc -n qa-portfolio

# Expected output: test-results-server service
```

**✅ Pass Criteria**: Service exists with ClusterIP

#### 6. Verify ConfigMaps

```bash
# List configmaps
kubectl get configmap -n qa-portfolio

# Expected output: test-config configmap
```

**✅ Pass Criteria**: ConfigMap exists

#### 7. Verify Persistent Volume Claims

```bash
# List PVCs
kubectl get pvc -n qa-portfolio

# Expected output: PVCs for test results and cache
```

**✅ Pass Criteria**: PVCs exist and are Bound

#### 8. Test Deployment Script

```bash
# Run deployment script (dry-run)
./deploy-to-k8s.sh --dry-run

# Expected output: Script validates without errors
```

**✅ Pass Criteria**: Script runs successfully

### Phase 1.3 Checklist

- [ ] k8s directory with all manifests
- [ ] qa-portfolio namespace created
- [ ] Deployment created (test-results-server)
- [ ] Pod running (1/1 Ready)
- [ ] Service created
- [ ] ConfigMap created
- [ ] PVCs created and bound
- [ ] Deployment script executable
- [ ] README.md documentation present

---

## Phase 1.4: Security Integration

### Verification Steps

#### 1. Verify Security Directory Structure

```bash
cd cicd-demo/security

# List files
ls -l

# Expected files:
# - README.md
# - trivy-config.yaml
# - security-report.sh
```

**✅ Pass Criteria**: All 3 files present

#### 2. Verify trivy-config.yaml

```bash
# Check YAML syntax
python3 -c "import yaml; yaml.safe_load(open('trivy-config.yaml'))"

# Expected output: No errors (silent success)
```

**✅ Pass Criteria**: YAML is valid

#### 3. Verify security-report.sh

```bash
# Check script is executable
test -x security-report.sh && echo "✅ Executable" || echo "❌ Not executable"

# Check script syntax
bash -n security-report.sh && echo "✅ Syntax OK" || echo "❌ Syntax error"
```

**✅ Pass Criteria**: Script is executable and has valid syntax

#### 4. Test npm audit Script

```bash
cd cicd-demo

# Run npm audit
npm run security:audit

# Expected output: Audit results (may show vulnerabilities in demo deps)
```

**✅ Pass Criteria**: Script runs and displays audit results

#### 5. Test security-report.sh

```bash
# Generate security report
npm run security:report

# Expected output: Report generated in ./security-reports/
```

**✅ Pass Criteria**: Report generated successfully

#### 6. Verify GitHub Workflow

```bash
# Check workflow file exists
ls -l .github/workflows/security-scan.yml

# Verify workflow has required jobs
grep -E "npm-audit|trivy-filesystem|trivy-docker" .github/workflows/security-scan.yml
```

**✅ Pass Criteria**: Workflow file exists and contains all scan jobs

#### 7. Verify Security Documentation

```bash
# Check README.md has required sections
grep -E "trivy-config.yaml|security-report.sh|NPM Scripts" security/README.md
```

**✅ Pass Criteria**: Documentation includes new configuration files

#### 8. Verify package.json Scripts

```bash
# Check security scripts added
grep "security:" package.json

# Expected output:
# "security:audit"
# "security:audit:fix"
# "security:scan"
# "security:report"
```

**✅ Pass Criteria**: All 4 security scripts present

### Phase 1.4 Checklist

- [ ] security/trivy-config.yaml exists and is valid YAML
- [ ] security/security-report.sh exists and is executable
- [ ] security/README.md updated with new sections
- [ ] package.json has 4 security scripts
- [ ] npm run security:audit works
- [ ] npm run security:report works
- [ ] .github/workflows/security-scan.yml exists
- [ ] SECURITY.md policy exists
- [ ] .trivyignore configuration exists

---

## Phase 1.5: GitOps Implementation

### Verification Steps

#### 1. Verify GitOps Directory Structure

```bash
cd cicd-demo/gitops

# List directory structure
tree argocd/ || find argocd/

# Expected structure:
# argocd/
# ├── install-argocd.sh
# ├── project.yaml
# ├── .gitignore
# └── applications/
#     ├── qa-portfolio-dev.yaml
#     └── qa-portfolio-staging.yaml
```

**✅ Pass Criteria**: All files present in correct structure

#### 2. Verify ArgoCD Installation

```bash
# Check if ArgoCD namespace exists
kubectl get namespace argocd

# Expected output: argocd namespace in Active status
```

**✅ Pass Criteria**: argocd namespace exists

#### 3. Verify ArgoCD Pods

```bash
# List all ArgoCD pods
kubectl get pods -n argocd

# Expected output: 7 pods all in Running status:
# - argocd-application-controller
# - argocd-applicationset-controller
# - argocd-dex-server
# - argocd-notifications-controller
# - argocd-redis
# - argocd-repo-server
# - argocd-server
```

**✅ Pass Criteria**: All 7 pods Running, READY shows 1/1

#### 4. Verify AppProject

```bash
# Check AppProject
kubectl get appproject -n argocd

# Expected output: qa-portfolio AppProject
```

**✅ Pass Criteria**: qa-portfolio AppProject exists

#### 5. Verify Applications

```bash
# List Applications
kubectl get applications -n argocd

# Expected output:
# NAME                   SYNC STATUS   HEALTH STATUS
# qa-portfolio-dev       Unknown/Synced Healthy
# qa-portfolio-staging   Unknown/Synced Healthy
```

**✅ Pass Criteria**: Both applications exist and Healthy

#### 6. Verify Application Health Detail

```bash
# Get dev application details
kubectl get application qa-portfolio-dev -n argocd -o yaml | grep -A 5 health

# Expected output: health.status: Healthy
```

**✅ Pass Criteria**: Health status is Healthy

#### 7. Test ArgoCD UI Access

```bash
# Get admin password
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d
echo

# Start port forward
kubectl port-forward svc/argocd-server -n argocd 9090:443 &

# Wait 5 seconds
sleep 5

# Test connection
curl -k https://localhost:9090 -I | head -1

# Expected output: HTTP/2 200
```

**✅ Pass Criteria**: Server responds with HTTP 200

**Manual UI Test**:
1. Open browser to https://localhost:9090
2. Login with username: `admin`, password from step 1
3. Verify you can see 2 applications (qa-portfolio-dev, qa-portfolio-staging)

**✅ Pass Criteria**: Can login and see applications in UI

#### 8. Verify install-argocd.sh Script

```bash
# Check script is executable
test -x gitops/argocd/install-argocd.sh && echo "✅ Executable" || echo "❌ Not executable"

# Check script syntax
bash -n gitops/argocd/install-argocd.sh && echo "✅ Syntax OK" || echo "❌ Syntax error"
```

**✅ Pass Criteria**: Script is executable and has valid syntax

#### 9. Verify GitOps Documentation

```bash
# Check README exists
ls -l gitops/README.md

# Verify content sections
grep -E "GitOps|ArgoCD|Quick Start|Troubleshooting|Interview" gitops/README.md
```

**✅ Pass Criteria**: README exists with all required sections

#### 10. Verify Security

```bash
# Check password file is gitignored
grep ".argocd-admin-password" gitops/argocd/.gitignore

# Check password file exists (local only)
test -f gitops/argocd/.argocd-admin-password && echo "✅ Password saved" || echo "❌ Password missing"
```

**✅ Pass Criteria**: Password file exists locally and is gitignored

### Phase 1.5 Checklist

- [ ] gitops/argocd/ directory structure complete
- [ ] install-argocd.sh executable and valid
- [ ] project.yaml (AppProject CRD) exists
- [ ] qa-portfolio-dev.yaml exists
- [ ] qa-portfolio-staging.yaml exists
- [ ] ArgoCD namespace exists
- [ ] All 7 ArgoCD pods running
- [ ] AppProject created (qa-portfolio)
- [ ] 2 Applications created and Healthy
- [ ] ArgoCD UI accessible (port 9090)
- [ ] Can login to ArgoCD UI
- [ ] gitops/README.md comprehensive documentation
- [ ] Admin password secured and gitignored

---

## Complete Verification Summary

### Quick Status Check (All Phases)

Run this comprehensive check script:

```bash
#!/bin/bash
# Complete DevOps Platform Verification

echo "═══════════════════════════════════════════════════════════"
echo "  DevOps Platform - Complete Verification"
echo "═══════════════════════════════════════════════════════════"
echo

# Phase 1.1
echo "Phase 1.1: Environment Preparation"
docker version --format '{{.Server.Version}}' >/dev/null 2>&1 && echo "✅ Docker" || echo "❌ Docker"
kubectl version --client >/dev/null 2>&1 && echo "✅ kubectl" || echo "❌ kubectl"
k3d version >/dev/null 2>&1 && echo "✅ k3d" || echo "❌ k3d"
terraform version >/dev/null 2>&1 && echo "✅ Terraform" || echo "❌ Terraform"
helm version >/dev/null 2>&1 && echo "✅ Helm" || echo "❌ Helm"
k3d cluster list | grep -q "qa-portfolio" && echo "✅ k3d cluster" || echo "❌ k3d cluster"
echo

# Phase 1.2
echo "Phase 1.2: Infrastructure as Code"
test -f terraform/main.tf && echo "✅ Terraform configs" || echo "❌ Terraform configs"
test -f terraform/environments/dev.tfvars && echo "✅ Environment files" || echo "❌ Environment files"
echo

# Phase 1.3
echo "Phase 1.3: Kubernetes Deployment"
kubectl get namespace qa-portfolio >/dev/null 2>&1 && echo "✅ K8s namespace" || echo "❌ K8s namespace"
kubectl get pods -n qa-portfolio | grep -q "Running" && echo "✅ K8s pods" || echo "❌ K8s pods"
echo

# Phase 1.4
echo "Phase 1.4: Security Integration"
test -f security/trivy-config.yaml && echo "✅ Trivy config" || echo "❌ Trivy config"
test -x security/security-report.sh && echo "✅ Security script" || echo "❌ Security script"
grep -q "security:audit" package.json && echo "✅ NPM scripts" || echo "❌ NPM scripts"
echo

# Phase 1.5
echo "Phase 1.5: GitOps Implementation"
kubectl get namespace argocd >/dev/null 2>&1 && echo "✅ ArgoCD namespace" || echo "❌ ArgoCD namespace"
PODS=$(kubectl get pods -n argocd --no-headers 2>/dev/null | grep "Running" | wc -l)
[[ $PODS -ge 7 ]] && echo "✅ ArgoCD pods ($PODS/7)" || echo "❌ ArgoCD pods ($PODS/7)"
kubectl get appproject qa-portfolio -n argocd >/dev/null 2>&1 && echo "✅ AppProject" || echo "❌ AppProject"
kubectl get application qa-portfolio-dev -n argocd >/dev/null 2>&1 && echo "✅ Applications" || echo "❌ Applications"
echo

echo "═══════════════════════════════════════════════════════════"
echo "  Verification Complete"
echo "═══════════════════════════════════════════════════════════"
```

**Save this script as `verify-all-phases.sh` and run**:
```bash
chmod +x verify-all-phases.sh
./verify-all-phases.sh
```

---

## Troubleshooting Common Issues

### Phase 1.1 Issues

**Issue**: k3d cluster not found
```bash
# Solution: Create cluster
k3d cluster create qa-portfolio --agents 2 --port "8080:80@loadbalancer"
```

### Phase 1.2 Issues

**Issue**: Terraform init fails
```bash
# Solution: Clear cache and reinitialize
rm -rf .terraform .terraform.lock.hcl
terraform init
```

### Phase 1.3 Issues

**Issue**: Pods not running
```bash
# Check pod status
kubectl describe pod <pod-name> -n qa-portfolio

# Check events
kubectl get events -n qa-portfolio --sort-by='.lastTimestamp'
```

### Phase 1.4 Issues

**Issue**: npm audit fails
```bash
# Solution: Ensure dependencies installed
npm ci
npm run security:audit
```

### Phase 1.5 Issues

**Issue**: ArgoCD pods not starting
```bash
# Check pod logs
kubectl logs -n argocd <pod-name>

# Restart deployment
kubectl rollout restart deployment -n argocd
```

**Issue**: Cannot access ArgoCD UI
```bash
# Kill existing port-forward
pkill -f "port-forward.*argocd"

# Start new port-forward
kubectl port-forward svc/argocd-server -n argocd 9090:443
```

---

## Report Issues

If you encounter any issues during manual verification:

1. **Check Prerequisites**: Ensure all Phase 1.1 tools are installed
2. **Review Logs**: Check Kubernetes logs and events
3. **Consult Documentation**: See phase-specific README files
4. **Check Completion Reports**: See `docs/PHASE-X-COMPLETION.md` files

---

**Last Updated**: March 1, 2026
**Version**: 1.0
**Status**: Phases 1.1-1.5 Complete
