# Phase 4 测试用例 — Soak Test + 可观测性增强 (#65)

## 单元测试

| ID         | 描述                         | 验证 |
| ---------- | ---------------------------- | ---- |
| UT-SOAK-01 | 稳定 heap (10% 增长) → ok    | Jest |
| UT-SOAK-02 | 警告 (30% 增长) → warning    | Jest |
| UT-SOAK-03 | 严重泄漏 (60% 增长) → leaked | Jest |
| UT-SOAK-04 | baseline 为零 → 不崩溃       | Jest |
| UT-SOAK-05 | 负增长 (heap 缩小) → ok      | Jest |
| UT-SOAK-06 | LEAK_THRESHOLD = 0.50        | Jest |
| UT-SOAK-07 | WARN_THRESHOLD = 0.25        | Jest |

## 性能测试

| ID         | 测试场景       | VUs | 时长 | 通过标准                                 |
| ---------- | -------------- | --- | ---- | ---------------------------------------- |
| SOAK-TC-01 | 短时验证       | 10  | 5min | p95 < 500ms, error < 1%                  |
| SOAK-TC-02 | 默认 soak (1h) | 200 | 1h   | p95 < 500ms, error < 1%, heap 增长 < 50% |
| SOAK-TC-03 | 完整 soak (4h) | 500 | 4h   | p95 < 500ms, error < 1%, heap 增长 < 50% |

## Grafana 验证

| ID         | 验证项             | 方法                         |
| ---------- | ------------------ | ---------------------------- |
| SOAK-TC-04 | Dashboard 面板渲染 | `docker compose up` + 浏览器 |
| SOAK-TC-05 | 告警规则触发       | 注入人工负载                 |
