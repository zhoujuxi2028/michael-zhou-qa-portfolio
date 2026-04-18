# k6 观测采样设计（Phase 7）

## 问题归属

`#133` **主归属是测试设计问题**，不是 SUT 核心业务设计缺陷。

| 维度 | 结论 |
|---|---|
| 主问题 | `capacity.k6.js` / `soak.k6.js` / `soak-short.k6.js` 把业务流量与 `/metrics` 观测流量混在一起 |
| 直接影响 | 观测流量放大、压测结果污染、threshold 口径不纯 |
| SUT 联动 | `/metrics` 是 SUT 的应用级观测接口，因此会联动观测架构设计 |

## 当前问题

现状是业务 VU 在 `default()` 中按随机比例轮询 `/metrics`：

- `capacity.k6.js`：`Math.random() < 0.1`
- `soak.k6.js`：`Math.random() < 0.05`
- `soak-short.k6.js`：`Math.random() < 0.05`

在 5000 VU 的 capacity 场景下，这意味着 `/metrics` 可能被额外打到约 `500 req/s`，这不符合企业级压测的职责隔离原则。

## 设计目标

1. 业务负载与观测采集分离
2. `/metrics` 改为固定间隔采样
3. threshold 只统计业务流量，不统计 observer 请求
4. 保留现有系统级采集链路，不重复造轮子

## 现有观测链路

| 层级 | 当前机制 | 说明 |
|---|---|---|
| 应用级 | `/metrics` | 暴露 event loop / heap / cpu.userPercent |
| 系统级 | `bash scripts/server.sh collect 1000 reports/system-metrics.csv` | `capacity:test` 已内置独立 CSV 采集 |

这意味着仓库已经具备企业级“双观测平面”的基础，只是 k6 侧的应用级采样方式还不够干净。

## 企业级方案

### 1. 双 scenario 拆分

每个需要采样 `/metrics` 的脚本拆成两个 scenario：

| Scenario | 职责 | 是否访问 `/metrics` |
|---|---|---|
| `load` | 业务流量（browse/detail/order/login） | 否 |
| `observer` | 固定间隔采集应用级指标 | 是 |

### 2. Observer 固定间隔采样

observer scenario 设计：

| 配置项 | 建议值 |
|---|---|
| executor | `constant-vus` |
| vus | `1` |
| exec | `observeMetrics` |
| interval | `METRICS_POLL_INTERVAL_MS=5000` |
| gracefulStop | `0s` |

observer 只做一件事：

```js
http.get(`${BASE_URL}/metrics`, {
  tags: { test_phase: 'observer', endpoint: '/metrics' },
});
sleep(METRICS_POLL_INTERVAL_MS / 1000);
```

### 3. Threshold 隔离

主 SLA 门禁只看 `scenario:load`：

```js
thresholds: {
  'http_req_duration{scenario:load}': ['p(95)<500'],
  'http_req_failed{scenario:load}': ['rate<0.01'],
}
```

这样 `/metrics` 的 observer 请求不会污染业务延迟和错误率。

### 4. 保留 setup / teardown 快照

`soak.k6.js` / `soak-short.k6.js` 在 `setup()` / `teardown()` 中对 `/metrics` 的一次性读取继续保留，用于：

- baseline heap
- final heap

它们属于快照，不属于周期采样。

### 5. 保留系统级 collector

`server.sh collect` 继续保留：

- observer scenario：应用级指标
- `server.sh collect`：系统级指标

最终形成企业级双观测平面：

| 平面 | 来源 | 用途 |
|---|---|---|
| 应用级 | `/metrics` observer scenario | event loop / heap / process CPU |
| 系统级 | `server.sh collect` | CPU / mem / disk / net CSV |

## 文件落点

| 文档/文件 | 作用 |
|---|---|
| `docs/design/phase7/03-k6-refactor-design.md` | `#133` 主设计文档 |
| `docs/qa/test-plan.md` | 如有必要，仅同步策略变化 |
| `docs/qa/test-cases/phase7-cicd.md` | 如有必要，仅补 observer 启动/threshold 隔离验证项 |

## 可行性评估

### 评估结果

**结论：可行。**

### 证据

1. **k6 运行时支持 multi-scenario + named exec**
   - 本地运行最小 PoC 成功
   - 环境版本：`k6 v1.7.0`

2. **setup / teardown 可与双 scenario 共存**
   - PoC 中 `setup()` / `runLoad()` / `observeMetrics()` / `teardown()` 全部成功执行

3. **threshold 可按 scenario 过滤**
   - PoC 中 `iteration_duration{scenario:load}` 与 `iteration_duration{scenario:observer}` 均通过

4. **现有 capacity 命令链路可复用**
   - `package.json` 中 `capacity:test` 仍是 `k6 run tests/performance/capacity.k6.js`
   - 改为 `options.scenarios` 后，调用方式不需要变

### 当前限制

| 项目 | 状态 |
|---|---|
| worktree baseline `npm test` | 非绿 |
| 原因 1 | worktree 基于当前 HEAD，不含未提交的 `#119` 本地修复 |
| 原因 2 | 还存在 `server-sh.test.js` / `preflight-check.test.js` 既有失败 |

因此，本轮可行性评估以**机制可行**为结论，但不把当前 worktree 误判为全绿基线。

## 开发前门禁

在真正修改脚本前，需满足：

1. 当前设计获得确认
2. 机制可行性已确认
3. 决定是否同步改 `capacity` / `soak` / `soak-short`
4. 再进入开发计划与 TDD 实施
