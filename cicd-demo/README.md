# CI/CD Demo Project - DevOps Skills Showcase

## Overview

This project is part of the **QA Portfolio** and demonstrates CI/CD pipeline integration, Docker containerization, and DevOps practices. It features:

- **Dual-layer GitHub Actions strategy** (PR fast checks + production Docker tests)
- **Docker container orchestration** with Cypress and Newman
- **100% test pass rate** (16 Cypress E2E + 18 Newman API tests)
- **Comprehensive architecture documentation** with interview talking points

Use this project to:
- Understand modern CI/CD pipeline design
- Practice Docker containerization
- Learn GitHub Actions workflows
- Demonstrate DevOps skills in interviews

## Project Structure

```
test-project/
├── README.md                      # This file - project overview
├── CLAUDE.md                      # Organization guidelines for AI assistance
├── package.json                   # Node.js dependencies and scripts
├── cypress.config.js              # Cypress configuration
├── docker-compose.yml             # Multi-container orchestration
├── Dockerfile.newman              # Newman container definition
│
├── cypress/                       # Cypress test suite
│   ├── e2e/                       # E2E test files
│   │   ├── 01-api-tests.cy.js    # API testing examples
│   │   └── 02-ui-tests.cy.js     # UI testing examples
│   ├── fixtures/                  # Test data files
│   ├── support/                   # Support files and custom commands
│   ├── videos/                    # Test execution recordings (auto-generated)
│   └── screenshots/               # Failure screenshots (auto-generated)
│
├── postman/                       # Postman/Newman API tests
│   ├── api-collection.json        # API test collection
│   └── environment.json           # Environment variables
│
├── newman/                        # Newman test output
│   ├── report.html                # HTML test report
│   └── junit.xml                  # JUnit XML for CI integration
│
├── test-logs/                     # Test execution logs
│   └── README.md                  # Log directory documentation
│
├── scripts/                       # Utility scripts
│   └── run-regression-test-with-logs.sh  # Regression test runner
│
└── docs/                          # Project documentation
    ├── README.md                  # Documentation directory overview
    ├── guides/                    # User guides and tutorials
    │   ├── CI-CD-GUIDE.md        # CI/CD setup and integration guide
    │   └── TROUBLESHOOTING.md    # Common issues and solutions
    ├── analysis/                  # Analysis reports
    │   ├── CICD-COMPLETE-ANALYSIS.md     # CI/CD implementation analysis
    │   └── REGRESSION-TEST-RESULT.md     # Test execution results
    └── fixes/                     # Bug fix records
        ├── BUGFIX-SUMMARY.md      # Summary of applied fixes
        ├── BUG-LIST.md            # Identified bugs and status
        └── README-DOCKER-FIXES.md # Docker-related fixes
```

## Quick Start

### Prerequisites
```bash
# Ensure you have Node.js installed (v18+ recommended)
node --version

# Ensure you have npm installed
npm --version
```

### Installation

```bash
# Navigate to the test project directory
cd test-project

# Install all dependencies
npm install

# Verify Cypress installation
npm run ci:verify
```

### Running Tests

#### Run All Tests
```bash
npm test
```

#### Run Cypress Tests Only
```bash
# Headless mode (for CI/CD)
npm run test:cypress

# Interactive mode (for development)
npm run test:cypress:headed
```

#### Run Newman Tests Only
```bash
npm run test:newman
```

#### Run with Different Base URL
```bash
# Set custom base URL for Cypress
CYPRESS_baseUrl=https://example.com npm run test:cypress

# Set custom base URL for Newman
BASE_URL=https://api.example.com npm run test:newman
```

#### Run Regression Tests with Detailed Logs
```bash
# Run full regression suite with detailed logging
npm run docker:test:logs

# Or directly
./scripts/run-regression-test-with-logs.sh

# Logs are saved to test-logs/ directory
```

## Test Details

### Cypress E2E Tests

**01-api-tests.cy.js** - RESTful API Testing
- GET requests with validation
- POST requests (create resources)
- PUT requests (update resources)
- DELETE requests
- Error handling (404 scenarios)
- Response structure validation

**02-ui-tests.cy.js** - UI End-to-End Testing
- Page load tests
- Link validation
- Responsive design testing (mobile/tablet/desktop)
- Performance testing (load time budgets)
- Network condition simulation

**Key Features Demonstrated**:
- Test isolation with `beforeEach`
- Retry logic for flaky test handling
- Screenshot and video capture
- Custom command patterns
- Environment variable usage
- Data-driven testing

