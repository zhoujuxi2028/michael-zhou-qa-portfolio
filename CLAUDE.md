# CLAUDE.md - QA Portfolio

Michael Zhou's QA Portfolio - Test automation & DevOps demos.

## Claude Code Guidelines

- **Be concise**: Keep responses and file content brief and to the point
- **No fluff**: Avoid unnecessary explanations, verbose comments, or filler text
- **Tables over prose**: Use tables/lists instead of paragraphs when possible

## Projects

| Project | Description | Key Tech |
|---------|-------------|----------|
| `iwsva-cypress-e2e/` | IWSVA E2E testing (77 test cases, 9 components) | Cypress, Page Objects |
| `k8s-auto-testing-platform/` | K8S HPA testing + Chaos Engineering (37 tests) | Python, Pytest, Chaos Mesh |
| `security-testing-demo/` | Security testing (170 tests, OWASP Top 10 2021) | Pytest, OWASP ZAP, Nessus, SQLMap |
| `cicd-demo/` | CI/CD pipeline demonstration | GitHub Actions, Docker |
| `api-testing-demo/` | API testing demonstration | Newman, Postman |
| `selenium-demo/` | Browser automation | Selenium, Python |

## Project CLAUDE.md Files

| Project | CLAUDE.md |
|---------|-----------|
| IWSVA Cypress E2E | `iwsva-cypress-e2e/CLAUDE.md` |
| K8S Testing Platform | `k8s-auto-testing-platform/CLAUDE.md` |
| Security Testing Demo | `security-testing-demo/CLAUDE.md` |
| CI/CD Demo | `cicd-demo/CLAUDE.md` |

## Virtual Environment

```bash
# Create once at repo root (for all Python projects)
python3 -m venv venv
source venv/bin/activate
```

## Quick Commands by Project

### iwsva-cypress-e2e
```bash
cd iwsva-cypress-e2e
npm install
npm test                    # Run main test
npm run cypress:open        # Interactive mode
```

### k8s-auto-testing-platform
```bash
cd k8s-auto-testing-platform
export no_proxy=localhost,127.0.0.1,kubernetes.docker.internal,10.0.0.0/8
pytest tests/ -v
./scripts/hpa-stress-test.sh --duration 120 --concurrency 15
```

### cicd-demo
```bash
cd cicd-demo
npm install
npm test                    # Both Cypress + Newman
npm run docker:test         # Run in Docker
```

### api-testing-demo
```bash
cd api-testing-demo
npm install
npm run server &            # Start json-server (port 3001)
npm run test:full           # Run full Newman suite (316 assertions)
kill %1                     # Stop json-server
```

### security-testing-demo
```bash
cd security-testing-demo
docker compose -f docker/docker-compose.yml up -d    # Start ZAP + DVWA
pip install -r requirements.txt
pytest tests/ -v                                     # Run 170 security tests
python zap/zap-baseline.py --target http://localhost # ZAP baseline scan
```

### selenium-demo
```bash
cd selenium-demo
pip install -r requirements.txt
pytest tests/ -v            # Run Selenium tests
```

## Git Workflow

- **Default branch**: `main`
- Use conventional commits: `feat:`, `fix:`, `docs:`, `test:`

### Feature Branches

| Branch | Description | Status |
|--------|-------------|--------|
| `feature/devops-platform` | DevOps platform with Helm, ArgoCD | Merged to main |
| `feature/security-testing` | Security testing with ZAP/Nessus (170 tests, OWASP Top 10 2021) | Ready to merge |
| `feature/api-testing` | API testing enhancements | In development |
| `feature/k8s-testing` | K8S testing features | In development |
| `feature/selenium` | Selenium automation | In development |
| `feature/robot-framework-demo` | Robot Framework demo | In development |
| `fix/api-testing-defects` | API testing bug fixes | In development |

## GitHub Actions

All workflows are in root `.github/workflows/` (GitHub ignores subdirectory workflows).

| Workflow | Project | Purpose |
|----------|---------|---------|
| `pipeline.yml` | cicd-demo | Full CI/CD pipeline (lint→build→E2E→deploy) |
| `pr-checks.yml` | cicd-demo | PR quick checks (validation + tests + lint) |
| `docker-tests.yml` | cicd-demo | Docker-based nightly regression tests |
| `security-scan.yml` | cicd-demo | Security scanning (Trivy, npm audit, SARIF) |
| `helm-deploy.yml` | cicd-demo | Helm chart validation & deploy |
| `security-tests.yml` | security-testing-demo | Security tests (DVWA, Juice Shop, ZAP, OWASP Top 10) |
| `k8s-ci.yml` | k8s-auto-testing-platform | K8S CI (code quality, unit tests, integration) |

## Security

- Never commit credentials
- Check `.gitignore` before committing
