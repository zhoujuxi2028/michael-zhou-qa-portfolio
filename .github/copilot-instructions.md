# GitHub Copilot Instructions for Michael Zhou QA Portfolio

## 语言偏好 (Language Preference)

**请优先使用中文回复所有问题、代码注释和文档。**

### 中文输出规范 (Chinese Output Standards)

1. **代码注释和文档** — 使用中文
   - 类、函数、变量的注释用中文
   - 测试用例的描述用中文
   - README、CLAUDE.md 等文档用中文

2. **技术术语保持英文** — 保持专业性
   - 库名称：`pytest`, `jest`, `k6`, `Grafana`
   - 技术概念：`AAA pattern`, `DRY`, `TDD`, `coverage`
   - API 名称：保持原样（如 `getByRole`, `fireEvent`）

3. **回复和解释** — 优先中文
   - 技术方案讲解用中文
   - 错误排查用中文
   - 学习内容用中文
   - 代码审查反馈用中文

### 双语并存原则 (Bilingual Coexistence)

- 核心代码逻辑保持现有风格（可中可英）
- 新增注释统一中文
- 代码变量名保持一致性（不混用）
- 必要时英中并注，例：
  ```python
  # 计算折扣 (calculate discount)
  def calc_discount():
      pass
  ```

---

## Branch Discipline (分支规范)

**⚠️ CRITICAL: All development, testing, and verification must be on `feature/*` branches. Never commit code changes to `main`.**

- Stage 1-5 work: Use corresponding `feature/*` branch
- Main branch: Only receives PR merges or documentation updates post-merge
- See `CLAUDE.md` for active branch list and status

---

## 项目上下文 (Project Context)

**Portfolio Type**: QA Testing & DevOps Automation (10 projects)

**Main Branch**: `main` (Default)

**Feature Branches**: 当前无活跃 feature 分支（均已合并到 main）

**Key Technologies**: 
- Testing: Pytest, Jest, Cypress, Playwright, Selenium, k6, JMeter
- DevOps: Kubernetes, Terraform, ArgoCD, Prometheus, Grafana

---

## High-Level Architecture (高层架构)

### Portfolio Structure

```
michael-zhou-qa-portfolio/
├── performance-testing-platform/       # k6 + JMeter dual-engine (148 unit + 31 integration + 33 perf tests)
├── playwright-demo/                    # Cross-browser E2E (38 tests)
├── api-testing-demo/                   # API + Newman (280+ assertions)
├── selenium-demo/                      # Browser automation (Python)
├── iwsva-cypress-e2e/                  # Cypress E2E (77 tests)
├── security-testing-demo/              # DAST + OWASP ZAP (~182 tests)
├── k8s-auto-testing-platform/          # K8S HPA + Chaos (37 tests)
├── sid-iam-testing-platform/           # IAM + Data Platform (163 tests, Python)
├── microservice-testing-platform/      # 5-layer testing (101 tests, Node.js)
├── cicd-demo/                          # DevOps Infrastructure (Terraform, ArgoCD)
├── .github/workflows/                  # CI/CD for all projects (14 workflows)
└── docs/                               # Portfolio-level architecture & guides
```

### Test Pyramid Across Portfolio

| Layer | Technologies | Coverage |
|-------|--------------|----------|
| Unit | Jest, Pytest | 148+ unit tests (perf-platform), per-project base tests |
| Integration | Jest, Pytest, Docker | 31+ integration tests (perf-platform), contract tests (microservices) |
| E2E | Playwright, Cypress, Selenium | 38-77 tests per frontend project |
| Performance | k6, JMeter | 33+ performance tests (perf-platform) |
| Security | OWASP ZAP, Nessus, SQLMap | ~182 tests (security-demo) |

---

## Build, Test & Lint Commands (构建、测试、代码检查)

### Node.js Projects

**性能测试平台** (`performance-testing-platform/`)
```bash
npm install && npm start            # Install + start API (port 3000, cluster mode)
npm test                            # Unit tests (Jest)
npm run test:unit                   # Unit tests only
npm run test:coverage               # With coverage report
npm run lint                        # ESLint
npm run lint:fix                    # Auto-fix
npm run k6:smoke                    # k6 smoke test
npm run jmeter:smoke                # JMeter smoke test
npm run jmeter:dryrun               # JMeter validation before full test
bash scripts/integration-test.sh    # Integration tests (requires Docker, uses mutex lock)
```

