# Michael Zhou - QA Portfolio | QA 作品集

**Senior QA Engineer | 高级QA工程师**

Test automation, performance testing, and DevOps demonstration projects.
测试自动化、性能测试与 DevOps 示范项目。

> **Performance Testing:** k6 + JMeter 双引擎负载测试 | 容量测试二分法定位 ~6000 VUs 拐点 | JWT 认证高并发压测 | 限流/熔断/崩溃点测试 | 自动摘要报告 | Grafana + InfluxDB 可观测

---

## Table of Contents | 目录

- [Projects | 项目](#projects--项目)
- [Skills Demonstrated | 技能展示](#skills-demonstrated--技能展示)
- [CI/CD Workflows | 持续集成](#cicd-workflows--持续集成)
- [Prerequisites | 运行环境要求](#prerequisites--运行环境要求)
- [Quick Start | 快速开始](#quick-start--快速开始)
- [Wiki | 文档](#wiki--文档)
- [Known Issues | 已知问题](#known-issues--已知问题)
- [Contact | 联系方式](#contact--联系方式)

---

## Projects | 项目

### 性能测试 (Performance Testing)

| Project | Description | Tech Stack |
|---------|-------------|------------|
| [performance-testing-platform](./performance-testing-platform/) | k6 + JMeter 双引擎 (148 unit + 31 integration + 33 perf) — 容量测试 + JWT 认证压测 + Soak 稳定性 + 基础设施 helpers + 限流熔断 + 崩溃测试 | k6, JMeter, Express, Grafana, InfluxDB |

### 自动化测试 (Test Automation)

| Project | Description | Tech Stack |
|---------|-------------|------------|
| [playwright-demo](./playwright-demo/) | Cross-Browser E2E Testing (38 tests) | Playwright, TypeScript, axe-core |
| [selenium-demo](./selenium-demo/) | Browser Automation | Selenium, Python, Allure |
| [iwsva-cypress-e2e](./iwsva-cypress-e2e/) | IWSVA E2E Testing (77 tests) | Cypress, JavaScript |
| [api-testing-demo](./api-testing-demo/) | API Testing (280+ assertions) | Newman, Postman, json-server |

### 系统测试 (System Testing)

| Project | Description | Tech Stack |
|---------|-------------|------------|
| [security-testing-demo](./security-testing-demo/) | DAST Security Testing (~182 tests, OWASP Top 10) | OWASP ZAP, Nessus, SQLMap, Pytest |
| [k8s-auto-testing-platform](./k8s-auto-testing-platform/) | K8S HPA + Chaos Engineering (37 tests) | Python, Pytest, Chaos Mesh |

### 平台测试 (Platform Testing)

| Project | Description | Tech Stack |
|---------|-------------|------------|
| [sid-iam-testing-platform](./sid-iam-testing-platform/) | IAM + Data + AI Agent Testing (138 tests) | Python, Pytest, FastAPI, networkx |
| [microservice-testing-platform](./microservice-testing-platform/) | Microservice Testing (101 tests, 5 layers) | Node.js, Express, Jest, Redis, k6 |

### AI 测试 (AI Testing)

| Project | Description | Tech Stack |
|---------|-------------|------------|
| [ai-testing-platform](./ai-testing-platform/) | AI-Powered Testing Platform — 智能测试用例生成 + 缺陷预测 + 脚本生成 (43 tests) | Python, Pytest, Rule Engine |

### DevOps

| Project | Description | Tech Stack |
|---------|-------------|------------|
| [cicd-demo](./cicd-demo/) | DevOps Infrastructure Platform (IaC + GitOps + Monitoring) | Terraform, K8S, ArgoCD, Prometheus |

---

## Performance Testing Highlights | 性能测试亮点

### [performance-testing-platform](./performance-testing-platform/) — Capacity Test

> k6 + JMeter 双引擎 | Express Cluster (多核) | Grafana + InfluxDB 可观测

**容量测试 (二分法, 28 轮)** 在 MacBook Pro Intel i5-1038NG7 (4C8T, 16GB) 上完成瓶颈定位：

| 指标 | 值 |
|------|-----|
| 最大安全并发 | **~6000 VUs** (p95=490ms ✅, error=0%) |
| 吞吐量天花板 | **~6,800 req/s** |
| 拐点 | 6000~6125 VUs |
| 主要瓶颈 | **Node.js event loop (CPU-bound)** |

**瓶颈定位过程 (3层证据):**
- CPU 持续 99.9~100%；内存 avg 61%、磁盘 avg 9 MB/s（远低于 SSD 上限 ~2,200 MB/s）
- Event loop lag p95 随 VUs 线性增长：197ms@3000 → 324ms@6000 → 433ms@6125
- R20 对照组 (0% 写操作) p95 与混合流量相近 → 排除 SQLite 写锁为瓶颈

> 完整逐轮数据 → [performance-testing-platform/docs/qa/rtm.md](./performance-testing-platform/docs/qa/rtm.md)

---

## Skills Demonstrated | 技能展示

- **Test Automation | 测试自动化**: Cypress, Playwright, Selenium, Pytest
- **API Testing | API测试**: Postman, Newman
- **Security Testing | 安全测试**: OWASP ZAP, Nessus, DAST, OWASP Top 10 2021
- **Performance Testing | 性能测试**: k6, JMeter, Load/Stress/Spike Testing
- **CI/CD**: GitHub Actions, Docker
- **Cloud/K8S | 云原生**: Kubernetes, HPA, Chaos Mesh
- **Monitoring | 监控**: Prometheus, Grafana, InfluxDB

---

## CI/CD Workflows | 持续集成

| Workflow | Project | Trigger | Purpose |
|----------|---------|---------|---------|
| `cicd-demo-pr.yml` | cicd-demo | PR to main (`cicd-demo/**`) | **PR Pipeline**: lint + unit/contract tests + Docker build + quick security scan + `pr-gate` 聚合 (< 5 min) |
| `cicd-demo-deploy.yml` | cicd-demo | Push to main (`cicd-demo/**`), manual | **Deploy Pipeline**: Helm package + SBOM → staging (auto) → smoke test → production (manual approval) |
| `cicd-demo-terraform.yml` | cicd-demo | PR to main (`cicd-demo/terraform/**`) | **Terraform CI**: fmt-check + validate + Trivy IaC security scan + tf-gate |
| `docker-tests.yml` | cicd-demo | Nightly, manual | Docker regression tests |
| `security-scan.yml` | cicd-demo | Push/PR, daily, manual | Trivy + npm audit → SARIF |
| `security-tests.yml` | security-testing-demo | Push/PR, weekly, manual | DVWA + Juice Shop + ZAP + dependency scan |
| `k8s-ci.yml` | k8s-auto-testing-platform | Push/PR, manual | Code quality + unit tests + K8S integration |
| `playwright-tests.yml` | playwright-demo | Push/PR to main | Cross-browser E2E (Chromium, Firefox, WebKit) |
| `sid-iam-ci.yml` | sid-iam-testing-platform | Push/PR, manual | Code quality + unit tests + integration (138 tests) |
| `microservice-ci.yml` | microservice-testing-platform | Push/PR | Lint → unit → contract → integration → E2E (101 tests) |
| `performance-ci.yml` | performance-testing-platform | Push/PR | Lint → unit tests → k6 + JMeter smoke gate |
| `setup-labels.yml` | repository | Manual (`workflow_dispatch`) | 一键创建/更新 11 个 `proj:xxx` labels |
| `repo-meta-ci.yml` | repository root | Push/PR, manual | docs/workflow/JSON/shell/Markdown links 轻量校验 + workflow 文档同步检查 |

> **PR → Merge → Deploy 端到端流程**：`cicd-demo` 演示了完整的 CI/CD 闭环 — PR 触发并行的 lint/unit-tests/build/security-scan 四个 job 经 `pr-gate` 聚合，合并到 `main` 后自动触发 `build-and-package` → `deploy-staging`（自动）→ `deploy-production`（手动审批）。详见 [cicd-demo/README.md#pr--merge--deploy-流程](./cicd-demo/README.md#pr--merge--deploy-流程) 的 ASCII / Mermaid 流程图与 Branch Protection 配置说明。

---

## Prerequisites | 运行环境要求

### 通用

| 软件 | 最低版本 | 验证命令 | 安装方式 |
|------|----------|----------|----------|
| Git | 2.x | `git --version` | git-scm.com |
| Node.js | 18+ | `node -v` | nodejs.org |
| npm | 9+ | `npm -v` | 随 Node.js |
| Python | 3.10+ | `python3 --version` | python.org |
| Docker | 20+ | `docker -v` | docker.com |
| Docker Compose | v2+ | `docker compose version` | 随 Docker Desktop |

### 各项目额外依赖

| 项目 | 额外依赖 | 安装方式 |
|------|----------|----------|
| playwright-demo | Playwright browsers | `npx playwright install` |
| security-testing-demo | OWASP ZAP, Docker | `docker compose up` 自动拉取 |
| k8s-auto-testing-platform | kubectl, Kubernetes cluster | docker.com/kubernetes |
| performance-testing-platform | k6, JMeter | `brew install k6 jmeter` (macOS) |
| microservice-testing-platform | Redis (Docker) | `docker compose up` 自动拉取 |

### 端口占用

以下端口需确保未被占用（按项目）：

| 端口 | 项目 | 服务 |
|------|------|------|
| 3000 | performance-testing-platform | Target API |
| 3001-3002 | api-testing-demo | json-server |
| 3003-3005 | microservice-testing-platform | Order / Inventory / Payment |
| 3010 | performance-testing-platform | Grafana |
| 3020 | k8s-auto-testing-platform | Grafana |
| 3100 | security-testing-demo | Juice Shop |
| 6379 | microservice-testing-platform | Redis |
| 8080 | k8s-auto-testing-platform | Test App |
| 8086 | performance-testing-platform | InfluxDB |
| 8090 | security-testing-demo | OWASP ZAP |
| 9090 | cicd-demo / k8s | Prometheus |

### 一键验证

```bash
git clone https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio.git
cd michael-zhou-qa-portfolio/<node-project>
npm install
npm test
```

### Python 子项目
```bash
git clone https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio.git
cd michael-zhou-qa-portfolio/<python-project>
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pytest tests/ -v
```

## 根目录文件说明

| 文件 | 用途 |
|---|---|
| `package.json` / `package-lock.json` | 根目录 Husky 与少量跨项目脚本 |
| `.gitignore` | 忽略虚拟环境、coverage、worktree、临时产物 |
| `docs/guides/label-strategy.md` | GitHub Issue Label 使用规范 |
| `CLAUDE.md` | 仓库级简明协作规则 |

## GitHub Actions

仓库 workflow 文件统一放在 `.github/workflows/`，请直接以该目录为准。

## 参考文档
- 根目录规范：[`CLAUDE.md`](./CLAUDE.md)
- 架构与过程文档：[`docs/`](./docs/)
- 各子项目说明：对应目录下 `README.md` / `CLAUDE.md`
