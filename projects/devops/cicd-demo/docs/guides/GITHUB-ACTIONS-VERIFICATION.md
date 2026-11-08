# GitHub Actions Verification Guide

本项目当前需要验证的有效 workflow：

1. `docker-tests.yml` — 夜间/手动 Docker 回归测试
2. `security-scan.yml` — Push / PR / 定时安全扫描

## 1. 验证 workflow 是否存在

```bash
git ls-tree HEAD:.github/workflows
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/docker-tests.yml'))"
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/security-scan.yml'))"
```

## 2. 验证 Docker 回归 workflow

`docker-tests.yml` 当前只保留以下触发方式：

- `workflow_dispatch`
- `schedule`

手动触发示例：

```bash
gh workflow run docker-tests.yml --ref main
gh run list --workflow=docker-tests.yml --limit 5
```

预期结果：

- Docker 镜像构建成功
- Cypress / Newman 容器执行完成
- artifacts 正常上传

## 3. 验证安全扫描 workflow

`security-scan.yml` 会在 `cicd-demo/**` 相关的 push / PR 上自动触发，也支持手动和每日定时触发。

```bash
gh workflow run security-scan.yml --ref main
gh run list --workflow=security-scan.yml --limit 5
```

预期结果：

- `npm-audit` job 运行
- `trivy-filesystem` / `trivy-docker` / `trivy-iac` job 运行
- SARIF 结果上传到 GitHub Security tab

## 4. 历史引用说明

若其他历史文档提到 `pr-checks.yml`、`pipeline.yml` 或 `helm-deploy.yml`，请将其视为归档设计，不代表当前仓库仍然保留这些 workflow。