**其他 Node.js 项目** (Playwright, API testing, Cypress, Microservices)
```bash
npm test                            # Run full test suite
npm run lint                        # ESLint check
npm start / npm run dev             # Start server (if applicable)
```

### Python Projects

**安全测试** (`security-testing-demo/`)
```bash
source venv/bin/activate
black --check src/ tests/           # Format check
isort --check-only src/ tests/      # Import sort check
flake8 src/ tests/ --max-line-length=120
pytest tests/ -v                    # Run all tests
pytest tests/ -v -k "test_name"     # Run single test
pytest tests/ -v --collect-only     # List tests without running
```

**K8S 自动化测试** (`k8s-auto-testing-platform/`)
```bash
source venv/bin/activate
pytest tests/ -v -m "not integration"   # Unit tests only
pytest tests/ -v -m integration         # Integration tests
pytest tests/ -v                        # All tests
```

**IAM & Data Platform** (`sid-iam-testing-platform/`)
```bash
source venv/bin/activate
pytest tests/ -v
pytest tests/unit -v                # Unit only
pytest tests/integration -v         # Integration only
```

### Python Setup

```bash
cd <project-dir>
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

---

## Key Conventions (关键约定)

### 1. Commit Message Format

All commits must follow conventional commit format with Copilot trailer:

```
feat: add k6 spike testing profile

