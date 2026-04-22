# 五类性能测试详细设计

## 1. 详细设计范围

本文档细化 `smoke / load / stress / spike / soak` 五类测试在配置、脚本、观测、门禁上的实现约束，并对应本次 TDD 开发落点。

## 2. 配置详细设计

### 2.1 Profile 契约

| 字段 | 必填 | 说明 |
|---|---|---|
| `stages` / `vus + duration` | 是 | 单场景或多阶段负载模型 |
| `thresholds` | 是 | SLA / 错误率门禁 |
| `setupTimeout` | 否 | setup 超时控制 |
| `observer.enabled` | 否 | 是否启用 observer 场景 |
| `observer.exec` | 否 | observer 执行函数名 |
| `observer.vus` | 否 | observer 并发数，必须 ≥ 1 |

### 2.2 类型配置落点

| 类型 | Profile | 脚本 |
|---|---|---|
| smoke | `profiles/smoke.json` | `tests/performance/smoke.k6.js` |
| load | `profiles/load.json` | `tests/performance/load.k6.js` |
| stress | `profiles/stress.json` | `tests/performance/stress.k6.js` |
| spike | `profiles/spike.json` | `tests/performance/spike.k6.js` |
| soak | `profiles/soak.json` | `tests/performance/soak.k6.js` / `soak-short.k6.js` |

## 3. 编排详细设计

### 3.1 `loadProfile(name)`
- 读取 `profiles/<name>.json`
- 校验 `stages` 或 `vus + duration`
- 校验 `thresholds`
- 校验 `observer` 元数据合法性
- 返回原始 profile 供单场景脚本使用

### 3.2 `buildScenarioProfile(name, options)`
- 输入：profile 名称、load exec 名称、load stages 覆写、observer 覆写
- 输出：标准 k6 `options`
- 固定生成 `scenarios.load`
- 当 `observer.enabled !== false` 时自动追加 `scenarios.observer`
- 默认使用 `buildObserverDurationFromStages()` 推导 observer 时长

## 4. 五类测试详细设计

### 4.1 smoke
- 目标：验证基础链路可用
- 端点：`/health`、`/api/products`、`/api/products/:id`
- 负载：5 VUs / 60s
- 门禁：`p95 < 500ms`，错误率 `< 1%`

### 4.2 load
- 目标：验证预期业务负载下的 SLA
- 负载：20 → 50 → 0 分阶段
- 流量：浏览 → 详情 → 下单完整业务漏斗
- 门禁：延迟、错误率、吞吐量

### 4.3 stress
- 目标：观察超载后的退化曲线
- 负载：50 → 100 → 150 → 200 → 0
- 观测：错误率增长、延迟抬升、容量拐点

### 4.4 spike
- 目标：验证突发流量与回落恢复
- 负载：5 → 100 → 5 → 0
- 设计变化：从脚本硬编码 options 改为 `profiles/spike.json`

### 4.5 soak
- 目标：验证长时间稳定性、内存泄漏、observer 观测平面
- 负载：长稳态运行，脚本按环境变量覆写 stage
- 场景：`load + observer`
- 门禁：仅针对 `scenario:load` 计算业务 SLA
- 观测：heap、event loop、认证延迟、恢复时间

## 5. TDD 实施设计

### 5.1 Red
- 新增 `tests/unit/helpers/performance-test-architecture.test.js`
- 补充 `tests/unit/helpers/profile.test.js`
- 先让以下契约失败：
  - `profiles/soak.json` 必须存在
  - spike 必须复用 `loadProfile('spike')`
  - soak / soak-short 必须复用统一 `buildScenarioProfile('soak')`
  - observer 元数据必须通过校验

### 5.2 Green
- 扩展 `src/utils/profile-parser.js` 的 observer 校验
- 在 `tests/performance/helpers/profile.js` 增加 `buildScenarioProfile()`
- 新增 `profiles/soak.json`
- 重构 spike / soak / soak-short 脚本接入统一配置

### 5.3 Refactor
- 保持现有命令、脚本路径、业务流量逻辑不变
- 仅收敛配置来源与多场景装配逻辑，避免大规模行为变更
