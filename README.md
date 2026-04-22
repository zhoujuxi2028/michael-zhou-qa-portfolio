# Michael Zhou QA Portfolio

测试自动化、性能测试、安全测试与 DevOps 演示仓库。

## 项目总览

| 项目 | 类型 | 主要技术 | 常用命令 |
|---|---|---|---|
| [`performance-testing-platform`](./performance-testing-platform/) | 性能测试 | k6, JMeter, Express | `npm install && npm test` |
| [`playwright-demo`](./playwright-demo/) | Cross-browser E2E | Playwright, TypeScript | `npm install && npm test` |
| [`api-testing-demo`](./api-testing-demo/) | API 测试 | Postman, Newman, json-server | `npm install && npm run validate && npm test` |
| [`selenium-demo`](./selenium-demo/) | Selenium 自动化 | Selenium, Pytest | `pip install -r requirements.txt && pytest tests/ -v` |
| [`iwsva-cypress-e2e`](./iwsva-cypress-e2e/) | Cypress E2E | Cypress | `npm install && npm test` |
| [`security-testing-demo`](./security-testing-demo/) | 安全测试 | Pytest, OWASP ZAP, Docker | `docker compose -f docker/docker-compose.yml up -d && pytest tests/ -v` |
| [`k8s-auto-testing-platform`](./k8s-auto-testing-platform/) | K8S 自动化测试 | Pytest, Kubernetes, Chaos Mesh | `pip install -r requirements.txt && pytest tests/ -v` |
| [`sid-iam-testing-platform`](./sid-iam-testing-platform/) | IAM / Data / AI 测试 | Pytest, FastAPI, networkx | `pip install -r requirements.txt && pytest tests/ -v` |
| [`microservice-testing-platform`](./microservice-testing-platform/) | 微服务测试 | Node.js, Jest, Redis | `npm install && npm run test:all` |
| [`cicd-demo`](./cicd-demo/) | DevOps Demo | GitHub Actions, Docker, Terraform | `npm install && npm test` |

## 快速开始

### Node.js 子项目
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
| `LABEL_STRATEGY.md` | GitHub Issue Label 使用规范 |
| `CLAUDE.md` | 仓库级简明协作规则 |

## GitHub Actions

当前仓库主要工作流位于 `.github/workflows/`：
- `api-testing-ci.yml`
- `k8s-ci.yml`
- `performance-ci.yml`
- `security-tests.yml`
- `security-scan.yml`
- `sid-iam-ci.yml`
- `docker-tests.yml`
- `claude.yml`
- `claude-code-review.yml`

## 参考文档
- 根目录规范：[`CLAUDE.md`](./CLAUDE.md)
- 架构与过程文档：[`docs/`](./docs/)
- 各子项目说明：对应目录下 `README.md` / `CLAUDE.md`
