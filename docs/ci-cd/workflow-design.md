# CI/CD Workflow 设计文档

> 本文档记录 michael-zhou-qa-portfolio 所有 GitHub Actions workflow 的设计意图、触发条件和 Job 依赖关系。
> 由 `scripts/check-workflow-doc-sync.sh` 校验文档与 workflow 文件的同步状态。

---

## 1. Workflow 总览

| # | Workflow 名称 | 文件 | 域 | 触发方式 |
|---|---|---|---|---|
| 1 | AI Testing Platform CI | `ai-testing-ci.yml` | AI 测试 | push / PR / dispatch |
| 2 | API Testing CI | `api-testing-ci.yml` | API 测试 | push / PR / dispatch |
| 3 | CICD Demo / Deploy Pipeline | `cicd-demo-deploy.yml` | 部署 | push / dispatch |
| 4 | CICD Demo / PR Pipeline | `cicd-demo-pr.yml` | PR 质量门 | PR / dispatch |
| 5 | CICD Demo / Terraform CI | `cicd-demo-terraform.yml` | IaC | PR / dispatch |
| 6 | Claude Code Review | `claude-code-review.yml` | AI 代码审查 | dispatch（已禁用自动触发）|
| 7 | CodeQL Analysis | `codeql-analysis.yml` | 安全 | push / PR / schedule / dispatch |
| 8 | Commit Guard | `commit-guard.yml` | 提交规范 | PR / dispatch |
| 9 | Copilot Setup Steps | `copilot-setup-steps.yml` | 依赖预热 | push / PR / dispatch |
| 10 | Docker-Based Tests | `docker-tests.yml` | 集成测试 | schedule / dispatch |
| 11 | K8S Auto Testing Platform CI | `k8s-ci.yml` | K8s 测试 | push / PR / dispatch |
| 12 | Nightly Soak & Weekly Capacity | `nightly-soak.yml` | 性能压测 | schedule / dispatch |
| 13 | Performance Testing CI | `performance-ci.yml` | 性能测试 | push / PR / dispatch |
| 14 | Repository Meta CI | `repo-meta-ci.yml` | 仓库规范 | push / PR / dispatch |
| 15 | Security Scanning | `security-scan.yml` | 安全扫描 | push / PR / schedule / dispatch |
| 16 | Security Tests | `security-tests.yml` | 安全测试 | push / PR / schedule / dispatch |
| 17 | Setup Project Labels | `setup-labels.yml` | 仓库管理 | dispatch |
| 18 | SID IAM CI | `sid-iam-ci.yml` | IAM 测试 | push / PR / dispatch |

---

## 2. Workflow 详细说明

### 2.1 AI Testing Platform CI — `ai-testing-ci.yml`

**用途：** 对 `ai-testing-platform/` 模块执行代码质量检查和单元测试，涵盖 TestCaseGenerator、DefectPredictor、ScriptGenerator 和 P0 关键用例。

**触发条件：**

| 事件 | 分支 / 路径 |
|---|---|
| `push` | `main`, `feature/*`, `copilot/*`；路径 `ai-testing-platform/**` |
| `pull_request` | `main`；路径 `ai-testing-platform/**` |
| `workflow_dispatch` | — |

**Job 依赖关系：**

```
code-quality → unit-tests → verify-by-module
```

| Job | 说明 |
|---|---|
| `code-quality` | black / isort / flake8 格式检查 |
| `unit-tests` | 43 个单元测试，输出覆盖率报告 |
| `verify-by-module` | 按模块分组验证（P0 Critical 必须全通过）|

---

### 2.2 API Testing CI — `api-testing-ci.yml`

**用途：** 使用 Newman 对 `api-testing-demo/` 的 Postman 集合执行 API 功能测试，以 json-server 作为 mock 后端。

**触发条件：**

| 事件 | 分支 / 路径 |
|---|---|
| `push` | `main`；路径 `api-testing-demo/**` |
| `pull_request` | `main`；路径 `api-testing-demo/**` |
| `workflow_dispatch` | — |

