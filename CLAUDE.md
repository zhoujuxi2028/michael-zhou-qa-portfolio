# CLAUDE.md

## 仓库定位
- QA / Test Automation / DevOps 作品集仓库
- 顶层目录下每个子项目基本可独立安装、运行、测试
- 优先修改对应子项目，不要在根目录堆放临时产物

## 分支规则
- 开发、测试、验证只在 `feature/*` 或 `fix/*` 分支进行
- 不在 `main` 上直接改代码、跑修复、做验证

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
npm install
npm run lint
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
- 项目说明看各子项目 `README.md`
- 面向 Agent 的简明规则看各子项目 `CLAUDE.md`
- 历史问题与排查经验见 `docs/postmortem-2026-Q1.md`、`docs/guides/workaround-tracking.md`
- 修改 CI 时，先本地验证对应命令，禁止用 shell 兜底写法或 `continue-on-error` 掩盖失败
