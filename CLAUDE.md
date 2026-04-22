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
- 项目说明看各子项目 `README.md` / `CLAUDE.md`
- 文档索引见 `docs/README.md`
- 详细复盘见 `docs/project-management/postmortems/`
- workaround 规则见 `docs/guides/workaround-tracking.md`
- 常见坑：新增依赖要同步依赖文件；新增 marker 要更新 `pytest.ini`；CI 写文件前先 `mkdir -p`
- 修改 CI 时先本地验证，避免 `|| true` 或 `continue-on-error` 掩盖失败