**Job 依赖关系：**

```
validate → api-tests
```

| Job | 说明 |
|---|---|
| `validate` | 校验 Postman Collection JSON 结构 |
| `api-tests` | 启动 json-server，Newman 执行断言测试，上传报告（保留 14 天）|

---

### 2.3 CICD Demo / Deploy Pipeline — `cicd-demo-deploy.yml`

**用途：** 演示完整的 GitOps 部署流程：Helm 打包 → staging 部署 → 冒烟测试 → production 部署（需人工审批）。

**触发条件：**

| 事件 | 分支 / 路径 |
|---|---|
| `push` | `main`；路径 `cicd-demo/**` |
| `workflow_dispatch` | 输入：`skip_production`（boolean，默认 false）|

> **⚠️ 并发策略：** `cancel-in-progress: false`，部署任务串行排队，不允许中途取消。

**Job 依赖关系：**

```
build-and-package
    ├── deploy-staging → smoke-test-staging
    │                         └── deploy-production（需 production 环境审批）
    └─────────────────────────────────────────────┘
                         deploy-summary
```

| Job | 环境 | 说明 |
|---|---|---|
| `build-and-package` | — | Helm lint、打包、SBOM 生成（Syft CycloneDX）|
| `deploy-staging` | `staging` | Helm dry-run，渲染 staging 清单 |
| `smoke-test-staging` | — | Newman 冒烟测试 |
| `deploy-production` | `production` | 需 GitHub Environment 人工审批 |
| `deploy-summary` | — | 生成部署摘要 Markdown |

---

### 2.4 CICD Demo / PR Pipeline — `cicd-demo-pr.yml`

**用途：** PR 阶段的多维质量门控：代码规范、Helm 校验、K8s 清单验证、Docker 构建验证、安全扫描、测试数量阈值检查。

**触发条件：**

| 事件 | 分支 / 路径 |
|---|---|
| `pull_request` | `main`；路径 `cicd-demo/**` |
| `workflow_dispatch` | — |

**Job 依赖关系：**

```
lint ──────────────────────────────┐
unit-tests ────────────────────────┤
build ─────────────────────────────┼──► pr-gate → push-metrics
security-scan ─────────────────────┤
quality-gate ──────────────────────┘
```

| Job | 质量门阈值 |
|---|---|
| `lint` | ESLint 0 错误 |
| `unit-tests` | Helm lint、kubeconform 校验通过 |
| `build` | Docker Buildx 构建成功（不推送）|
| `security-scan` | npm audit moderate 以下；Trivy HIGH/CRITICAL = 0 |
| `quality-gate` | Newman 断言 ≥ 15，Cypress 测试 ≥ 15 |
| `pr-gate` | 所有上游 Job 通过才标记成功 |

---

### 2.5 CICD Demo / Terraform CI — `cicd-demo-terraform.yml`

**用途：** 对 `cicd-demo/terraform/` IaC 代码执行格式、语法和安全扫描，阻止 HIGH/CRITICAL 级别的 Terraform 安全问题合入。

**触发条件：**

| 事件 | 分支 / 路径 |
|---|---|
| `pull_request` | `main`；路径 `cicd-demo/terraform/**` |
| `workflow_dispatch` | — |

**Job 依赖关系：**

```
fmt ────────┐
validate ───┼──► tf-gate
security ───┘
```

| Job | 说明 |
|---|---|
| `fmt` | `terraform fmt -check -recursive` |
| `validate` | `terraform validate`（无 backend）|
| `security` | Trivy IaC 扫描（HIGH/CRITICAL 硬阻断）|

---

### 2.6 Claude Code Review — `claude-code-review.yml`

**用途：** 使用 Anthropic Claude API 对 PR 代码进行 AI 辅助审查。

