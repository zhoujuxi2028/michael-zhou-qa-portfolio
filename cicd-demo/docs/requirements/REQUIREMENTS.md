# CICD Demo — Requirements

## 功能需求

| ID | 描述 | 优先级 |
|----|------|--------|
| FR-CICD-001 | Terraform IaC（S3, DynamoDB, 3 环境） | P0 |
| FR-CICD-002 | Kubernetes 编排（k3d, 3 节点） | P0 |
| FR-CICD-003 | ArgoCD GitOps（dev 自动/staging 手动同步） | P0 |
| FR-CICD-004 | Helm Charts 版本化部署 | P0 |
| FR-CICD-005 | Trivy 4 层安全扫描（fs/Docker/IaC/dep） | P0 |
| FR-CICD-006 | Prometheus + Grafana 监控（14 面板） | P1 |
| FR-CICD-007 | AlertManager + Slack 告警 | P1 |
| FR-CICD-008 | npm audit 依赖检查 | P1 |
| FR-CICD-009 | Cypress E2E 测试（16 测试） | P1 |
| FR-CICD-010 | Newman API 测试（18 断言） | P1 |
| FR-CICD-011 | GitHub Actions PR 门禁 + 部署流水线 | P0 |
| FR-CICD-012 | Docker Compose 容器化测试执行 | P1 |
| FR-CICD-013 | Pushgateway 构建/测试/部署指标 | P2 |
| FR-CICD-014 | Loki + Promtail 日志聚合 | P2 |
| FR-CICD-015 | Localstack 本地 AWS 模拟 | P2 |

## 非功能需求

| ID | 类别 | 要求 |
|----|------|------|
| NFR-CICD-001 | CI | PR gate + deploy pipeline + Terraform CI |
| NFR-CICD-002 | 安全 | Trivy SARIF → GitHub Security |
| NFR-CICD-003 | 恢复 | ArgoCD 自愈功能 |
