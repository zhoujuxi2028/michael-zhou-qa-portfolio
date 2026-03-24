# CLAUDE.md - QA Portfolio

Michael Zhou's QA Portfolio - Test automation & DevOps demos.

## Claude Code Guidelines

- **Be concise**: Keep responses and file content brief and to the point
- **No fluff**: Avoid unnecessary explanations, verbose comments, or filler text
- **Tables over prose**: Use tables/lists instead of paragraphs when possible

## Development Process（开发流程）

每个新功能/项目遵循 5 阶段流程，**每阶段结束必须暂停等待人工评审**，通过后才能进入下一阶段。

| 阶段 | 活动 | 交付物 | 评审要点 |
|------|------|--------|----------|
| 1. 需求 | Issue 分析、scope 确认、可行性评估 | 需求描述 + 可行性评估 | scope 是否合理、本机环境是否支持 |
| 2. 设计 | 实施计划、架构设计、Plan Review | 实施计划文档 | 架构合理、任务拆分清晰、reviewer 问题已修复 |
| 3. 开发 | TDD 编码、逐步提交 | 代码 + 单元测试 | 代码质量、测试覆盖、commit 规范 |
| 4. 测试 | 本地自测、lint、CI 验证 | 全部测试通过 | lint 通过、所有测试 PASS、CI 绿灯 |
| 5. 收尾 | PR 创建、文档更新、root 注册 | PR merged + 文档同步 | README/CLAUDE.md 更新、Wiki 同步 |

**规则：**
- Claude 在每个阶段完成后必须**报告状态并等待确认**，不得自行跳到下一阶段
- 如果评审发现问题，在当前阶段修复后重新评审
- 阶段可根据任务规模简化（小 bugfix 可合并阶段），但需用户同意

## Projects (by Testing Category)

| Category | Project | Description | Key Tech |
|----------|---------|-------------|----------|
| 功能测试 | `iwsva-cypress-e2e/` | IWSVA E2E testing (77 tests) | Cypress, Page Objects |
| DevOps | `cicd-demo/` | DevOps Infrastructure Platform (IaC + GitOps + Monitoring) | Terraform, K8S, ArgoCD, Prometheus |
| 功能测试 | `api-testing-demo/` | API testing (280+ assertions) | Newman, Postman, json-server |
| 功能测试 | `playwright-demo/` | Cross-browser E2E testing (38 tests) | Playwright, TypeScript, axe-core |
| 功能测试 | `selenium-demo/` | Browser automation | Selenium, Python, Allure |
| 安全测试 | `security-testing-demo/` | Security testing (~182 tests, OWASP Top 10) | Pytest, OWASP ZAP, Nessus, SQLMap |
| 平台测试 | `sid-iam-testing-platform/` | IAM + Data + AI Agent testing (163 tests) | Python, Pytest, FastAPI, networkx |
| 平台测试 | `microservice-testing-platform/` | Microservice testing (101 tests, 5 layers) | Node.js, Express, Jest, Redis, k6 |
| 稳定性测试 | `k8s-auto-testing-platform/` | K8S HPA + Chaos Engineering (37 tests) | Python, Pytest, Chaos Mesh |

## Standard docs/ Template

All projects use the same `docs/` structure:

```
docs/
├── architecture/           # ARCHITECTURE.md, design decisions, API specs
├── test-cases/             # TEST-CASES.md, test reports, strategies
├── project-management/     # WBS.md, ISSUES.md, requirements, defects
└── guides/                 # FAQ, troubleshooting, learning guides (optional)
```

## Project CLAUDE.md Files

