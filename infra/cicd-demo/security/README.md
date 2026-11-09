# Security Documentation

This directory contains security scanning configuration and documentation for the CI/CD demo project.

## Overview

The project implements comprehensive security scanning as part of the CI/CD pipeline:

- **npm audit**: JavaScript dependency vulnerability scanning
- **Trivy**: Multi-purpose security scanner (containers, filesystems, IaC)
- **GitHub Security**: Centralized vulnerability management via SARIF
- **Automated scanning**: Every push, PR, and daily scheduled scans

## Security Workflow

The `security-scan.yml` GitHub Actions workflow performs four types of scans:

### 1. NPM Audit (Dependency Scanning)

Scans Node.js dependencies for known vulnerabilities using the npm advisory database.

```bash
# Run locally
npm audit

# Production dependencies only
npm audit --omit=dev

# Fail on moderate+ severity
npm audit --audit-level=moderate
```

**What it scans:**
- Direct dependencies in `package.json`
- Transitive dependencies in `package-lock.json`
- Checks against npm security advisories

**Output:**
- `npm-audit.json`: Machine-readable results
- `npm-audit-report.md`: Human-readable report
- Uploaded to GitHub Actions artifacts

### 2. Trivy Filesystem Scan

Scans the project filesystem for vulnerabilities in dependencies and misconfigurations.

```bash
# Run locally
docker run --rm \
  -v $(pwd):/workspace \
  aquasec/trivy fs \
  --severity CRITICAL,HIGH,MEDIUM \
  /workspace
```

**What it scans:**
- Node.js dependencies (package-lock.json)
- OS packages (if applicable)
- License compliance
- Secrets detection (API keys, passwords)

**Output:**
- SARIF format → GitHub Security tab
- Table format → Artifacts

### 3. Trivy Docker Image Scan

Scans Docker images for OS and application vulnerabilities.

```bash
# Build and scan Newman image locally
docker build -t qa-newman-demo:latest -f Dockerfile.newman .
docker run --rm \
  -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image \
  --severity CRITICAL,HIGH,MEDIUM \
  qa-newman-demo:latest
```

**What it scans:**
- Base image vulnerabilities (Alpine Linux, Node.js)
- Application dependencies (npm packages)
- OS packages (apk, apt, yum)
- Misconfigurations

**Images scanned:**
- `qa-newman-demo:latest` (Dockerfile.newman)

### 4. Trivy IaC Scan

Scans Infrastructure as Code for security misconfigurations.

```bash
# Run locally
docker run --rm \
  -v $(pwd):/workspace \
  aquasec/trivy config \
  /workspace
```

**What it scans:**
- Terraform configurations (`terraform/`)
- Kubernetes manifests (`k8s/`)
- Dockerfiles
- Docker Compose files
- CI/CD workflows

**Checks for:**
- CIS Benchmark violations
- Insecure defaults
- Missing security controls
- Privilege escalation risks
- Network exposure issues

## Scan Schedule

| Trigger | Frequency | Purpose |
|---------|-----------|---------|
| **Push** | Every push to main/feature branches | Immediate feedback on new code |
| **Pull Request** | On PR creation/update | Security gate before merge |
| **Scheduled** | Daily at 3:00 AM UTC | Detect newly disclosed CVEs |
| **Manual** | On-demand via GitHub UI | Ad-hoc security audits |

## Viewing Results

### GitHub Security Tab

