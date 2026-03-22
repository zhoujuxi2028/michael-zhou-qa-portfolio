# Michael Zhou - QA Portfolio | QA 作品集

**Senior QA Engineer | 高级QA工程师**

Test automation and DevOps demonstration projects.
测试自动化与 DevOps 示范项目。

---

## Projects | 项目

| Category | Project | Description | Tech Stack |
|----------|---------|-------------|------------|
| 功能测试 | [iwsva-cypress-e2e](./iwsva-cypress-e2e/) | IWSVA E2E Testing (77 tests) | Cypress, JavaScript |
| DevOps | [cicd-demo](./cicd-demo/) | DevOps Infrastructure Platform (IaC + GitOps + Monitoring) | Terraform, K8S, ArgoCD, Prometheus |
| 功能测试 | [api-testing-demo](./api-testing-demo/) | API Testing (280+ assertions) | Newman, Postman, json-server |
| 功能测试 | [playwright-demo](./playwright-demo/) | Cross-Browser E2E Testing (38 tests) | Playwright, TypeScript, axe-core |
| 功能测试 | [selenium-demo](./selenium-demo/) | Browser Automation | Selenium, Python, Allure |
| 安全测试 | [security-testing-demo](./security-testing-demo/) | DAST Security Testing (~182 tests, OWASP Top 10) | OWASP ZAP, Nessus, SQLMap, Pytest |
| 平台测试 | [sid-iam-testing-platform](./sid-iam-testing-platform/) | IAM + Data + AI Agent Testing (138 tests) | Python, Pytest, FastAPI, networkx |
| 平台测试 | [microservice-testing-platform](./microservice-testing-platform/) | Microservice Testing (101 tests, 5 layers) | Node.js, Express, Jest, Redis, k6 |
| 稳定性测试 | [k8s-auto-testing-platform](./k8s-auto-testing-platform/) | K8S HPA + Chaos Engineering (37 tests) | Python, Pytest, Chaos Mesh |

---

## Skills Demonstrated | 技能展示

- **Test Automation | 测试自动化**: Cypress, Playwright, Selenium, Pytest
- **API Testing | API测试**: Postman, Newman
- **Security Testing | 安全测试**: OWASP ZAP, Nessus, DAST, OWASP Top 10 2021
- **CI/CD**: GitHub Actions, Docker
- **Cloud/K8S | 云原生**: Kubernetes, HPA, Chaos Mesh
- **Monitoring | 监控**: Prometheus, Grafana

---

## CI/CD Workflows | 持续集成

| Workflow | Project | Trigger | Purpose |
|----------|---------|---------|---------|
| `pipeline.yml` | cicd-demo | Push to main, manual | Full pipeline: Lint → Build → E2E → Deploy |
| `pr-checks.yml` | cicd-demo | PR to main | Fast PR validation (2-3 min) |
| `docker-tests.yml` | cicd-demo | Nightly, manual | Docker regression tests |
| `security-scan.yml` | cicd-demo | Push/PR, daily, manual | Trivy + npm audit → SARIF |
| `helm-deploy.yml` | cicd-demo | Push to main (helm/**), PR | Helm chart validation & deploy |
| `security-tests.yml` | security-testing-demo | Push/PR, weekly, manual | DVWA + Juice Shop + ZAP + dependency scan |
| `k8s-ci.yml` | k8s-auto-testing-platform | Push/PR, manual | Code quality + unit tests + K8S integration |
| `playwright-tests.yml` | playwright-demo | Push/PR to main | Cross-browser E2E (Chromium, Firefox, WebKit) |
| `sid-iam-ci.yml` | sid-iam-testing-platform | Push/PR, manual | Code quality + unit tests + integration (138 tests) |
| `microservice-ci.yml` | microservice-testing-platform | Push/PR | Lint → unit → contract → integration → E2E (101 tests) |

---

## Quick Start | 快速开始

```bash
# Clone
git clone https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio.git
cd michael-zhou-qa-portfolio

# Create virtual environment (for all Python projects)
python3 -m venv venv
source venv/bin/activate

# Run any project | 运行任意项目
cd iwsva-cypress-e2e && npm install && npm test
cd k8s-auto-testing-platform && pip install -r requirements.txt && pytest tests/ -v
cd security-testing-demo && pip install -r requirements.txt && pytest tests/ -v
cd cicd-demo && npm install && npm test
cd playwright-demo && npm install && npx playwright install && npm test
cd sid-iam-testing-platform && pip install -r requirements.txt && pytest tests/ -v
cd microservice-testing-platform && npm install && npm run test:all
```

---

## Wiki | 文档

For detailed documentation, see the [Project Wiki](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/wiki):

| Page | Description |
|------|-------------|
| [Architecture](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/wiki/Architecture) | System architecture & test layering |
| [Test Strategy](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/wiki/Test-Strategy) | Test types, coverage, selection criteria |
| [CI/CD Pipeline](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/wiki/CI-CD-Pipeline) | GitHub Actions workflows & triggers |
| [Defect Management](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/wiki/Defect-Management) | Label system, issue workflow |
| [Lessons Learned](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/wiki/Lessons-Learned) | Real-world debugging experiences |
| [Tech Stack](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/wiki/Tech-Stack) | Tool selection rationale |

---

## Contact | 联系方式

- GitHub: [@zhoujuxi2028](https://github.com/zhoujuxi2028)