| Project | CLAUDE.md |
|---------|-----------|
| IWSVA Cypress E2E | `iwsva-cypress-e2e/CLAUDE.md` |
| K8S Testing Platform | `k8s-auto-testing-platform/CLAUDE.md` |
| Security Testing Demo | `security-testing-demo/CLAUDE.md` |
| CI/CD Demo | `cicd-demo/CLAUDE.md` |
| API Testing Demo | `api-testing-demo/CLAUDE.md` |
| Playwright Demo | `playwright-demo/CLAUDE.md` |
| Selenium Demo | `selenium-demo/CLAUDE.md` |
| SID IAM Testing | `sid-iam-testing-platform/CLAUDE.md` |
| Microservice Testing | `microservice-testing-platform/CLAUDE.md` |

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
pytest tests/ -v                                     # Run ~182 security tests
python zap/zap-baseline.py --target http://localhost # ZAP baseline scan
```

### playwright-demo
```bash
cd playwright-demo
npm install
npx playwright install
npm test                    # All 38 tests (Chromium + Firefox + WebKit)
npm run test:chromium       # Chromium only
npm run test:api            # API tests (no browser)
npm run test:a11y           # Accessibility tests
npm run report              # Open HTML report
```

### selenium-demo
```bash
cd selenium-demo
pip install -r requirements.txt
pytest tests/ -v            # Run Selenium tests
```

### sid-iam-testing-platform
```bash
cd sid-iam-testing-platform
pip install -r requirements.txt
pytest tests/ -v            # Run all 138 tests
pytest tests/test_auth/ -v  # Auth domain only (54 tests)
pytest tests/test_data/ -v  # Data platform only (44 tests)
pytest tests/test_ai/ -v    # AI Agent only (40 tests)
```

### microservice-testing-platform
```bash
cd microservice-testing-platform
npm install
npm run test:unit          # 46 unit tests
npm run test:contract      # 15 contract tests
npm run test:integration   # 20 integration tests
npm run test:e2e           # 10 E2E tests
npm run test:observability # 10 observability tests
npm run test:all           # All 101 tests
npm run docker:up          # Start all services + Redis
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
| `feature/sid-iam-testing` | SID IAM + Data Platform + AI Agent testing (138 tests) | In development |
| `feature/microservice-testing` | Microservice testing platform (101 tests, 5 layers) | In development |

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
| `playwright-tests.yml` | playwright-demo | Cross-browser E2E tests (Chromium, Firefox, WebKit) |
| `sid-iam-ci.yml` | sid-iam-testing-platform | SID IAM CI (code quality, unit tests, integration) |
| `microservice-ci.yml` | microservice-testing-platform | Lint → unit → contract → integration → E2E (101 tests) |
| `api-testing-ci.yml` | api-testing-demo | Validate collections → Newman tests (280+ assertions) |
| `selenium-ci.yml` | selenium-demo | Code quality (black + flake8) → smoke tests |

## Pre-commit Checklist

### Python Projects

```bash
source venv/bin/activate && cd <project-dir>
black --check src/ tests/
isort --check-only src/ tests/
flake8 src/ tests/ --max-line-length=120 --extend-ignore=E203
pytest tests/ -v -m "not integration"
```

### Node.js Projects

```bash
cd <project-dir>
npx eslint . || true
npm test
```

### Writing CI Workflows

Before pushing a new `.github/workflows/*.yml`:

```bash
# 1. Verify every command in the workflow exists in deps
grep <tool> requirements.txt   # Python: black, flake8, isort, pylint
grep <tool> package.json       # Node.js: eslint, prettier, newman

# 2. Run each CI step locally in order
# 3. Confirm all steps pass before pushing
```

### Common Pitfalls

| Check | Why | Learned From |
|-------|-----|--------------|
| `black` / `isort` / `flake8` | CI enforces formatting | ISS-001, ISS-002 |
| New imports → `requirements.txt` | Missing deps = `ModuleNotFoundError` in CI | ISS-003 |
| New markers → `pytest.ini` | `--strict-markers` rejects undeclared markers | ISS-004 |
| Contract schemas match actual responses | Validate response shape before writing schema | ISS-005, ISS-006 |
| CI tools must be in dependency files | `command not found` (exit 127) if missing | ISS-007 |
| Run tests locally before pushing CI | Pre-existing test failures break CI | ISS-008 |

## Wiki & Roadmap

- Wiki: https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/wiki
- Roadmap: https://github.com/users/zhoujuxi2028/projects/1

## Security

- Never commit credentials
- Check `.gitignore` before committing
