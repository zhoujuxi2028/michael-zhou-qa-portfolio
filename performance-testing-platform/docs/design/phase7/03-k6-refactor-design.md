# k6 脚本改动设计

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
// stress.js
import { funnel, checkStatus } from '../helpers/funnel.js';
import { thinkTime } from '../helpers/thinkTime.js';

export default function() {
  // 使用 helper 函数
  const res = funnel([
    () => http.get(`${BASE_URL}/orders`),
    () => http.post(`${BASE_URL}/checkout`, {...})
  ]);
}
```

### 迁移要点

- ✅ **保留** `tests/performance/helpers/` 目录及所有模块
- ✅ **更新** 脚本导入：从 `src/helpers.js` → `../helpers/*.js`
- ✅ **删除** `src/helpers.js`（旧位置，已过时）
- ✅ **维护** helpers 的通用性和可复用性

### 改动清单

| 文件 | 改动 | 行数 |
|------|------|------|
| `tests/performance/scripts/stress.js` | 更新导入路径，使用 `../helpers/` | ~80 |
| `tests/performance/scripts/capacity.js` | 更新导入路径，添加 breakpoint 检测 | ~100 |
| `tests/performance/scripts/soak.js` | 更新导入路径，添加熔断恢复验证 | ~150 |
| `src/helpers.js` | 🗑️ 删除（仅 stub 旧导入，便于迁移） | - |
| `tests/performance/helpers/` | ✅ 保留所有模块，确保 Phase 7+ 可用 | - |

---

## Breakpoint Test 实现

**目的**: 发现系统最大承载能力（与 capacity 对标）

**过程**:
1. 起始 VU=10，每分钟增加 10 VU
2. 持续至 error rate > 5% 或 p95 > 2s
3. 记录 breakpoint VU 和 degradation profile

**两种模式**:

| 模式 | 定义 | k6 threshold | 预期结果 |
|------|------|-------------|----------|
| **Graceful** | p95 缓升，无突跳 | p95 ≤ 1500ms | PASS |
| **Catastrophic** | p95 陡升，error 爆炸 | p95 > 2000ms 或 error > 5% | FAIL（记录降级点） |

**验收**: breakpoint VU ≥ 50（最小业界标准）

---

## 熔断恢复测试

**场景**: 故意引发高负载 → 观察自动恢复 → 验证恢复标准

**恢复定义**（PERF-CHAOS-FR-002）:
```
连续 10 秒内：
  - error_rate < 1%
  - p95_latency < 500ms
→ 判定为"已恢复"
```

**验收标准**:
- 恢复时间 ≤ 60s（从故障注入到满足定义）
- 恢复后持续 2 分钟无再次故障

**test 伪代码**:
```js
// soak.js 内置
1. 0-100s: 正常负载 (VU=50)
2. 100s: 故障注入 (error spike 或延迟翻倍)
3. 100-160s: 监测恢复（每秒采样）
4. 160-280s: 验证稳定性
```

---

## 改动清单

| 文件 | 改动 | 行数 |
|------|------|------|
| `src/scripts/stress.js` | 集成 funnel/checkStatus/thinkTime，移除 require helpers | ~80 |
| `src/scripts/capacity.js` | 同上，添加 breakpoint 检测逻辑 | ~100 |
| `src/scripts/soak.js` | 同上，添加熔断恢复验证，采集 event loop lag | ~150 |
| `src/helpers.js` | 🗑️ 删除（仅保留供旧集成测试引用的 shim） | - |

---

## 文件位置

- 脚本: `src/scripts/stress.js`, `capacity.js`, `soak.js`
- 实现验收: `tests/integration/k6-*.test.js` (3 files)
