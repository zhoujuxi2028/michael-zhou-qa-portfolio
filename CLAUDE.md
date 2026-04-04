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
- **每阶段开始时，先对照 checklist 列出本阶段所有交付物**，再逐项完成
- Claude 在每个阶段完成后必须**报告状态并等待确认**，不得自行跳到下一阶段
- 如果评审发现问题，在当前阶段修复后重新评审
- 阶段可根据任务规模简化（小 bugfix 可合并阶段），但需用户同意
- 详见 [Development Process Checklist](docs/dev-process-checklist.md)

## Projects (by Testing Category)

| Category | Project | Key Tech | CLAUDE.md |
|----------|---------|----------|-----------|
| 功能测试 | `iwsva-cypress-e2e/` — IWSVA E2E (77 tests) | Cypress, Page Objects | `iwsva-cypress-e2e/CLAUDE.md` |
| DevOps | `cicd-demo/` — DevOps Infrastructure Platform | Terraform, K8S, ArgoCD, Prometheus | `cicd-demo/CLAUDE.md` |
| 功能测试 | `api-testing-demo/` — API testing (280+ assertions) | Newman, Postman, json-server | `api-testing-demo/CLAUDE.md` |
| 功能测试 | `playwright-demo/` — Cross-browser E2E (38 tests) | Playwright, TypeScript, axe-core | `playwright-demo/CLAUDE.md` |
| 功能测试 | `selenium-demo/` — Browser automation | Selenium, Python, Allure | `selenium-demo/CLAUDE.md` |
| 安全测试 | `security-testing-demo/` — Security (~182 tests, OWASP Top 10) | Pytest, OWASP ZAP, Nessus, SQLMap | `security-testing-demo/CLAUDE.md` |
| 平台测试 | `sid-iam-testing-platform/` — IAM + Data + AI Agent (163 tests) | Python, Pytest, FastAPI, networkx | `sid-iam-testing-platform/CLAUDE.md` |
| 平台测试 | `microservice-testing-platform/` — Microservice (101 tests, 5 layers) | Node.js, Express, Jest, Redis, k6 | `microservice-testing-platform/CLAUDE.md` |
| 性能测试 | `performance-testing-platform/` — k6 + JMeter dual-engine (71 unit + 15 perf) | k6, JMeter, Express, Grafana, InfluxDB | `performance-testing-platform/CLAUDE.md` |
| 稳定性测试 | `k8s-auto-testing-platform/` — K8S HPA + Chaos (37 tests) | Python, Pytest, Chaos Mesh | `k8s-auto-testing-platform/CLAUDE.md` |

> **Quick Commands**: 各项目的安装、运行、测试命令详见对应子项目 `CLAUDE.md`。

## Standard docs/ Template

```
docs/
├── architecture/           # ARCHITECTURE.md, design decisions, API specs
├── test-cases/             # TEST-CASES.md, test reports, strategies
├── project-management/     # WBS.md, ISSUES.md, requirements, defects
└── guides/                 # FAQ, troubleshooting, learning guides (optional)
```

## Virtual Environment (Python Projects)

```bash
python3 -m venv venv && source venv/bin/activate
```

## Port Allocation

避免跨项目端口冲突，所有项目端口统一分配如下：

| 端口 | 项目 | 服务 |
|------|------|------|
| 3000 | performance-testing-platform | Target API |
| 3001 | api-testing-demo | json-server |
| 3002 | api-testing-demo (staging) | json-server |
| 3003-3005 | microservice-testing-platform | Order / Inventory / Payment |
| 3010 | performance-testing-platform | Grafana |
| 3020 | k8s-auto-testing-platform | Grafana (K8S) |
| 6379 | microservice-testing-platform | Redis |
| 8080 | k8s-auto-testing-platform | Test App |
| 8086 | performance-testing-platform | InfluxDB |
| 3100 | security-testing-demo | Juice Shop |
| 8090 | security-testing-demo | OWASP ZAP |
| 8443 | selenium-demo / iwsva-cypress-e2e | IWSVA |
| 9090 | cicd-demo / k8s | Prometheus |
| 9390-9392 | security-testing-demo | OpenVAS |

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
| `feature/performance-testing` | Performance testing platform (k6 + JMeter dual-engine) | In development |

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
| `performance-ci.yml` | performance-testing-platform | Lint → unit tests → k6 + JMeter smoke gate |

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

**CI 防假绿灯规则（详见 `docs/dev-process-checklist.md` 阶段 3/4）：**
- 禁止 `|| true`、`continue-on-error`、`--collect-only` 作为最终方案
- 临时 workaround 必须同时创建 follow-up issue 追踪
- 测试阶段：移除所有 workaround 后再验证一次 + 故意失败确认 CI 能报红

### Common Pitfalls

| Check | Why | Learned From |
|-------|-----|--------------|
| `black` / `isort` / `flake8` | CI enforces formatting | ISS-001, ISS-002 |
| New imports → `requirements.txt` | Missing deps = `ModuleNotFoundError` in CI | ISS-003 |
| New markers → `pytest.ini` | `--strict-markers` rejects undeclared markers | ISS-004 |
| Contract schemas match actual responses | Validate response shape before writing schema | ISS-005, ISS-006 |
| CI tools must be in dependency files | `command not found` (exit 127) if missing | ISS-007 |
| Run tests locally before pushing CI | Pre-existing test failures break CI | ISS-008 |
| Upgrade tasks: scan ALL refs, verify ALL workflows | Partial scan misses third-party actions; partial CI check misses untriggered workflows | ISS-009 |
| `$(cmd)` 捕获数值必须清洗输出 | Node.js/Python 子进程可能输出 warning，污染 shell 变量导致 `-ge` 比较异常 | ISS-010 |
| k6 `setup()` 请求必须用 tag 隔离 | setup/teardown 的 HTTP 请求计入全局 metrics，会污染 threshold 判定 | ISS-011 |
| CI 绿灯 ≠ 测试通过，禁止 `continue-on-error` 掩盖失败 | 22 个 Newman 断言失败被隐藏，临时 workaround 变成永久遗留 | ISS-012, ISS-013 |
| JMeter 正式测试前先 `npm run jmeter:dryrun` | 字段名/状态码错误在 dry-run 阶段拦截，避免全量测试浪费时间 | #50 |

## Wiki & Roadmap

- Wiki: https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/wiki
- Roadmap: https://github.com/users/zhoujuxi2028/projects/1

## Security

- Never commit credentials
- Check `.gitignore` before committing
- Code scanning alerts (Trivy): CI runner global packages → dismiss as "false positive"; K8S/Helm/Terraform/Dockerfile demo configs → dismiss as "won't fix"