描述中文说明 (optional)

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
```

**Prefix types**: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `perf:`

### 2. Testing Coverage Requirements

- **Statements**: ≥ 80%
- **Branches**: ≥ 70%
- **Functions**: ≥ 75%
- Run coverage: `npm run test:coverage` (Node.js) or `pytest --cov` (Python)

### 3. Python Code Quality

```bash
# Pre-commit checklist (Python projects)
black --check src/ tests/
isort --check-only src/ tests/
flake8 src/ tests/ --max-line-length=120 --extend-ignore=E203
pytest tests/ -v -m "not integration"
```

Configuration files:
- `pyproject.toml` or `setup.cfg`: Black, isort settings
- `pytest.ini`: Pytest markers and test collection
- `.flake8`: Flake8 rules

### 4. Node.js Code Quality

```bash
# Pre-commit checklist (Node.js projects)
npm run lint
npm test
```

ESLint rules: See individual project `.eslintrc` or `eslintrc.js`

### 5. Test Organization

- **Unit tests**: `tests/unit/` (Jest) or `tests/unit/` (Pytest)
- **Integration tests**: `tests/integration/` or marked with `@pytest.mark.integration`
- **Performance tests**: `tests/performance/` or k6 scripts in `tests/performance-testing-platform/k6/`
- **AAA Pattern**: Arrange → Act → Assert for all tests
- **Naming**: `test_<feature>_<scenario>_<expected_outcome>` or Jest equivalent

### 6. Port Allocation (避免冲突)

Critical for running multiple projects simultaneously:
- **3000**: performance-testing-platform (Target API)
- **3001-3002**: api-testing-demo (json-server)
- **3003-3005**: microservice-testing-platform (services)
- **3010**: performance-testing-platform (Grafana)
- **3100**: security-testing-demo (Juice Shop)
- **6379**: microservice-testing-platform (Redis)
- **8080**: k8s-auto-testing-platform (Test App)
- **8086**: performance-testing-platform (InfluxDB)
- **9090**: cicd-demo / k8s (Prometheus)

Full list in root `CLAUDE.md`

### 7. Documentation Requirements

- **Project-level**: Each project has `CLAUDE.md` (project-specific commands, branch rules)
- **Root-level**: CLAUDE.md contains portfolio overview, git workflow, common pitfalls
- **Architecture**: `docs/ARCHITECTURE.md` defines documentation responsibility matrix
- **API Specs**: `docs/architecture/<project>-api.md` if applicable
- **Test Plans**: `docs/qa/test-plan.md` per project (scope, test types, coverage goals)

### 8. CI/CD Pipeline Rules

All workflows in `.github/workflows/`:

**Anti-patterns (absolute prohibitions)**:
- ❌ Never use `|| true` to hide failures
- ❌ Never use `continue-on-error: true` unless absolutely required + documented
- ❌ Never use `--collect-only` as final test command
- ❌ Always verify CI locally before pushing

**Verification flow**:
1. Run each CI step locally in order
2. Confirm all steps pass
3. Intentionally fail one step to verify CI reports red
4. Push only after green verification

### 9. TDD Workflow (5-Stage Process)

Follows 5-stage development process (see `docs/dev-process-checklist.md`):

1. **需求 (Requirements)**: Analyze issue, confirm scope
2. **设计 (Design)**: Implementation plan, architecture review
3. **开发 (Development)**: TDD coding, commit regularly
4. **测试 (Testing)**: Local verification, lint, CI green
5. **收尾 (Closing)**: PR creation, documentation sync

Each stage ends with pause for human review before proceeding to next stage.

### 10. Python Virtual Environments

- **Create**: `python3 -m venv venv`
- **Activate**: `source venv/bin/activate` (macOS/Linux)
- **Always activate before**: Installing deps, running tests, running linters
- **Check in**: Only `requirements.txt`, not `venv/` directory

---

## Performance Testing Platform Specifics

This portfolio's flagship project deserves special attention:

### Command Quick Reference

```bash
cd performance-testing-platform
npm install && npm start            # Start API
npm test                            # 148 unit tests (Jest)
npm run test:coverage               # Coverage report
npm run lint && npm run lint:fix     # ESLint + auto-fix
npm run k6:smoke                    # k6 smoke test
npm run jmeter:smoke                # JMeter smoke test
bash scripts/integration-test.sh    # 31 integration tests (with mutex lock)
```

### Integration Test Lock Mechanism

**Problem**: Multiple `scripts/integration-test.sh` instances cause port conflicts, database corruption.

**Solution**: Mutex lock using `scripts/lock.sh`

```bash
# If integration test fails due to lock:
rm -rf /tmp/integration-test.lock
bash scripts/integration-test.sh
```

### Key Files

- Test cases: `docs/qa/test-cases/index.md` (Phase 1-7 statistics)
- Architecture: `docs/architecture/architecture.md`
- Implementation plan: `docs/project-management/implementation-plan-phase*.md`
- Risk management: `docs/project-management/risks.md`

---

## When Errors Occur (错误排查)

### Common Pitfalls (from CLAUDE.md)

| Issue | Cause | Solution |
|-------|-------|----------|
| Tests fail locally but CI passes | `|| true` hiding failures | Remove all workarounds, verify CI reports red on failure |
| `ModuleNotFoundError` in CI | Missing dependency | Add to `requirements.txt` or `package.json` |
| Pytest markers rejected | Undeclared marker | Add to `pytest.ini` with `strict-markers` rule |
| Port already in use | Cross-project conflicts | Check port allocation table, use different port |
| k6 thresholds fail | Setup requests counted in metrics | Use `tags: {name: 'setup'}` to isolate setup traffic |
| JMeter test structure errors | Wrong field names/response codes | Run `npm run jmeter:dryrun` before full test |

### How to Debug

1. **Run full command locally**: Reproduce issue in same environment
2. **Check logs**: Look for actual error before the exit code
3. **Verify dependencies**: Confirm all tools installed correctly
4. **Isolate the problem**: Run subset of tests/steps to narrow down
5. **Check configuration files**: `pytest.ini`, `.eslintrc`, `jest.config.js`, etc.

---

## Documentation Resources

- **Architecture & workflow**: `docs/ARCHITECTURE.md`, root `CLAUDE.md`
- **Project-specific**: Each project's `CLAUDE.md` (branch rules, quick commands)
- **Development process**: `docs/dev-process-checklist.md` (5-stage requirements)
- **Test design learning**: `docs/M4-LEARNING-COMPLETION.md` (Copilot test generation patterns)
- **CI/CD examples**: `.github/workflows/` (14 sample workflows)
- **Common issues**: `README.md` Known Issues section

---

## Project-Specific Guidance

Quick links to project CLAUDE.md files for detailed commands and branch rules:

- [performance-testing-platform/CLAUDE.md](../../performance-testing-platform/CLAUDE.md)
- [playwright-demo/CLAUDE.md](../../playwright-demo/CLAUDE.md)
- [api-testing-demo/CLAUDE.md](../../api-testing-demo/CLAUDE.md)
- [security-testing-demo/CLAUDE.md](../../security-testing-demo/CLAUDE.md)
- [microservice-testing-platform/CLAUDE.md](../../microservice-testing-platform/CLAUDE.md)
- [sid-iam-testing-platform/CLAUDE.md](../../sid-iam-testing-platform/CLAUDE.md)
- [k8s-auto-testing-platform/CLAUDE.md](../../k8s-auto-testing-platform/CLAUDE.md)

---

**Last Updated**: 2026-04-17  
**Language Priority**: 中文优先 (Chinese First)  
**Reference**: Root `CLAUDE.md`, `.github/workflows/`, project `CLAUDE.md` files