> **⚠️ 当前状态：** 已于 2026-04-27 禁用自动触发（`pull_request` 触发已注释），原因：token 配额不足。当前仅支持手动 `workflow_dispatch`。

**触发条件：**

| 事件 | 说明 |
|---|---|
| `workflow_dispatch` | 唯一有效触发方式 |

**Job 说明：**

| Job | 说明 |
|---|---|
| `claude-review` | 调用 `anthropics/claude-code-action@v1`，跳过 Draft PR / dependabot / Copilot；`continue-on-error: true` 防止外部服务故障阻塞流水线 |

**依赖 Secrets：** `CLAUDE_CODE_OAUTH_TOKEN`

---

### 2.7 CodeQL Analysis — `codeql-analysis.yml`

**用途：** 对 JavaScript/TypeScript 和 Python 代码执行 GitHub CodeQL 语义分析，检测安全漏洞，结果上传至 GitHub Security 面板。

**触发条件：**

| 事件 | 分支 / 路径 / 计划 |
|---|---|
| `push` | `main`；路径 `**/*.js`, `**/*.py` |
| `pull_request` | `main`；路径同上 |
| `schedule` | 每周一 04:00 UTC |
| `workflow_dispatch` | — |

**Job 说明：**

| Job | Matrix | 说明 |
|---|---|---|
| `analyze` | `javascript-typescript`, `python` | CodeQL 初始化 → Autobuild → 分析 → SARIF 上传 |

**权限：** `security-events: write`（SARIF 上传必需）

---

### 2.8 Commit Guard — `commit-guard.yml`

**用途：** 在 PR 合入前强制执行三项规范：Conventional Commits 格式、秘密扫描、Husky hook 语法校验。

**触发条件：**

| 事件 | 分支 |
|---|---|
| `pull_request` | `main` |
| `workflow_dispatch` | — |

**Job 说明（并行，无依赖）：**

| Job | 规则 |
|---|---|
| `conventional-commits` | 提交消息格式：`type(scope): description`；≤ 72 字符；无尾随标点 |
| `secret-scan` | 扫描 AWS key、GH token、私钥、JWT 等；支持 `.secretsallow` 白名单 |
| `hook-syntax` | `bash -n` 校验 `.husky/pre-commit`、`pre-push`、`commit-msg` |

---

### 2.9 Copilot Setup Steps — `copilot-setup-steps.yml`

**用途：** 为 GitHub Copilot 代理预热依赖缓存（Node.js + Python），覆盖仓库所有 7 个子项目，减少后续 Job 的依赖安装耗时。

**触发条件：**

| 事件 | 路径 |
|---|---|
| `push` | `.github/workflows/copilot-setup-steps.yml` |
| `pull_request` | 同上 |
| `workflow_dispatch` | — |

**Job 说明：**

| Job | 说明 |
|---|---|
| `copilot-setup-steps` | Setup Node.js 20 + Python 3.11，缓存 7 个项目的依赖清单 |

---

### 2.10 Docker-Based Tests — `docker-tests.yml`

**用途：** 夜间在真实 Docker 环境中并行运行 Cypress + Newman 集成测试，模拟生产级容器化执行，结果上传至 S3（可选）。

**触发条件：**

| 事件 | 计划 |
|---|---|
| `schedule` | 每天 02:00 UTC（北京时间 10:00）|
| `workflow_dispatch` | — |

**Job 说明：**

| Job | 说明 |
|---|---|
| `docker-tests` | Docker Compose 启动 Cypress + Newman 容器并行执行；检查退出码；Cypress 截图/视频（保留 7 天）、Newman 报告（保留 30 天）；S3 上传（条件：`AWS_ACCESS_KEY_ID` 存在）|

---

### 2.11 K8S Auto Testing Platform CI — `k8s-ci.yml`

**用途：** 对 `k8s-auto-testing-platform/` 执行代码质量、单元测试，并可选地创建 Kind 集群执行 Kubernetes 集成测试（含 HPA 验证）。

