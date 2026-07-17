# K8S Auto Testing Platform — Requirements

## 功能需求

| ID | 描述 | 优先级 |
|----|------|--------|
| FR-K8S-001 | HPA 扩缩容行为验证（上下限） | P0 |
| FR-K8S-002 | Min/max 副本边界测试 | P0 |
| FR-K8S-003 | CPU/内存阈值触发验证 | P0 |
| FR-K8S-004 | Pod 故障注入与恢复（Chaos Mesh） | P0 |
| FR-K8S-005 | 网络延迟/丢包混沌测试 | P1 |
| FR-K8S-006 | 并发请求弹性测试 | P1 |
| FR-K8S-007 | Locust 负载测试 | P1 |
| FR-K8S-008 | Prometheus 指标收集 + Grafana 仪表盘 | P1 |
| FR-K8S-009 | HPA 压力测试自动化脚本 | P1 |
| FR-K8S-010 | Chaos Mesh CRD 集成 | P2 |
| FR-K8S-011 | CSV 指标导出与报告 | P2 |

## 非功能需求

| ID | 类别 | 要求 |
|----|------|------|
| NFR-K8S-001 | 环境 | Kind 集群 + Metrics Server |
| NFR-K8S-002 | 质量 | Black/isort/flake8/pylint 门禁 |
| NFR-K8S-003 | 覆盖率 | pytest 覆盖率 ≥ 80% |
