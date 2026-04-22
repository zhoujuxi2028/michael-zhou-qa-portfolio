# GitHub Actions Workflows Guide

当前 `cicd-demo` 在仓库根目录实际保留的 workflow 只有 2 个：

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `docker-tests.yml` | `schedule`, `workflow_dispatch` | Docker 回归测试（Cypress + Newman） |
| `security-scan.yml` | `push`, `pull_request`, `schedule`, `workflow_dispatch` | npm audit + Trivy 安全扫描 |

## 当前策略

- **Docker 回归**：保留为夜间/手动执行，避免在每次代码变更时拉长主流程
- **安全扫描**：对 `cicd-demo/**` 的 push / PR 持续执行，并每日定时补扫
- **历史引用说明**：旧文档中出现的 `pr-checks.yml`、`pipeline.yml`、`helm-deploy.yml` 仅代表历史设计；这些文件当前已不在根目录 `.github/workflows/` 中

## 快速验证

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/docker-tests.yml'))"
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/security-scan.yml'))"
```

## 文件位置

```text
.github/workflows/
├── docker-tests.yml
└── security-scan.yml
```