**触发条件：**

| 事件 | 分支 / 路径 |
|---|---|
| `push` | `main`；路径 `k8s-auto-testing-platform/**` |
| `pull_request` | `main`；路径同上 |
| `workflow_dispatch` | 输入：`run_integration`（boolean，默认 false）|

**Job 依赖关系：**

```
code-quality → unit-tests → k8s-integration-tests（仅 run_integration=true）
                    └──────────────────────────────────────────────────────► build-status
```

| Job | 说明 |
|---|---|
| `code-quality` | black / isort / flake8 / pylint（fail-under: 8.0）|
| `unit-tests` | pytest，排除 integration/slow 标记，生成 JUnit XML + HTML |
| `k8s-integration-tests` | Kind 集群（k8s-testing），安装 Metrics Server，构建镜像加载进 Kind，验证 HPA，180s 超时 |
| `build-status` | always 运行，汇总结果 |

---

### 2.12 Nightly Soak & Weekly Capacity — `nightly-soak.yml`

**用途：** 长时间压力测试和容量规划测试，验证系统在持续负载下的稳定性和极限吞吐量。

**触发条件：**

| 事件 | 计划 / 输入 |
|---|---|
| `schedule` soak | 每天 03:00 UTC → `soak-short` 场景 |
| `schedule` capacity | 每周日 06:00 UTC → `capacity` 场景 |
| `workflow_dispatch` | 输入：`scenario`（`soak-short` \| `capacity`）|

> **并发策略：** `cancel-in-progress: false`，长时压测不中断。

**Job 说明：**

| Job | 触发条件 | 工具 | 产物保留 |
|---|---|---|---|
| `nightly-soak` | schedule 03:00 或 dispatch=soak-short | k6 v1.7.0 | 30 天 |
| `weekly-capacity` | schedule 06:00 或 dispatch=capacity | k6 v1.7.0 | 30 天 |

---

### 2.13 Performance Testing CI — `performance-ci.yml`

**用途：** 对 `performance-testing-platform/` 执行完整的性能测试流水线：代码规范 → 单元/Shell 测试 → JMeter 冒烟测试 → k6 基准比较 → 性能趋势追踪。

**触发条件：**

| 事件 | 分支 / 路径 |
|---|---|
| `push` | `main`, `feature/performance-testing`；路径 `performance-testing-platform/**` |
| `pull_request` | 同上 |
| `workflow_dispatch` | — |

**Job 依赖关系：**

```
performance-lint ─────────────────────────────────────────────┐
unit-tests ──────────────────┬──► jmeter-smoke-test ──────────┤
shell-tests-fast ────────────┘                                 │
shell-tests-integration ──────────────────────────────────────┤
                              └──► smoke-test → baseline-compare
                                         └──► trend-collect
                                                              ↓
                                                       performance-gate（always）
```

| Job | 阈值 |
|---|---|
| `jmeter-smoke-test` | 错误率 < 1%，p95 < 500ms |
| `baseline-compare` | p95 退步 > 20% 警告，> 50% 失败 |
| `performance-gate` | 所有上游通过 |

---

### 2.14 Repository Meta CI — `repo-meta-ci.yml`

**用途：** 仓库级规范守卫：校验变更文件的 YAML/JSON/Shell 语法，检测 Markdown 断链，并验证变更的 workflow 文件是否已同步登记到 `README.md` 和 `CLAUDE.md`。

**触发条件：**

| 事件 | 分支 |
|---|---|
| `push` | `main` |
| `pull_request` | `main` |
| `workflow_dispatch` | — |

**Job 说明：**

| Job | 检查项 |
|---|---|
| `lint` | YAML 语法、JSON 语法、Shell `bash -n`、Markdown 断链、workflow-doc 同步（`scripts/check-workflow-doc-sync.sh`）|

---

### 2.15 Security Scanning — `security-scan.yml`

