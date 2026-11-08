# Phase 6 脚本迁移 Diff 分析矩阵

**目的:** Stage 2 设计阶段的迁移项分析 — 9 个 k6 脚本统一迁移到 helpers 时的关键差异点

---

## 脚本现状分析

### 1. 标准压力测试脚本 (4 个)

#### load.k6.js

**当前结构:**

```javascript
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import { sleep } from 'k6';
import { BASE_URL, checkStatus } from './helpers/utils.js';
import { randomProduct } from './helpers/data.js';

export default function () {
  const p = randomProduct();

  // 漏斗逻辑：inline
  const listRes = http.get(`${BASE_URL}/api/products`);
  checkStatus(listRes, 200);
  sleep(randomIntBetween(0.5, 1.0));

  if (Math.random() < 0.6) {
    // detail 逻辑...
  }
  if (Math.random() < 0.3) {
    // order 逻辑...
  }
}
```

**迁移差异点:**
| 项目 | 现状 | 迁移后 | 风险 |
|------|------|--------|------|
| import | `randomIntBetween` from CDN | `funnel`, `thinkTime` from helpers | 低 — 替代品完全相同 |
| sleep | `randomIntBetween(0.5, 1.0)` | `thinkTime()` | 低 — 换函数名，逻辑一致 |
| 漏斗 | inline (60/30/10) | `executeFunnel()` (100/50/33 嵌套) | **高** — 概率模型变化 |
| metrics | 无自定义 metrics | 无需改动 | — |
| VUs/duration | 10 VUs, 1m | 不变 | — |

**验收标准:** p95 差异 < 10%, error rate 不变

---

#### stress.k6.js

**当前结构:**

```javascript
// 与 load.k6.js 相同的漏斗 + 更高 VUs (20 VUs)
```

**迁移差异:** 同 load.k6.js（只改 options 中 VUs）

---

#### capacity.k6.js

**当前结构:**

```javascript
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
// ... 漏斗逻辑 ...
// custom metrics: heapUsed polling，pollMetrics()
```

**迁移差异:**
| 项目 | 现状 | 迁移后 | 风险 |
|------|------|--------|------|
| funnel | inline | `executeFunnel()` | 高 |
| CDN import | `randomIntBetween` | `thinkTime` from helpers | 低 |
| metrics polling | `pollMetrics()` 在 default() | **保留** pollMetrics() 独立 | 低 — 不涉及 funnel |
| onOrder hook | 无 | 不需要 | — |

**关键:** capacity 的 custom metrics 与 funnel 无关（heapUsed 系统指标），可独立保留

---

#### soak.k6.js

**当前结构:**

```javascript
// 漏斗 + 自定义 metrics: soakOrderSuccess, soakOrderFailure
// 内联记录：if (orderRes.status === 201) customMetrics.soakOrderSuccess.add(1)
```

**迁移差异:**
| 项目 | 现状 | 迁移后 | 风险 |
|------|------|--------|------|
| funnel | inline | `executeFunnel(baseUrl, { onOrder: orderCallback })` | 高 |
| metrics 记录 | 内联 在 default() | **改为 onOrder callback** | **高** — 需验证 metrics 数据一致 |
| 逻辑 | `if (orderRes.status === 201) { soakOrderSuccess.add(1) }` | `onOrder` 被调用 → callback 执行 | 中 — 需确保 callback 执行时序 |

**关键风险:** onOrder callback 是否被可靠调用？soak 30min+ 运行中是否有 metrics 丢失风险？

---

### 2. 认证脚本 (3 个)

#### auth-login.k6.js

**当前结构:**

```javascript
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import { check } from 'k6';  // ← 直接 check()，不用 checkStatus()

export default function () {
  const res = http.post(`${BASE_URL}/api/auth/login`, ...);
  check(res, {
    'login status 200': (r) => r.status === 200,
    'token in body': (r) => r.json('token') !== undefined,
  });

  sleep(randomIntBetween(0.5, 1.0));
}
```

**迁移差异:**
| 项目 | 现状 | 迁移后 | 风险 |
|------|------|--------|------|
| check | 直接 `check()` | `checkStatus()` helper | 低 — 功能相同，仅换函数 |
| CDN import | `randomIntBetween` | `thinkTime` from helpers | 低 |
| sleep | `randomIntBetween(0.5, 1.0)` | `thinkTime()` | 低 |
| 漏斗 | 无 | 无需加 | — |

**验收:** 断言结果不变

---

#### auth-refresh.k6.js

**迁移差异:** 同 auth-login.k6.js（token refresh 逻辑类似）

---

#### auth-journey.k6.js

**当前结构:**

```javascript
// login → browse/detail/order 完整旅程
// 包含 randomIntBetween(0.5, 1.0) 多处
```

**迁移差异:**
| 项目 | 现状 | 迁移后 | 风险 |
|------|------|--------|------|
| 漏斗 | **已有** (在 journey 中) | `executeFunnel()` | 中 — 需确保 journey 逻辑完整 |
| sleep | `randomIntBetween(0.5, 1.0)` | `thinkTime()` | 低 |
| check | 混合 check/checkStatus | **统一为 checkStatus** | 低 |

