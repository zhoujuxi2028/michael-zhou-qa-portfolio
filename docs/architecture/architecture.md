# Architecture — Dependabot Groups 聚合配置

**Issue:** #813
**变更类型:** 纯配置变更（YAML），不涉及应用代码逻辑
**更新日期:** 2026-11-03

## 当前架构

`.github/dependabot.yml` 包含 **22 个** updates 条目：

| Ecosystem      | 条目数 | 目录                                                                                                    |
|----------------|--------|---------------------------------------------------------------------------------------------------------|
| github-actions | 1      | /                                                                                                       |
| npm            | 7      | /, /cicd-demo, /playwright-demo, /microservice-testing-platform, /performance-testing-platform, /api-testing-demo, /iwsva-cypress-e2e |
| terraform      | 1      | /cicd-demo/terraform                                                                                    |
| docker         | 6      | /cicd-demo, /k8s-auto-testing-platform/app, /microservice-testing-platform/services/inventory-service, /microservice-testing-platform/services/order-service, /microservice-testing-platform/services/payment-service, /performance-testing-platform |
| pip            | 7      | /ai-testing-platform, /k8s-auto-testing-platform, /k8s-auto-testing-platform/app, /robot-framework-demo, /security-testing-demo, /selenium-demo, /sid-iam-testing-platform |
| **合计**       | **22** |                                                                                                         |

每次 Dependabot 扫描，22 个条目各自独立产生 PR，无聚合，导致每周约 53 个 PR。

## 目标架构

在每个 updates 条目内增加 `groups` 字段，按 `update-type` 分为两组：

- `routine-updates`：包含 `minor` 和 `patch` 类型升级 → 同条目内合为 1 个 PR（低风险，可批量合并）
- `major-updates`：包含 `major` 类型升级 → 同条目内合为 1 个 PR（破坏性变更，需人工审查）

```yaml
groups:
  routine-updates:
    update-types:
      - "minor"
      - "patch"
  major-updates:
    update-types:
      - "major"
```

## 核心约束

| 约束 | 说明 |
|------|------|
| groups 作用域 | 仅作用于**单个 updates 条目内部**（相同目录 + 相同 ecosystem） |
| 跨目录合并 | 不支持，22 个条目是每周 PR 数量的理论下限 |
| 安全更新 | 始终独立创建 PR，不受 groups 影响 |
| docker 单镜像 | docker 条目每目录通常只有 1 个镜像，groups 无实际聚合效果，但统一添加保持一致性 |

## 预期效果

每个条目内的多包升级从 N 个 PR 降为最多 2 个（routine / major），全局每周 PR 从 ~53 降至 ~22。