**用途：** 对 `cicd-demo/` 执行多层安全扫描：npm 依赖审计、文件系统漏洞、Docker 镜像漏洞、IaC 配置风险，结果上传至 GitHub Security 面板。

**触发条件：**

| 事件 | 分支 / 路径 / 计划 |
|---|---|
| `push` | `main`；路径 `cicd-demo/**` |
| `pull_request` | `main`；路径同上 |
| `schedule` | 每天 03:00 UTC |
| `workflow_dispatch` | — |

**Job 依赖关系：**

```
npm-audit ──────────────┐
trivy-filesystem ───────┤
trivy-docker ───────────┼──► security-quality-gate → security-summary
trivy-iac ──────────────┘
```

| Job | 工具 | 阻断条件 |
|---|---|---|
| `npm-audit` | npm audit | 任意 moderate 以上漏洞 |
| `trivy-filesystem` | Trivy fs | CRITICAL/HIGH/MEDIUM → SARIF |
| `trivy-docker` | Trivy image（matrix）| CRITICAL/HIGH → SARIF |
| `trivy-iac` | Trivy config | Terraform/K8s 配置风险 → SARIF |
| `security-quality-gate` | — | 存在 CRITICAL 则硬失败（exit-code: 1）|

**权限：** `security-events: write`（SARIF 上传必需）

---

### 2.16 Security Tests — `security-tests.yml`

**用途：** 基于真实漏洞靶场（DVWA、Juice Shop）执行 OWASP Top 10 功能性安全测试，并运行 OWASP ZAP 基线扫描和 Python 依赖漏洞扫描。

**触发条件：**

| 事件 | 分支 / 路径 / 计划 |
|---|---|
| `push` | `main`；路径 `security-testing-demo/**` |
| `pull_request` | 同上 |
| `schedule` | 每周日 00:00 UTC |
| `workflow_dispatch` | — |

**Job 说明（并行，无依赖）：**

| Job | 靶场 / 工具 | 产物 |
|---|---|---|
| `security-tests` | DVWA（port 80）/ pytest | `test-report.html`, `security-tests.xml` |
| `juice-shop-tests` | Juice Shop（port 3000）/ pytest | `juice-shop-report.html` |
| `zap-baseline-scan` | DVWA + OWASP ZAP | `report_html.html` |
| `dependency-scan` | Safety（Python）| `dependency-scan.json` |
| `summary` | — | OWASP Top 10 覆盖度汇总表 |

---

### 2.17 Setup Project Labels — `setup-labels.yml`

**用途：** 一次性初始化仓库 Issue/PR 标签，创建或更新 11 个 `proj:xxx` 标签（如 `proj:performance`、`proj:k8s`、`proj:security` 等）。

**触发条件：**

| 事件 | 说明 |
|---|---|
| `workflow_dispatch` | 唯一触发方式，按需手动执行 |

**Job 说明：**

| Job | 说明 |
|---|---|
| `create-proj-labels` | 通过 `actions/github-script` 创建/更新标签，HTTP 422 视为已存在并更新 |

---

### 2.18 SID IAM CI — `sid-iam-ci.yml`

**用途：** 对 `sid-iam-testing-platform/` 执行完整的身份认证与授权测试：代码质量 → 单元测试 → 集成测试 → P0 关键路径验证（138 个测试，含 60 个 P0 + 安全测试）。

**触发条件：**

| 事件 | 分支 / 路径 |
|---|---|
| `push` | `main`, `feature/sid-iam-testing`；路径 `sid-iam-testing-platform/**` |
| `pull_request` | `main`；路径同上 |
| `workflow_dispatch` | — |

**Job 依赖关系：**

```
code-quality → unit-tests → integration-tests
                    └──────────────────────────► all-tests
```

| Job | 说明 |
|---|---|
| `code-quality` | black / isort / flake8 |
| `unit-tests` | pytest，排除 integration 标记，输出覆盖率 |
| `integration-tests` | pytest integration 标记 |
| `all-tests` | 全量 138 测试，验证 P0 Critical（60 个）和安全测试通过率 |