**关键:** auth-journey 的漏斗是否与 `executeFunnel()` 完全相同？

---

### 3. 快速测试 (2 个)

#### smoke.k6.js

**当前结构:**

```javascript
// 简单测试，无漏斗逻辑，有内联 health check
```

**迁移差异:**
| 项目 | 现状 | 迁移后 | 风险 |
|------|------|--------|------|
| funnel | 无 | 无需加 | — |
| health check | inline 在 setup() | `verifyHealth()` helper | 低 |
| 前置验证 | 无 | **setup() 新增 verifyHealth()** | 低 |

---

#### spike.k6.js

**迁移差异:** 同 smoke.k6.js

---

## 迁移计划

### 优先级顺序（降低风险）

**第 1 批：低风险（auth 脚本）** — 2h

- auth-login.k6.js: check→checkStatus + CDN→thinkTime
- auth-refresh.k6.js: 同上
- 验收: k6 run auth-login.k6.js 通过

**第 2 批：标准脚本（无自定义 metrics）** — 3h

- smoke.k6.js + spike.k6.js: 添加 verifyHealth()
- load.k6.js + stress.k6.js: 迁移漏斗 + 对标 before/after
- 验收: p95 差异 < 10%

**第 3 批：高风险（自定义 metrics）** — 3-4h

- capacity.k6.js: 保留 pollMetrics()，只迁移 funnel
- soak.k6.js: **关键** — 验证 onOrder callback 正确性
- auth-journey.k6.js: 迁移漏斗 + 断言统一
- 验收: 自定义 metrics 数据无丢失

---

## 验收标准详细定义

### 批量迁移前

```bash
npm run smoke &          # baseline
npm run load &
npm run soak:short &
sleep 60
npm run capacity &
# 记录 p95 / error_rate / custom metrics
```

### 逐脚本迁移 → 对标

```bash
# Step 1: 迁移单个脚本（e.g., load.k6.js）
git checkout -b migrate/load-helpers

# Step 2: before snapshot
npm run load > /tmp/load-before.txt 2>&1

# Step 3: apply changes
# - funnel: inline → executeFunnel()
# - sleep: randomIntBetween → thinkTime()
# - checkStatus: 验证已有

# Step 4: after snapshot
npm run load > /tmp/load-after.txt 2>&1

# Step 5: diff
diff <(grep 'p(95)\|error_rate\|throughput' /tmp/load-before.txt) \
     <(grep 'p(95)\|error_rate\|throughput' /tmp/load-after.txt)
# 允许 p95 差异 < 10%, error_rate 不变
```

### soak 脚本特殊验证

```bash
npm run soak:short > /tmp/soak-before.json 2>&1
# 迁移后
npm run soak:short > /tmp/soak-after.json 2>&1

# 检查 custom metrics
jq '.data[] | select(.metric | contains("soak")) | .data.value' \
  /tmp/soak-before.json > /tmp/metrics-before.txt
jq '.data[] | select(.metric | contains("soak")) | .data.value' \
  /tmp/soak-after.json > /tmp/metrics-after.txt
# soak_orders_success 计数应保持一致（±5%）
```

---

## 关键风险点总结

| 脚本         | 风险等级 | 关键风险                | 迁移前必做                 |
| ------------ | -------- | ----------------------- | -------------------------- |
| auth-\* (3)  | 🟢 低    | 无                      | —                          |
| smoke/spike  | 🟢 低    | 无                      | —                          |
| load/stress  | 🟡 中    | 漏斗概率变化            | before/after 对标          |
| capacity     | 🟡 中    | pollMetrics 独立性      | 验证 metrics 不变          |
| soak         | 🔴 高    | onOrder callback 可靠性 | 完整 soak 运行对标         |
| auth-journey | 🟡 中    | 漏斗完整性              | 验证登录→浏览→下单完整链路 |

---

## 建议实施方案

**不推荐全量同时迁移。建议:**

1. **PoC 已验证（Task 1/6 完成）**
   - helpers 代码可靠，已过 k6 smoke test

2. **Stage 3 Task 2 分批实施**
   - 批次 1: auth 脚本 (低风险快速合入)
   - 批次 2: smoke/spike (标准脚本)
   - 批次 3: capacity (metrics 谨慎)
   - 批次 4: soak (关键验证)

3. **每批后回归验证**
   - 对标 before/after
   - 若 p95 > 10% 差异，立即 rollback + debug

---

**相关链接:**

- Requirements: [phase6-testing.md](../requirements/phase6-testing.md)
- Design: [implementation-plan-phase6.md](../implementation-plans/implementation-plan-phase6.md)
- PoC Results: [Issue #91](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/91)
- Remaining Risks: [phase6-poc-risks-remaining.md](phase6-poc-risks-remaining.md)
