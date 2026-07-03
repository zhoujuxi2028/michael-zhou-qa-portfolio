# CLAUDE.md - QA Portfolio

Michael Zhou's QA Portfolio - Test automation & DevOps demos.

## Claude Code Guidelines

- **Be concise**: Keep responses and file content brief and to the point
- **No fluff**: Avoid unnecessary explanations, verbose comments, or filler text
- **Tables over prose**: Use tables/lists instead of paragraphs when possible

## ⚠️ Branch Discipline

**CRITICAL: Never work on `main` branch for development, testing, or verification.**

| Phase | 工作内容 | 分支要求 |
|-------|---------|----------|
| 1-5 (需求→收尾) | 代码编写、测试、验证 | ✅ 使用 `feature/*` 分支 |
| 收尾 (PR 合并后) | 文档同步、Wiki 更新 | ✅ main 已合并，可直接更新 |

**Rule**: 
- Stage 3 (开发) → Stage 4 (测试) → Stage 5 (收尾 PR) 都必须在 feature 分支上
- Main 分支仅用于：(1) 接收 PR merge，(2) 生产部署
- 误操作示例：在 main 上 run tests, commit fixes, git merge —abort ❌

**历史教训**: 2026-04-15 在 main 上触发 merge，导致需要回滚到 feature/performance-testing 重新开始 Stage 4 verification

## Worktree Convention

- 默认 worktree 位置：`~/.config/superpowers/worktrees/<repo-name>/`
- 本仓库推荐路径：`~/.config/superpowers/worktrees/michael-zhou-qa-portfolio/`
- 需要隔离开发、测试、设计验证时，优先使用全局 worktree，而不是在仓库内新建 `.worktrees/`

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
| 性能测试 | `performance-testing-platform/` — k6 + JMeter dual-engine (148 unit + 31 integration + 33 perf) | k6, JMeter, Express, Grafana, InfluxDB | `performance-testing-platform/CLAUDE.md` |
| 稳定性测试 | `k8s-auto-testing-platform/` — K8S HPA + Chaos (37 tests) | Python, Pytest, Chaos Mesh | `k8s-auto-testing-platform/CLAUDE.md` |
| **AI 测试** | `ai-testing-platform/` — AI-Powered Testing Platform (43 tests) | Python, Pytest, Rule Engine | `ai-testing-platform/CLAUDE.md` |

> **Quick Commands**: 各项目的安装、运行、测试命令详见对应子项目 `CLAUDE.md`。

## Standard docs/ Template

