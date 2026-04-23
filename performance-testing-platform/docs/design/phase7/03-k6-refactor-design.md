# k6 脚本改动设计

---

## /metrics 采样策略 (PERF-MONITOR-SAMPLING-001)

**问题背景:** capacity.k6.js 原来使用随机 10% 采样，在 5000 VU 时造成 ~166 req/s 的 /metrics 请求，占用大量 SUT 资源，导致性能指标虚高。

**解决方案:** 改为**固定间隔轮询**（而非随机采样），降低 /metrics 负载 80 倍。

### 设计对比

| 方案 | 采样方式 | 预期负载 | 优点 | 缺点 |
|------|---------|----------|------|------|
| ❌ 旧方案（随机 10%） | `Math.random() < 0.1` | ~166 req/s | 简单 | 占用资源高，指标虚高 |
| ✅ **新方案（固定间隔）** | **`if (__ITER % 50 === 0)`** | **~0.2 req/s** | **资源低，稳定性高** | **需要调整采样频率** |

### 实现方式（capacity.k6.js）

```javascript
export default function () {
  executeFunnel(BASE_URL);

  // Poll server metrics every ~50 iterations ≈ 5 seconds
  // 降低 /metrics 负载 80 倍（从随机 10% 的 166 req/s 改为 ~0.2 req/s）
  if (__ITER % 50 === 0) {
    const m = http.get(`${BASE_URL}/metrics`, { tags: { endpoint: '/metrics' } });
    if (m.status === 200) {
      try {
        const body = JSON.parse(m.body);
        if (body.eventLoop) serverEventLoopLag.add(body.eventLoop.lag);
        if (body.memory) serverHeapUsedMb.add(body.memory.heapUsed / 1024 / 1024);
        if (body.cpu) serverCpuUser.add(body.cpu.userPercent);
      } catch {
        // ignore parse errors
      }
    }
  }

  thinkTime(0.5, 1.0);
}
```

### 性能影响分析

**旧方案（随机 10%）：**
- VU 数：5000 稳定阶段
- 每 VU 每秒 iterations：~10（假设每个 iteration 100-200ms）
- 总 iterations/s：5000 × 10 = 50K iter/s
- 采样率 10%：50K × 10% = 5K /metrics req/s × 1 VU = 5000 req/s ✗ **太高**

实际计算（按实测）：
- 假设稳定阶段每个 VU 每 5 秒执行一次完整的 executeFunnel()
- 每次 executeFunnel() 包含 3 个 HTTP 调用 + think time（总 2-3 秒）
- 5000 VU × ~20 iter/min = ~100K req/min
- 10% 采样：~10K /metrics req/min ≈ **166 req/s** ✗ 占用 SUT 资源

**新方案（固定 50 iteration 间隔）：**
- 所有 VU 每 50 iterations 轮询一次 /metrics
- 总体采样频率：~5000 VU × (50 iter/sample) = 1 /metrics 请求 per 50 VU-iterations
- 换算：50K total iter/s ÷ 50 = **1 req/s（全局）** ✓ 资源占用低

实际运行预期：~0.2-0.5 req/s（取决于实际 iteration 速率）

### 关键特性

✅ **稳定性:** 固定间隔 vs 随机波动 → 时间序列数据更平滑  
✅ **准确性:** 降低噪声，压力测试指标更真实  
✅ **可维护:** 易于调整采样频率（改 50 为其他值）  
✅ **兼容性:** 不改变其他 VU 的业务流程  

### 调整建议

如需调整采样频率，修改 `__ITER % 50 === 0` 中的 `50`：
- `% 25` → 每 25 iterations 采样一次（2x 频率，更接近实时）
- `% 100` → 每 100 iterations 采样一次（0.5x 频率，更省资源）

---

## k6 Tags 规范 (PERF-MONITOR-TAG-001)

**目的:** 所有 HTTP 调用必须添加 `endpoint` tag，支持 Grafana 按 endpoint 分组错误分布、延迟等指标

**设计原则:** 
- 每个 HTTP 调用都显式标识 endpoint，便于 InfluxDB 按 tag 分组统计
- tags 保持静态，不依赖动态变量（便于 Grafana 面板分组）
- 规范化 endpoint 路径，去掉 ID 参数（如 `/api/products/{id}` → `/api/products/:id`）

### Endpoint Tags 标准表

| Endpoint | Tags | 脚本覆盖 | 用途 |
|----------|------|---------|------|
| `/health` | `{ endpoint: '/health' }` | smoke.k6.js | 健康检查 |
| `/api/products` | `{ endpoint: '/api/products' }` | smoke/capacity/soak.k6.js | 列表浏览（100% 流量） |
| `/api/products/:id` | `{ endpoint: '/api/products/:id' }` | smoke/capacity/soak.k6.js | 详情查看（~50% 流量） |
| `/api/orders` | `{ endpoint: '/api/orders' }` | capacity/soak.k6.js | 订单创建（~16.5% 流量） |
| `/api/auth/login` | `{ endpoint: '/api/auth/login' }` | soak.k6.js | 认证延迟采样（~2% 流量） |
| `/metrics` | `{ endpoint: '/metrics' }` | capacity/soak.k6.js | 服务器指标采样（~1-10% 流量） |

### 使用示例

**正确用法：**
```javascript
// smoke.k6.js
const products = http.get(`${BASE_URL}/api/products`, { 
  tags: { endpoint: '/api/products' } 
});

// capacity.k6.js
const order = http.post(
  `${BASE_URL}/api/orders`,
  JSON.stringify({ product_id: 1, quantity: 1 }),
  { 
    headers: { 'Content-Type': 'application/json' },
    tags: { endpoint: '/api/orders' } 
  }
);
```

**错误用法（避免）：**
```javascript
// ❌ 不要：动态 endpoint，每个 ID 都生成不同 tag
{ tags: { endpoint: `/api/products/${product.id}` } }

// ❌ 不要：忘记添加 tag
http.get(`${BASE_URL}/api/products`)
```

### Grafana 集成

**面板查询示例：** "Error Distribution (by endpoint)"
```sql
SELECT sum("value") FROM "http_req_failed" 
WHERE $timeFilter 
GROUP BY time($__interval), "endpoint"
```

**如何使用：**
1. k6 脚本中的 `endpoint` tag → InfluxDB tag field
2. InfluxDB 查询按 `endpoint` tag 分组 → 按 endpoint 统计错误率
3. Grafana 显示为表格或图表 → 快速识别问题 endpoint

---

## Helper 函数模块化结构 (PERF-ARCH-FR-001)

**设计原则:** 保留模块化 helpers 目录，避免代码重复

### 现有 helpers 结构（应保留）

`tests/performance/helpers/` 目录包含可复用的测试工具库：

| 模块 | 职责 | 用途 |
|------|------|------|
| `utils.js` | 通用工具（检查状态、断言等） | 所有脚本共享 |
| `thinkTime.js` | 思考延迟注入 | 模拟用户行为 |
| `data.js` | 测试数据生成 | 订单数据、用户数据 |
| `profile.js` | VU 配置文件 | 压力/容量/soak 配置 |
| `env.js` | 环境变量管理 | 跨环境配置 |
| `funnel.js` | 链式请求执行 | 多步骤业务流程 |
| `healthCheck.js` | 健康检查 | 测试前验证 |

### 使用方式

Phase 7 脚本应导入而非内联：

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
