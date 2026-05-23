# CLAUDE.md - cicd-demo

## 项目定位
- DevOps / CI/CD 演示项目
- 包含 GitHub Actions、Docker、Terraform、Kubernetes、ArgoCD、Trivy

## 常用命令
```bash
npm install
npm run validate
npm run lint
npm test
npm run docker:test
```

## 提交前检查
```bash
npm run validate
npm run lint
npm test
```

## 注意事项
- 变更工作流前，先本地验证对应脚本
- 禁止用 `|| true`、`continue-on-error` 隐藏失败
- Docker / K8S 相关变更优先保持脚本和 README 一致

## GitHub Actions（根目录 `.github/workflows/`）
- `cicd-demo-pr.yml` — PR Gate（lint + unit/contract tests + Docker build + 快速安全扫描）
- `cicd-demo-deploy.yml` — Deploy Pipeline（Helm package → staging auto → production 手动审批）
- `docker-tests.yml` — Nightly Docker 全量回归
- `security-scan.yml` — 深度安全扫描（Trivy fs/Docker/IaC + npm audit → SARIF）

Branch protection 与 GitHub Environments 配置详见 `cicd-demo/README.md`。
