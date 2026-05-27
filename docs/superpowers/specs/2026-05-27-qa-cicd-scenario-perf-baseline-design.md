# Design: QA-CICD-SCENARIOS 新增场景 10 性能基线验证

**Issue**: #283  
**Branch**: `docs/qa-cicd-scenario-perf-baseline`  
**File**: `cicd-demo/docs/reference/QA-CICD-SCENARIOS.md`

## Scope

Pure documentation change — no code, no workflow, no config.

## Changes

| # | 变更 | 位置 |
|---|------|------|
| 1 | 插入场景 10：性能基线验证（Performance Baseline Gate） | 场景 9 之后 |
| 2 | 原场景 10（Flaky Test 治理）→ 场景 11 | 场景列表 |
| 3 | 原场景 11（测试数据管理）→ 场景 12 | 场景列表 |
| 4 | 反模式引用 `（场景 10）` → `（场景 11）` | 反模式表 |
| 5 | MVP 表格新增第 6 行：性能基线验证 | MVP 表 |

## 新场景 10 内容

**标题**：场景 10：性能基线验证（Performance Baseline Gate）

**适用时机**：staging 部署后、生产发布前、回归周期性执行。

| 项目 | 内容 |
|------|------|
| 推荐工具 | k6、JMeter、InfluxDB + Grafana |
| 质量门禁 | P95 ≤ 基线阈值；错误率 < 1%；吞吐量不低于基线 90% |
| 输出产物 | k6 HTML report、JUnit XML、基线对比差值 |
| 失败处理 | 阻断生产部署；区分环境抖动与真实回归 |
| Demo 映射 | `performance-testing-platform/`、`performance-ci.yml`、`nightly-soak.yml` |

**重点**：性能基线验证的核心不是追求绝对性能，而是在每次发布前检测性能退化。区分"环境抖动"和"真实回归"是门禁可信度的关键。

## MVP 新增行

| 顺序 | 场景 | 最小实现 |
|------|------|---------|
| 6 | 性能基线验证 | staging 后跑 k6 smoke，P95 超阈值阻断 production |

## Out of Scope

- 企业级扩展路线中「性能基线自动比较」条目不变（指更高级的自动对比能力）
- 不修改任何 workflow 文件
- 不修改 performance-testing-platform 代码
