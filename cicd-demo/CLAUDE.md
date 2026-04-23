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