```
docs/
├── architecture/           # ARCHITECTURE.md, design decisions, API specs
├── qa/                     # test-plan, test-cases/, rtm, reports/
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
- **Commit Convention**: 详见 [GIT-COMMIT-CONVENTION.md](docs/GIT-COMMIT-CONVENTION.md) - 格式统一、issue 关联、Copilot 署名
- **Conventional Commits Format**: `<type>(<scope>): <subject> [#issue]`

### ⚠️ Commit Subject 长度硬上限：72 字符（Cloud Agent 必读）

`Commit Guard` workflow 强制校验 subject ≤ 72 字符，违规直接 PR 红灯阻塞合并。

| 提交路径 | 是否触发 Husky 客户端防线 | 兜底 |
|----------|---------------------------|------|
| 本地 `git push` | ✅ `.husky/pre-push` 自动跑 `scripts/check-commit-guard.sh` | CI |
| **Cloud Agent `report_progress`** | ❌ **不经过 Husky，客户端防线全部失效** | 仅 CI 事后拦截 |

**Cloud Agent 提交规则（防 PDEF-003 / DEF-022 复发）**：

1. **拟稿即心算字符数**：`<type>(<scope>): <subject> (#issue)` 中 type+scope+`(#NNN)` 通常占 18-22 字符；**描述空间 ≤ 50 字符**
2. **超长信号词**：subject 含 "align / update / refactor + 多个名词列表 + (#issue)" 时几乎必超 72，必须缩写
3. **常用安全模板**：
   - `docs(<scope>): sync workflow names (#NNN)`（≤ 45）
   - `fix(<scope>): <动词> <对象> (#NNN)`（≤ 50）
   - 避免在 subject 罗列 ≥ 2 个工作流/文件名，搬到 body 描述
4. **本地校验等价命令**（Agent 在 bash 中可直接验证拟稿 subject）：
   ```bash
   SUBJECT="docs(readme): sync workflow table (#242)"
   echo "len=${#SUBJECT}"   # 必须 ≤ 72
   ```
5. **失败后**：受 `report_progress` patch-id 去重限制，Agent **无法**通过 filter-branch + push 重写已推送的违规 commit；必须由仓库维护者 squash-merge 或本地 force-push。预防优先于补救。

参考：[PDEF-003 RCA](docs/project-management/postmortems/RCA-2026-05-25-PDEF-003-commit-subject-length.md)、[DEF-022](performance-testing-platform/docs/qa/defects/register.md)、[`scripts/check-commit-guard.sh`](scripts/check-commit-guard.sh)

### Branch Prefix Convention

已用合法前缀（**新增前缀须同步更新 `performance-testing-platform/tests/unit/scripts/stage4-selftest-fast.bats` 白名单**，参见 DEF-023 RCA）：

| 前缀 | 用途 |
|------|------|
| `feature/` | 新功能 |
| `fix/` | Bug 修复 |
| `docs/` | 文档更新 |
| `copilot/` | Cloud Agent / Copilot 自动分支 |
| `hotfix/` | 紧急修复 |

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
| `feature/performance-testing` | Performance testing platform (k6 + JMeter dual-engine, Phase 1-5 done) | In development |
| `copilot/ai-powered-testing-platform-research` | AI Testing Platform (43 tests, 91% coverage) | In development |

### Dependabot PR 处理规则（防 PDEF-007 复发）

Dependabot PR CI 报红时，按以下流程排查，**不要直接关闭**：

| 步骤 | 操作 |
|------|------|
| 1. 判断报错类型 | breaking change（ESLint major 等）→ 关闭并备注；文档/检查缺口 → 修复后继续 |
| 2. 触发 rebase | PR 评论 `@dependabot rebase`，等待分支更新（通常 1-5 分钟） |
| 3. **确认 rebase 包含最新 main** | `git log origin/<dependabot-branch> -1` 的父提交应晚于你的修复合并时间 |
| 4. 若 rebase 早于修复 | 再次评论 `@dependabot rebase`（时间竞态，见 PDEF-007 RCA） |
| 5. CI 全绿后合并 | `gh pr merge <N> --squash` |

> ⚠️ `@dependabot rebase` 是**异步**操作，完成时间不可控。修复合并后若 PR 仍报错，先检查分支父提交时间戳，再决定是否需要二次 rebase。

## GitHub Actions

All workflows are in root `.github/workflows/` (GitHub ignores subdirectory workflows).

| Workflow | Project | Purpose |
|----------|---------|---------|
| `ai-testing-ci.yml` | ai-testing-platform | AI Testing CI: code quality + unit tests (43 tests, 91% coverage) |
| `api-testing-ci.yml` | api-testing-demo | Validate collections → Newman tests (280+ assertions) |
| `robot-framework-ci.yml` | robot-framework-demo | Robot Framework / Pabot parallel + Selenium Grid + Rebot merge (9 tests) |
| `cicd-demo-pr.yml` | cicd-demo | PR Gate: lint + unit/contract tests + Docker build + quick security scan |
| `cicd-demo-deploy.yml` | cicd-demo | Deploy Pipeline: Helm package + SBOM → staging (auto) → smoke test → production (manual approval) |
| `cicd-demo-terraform.yml` | cicd-demo | Terraform CI: fmt-check + validate + Trivy IaC security scan + tf-gate |
| `k8s-ci.yml` | k8s-auto-testing-platform | K8S Testing CI: code quality, unit tests, integration |
| `performance-ci.yml` | performance-testing-platform | Performance Testing CI: lint → unit tests → k6 + JMeter smoke gate |
| `nightly-soak.yml` | performance-testing-platform | Performance / Nightly: soak-short daily + capacity weekly, artifact retention 30 days |
| `security-tests.yml` | security-testing-demo | Security / Tests: DVWA, Juice Shop, ZAP, OWASP Top 10 |
| `sid-iam-ci.yml` | sid-iam-testing-platform | SID IAM CI: code quality, unit tests, integration |
| `docker-tests.yml` | cicd-demo | CICD Demo / Docker Nightly: Cypress + Newman in containers |
| `codeql-analysis.yml` | repository (JS+Python) | CodeQL Analysis: 代码语义漏洞扫描 (XSS, SQLi, path traversal) |
| `security-scan.yml` | cicd-demo | Security / Scan: Trivy fs + Docker + IaC + npm audit → SARIF |
| `repo-meta-ci.yml` | repository root | PR 级轻量 lint（docs / workflow / JSON / shell / Markdown links） |
| `commit-guard.yml` | repository | Conventional Commits 格式校验 + secret scan CI 兜底（绕过 pre-push hook 时的安全网） |
| `claude.yml` | repository | Claude Code 助手触发入口 |
| `claude-code-review.yml` | repository | Claude Code PR review |
| `setup-labels.yml` | repository | 手动触发：一键创建/更新 11 个 `proj:xxx` labels |
| `copilot-setup-steps.yml` | repository | 预热 Node.js/Python 依赖缓存供 Copilot 使用 |

### CI Job Naming Convention

- workflow 名使用 `<Project> CI`
- job id 使用稳定 kebab-case，测试 job 统一为 `unit-tests`
- job 显示名使用 `<Project> / <Stage>`，例如 `Performance Testing / Unit Tests`
- 修改 check 名称后，需同步清理 branch protection / rulesets 中的历史 required checks（如 `Unit-Tests`、`unit-test`）

## Pre-commit Checklist

### 通用（含 Markdown 文件变更时）

```bash
bash scripts/check-markdown-links.sh   # 检查变更的 .md 文件相对路径
```

### 变更 `.github/workflows/*.yml` 时

```bash
git diff --name-only origin/main...HEAD > /tmp/changed-files.txt
bash scripts/check-workflow-doc-sync.sh /tmp/changed-files.txt
rm /tmp/changed-files.txt
```

> pre-push hook 已自动执行此检查（PDEF-006 修复后）。手动运行用于本地提前验证。

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
- 标签策略见 `docs/guides/label-strategy.md`
- 详细复盘见 `docs/project-management/postmortems/`
- workaround 规则见 `docs/guides/workaround-tracking.md`
- 常见坑：新增依赖要同步依赖文件；新增 marker 要更新 `pytest.ini`；CI 写文件前先 `mkdir -p`
- 修改 CI 时先本地验证，避免 `|| true` 或 `continue-on-error` 掩盖失败
