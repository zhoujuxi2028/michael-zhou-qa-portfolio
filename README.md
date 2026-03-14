# Michael Zhou - QA Portfolio | QA 作品集

**Senior QA Engineer | 高级QA工程师**

Test automation and DevOps demonstration projects.
测试自动化与 DevOps 示范项目。

---

## Projects | 项目

| Project                                                   | Description                                          | Tech Stack                        |
| --------------------------------------------------------- | ---------------------------------------------------- | --------------------------------- |
| [iwsva-cypress-e2e](./iwsva-cypress-e2e/)                 | IWSVA E2E Testing (77 tests) ([setup notes](./docs/iwsva-setup.md)) | Cypress, JavaScript               |
| [k8s-auto-testing-platform](./k8s-auto-testing-platform/) | K8S HPA + Chaos Engineering (37 tests)               | Python, Pytest, Chaos Mesh        |
| [security-testing-demo](./security-testing-demo/)         | DAST Security Testing (170 tests, OWASP Top 10 2021) | OWASP ZAP, Nessus, SQLMap, Pytest |
| [cicd-demo](./cicd-demo/)                                 | CI/CD Pipeline Demo                                  | GitHub Actions, Docker            |
| [api-testing-demo](./api-testing-demo/)                   | API Testing                                          | Newman, Postman                   |
| [selenium-demo](./selenium-demo/)                         | Browser Automation                                   | Selenium, Python                  |

---

## Skills Demonstrated | 技能展示

- **Test Automation | 测试自动化**: Cypress, Selenium, Pytest
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
```

---

## Contact | 联系方式

- GitHub: [@zhoujuxi2028](https://github.com/zhoujuxi2028)