### Newman API Tests

**api-collection.json** - Postman Collection
- User management endpoints
- Post CRUD operations
- Error handling tests
- Request/response validation
- Collection variables
- Test scripts with assertions

**Key Features Demonstrated**:
- Comprehensive test assertions
- Collection and environment variables
- Pre-request scripts
- Test chaining (storing IDs for subsequent requests)
- Multiple reporter formats (CLI, HTML, JUnit)

## CI/CD Integration

This project includes **production-ready GitHub Actions workflows**:

### GitHub Actions Workflows

Located in `.github/workflows/`:

- **`pr-checks.yml`**: Fast Node.js-based checks for pull requests (2-3 min)
  - Runs Cypress and Newman tests
  - Parallel linting
  - Conditional artifact uploads

- **`docker-tests.yml`**: Production-grade Docker-based tests (5-8 min)
  - Runs on main branch pushes
  - Scheduled nightly runs (2:00 AM UTC)
  - Full Docker containerization
  - Comprehensive artifact collection

**To enable**: These workflows will automatically trigger when pushed to a GitHub repository with Actions enabled.

## Docker Integration

### Docker Compose (Recommended)

This project includes a `docker-compose.yml` configuration for running tests in containers:

```bash
# Build images (if needed)
docker compose build

# Run all tests
docker compose up --abort-on-container-exit

# Or use the npm script
npm run docker:test

# Run with detailed logs
npm run docker:test:logs

# Clean up
docker compose down -v
```

### Container Architecture

- **Cypress Service**: Official `cypress/included:13.6.0` image with Chrome browser
- **Newman Service**: Custom image with `newman-reporter-htmlextra` support
- **Network Isolation**: Custom bridge network for clean test environment
- **Volume Caching**: Cypress binary cached for faster subsequent runs

For detailed Docker usage, see the `docker-compose.yml` file comments.

## Test Reports

### Cypress Reports
- **Videos**: `cypress/videos/` - Full test execution recordings
- **Screenshots**: `cypress/screenshots/` - Failure screenshots
- **Console**: Terminal output with pass/fail status

### Newman Reports
- **HTML Report**: `newman/report.html` - Detailed visual report
- **JUnit XML**: `newman/junit.xml` - For CI/CD integration
- **CLI Output**: Terminal summary

To view the HTML report:
```bash
# After running Newman tests
open newman/report.html  # macOS
xdg-open newman/report.html  # Linux
start newman/report.html  # Windows
```

## Interview Demonstration Tips

### Scenario 1: "Show me your test automation framework"

**Steps**:
1. Open this project in your IDE
2. Run `npm install && npm test`
3. Show the test execution and results
4. Open test files and explain key patterns
5. Show reports (videos, screenshots, HTML)

**Talking Points**:
- "I've structured tests with clear organization and naming conventions"
- "Tests use retry logic and proper assertions for reliability"
- "We generate multiple report formats for different audiences"
- "Configuration is externalized for environment flexibility"

### Scenario 2: "Explain your CI/CD setup"

**Steps**:
1. Show the pipeline configuration files
2. Explain each stage (install, lint, test, report)
3. Demonstrate Docker containerization
4. Show how artifacts are stored

**Talking Points**:
- "Our pipeline has 4 stages: build, test, report, deploy"
- "We use Docker for consistent test environments"
- "Tests run in parallel across browsers/workers"
- "Reports and videos are stored as artifacts for 7 days"

### Scenario 3: "How do you handle test failures?"

**Steps**:
1. Force a test failure (change an assertion)
2. Run the test suite
3. Show the failure output, screenshot, and video
4. Demonstrate debugging with Cypress Test Runner

**Talking Points**:
- "Cypress captures videos and screenshots automatically on failure"
- "We have retry logic configured for transient failures"
- "Test logs include detailed error messages and stack traces"
- "The interactive Test Runner helps debug issues locally"

## Common Interview Questions - With This Project

### Q1: "Walk me through your test automation setup"

**Answer using this project**:
"This project demonstrates my approach to test automation:
- **Framework**: Cypress for E2E and API tests, Newman for Postman collections
- **Organization**: Tests organized by type (API vs UI) with clear naming
- **Configuration**: Externalized config for different environments
- **CI/CD**: Ready-to-integrate pipeline configs for GitHub Actions, GitLab CI, Jenkins
- **Reporting**: Multiple formats - videos, screenshots, HTML, JUnit XML
- **Containerization**: Dockerfiles for reproducible test environments"