1. Navigate to: **Repository > Security > Code scanning alerts**
2. Filter by:
   - Tool: Trivy, npm audit
   - Severity: Critical, High, Medium, Low
   - Status: Open, Fixed, Dismissed
   - Branch: main, feature/*, etc.

### Workflow Artifacts

1. Navigate to: **Actions > Security Scanning workflow > Latest run**
2. Scroll to **Artifacts** section
3. Download:
   - `npm-audit-results`
   - `trivy-filesystem-results`
   - `trivy-docker-*-results`
   - `trivy-iac-results`
   - `security-summary`

## Severity Levels

| Level | Description | Action Required |
|-------|-------------|-----------------|
| **CRITICAL** | Exploitable remotely, immediate action required | Fix within 24 hours |
| **HIGH** | Significant impact, patch available | Fix within 1 week |
| **MEDIUM** | Moderate impact, may require configuration change | Fix within 1 month |
| **LOW** | Minor impact, low exploitability | Fix in next release |

## Handling Vulnerabilities

### 1. Review the Finding

- Check CVE details and CVSS score
- Assess impact on your application
- Verify exploitability in your context

### 2. Remediation Options

**Option A: Update Dependency**
```bash
# Update to patched version
npm update package-name

# Or update to specific version
npm install package-name@1.2.3
```

**Option B: Replace Dependency**
```bash
# Switch to secure alternative
npm uninstall vulnerable-package
npm install secure-alternative
```

**Option C: Apply Workaround**
- Configure dependency to avoid vulnerable code path
- Add runtime protections (WAF, rate limiting)
- Document in `.trivyignore` (see below)

**Option D: Accept Risk**
- Document business justification
- Add to `.trivyignore` with expiration date
- Track in security register

### 3. Verify Fix

```bash
# Re-run scans
npm audit
trivy fs .
trivy image qa-newman-demo:latest
```

## Suppressing False Positives

Create `.trivyignore` in project root:

```
# CVE-2024-12345: False positive - not exploitable in our context
# Reason: We don't use the vulnerable feature
# Expires: 2024-12-31
# Reviewed by: Security Team
CVE-2024-12345

# GHSA-xxxx-yyyy-zzzz: Known issue, no patch available
# Mitigation: WAF rules block exploit attempts
# Expires: 2025-01-15
GHSA-xxxx-yyyy-zzzz
```

**Best practices:**
- Always document WHY a CVE is ignored
- Set expiration dates (review periodically)
- Get security team approval for CRITICAL/HIGH suppressions

## Security Configuration Files

This directory contains the following files:

| File | Description | Purpose |
|------|-------------|---------|
| `README.md` | This file | Security scanning documentation |
| `trivy-config.yaml` | Trivy configuration | Standardized Trivy scan settings |
| `security-report.sh` | Security report generator | Comprehensive local security scanning |

### trivy-config.yaml

Centralized Trivy configuration that defines:
- **Severity levels**: CRITICAL, HIGH, MEDIUM
- **Security checks**: Vulnerabilities, misconfigurations, secrets, licenses
- **Exclusions**: Skip test files, build artifacts, caches
- **License restrictions**: Flag GPL and AGPL licenses
- **Timeouts**: 10-minute scan timeout

**Usage:**
```bash
# Use with Trivy CLI
trivy fs --config security/trivy-config.yaml .
trivy image --config security/trivy-config.yaml myimage:latest

# Via npm script
npm run security:scan
```

### security-report.sh

Automated security report generator that runs:
1. **npm audit** - Dependency vulnerability scanning
2. **Trivy filesystem scan** - Source code and dependency analysis
3. **Trivy image scan** - Docker image security assessment

Generates a consolidated markdown report with all findings.

**Usage:**
```bash
# Generate report in default directory (./security-reports)
./security/security-report.sh

# Generate report in custom directory
./security/security-report.sh /path/to/output

# Via npm script
npm run security:report
```

**Output:**
- `security-report-{timestamp}.md` - Comprehensive markdown report
- `npm-audit.json` - Raw npm audit results
- `trivy-fs.txt` - Trivy filesystem scan results
- `trivy-image.txt` - Trivy image scan results

## NPM Scripts for Security

The following security commands are available in `package.json`:

```bash
# Run npm audit (fails on moderate+ vulnerabilities)
npm run security:audit

# Automatically fix vulnerabilities
npm run security:audit:fix

# Run Trivy filesystem scan in Docker
npm run security:scan

# Generate comprehensive security report
npm run security:report
```

## Local Security Scanning

### Prerequisites

```bash
# Install Trivy (macOS)
brew install aquasecurity/trivy/trivy

# Install Trivy (Linux)
wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | sudo apt-key add -
echo "deb https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main" | sudo tee -a /etc/apt/sources.list.d/trivy.list
sudo apt-get update
sudo apt-get install trivy
```

### Run Scans Locally

```bash
# NPM audit
npm audit

# Trivy filesystem
trivy fs .

# Trivy Docker image (after building)
docker build -t qa-newman-demo:latest -f Dockerfile.newman .
trivy image qa-newman-demo:latest

# Trivy IaC
trivy config .

# Trivy all-in-one (filesystem + IaC)
trivy fs --scanners vuln,config,secret .
```

### Pre-commit Hook (Optional)

Add to `.husky/pre-commit`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run npm audit before commit
echo "Running npm audit..."
npm audit --audit-level=high || {
  echo "❌ npm audit found HIGH or CRITICAL vulnerabilities"
  echo "Run 'npm audit fix' to resolve"
  exit 1
}
```

## Security Metrics

Track these metrics for security posture improvement:

| Metric | Target | Current |
|--------|--------|---------|
| **Mean Time to Detect (MTTD)** | < 24 hours | Daily scans |
| **Mean Time to Remediate (MTTR)** | < 7 days for HIGH | Track in Security tab |
| **False Positive Rate** | < 10% | Review .trivyignore |
| **Critical Vulnerabilities** | 0 in production | Block deploys with CRITICAL |
| **Scan Coverage** | 100% of images/repos | All images scanned |

## Compliance

This security setup supports compliance with:

- **OWASP Top 10**: Detects vulnerable dependencies (A06:2021)
- **PCI DSS**: Regular vulnerability scanning (Requirement 11.2)
- **SOC 2**: Security monitoring and incident response
- **ISO 27001**: Information security management
- **CIS Benchmarks**: Infrastructure security baseline

## Troubleshooting

### npm audit fails with network errors

```bash
# Use different registry
npm config set registry https://registry.npmmirror.com

# Or bypass proxy
npm audit --no-proxy
```

### Trivy scan is slow

```bash
# Use local vulnerability database
trivy image --download-db-only
trivy image --skip-db-update qa-newman-demo:latest
```

### Too many false positives

1. Update Trivy to latest version (DB updates weekly)
2. Use `.trivyignore` for known false positives
3. Consider severity filtering: `--severity CRITICAL,HIGH`

### SARIF upload fails

- Ensure `security-events: write` permission in workflow
- Verify SARIF file is valid: `cat results.sarif | jq`
- Check GitHub Advanced Security is enabled (for private repos)

## References

- [Trivy Documentation](https://aquasecurity.github.io/trivy/)
- [npm audit Documentation](https://docs.npmjs.com/cli/v9/commands/npm-audit)
- [GitHub Security Features](https://docs.github.com/en/code-security)
- [SARIF Specification](https://sarifweb.azurewebsites.net/)
- [OWASP Dependency Check](https://owasp.org/www-project-dependency-check/)
- [CVE Database](https://cve.mitre.org/)
- [NIST NVD](https://nvd.nist.gov/)

## Contact

For security issues:
- GitHub Security Advisories: Private vulnerability reporting
- Security team: [security@example.com](mailto:security@example.com)
- On-call: PagerDuty escalation for CRITICAL findings

---

**Last Updated**: 2026-02-28
**Maintained by**: DevOps & Security Team
