# CLAUDE.md - QA Portfolio

## 仓库定位
- QA / Test Automation / DevOps 作品集仓库
- 顶层目录下各子项目基本可独立安装、运行、测试
- 优先在对应子项目内修改，避免在根目录堆放临时产物

## 分支规则
- 开发、测试、验证只在 `feature/*` 或 `fix/*` 分支进行
- 不在 `main` 上直接改代码、跑修复、做验证
- 需要隔离工作目录时，优先使用仓库内 `./.worktrees/feature-*`

## 顶层项目
| 项目 | 类型 | 主要技术 |
|---|---|---|
| `performance-testing-platform` | 性能测试 | k6, JMeter, Express, Grafana |
| `playwright-demo` | E2E/UI/API | Playwright, TypeScript |
| `api-testing-demo` | API 测试 | Postman, Newman, json-server |
| `selenium-demo` | UI 自动化 | Selenium, Pytest |
| `iwsva-cypress-e2e` | E2E | Cypress |
| `security-testing-demo` | 安全测试 | Pytest, OWASP ZAP, Docker |
| `k8s-auto-testing-platform` | K8S 测试 | Pytest, Kubernetes, Chaos Mesh |
| `sid-iam-testing-platform` | 平台测试 | Pytest, FastAPI, networkx |
| `microservice-testing-platform` | 微服务测试 | Node.js, Jest, Redis |
| `cicd-demo` | DevOps Demo | GitHub Actions, Docker, Terraform |

## 通用命令
### Node.js 项目
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
- **Commit Convention**: 详见 [GIT-COMMIT-CONVENTION.md](docs/GIT-COMMIT-CONVENTION.md) - 格式统一、issue 关联、Copilot 署名
- **Conventional Commits Format**: `<type>(<scope>): <subject> [#issue]`

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
| `feature/performance-testing` | Performance testing platform (k6 + JMeter dual-engine, Phase 1-7 done) | In development |

## GitHub Actions

All workflows are in root `.github/workflows/` (GitHub ignores subdirectory workflows).

| Workflow | Project | Purpose |
|----------|---------|---------|
| `api-testing-ci.yml` | api-testing-demo | Validate collections → Newman tests (280+ assertions) |
| `k8s-ci.yml` | k8s-auto-testing-platform | K8S CI (code quality, unit tests, integration) |
| `performance-ci.yml` | performance-testing-platform | Lint → unit tests → k6 + JMeter smoke gate |
| `security-tests.yml` | security-testing-demo | Security tests (DVWA, Juice Shop, ZAP, OWASP Top 10) |
| `sid-iam-ci.yml` | sid-iam-testing-platform | SID IAM CI (code quality, unit tests, integration) |
| `docker-tests.yml` | cicd-demo | Docker-based nightly regression tests |
| `security-scan.yml` | cicd-demo | Security scanning (Trivy, npm audit, SARIF) |
| `repo-meta-ci.yml` | repository root | PR 级轻量 lint（docs / workflow / JSON / shell / Markdown links） |
| `claude.yml` | repository | Claude Code 助手触发入口 |
| `claude-code-review.yml` | repository | Claude Code PR review |

### CI Job Naming Convention

- workflow 名使用 `<Project> CI`
- job id 使用稳定 kebab-case，测试 job 统一为 `unit-tests`
- job 显示名使用 `<Project> / <Stage>`，例如 `Performance Testing / Unit Tests`
- 修改 check 名称后，需同步清理 branch protection / rulesets 中的历史 required checks（如 `Unit-Tests`、`unit-test`）

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
npx prettier --check 'src/**/*.js' 'tests/**/*.js' 'scripts/**/*.js'
npm test
```

### Python 项目
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pytest tests/ -v
```

## 文档与约定
- 项目说明看各子项目 `README.md` / `CLAUDE.md`
- 文档索引见 `docs/README.md`
- 详细复盘见 `docs/project-management/postmortems/`
- workaround 规则见 `docs/guides/workaround-tracking.md`
- 常见坑：新增依赖要同步依赖文件；新增 marker 要更新 `pytest.ini`；CI 写文件前先 `mkdir -p`
- 修改 CI 时先本地验证，避免 `|| true` 或 `continue-on-error` 掩盖失败