### Q2: "How do you ensure test reliability?"

**Answer**:
"Several strategies demonstrated in this project:
- **Retry Logic**: Configured 2 retries in CI mode (`cypress.config.js:32`)
- **Test Isolation**: Each test runs independently with fresh state
- **Explicit Waits**: No arbitrary sleeps, only explicit waits for conditions
- **Error Handling**: Proper use of `failOnStatusCode: false` for error scenarios
- **Assertions**: Comprehensive assertions on status, headers, body structure"

### Q3: "How do you integrate tests into CI/CD?"

**Answer**:
"This project includes three pipeline configurations:
- **GitHub Actions**: Matrix strategy for parallel browser testing
- **GitLab CI**: Docker-in-Docker for containerized execution
- **Jenkins**: Declarative pipeline with parallel stages

Key integration points:
- Tests run on every PR and merge
- Reports generated as artifacts
- Notifications on failure
- Environment-specific configurations"

## Documentation

This project includes comprehensive documentation in the `docs/` directory:

### Guides (`docs/guides/`)
- **CI-CD-GUIDE.md**: Complete guide for integrating tests into CI/CD pipelines (GitHub Actions, GitLab CI, Jenkins)
- **TROUBLESHOOTING.md**: Common issues and solutions

### Analysis Reports (`docs/analysis/`)
- **CICD-COMPLETE-ANALYSIS.md**: Detailed analysis of the CI/CD implementation
- **REGRESSION-TEST-RESULT.md**: Latest regression test execution results

### Fix Records (`docs/fixes/`)
- Historical records of bugs fixed and troubleshooting sessions
- Useful for understanding project evolution and problem-solving approaches

**Quick access**:
```bash
# Browse all documentation
ls docs/*/

# View CI/CD guide
cat docs/guides/CI-CD-GUIDE.md

# View latest test results
cat docs/analysis/REGRESSION-TEST-RESULT.md
```

## Troubleshooting

For detailed troubleshooting information, see **[docs/guides/TROUBLESHOOTING.md](docs/guides/TROUBLESHOOTING.md)**.

### Quick Fixes

**Cypress installation fails**:
```bash
npm cache clean --force && rm -rf node_modules package-lock.json && npm install
```

**Tests fail with "baseUrl" error**:
```bash
curl https://jsonplaceholder.typicode.com/users  # Verify connectivity
```

**Docker build fails**:
```bash
docker ps  # Ensure Docker is running
docker compose build --no-cache
```

**Newman command not found**:
```bash
npm install -g newman newman-reporter-htmlextra
# Or use: npx newman run postman/api-collection.json -e postman/environment.json
```

## 📚 Comprehensive Documentation

This DevOps Platform includes complete documentation across all 6 phases:

### Quick Links

**Getting Started:**
- **[QUICKSTART.md](docs/QUICKSTART.md)** - 5-minute setup guide to get everything running

**Technical Reference:**
- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - Deep dive into all 6 phases, design decisions, scalability

**Interview Preparation:**
- **[INTERVIEW-GUIDE.md](docs/INTERVIEW-GUIDE.md)** - 35+ interview questions with detailed answers
  - Organized by technology (CI/CD, IaC, K8s, Security, GitOps, Monitoring)
  - 5 demo scenarios with walkthroughs
  - STAR method examples
  - Technical deep dives

**Phase Completion Reports:**
- [Phase 1.4: Security Integration](docs/PHASE-1.4-COMPLETION.md)
- [Phase 1.5: GitOps Implementation](docs/PHASE-1.5-COMPLETION.md)
- [Phase 1.6: Monitoring Setup](docs/PHASE-1.6-COMPLETION.md)
- [Phase 1.7: Documentation](docs/PHASE-1.7-COMPLETION.md)

---

## 🎤 Interview Preparation

This project is **interview-ready** with comprehensive preparation materials.

### Quick Facts

| Metric | Value |
|--------|-------|
| **Total Phases** | 6 complete (Environment → Documentation) |
| **Total Pods** | 30+ deployed across 3 namespaces |
| **Technology Stack** | 10+ (Docker, K8s, Terraform, ArgoCD, Prometheus, Grafana, Trivy) |
| **Lines of Code** | 8,000+ |
| **Test Pass Rate** | 100% (16 Cypress + 18 Newman) |
| **Interview Q&A** | 35+ questions with detailed answers |
| **Demo Time** | 5-10 minutes |

### 30-Second Elevator Pitch