---

## 3. 触发条件汇总

### 3.1 Push 触发（main 分支）

| Workflow | 路径过滤 |
|---|---|
| `ai-testing-ci.yml` | `ai-testing-platform/**` |
| `api-testing-ci.yml` | `api-testing-demo/**` |
| `cicd-demo-deploy.yml` | `cicd-demo/**` |
| `cicd-demo-terraform.yml` | `cicd-demo/terraform/**` |
| `codeql-analysis.yml` | `**/*.js`, `**/*.py` |
| `k8s-ci.yml` | `k8s-auto-testing-platform/**` |
| `performance-ci.yml` | `performance-testing-platform/**` |
| `repo-meta-ci.yml` | —（全量）|
| `security-scan.yml` | `cicd-demo/**` |
| `security-tests.yml` | `security-testing-demo/**` |
| `sid-iam-ci.yml` | `sid-iam-testing-platform/**` |

### 3.2 定时任务（Schedule）

| Workflow | Cron | 北京时间 | 场景 |
|---|---|---|---|
| `codeql-analysis.yml` | `0 4 * * 1` | 周一 12:00 | 每周安全分析 |
| `docker-tests.yml` | `0 2 * * *` | 每天 10:00 | 夜间集成测试 |
| `nightly-soak.yml` | `0 3 * * *` | 每天 11:00 | soak-short 压测 |
| `nightly-soak.yml` | `0 6 * * 0` | 周日 14:00 | capacity 容量测试 |
| `security-scan.yml` | `0 3 * * *` | 每天 11:00 | 安全扫描 |
| `security-tests.yml` | `0 0 * * 0` | 周日 08:00 | 每周安全测试 |

### 3.3 仅支持手动触发（workflow_dispatch only）

| Workflow | 说明 |
|---|---|
| `claude-code-review.yml` | AI 代码审查（token 配额不足，自动触发已禁用）|
| `docker-tests.yml` | 夜间测试也支持手动按需执行 |
| `nightly-soak.yml` | 支持选择场景：`soak-short` \| `capacity` |
| `setup-labels.yml` | 标签初始化，一次性操作 |

---

## 4. Job 依赖关系图（跨 Workflow）

各 Workflow 独立运行，无跨 Workflow 的 Job 依赖。以下为同一部署域中的逻辑关联：

```
PR 阶段
  cicd-demo-pr.yml      ──► PR 质量门（必须通过才能合入）
  cicd-demo-terraform.yml ──► IaC 格式/安全门
  commit-guard.yml      ──► 提交规范门
  repo-meta-ci.yml      ──► 仓库规范门

Push 到 main 后
  cicd-demo-deploy.yml  ──► staging 自动部署 → 冒烟测试 → production（需审批）
  security-scan.yml     ──► 持续安全扫描
  codeql-analysis.yml   ──► 语义安全分析
```

---

## 5. 关键配置约定

| 约定 | 说明 |
|---|---|
| 路径过滤 | 所有 CI workflow 均配置 `paths`，只有相关模块变更才触发，避免不必要的运行 |
| 并发控制 | 默认 `cancel-in-progress: true`；部署类 workflow 使用 `false` 防止中途取消 |
| SARIF 上传 | 安全类 workflow（CodeQL、Trivy）统一上传 SARIF 至 GitHub Security 面板 |
| 产物保留 | 测试报告默认 14–30 天；性能/压测报告 30 天；Docker 截图 7 天 |
| Python 版本 | `3.11`（AI / K8s / SID IAM），`3.13`（Security Tests）|
| Node.js 版本 | `18`（API Testing、Nightly Soak、CICD Demo），`20`（Copilot Setup）|
| 文档同步 | 变更 `.github/workflows/*.yml` 时，`repo-meta-ci.yml` 会检查 `README.md` 和 `CLAUDE.md` 是否同步登记 |
