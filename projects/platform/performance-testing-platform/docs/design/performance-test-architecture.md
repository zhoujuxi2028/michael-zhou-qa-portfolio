# 五类性能测试架构设计

## 1. 设计目标

基于 `docs/qa/test-plan.md` 中对 smoke / load / stress / spike / soak 的职责定义，统一五类性能测试的配置模型、执行链路与观测平面，避免脚本参数分散、阈值口径不一致、可观测能力重复实现。

## 2. 架构总览

```text
profiles/*.json
  ├─ smoke / load / stress / spike / soak
  │
  ▼
tests/performance/helpers/profile.js
  ├─ loadProfile()          -> 单场景脚本读取标准 profile
  └─ buildScenarioProfile() -> 多场景脚本生成 load + observer options
  │
  ▼
tests/performance/*.k6.js
  ├─ smoke / load / stress / spike
  └─ soak / soak-short
  │
  ├─ 业务流量: products/detail/orders/auth
  └─ 观测流量: /metrics observer
  │
  ▼
Express API + SQLite + /metrics
  │
  ├─ k6 HTML / JMeter HTML 报告
  ├─ InfluxDB / Grafana
  └─ reports/ + results/
```

## 3. 分层职责

| 层         | 组件                                  | 职责                                                   |
| ---------- | ------------------------------------- | ------------------------------------------------------ |
| 配置层     | `profiles/*.json`                     | 统一定义负载模型、阈值、observer 元数据                |
| 编排层     | `helpers/profile.js`                  | 解析 profile，组装 k6 `options`，隔离单场景/多场景差异 |
| 场景层     | `smoke/load/stress/spike/soak*.k6.js` | 承载具体业务流量模型与故障/恢复行为                    |
| 观测层     | `metricsObserver.js`、`/metrics`      | 采集 heap、event loop、CPU 等应用级指标                |
| 质量门禁层 | Jest / lint / format / CI             | 用 TDD 固化配置契约与脚本接入规则                      |

## 4. 五类测试类型映射

| 类型   | 核心问题           | 负载模型                  | 观测要求                   | 产出            |
| ------ | ------------------ | ------------------------- | -------------------------- | --------------- |
| smoke  | 系统是否可用       | `vus + duration` 最小负载 | 基础响应时间/错误率        | 快速门禁        |
| load   | 预期负载是否达标   | 分阶段稳定爬升            | 延迟、吞吐、错误率         | SLA 验证        |
| stress | 超载后如何退化     | 阶梯式高压                | 错误率、降级拐点           | 容量边界        |
| spike  | 瞬时突发后能否恢复 | 快速拉升 + 回落           | 峰值稳定性                 | 突发恢复能力    |
| soak   | 长时间运行是否稳定 | 长稳态 + observer         | 内存、event loop、认证延迟 | 稳定性/泄漏验证 |

## 5. 关键架构决策

### 5.1 配置驱动优先

- smoke/load/stress/spike/soak 全部落到 `profiles/`
- spike 从脚本内联 options 改为复用统一 profile
- soak 新增标准 profile，统一阈值和 observer 元数据来源

### 5.2 单场景与多场景分离

- `loadProfile()` 负责 smoke/load/stress/spike 这类单场景脚本
- `buildScenarioProfile()` 负责 soak/soak-short 这类 `load + observer` 多场景脚本

### 5.3 阈值只绑定业务场景

- soak 使用 `http_req_duration{scenario:load}` 与 `http_req_failed{scenario:load}`
- observer 场景只做观测，不污染业务 SLA

### 5.4 观测能力复用

- observer 元数据放在 `profiles/soak.json`
- 具体长/短 soak 时长仍由脚本按环境变量覆写 stage，兼顾统一设计与运行灵活性

## 6. 非功能要求

| 维度     | 设计约束                                               |
| -------- | ------------------------------------------------------ |
| 可维护性 | 新增测试类型时优先增加 profile，而不是复制脚本 options |
| 一致性   | 五类测试共用同一套 profile 校验规则                    |
| 可测试性 | 所有新增契约先由 Jest 单元测试描述                     |
| 可观测性 | soak 必须具备 observer 场景，且阈值与业务场景隔离      |