> "I built a complete DevOps platform demonstrating the full infrastructure lifecycle: containerization with Docker → Kubernetes orchestration → infrastructure-as-code with Terraform → security scanning with Trivy → GitOps deployments with ArgoCD → observability with Prometheus + Grafana. All 6 phases deployed to a k3d cluster with production-grade automation, comprehensive documentation, and 100% test pass rate."

### Pre-Interview Checklist

Before your interview, verify:
- [ ] k3d cluster running (3 nodes)
- [ ] 30+ pods healthy across all namespaces
- [ ] Grafana accessible (2 dashboards ready)
- [ ] ArgoCD accessible (2 Applications synced)
- [ ] Prometheus collecting metrics
- [ ] All documentation available locally
- [ ] Read INTERVIEW-GUIDE.md (35+ Q&A)
- [ ] Practiced 5-minute demo scenario

### 5-Minute Demo Path

1. **Show the cluster** (30 sec)
   ```bash
   kubectl get pods --all-namespaces | head -20
   # Shows: 30+ pods across 3 namespaces
   ```

2. **Show Grafana dashboards** (1.5 min)
   - Port-forward: `kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80`
   - Open: http://localhost:3000 (admin/grafana-admin)
   - Show: Cluster Overview dashboard (real-time metrics)

3. **Show ArgoCD applications** (1.5 min)
   - Port-forward: `kubectl port-forward -n argocd svc/argocd-server 9090:443`
   - Open: https://localhost:9090
   - Show: 2 Applications (dev auto-sync, staging manual)

4. **Explain Git integration** (1 min)
   - Describe: Commits to Git trigger ArgoCD sync
   - Show: Feature branch → dev environment (auto)
   - Show: Main branch → staging (manual approval)

5. **Discuss architecture** (1 min)
   - Summarize: 6 phases, production patterns
   - Mention: Interview talking points in docs

### Key Interview Topics

See **[INTERVIEW-GUIDE.md](docs/INTERVIEW-GUIDE.md)** for complete coverage of:

**CI/CD** (6 questions)
- Your CI/CD strategy and dual-layer approach
- Docker vs native execution trade-offs
- Secret handling in CI/CD
- Deployment pipeline design

**Infrastructure as Code** (6 questions)
- Why Terraform over CloudFormation
- Multi-environment management
- State management strategies
- Drift detection and remediation

**Kubernetes** (7 questions)
- Why Kubernetes for this project
- Cluster architecture and namespaces
- Persistent storage and scaling
- Troubleshooting pod issues

**Security** (6 questions)
- Multi-layer scanning approach
- Vulnerability handling policies
- Secret management strategies
- Security baseline practices

**GitOps** (7 questions)
- GitOps principles and benefits
- ArgoCD vs Flux comparison
- Auto-sync and selfHeal mechanisms
- Rollback procedures

**Monitoring** (7 questions)
- Prometheus + Grafana selection
- ServiceMonitor auto-discovery
- PromQL query language
- Monitoring at scale with Thanos

---

## Next Steps

1. **Study the Documentation**
   - Read [QUICKSTART.md](docs/QUICKSTART.md) for fast track
   - Study [INTERVIEW-GUIDE.md](docs/INTERVIEW-GUIDE.md) for interview prep
   - Review [ARCHITECTURE.md](docs/ARCHITECTURE.md) for technical depth

2. **Prepare Demo Environment**
   - Verify cluster is running
   - Test all port-forwards
   - Ensure dashboards accessible

3. **Practice Demonstration**
   - Run through 5-minute demo scenario
   - Practice explaining each component
   - Be ready to discuss design decisions

4. **Interview Success**
   - Study STAR method examples in INTERVIEW-GUIDE.md
   - Know answers to all 35+ interview questions
   - Be confident discussing all 6 phases

## Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [ArgoCD Documentation](https://argo-cd.readthedocs.io/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Terraform Documentation](https://www.terraform.io/docs/)
- [Docker Documentation](https://docs.docker.com/)

## Interview Success Metrics

You're interview-ready when you can:
- [ ] Explain all 6 phases in under 10 minutes
- [ ] Answer all 35+ interview questions from INTERVIEW-GUIDE.md
- [ ] Complete 5-minute demo without reference notes
- [ ] Discuss design decisions and trade-offs confidently
- [ ] Demonstrate understanding of production patterns
- [ ] Talk about your learning journey and challenges overcome

---

**This project demonstrates enterprise-grade DevOps skills. You're well-prepared for technical interviews!**
