# Implementation Plan — Phase 4: Soak Test + 可观测性增强

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Issue:** [#65](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/65)
**Branch:** `feature/performance-testing`
**Date:** 2026-04-02

**Goal:** Add soak testing (1~4h low-load) with memory leak detection, custom business metrics, and Grafana alerting.

**Architecture:** k6 soak script polls existing `/metrics` endpoint periodically to track `heapUsed` over time. A `setup()` records baseline heap, `teardown()` compares final heap — growth >50% = FAIL. Custom k6 `Counter`/`Trend` metrics track order success rate and auth latency. InfluxDB output (`--out influxdb`) feeds Grafana dashboards with new panels for heap trend + business metrics. Grafana alert rules trigger on p95 > 500ms, error > 1%, or sustained heap growth.

**Tech Stack:** k6 (ES6 modules), Express, InfluxDB 1.8, Grafana 10.2, Jest + Supertest

---

## 1. 架构设计

### 1.1 Soak Test 流程

```
  k6 soak.k6.js (100~500 VUs, 1~4h)
  ┌─────────────────────────────────────────────────┐
  │  setup()                                         │
  │    └─ GET /metrics → record baseline heapUsed    │
  │                                                   │
  │  default() — steady-state loop                   │
  │    ├─ 60% GET /api/products                      │
  │    ├─ 30% GET /api/products/:id                  │
  │    ├─ 10% POST /api/orders                       │
  │    └─ 5%  GET /metrics → custom Trend metrics    │
  │           (server_heap_used_mb, server_event_loop │
  │            order_success, auth_latency_p99)       │
  │                                                   │
  │  teardown(data)                                   │
  │    └─ GET /metrics → compare heapUsed vs baseline │
  │       growth > 50% → console.error("LEAK!")       │
  └─────────────────────────────────────────────────┘
         │
         ▼ --out influxdb=http://localhost:8086/k6
  ┌──────────────┐     ┌──────────────────────────┐
  │  InfluxDB    │────▶│  Grafana                  │
  │  k6 database │     │  ├─ heapUsed 趋势面板     │
  │              │     │  ├─ 业务指标面板           │
  │              │     │  └─ 告警规则               │
  └──────────────┘     └──────────────────────────┘
```

### 1.2 内存泄漏检测逻辑

```
baseline_heap = setup() → GET /metrics → memory.heapUsed
final_heap    = teardown() → GET /metrics → memory.heapUsed
growth_ratio  = (final_heap - baseline_heap) / baseline_heap

if growth_ratio > 0.50 → console.error("MEMORY LEAK DETECTED")
                          log baseline, final, growth %
if growth_ratio > 0.25 → console.warn("MEMORY GROWTH WARNING")
```

### 1.3 Custom k6 Metrics

| Metric Name | Type | Source | Purpose |
|-------------|------|--------|---------|
| `soak_heap_used_mb` | Trend | `GET /metrics → memory.heapUsed` | heapUsed 趋势 |
| `soak_event_loop_lag` | Trend | `GET /metrics → eventLoop.lag` | 事件循环延迟趋势 |
| `soak_order_success` | Counter | `POST /api/orders → status 201` | 订单成功计数 |
| `soak_order_failure` | Counter | `POST /api/orders → status != 201` | 订单失败计数 |
| `soak_auth_latency` | Trend | `POST /api/auth/login → timings.duration` | 认证延迟趋势 (SOAK-04) |

> **SOAK-01 状态:** `/api/metrics` 端点已在 Phase 2 实现 (`src/routes/health.js` + `src/middleware/metrics.js`)，返回 heapUsed/heapTotal/rss/external/CPU/eventLoop。Phase 4 无需重新开发，直接复用。

> **Auth latency 说明:** Soak 脚本默认不启用认证 (`AUTH_ENABLED` 未设置)，以隔离稳定性测试。但根据 SOAK-04 要求，soak.k6.js 中会包含可选的认证采样 (每 ~2% 迭代执行 login + 记录 `soak_auth_latency`)，无论 `AUTH_ENABLED` 是否开启。auth 端点始终可用。

---

## 2. 文件结构

### 2.1 新增文件

| File | Responsibility |
|------|---------------|
| `tests/performance/soak.k6.js` | Soak test 脚本 (100~500 VUs, stages 配置) |
| `tests/performance/soak-short.k6.js` | 短时 soak (10 VUs, 5min) 用于本地验证和 CI smoke |
| `tests/unit/scripts/soak-leak-detection.test.js` | 泄漏检测逻辑单元测试 |
| `grafana/dashboards/soak-results.json` | Grafana soak dashboard (heap + business metrics + alerts) |

### 2.2 修改文件

| File | Changes |
|------|---------|
| `package.json` | 新增 `k6:soak`, `k6:soak:short`, `k6:soak:influx` scripts |
| `tests/performance/helpers/utils.js` | 新增 `pollMetrics()`, `LEAK_THRESHOLD` 常量 |
| `grafana/provisioning/dashboards/dashboard.yml` | 注册 soak-results.json |

---

## 3. Task Breakdown

| Task | 内容 | 文件 | 依赖 |
|------|------|------|------|
| T0 | Helper 扩展: pollMetrics + leak detection | `helpers/utils.js` + test | — |
| T1 | k6 soak-short 脚本 (5min 验证版) | `soak-short.k6.js` | T0 |
| T2 | k6 soak 脚本 (完整 1~4h 版) | `soak.k6.js` | T0 |
| T3 | npm scripts | `package.json` | T1, T2 |
| T4 | Grafana soak dashboard | `grafana/dashboards/soak-results.json` | — |
| T5 | Grafana alert rules | 内嵌于 soak dashboard JSON | T4 |
| T6 | 文档更新 | architecture.md, qa/test-cases/index.md | T0~T5 |

---

## 4. Detailed Design

### Task 0: Helper 扩展 — pollMetrics + leak detection

**Files:**
- Modify: `tests/performance/helpers/utils.js`
- Create: `tests/unit/scripts/soak-leak-detection.test.js`

#### 4.0.1 utils.js 扩展

```javascript
// 新增常量
export const LEAK_THRESHOLD = 0.50;  // 50% growth = leak
export const WARN_THRESHOLD = 0.25;  // 25% growth = warning

// 新增: 采集服务端指标并写入 custom metrics
export function pollMetrics(customMetrics) {
  const m = http.get(`${BASE_URL}/metrics`);
  if (m.status === 200) {
    try {
      const body = JSON.parse(m.body);
      if (body.memory && customMetrics.heapUsedMb) {
        customMetrics.heapUsedMb.add(body.memory.heapUsed / 1024 / 1024);
      }
      if (body.eventLoop && customMetrics.eventLoopLag) {
        customMetrics.eventLoopLag.add(body.eventLoop.lag);
      }
    } catch { /* ignore */ }
  }
}

// 新增: 泄漏检测 (teardown 中调用)
export function checkMemoryLeak(baselineBytes, finalBytes) {
  if (baselineBytes <= 0) return { leaked: false, ratio: 0, level: 'ok' };
  const ratio = (finalBytes - baselineBytes) / baselineBytes;
  if (ratio > LEAK_THRESHOLD) return { leaked: true, ratio, level: 'critical' };
  if (ratio > WARN_THRESHOLD) return { leaked: false, ratio, level: 'warning' };
  return { leaked: false, ratio, level: 'ok' };
}
```

#### 4.0.2 单元测试 (Jest)

```javascript
// tests/unit/scripts/soak-leak-detection.test.js
// 测试 checkMemoryLeak 纯逻辑 (不依赖 k6 runtime)
// 从 helpers/utils.js 提取纯函数到 src/utils/leak-detection.js 以便 Jest 测试

// 实际方案: 泄漏检测逻辑放 src/utils/leak-detection.js (CommonJS)
// k6 的 helpers/utils.js 中保留 pollMetrics (依赖 k6 http)
```

**设计决策:** 泄漏检测是纯计算逻辑，不依赖 k6 runtime。提取到 `src/utils/leak-detection.js` (CommonJS) 供 Jest 测试，k6 脚本中通过 inline 复制使用（k6 不支持 require）。

- [ ] **Step 1: Write failing test for leak detection**

Create `tests/unit/scripts/soak-leak-detection.test.js`:

```javascript
const { checkMemoryLeak, LEAK_THRESHOLD, WARN_THRESHOLD } = require('../../../src/utils/leak-detection');

describe('checkMemoryLeak', () => {
  test('UT-SOAK-01: no leak — stable heap', () => {
    const result = checkMemoryLeak(100 * 1024 * 1024, 110 * 1024 * 1024);
    expect(result.leaked).toBe(false);
    expect(result.level).toBe('ok');
    expect(result.ratio).toBeCloseTo(0.1, 1);
  });

  test('UT-SOAK-02: warning — 30% growth', () => {
    const result = checkMemoryLeak(100 * 1024 * 1024, 130 * 1024 * 1024);
    expect(result.leaked).toBe(false);
    expect(result.level).toBe('warning');
  });

  test('UT-SOAK-03: critical leak — 60% growth', () => {
    const result = checkMemoryLeak(100 * 1024 * 1024, 160 * 1024 * 1024);
    expect(result.leaked).toBe(true);
    expect(result.level).toBe('critical');
  });

  test('UT-SOAK-04: zero baseline — no crash', () => {
    const result = checkMemoryLeak(0, 50 * 1024 * 1024);
    expect(result.leaked).toBe(false);
    expect(result.level).toBe('ok');
    expect(result.ratio).toBe(0);
  });

  test('UT-SOAK-05: negative growth — heap shrunk', () => {
    const result = checkMemoryLeak(100 * 1024 * 1024, 80 * 1024 * 1024);
    expect(result.leaked).toBe(false);
    expect(result.level).toBe('ok');
  });
});

describe('thresholds', () => {
  test('UT-SOAK-06: LEAK_THRESHOLD is 0.50', () => {
    expect(LEAK_THRESHOLD).toBe(0.50);
  });

  test('UT-SOAK-07: WARN_THRESHOLD is 0.25', () => {
    expect(WARN_THRESHOLD).toBe(0.25);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/scripts/soak-leak-detection.test.js`
Expected: FAIL — `Cannot find module '../../../src/utils/leak-detection'`

- [ ] **Step 3: Implement leak-detection.js**

Create `src/utils/leak-detection.js`:

```javascript
const LEAK_THRESHOLD = 0.50;
const WARN_THRESHOLD = 0.25;

function checkMemoryLeak(baselineBytes, finalBytes) {
  if (baselineBytes <= 0) return { leaked: false, ratio: 0, level: 'ok' };
  const ratio = (finalBytes - baselineBytes) / baselineBytes;
  if (ratio > LEAK_THRESHOLD) return { leaked: true, ratio, level: 'critical' };
  if (ratio > WARN_THRESHOLD) return { leaked: false, ratio, level: 'warning' };
  return { leaked: false, ratio, level: 'ok' };
}

module.exports = { checkMemoryLeak, LEAK_THRESHOLD, WARN_THRESHOLD };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/scripts/soak-leak-detection.test.js`
Expected: 7 PASS

- [ ] **Step 5: Extend helpers/utils.js with pollMetrics**

Add to `tests/performance/helpers/utils.js`:

```javascript
import http from 'k6/http';

export const LEAK_THRESHOLD = 0.50;
export const WARN_THRESHOLD = 0.25;

export function pollMetrics(customMetrics) {
  const m = http.get(`${BASE_URL}/metrics`);
  if (m.status === 200) {
    try {
      const body = JSON.parse(m.body);
      if (body.memory && customMetrics.heapUsedMb) {
        customMetrics.heapUsedMb.add(body.memory.heapUsed / 1024 / 1024);
      }
      if (body.eventLoop && customMetrics.eventLoopLag) {
        customMetrics.eventLoopLag.add(body.eventLoop.lag);
      }
    } catch { /* ignore */ }
  }
}

export function checkMemoryLeak(baselineBytes, finalBytes) {
  if (baselineBytes <= 0) return { leaked: false, ratio: 0, level: 'ok' };
  const ratio = (finalBytes - baselineBytes) / baselineBytes;
  if (ratio > LEAK_THRESHOLD) return { leaked: true, ratio, level: 'critical' };
  if (ratio > WARN_THRESHOLD) return { leaked: false, ratio, level: 'warning' };
  return { leaked: false, ratio, level: 'ok' };
}
```

- [ ] **Step 6: Commit**

```bash
git add src/utils/leak-detection.js tests/unit/scripts/soak-leak-detection.test.js tests/performance/helpers/utils.js
git commit -m "feat(perf): add memory leak detection logic + pollMetrics helper (#65)"
```

---

### Task 1: k6 soak-short 脚本 (5min 验证版)

**Files:**
- Create: `tests/performance/soak-short.k6.js`

**Purpose:** 短时 soak (10 VUs, 5min) 用于本地快速验证脚本正确性。

- [ ] **Step 1: Create soak-short.k6.js**

```javascript
import http from 'k6/http';
import { sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { BASE_URL, checkStatus, pollMetrics, checkMemoryLeak, LEAK_THRESHOLD } from './helpers/utils.js';

// Custom metrics
const soakHeapUsedMb = new Trend('soak_heap_used_mb');
const soakEventLoopLag = new Trend('soak_event_loop_lag');
const soakOrderSuccess = new Counter('soak_order_success');
const soakOrderFailure = new Counter('soak_order_failure');

export const options = {
  stages: [
    { duration: '30s', target: 10 },   // ramp-up
    { duration: '4m', target: 10 },     // steady state
    { duration: '30s', target: 0 },     // ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export function setup() {
  const m = http.get(`${BASE_URL}/metrics`);
  let baselineHeap = 0;
  if (m.status === 200) {
    try {
      baselineHeap = JSON.parse(m.body).memory.heapUsed;
    } catch { /* ignore */ }
  }
  console.log(`Soak baseline heapUsed: ${(baselineHeap / 1024 / 1024).toFixed(1)} MB`);
  return { baselineHeap };
}

export default function () {
  // Funnel: 60% browse → 30% detail → 10% order
  const products = http.get(`${BASE_URL}/api/products`);
  checkStatus(products, 200, 'products');

  if (Math.random() < 0.5) {
    const id = Math.ceil(Math.random() * 5);
    const detail = http.get(`${BASE_URL}/api/products/${id}`);
    checkStatus(detail, 200, 'product detail');

    if (Math.random() < 0.33) {
      const order = http.post(
        `${BASE_URL}/api/orders`,
        JSON.stringify({ product_id: id, quantity: 1 }),
        { headers: { 'Content-Type': 'application/json' } }
      );
      if (order.status === 201) {
        soakOrderSuccess.add(1);
      } else {
        soakOrderFailure.add(1);
      }
    }
  }

  // Poll server metrics every ~5% of iterations
  if (Math.random() < 0.05) {
    pollMetrics({ heapUsedMb: soakHeapUsedMb, eventLoopLag: soakEventLoopLag });
  }

  sleep(1);
}

export function teardown(data) {
  const m = http.get(`${BASE_URL}/metrics`);
  let finalHeap = 0;
  if (m.status === 200) {
    try {
      finalHeap = JSON.parse(m.body).memory.heapUsed;
    } catch { /* ignore */ }
  }

  const result = checkMemoryLeak(data.baselineHeap, finalHeap);
  console.log(`Soak final heapUsed: ${(finalHeap / 1024 / 1024).toFixed(1)} MB`);
  console.log(`Heap growth: ${(result.ratio * 100).toFixed(1)}% — level: ${result.level}`);

  if (result.leaked) {
    console.error(`MEMORY LEAK DETECTED: heap grew ${(result.ratio * 100).toFixed(1)}% (threshold: ${LEAK_THRESHOLD * 100}%)`);
  }
}
```

- [ ] **Step 2: Manually verify script runs**

Run: `npm run restart:clean && k6 run tests/performance/soak-short.k6.js`
Expected: 5min run completes, teardown prints heap comparison, no LEAK

- [ ] **Step 3: Commit**

```bash
git add tests/performance/soak-short.k6.js
git commit -m "feat(perf): add soak-short k6 script (5min validation) (#65)"
```

---

### Task 2: k6 soak 脚本 (完整 1~4h 版)

**Files:**
- Create: `tests/performance/soak.k6.js`

- [ ] **Step 1: Create soak.k6.js**

```javascript
import http from 'k6/http';
import { sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { BASE_URL, checkStatus, pollMetrics, checkMemoryLeak, LEAK_THRESHOLD } from './helpers/utils.js';
// Custom metrics (SOAK-04)
const soakHeapUsedMb = new Trend('soak_heap_used_mb');
const soakEventLoopLag = new Trend('soak_event_loop_lag');
const soakOrderSuccess = new Counter('soak_order_success');
const soakOrderFailure = new Counter('soak_order_failure');
const soakAuthLatency = new Trend('soak_auth_latency');

// Configurable via env: SOAK_VUS (default 200), SOAK_DURATION (default 1h)
const SOAK_VUS = parseInt(__ENV.SOAK_VUS || '200');
const SOAK_DURATION = __ENV.SOAK_DURATION || '1h';

export const options = {
  stages: [
    { duration: '2m', target: SOAK_VUS },             // ramp-up
    { duration: SOAK_DURATION, target: SOAK_VUS },     // steady state
    { duration: '1m', target: 0 },                      // ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export function setup() {
  const m = http.get(`${BASE_URL}/metrics`);
  let baselineHeap = 0;
  if (m.status === 200) {
    try {
      baselineHeap = JSON.parse(m.body).memory.heapUsed;
    } catch { /* ignore */ }
  }
  // Register soak user for auth latency sampling (SOAK-04)
  http.post(`${BASE_URL}/api/auth/register`,
    JSON.stringify({ username: 'soakuser', password: 'soakpass' }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  console.log(`[SOAK] Baseline heapUsed: ${(baselineHeap / 1024 / 1024).toFixed(1)} MB`);
  console.log(`[SOAK] Config: ${SOAK_VUS} VUs, duration: ${SOAK_DURATION}`);
  return { baselineHeap };
}

export default function () {
  // Funnel: 60% browse → 30% detail → 10% order
  const products = http.get(`${BASE_URL}/api/products`);
  checkStatus(products, 200, 'products');

  if (Math.random() < 0.5) {
    const id = Math.ceil(Math.random() * 5);
    const detail = http.get(`${BASE_URL}/api/products/${id}`);
    checkStatus(detail, 200, 'product detail');

    if (Math.random() < 0.33) {
      const order = http.post(
        `${BASE_URL}/api/orders`,
        JSON.stringify({ product_id: id, quantity: 1 }),
        { headers: { 'Content-Type': 'application/json' } }
      );
      if (order.status === 201) {
        soakOrderSuccess.add(1);
      } else {
        soakOrderFailure.add(1);
      }
    }
  }

  // Auth latency sampling (~2% of iterations) — SOAK-04
  if (Math.random() < 0.02) {
    const loginRes = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({ username: 'soakuser', password: 'soakpass' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    soakAuthLatency.add(loginRes.timings.duration);
  }

  // Poll server metrics every ~5% of iterations
  if (Math.random() < 0.05) {
    pollMetrics({ heapUsedMb: soakHeapUsedMb, eventLoopLag: soakEventLoopLag });
  }

  sleep(Math.random() + 0.5); // 0.5~1.5s fractional sleep
}

export function teardown(data) {
  const m = http.get(`${BASE_URL}/metrics`);
  let finalHeap = 0;
  if (m.status === 200) {
    try {
      finalHeap = JSON.parse(m.body).memory.heapUsed;
    } catch { /* ignore */ }
  }

  const result = checkMemoryLeak(data.baselineHeap, finalHeap);

  console.log(`[SOAK] Final heapUsed: ${(finalHeap / 1024 / 1024).toFixed(1)} MB`);
  console.log(`[SOAK] Heap growth: ${(result.ratio * 100).toFixed(1)}% — level: ${result.level}`);

  if (result.level === 'warning') {
    console.warn(`[SOAK] MEMORY GROWTH WARNING: ${(result.ratio * 100).toFixed(1)}%`);
  }
  if (result.leaked) {
    console.error(`[SOAK] MEMORY LEAK DETECTED: heap grew ${(result.ratio * 100).toFixed(1)}% (threshold: ${LEAK_THRESHOLD * 100}%)`);
  }
}
```

- [ ] **Step 2: Verify script parses correctly**

Run: `k6 inspect tests/performance/soak.k6.js`
Expected: JSON output with stages, thresholds

- [ ] **Step 3: Commit**

```bash
git add tests/performance/soak.k6.js
git commit -m "feat(perf): add full soak k6 script (1~4h configurable) (#65)"
```

---

### Task 3: npm scripts

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add soak scripts to package.json**

Add to `scripts` section:

```json
"k6:soak:short": "mkdir -p reports && npm run restart:clean && k6 run --out 'web-dashboard=export=reports/k6-soak-short.html' tests/performance/soak-short.k6.js",
"k6:soak": "mkdir -p reports && npm run restart:clean && k6 run --out 'web-dashboard=export=reports/k6-soak.html' tests/performance/soak.k6.js",
"k6:soak:full": "mkdir -p reports && npm run restart:clean && SOAK_VUS=500 SOAK_DURATION=4h k6 run --out 'web-dashboard=export=reports/k6-soak-full.html' tests/performance/soak.k6.js",
"k6:soak:influx": "npm run restart:clean && k6 run --out influxdb=http://localhost:8086/k6 tests/performance/soak.k6.js"
```

- [ ] **Step 2: Verify script is runnable**

Run: `npm run k6:soak:short -- --help` (verify it resolves, don't actually run)

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "feat(perf): add npm soak scripts (short/default/full/influx) (#65)"
```

---

### Task 4: Grafana soak dashboard

**Files:**
- Create: `grafana/dashboards/soak-results.json`
- Modify: `grafana/provisioning/dashboards/dashboard.yml`

- [ ] **Step 1: Create soak-results.json dashboard**

Dashboard with 6 panels:
1. **Soak Heap Used (MB)** — `SELECT mean("value") FROM "soak_heap_used_mb" WHERE $timeFilter GROUP BY time($__interval)`
2. **Event Loop Lag (ms)** — `SELECT mean("value") FROM "soak_event_loop_lag" WHERE $timeFilter GROUP BY time($__interval)`
3. **Virtual Users** — `SELECT mean("value") FROM "vus" WHERE $timeFilter GROUP BY time($__interval)`
4. **Request Rate** — `SELECT sum("value") FROM "http_reqs" WHERE $timeFilter GROUP BY time($__interval)`
5. **Order Success vs Failure** — `SELECT sum("value") FROM "soak_order_success"` + `soak_order_failure`
6. **Response Time p95** — `SELECT percentile("value", 95) FROM "http_req_duration" WHERE $timeFilter GROUP BY time($__interval)`

```json
{
  "uid": "soak-results",
  "title": "Soak Test Results — Memory & Business Metrics",
  "tags": ["k6", "soak", "performance"],
  "timezone": "browser",
  "schemaVersion": 38,
  "version": 1,
  "refresh": "10s",
  "time": { "from": "now-1h", "to": "now" },
  "panels": [
    panel_1_heap, panel_2_eventloop, panel_3_vus,
    panel_4_reqrate, panel_5_orders, panel_6_p95
  ]
}
```

(Full JSON will be generated during implementation with correct Grafana panel schema.)

- [ ] **Step 2: Register dashboard in provisioning**

Verify `grafana/provisioning/dashboards/dashboard.yml` covers the `grafana/dashboards/` folder (it should already pick up new JSON files automatically).

- [ ] **Step 3: Commit**

```bash
git add grafana/dashboards/soak-results.json grafana/provisioning/dashboards/dashboard.yml
git commit -m "feat(perf): add Grafana soak dashboard (heap + business metrics) (#65)"
```

---

### Task 5: Grafana alert rules

**Files:**
- Modify: `grafana/dashboards/soak-results.json` (add alert section to panels)

- [ ] **Step 1: Add alert rules to soak dashboard panels**

Three alert rules (embedded in panel `alert` field):
1. **p95 > 500ms** on panel 6 (Response Time p95)
2. **Error rate > 1%** — new panel 7 with `http_req_failed` query
3. **Heap sustained growth** — on panel 1, alert when last 10m avg > first 10m avg by 50%

- [ ] **Step 2: Verify alerts render in Grafana**

Run: `npm run docker:up` → Open `http://localhost:3010` → Check soak dashboard alerts

- [ ] **Step 3: Commit**

```bash
git add grafana/dashboards/soak-results.json
git commit -m "feat(perf): add Grafana alert rules (p95, error rate, heap growth) (#65)"
```

---

### Task 6: 文档更新

**Files:**
- Modify: `docs/architecture/architecture.md`
- Modify: `docs/qa/test-cases/index.md`

- [ ] **Step 1: Update architecture.md**

Add Phase 4 section:
- Soak test 流程图 (from §1.1)
- Custom metrics 表 (from §1.3)
- Grafana dashboard 描述

- [ ] **Step 2: Update qa/test-cases/index.md**

Add soak test cases:

| ID | Test Case | VUs | Duration | Pass Criteria |
|----|-----------|-----|----------|---------------|
| SOAK-TC-01 | Short soak (validation) | 10 | 5min | p95 < 500ms, error < 1% |
| SOAK-TC-02 | Default soak (1h) | 200 | 1h | p95 < 500ms, error < 1%, heap growth < 50% |
| SOAK-TC-03 | Full soak (4h) | 500 | 4h | p95 < 500ms, error < 1%, heap growth < 50% |

- [ ] **Step 3: Commit**

```bash
git add docs/architecture/architecture.md docs/qa/test-cases/index.md
git commit -m "docs(perf): update architecture and test cases for Phase 4 soak (#65)"
```

---

## 5. Test Case Design

| ID | 类型 | 描述 | 验证方法 |
|----|------|------|----------|
| UT-SOAK-01~07 | Unit | leak detection 逻辑 (stable/warning/critical/zero/negative) | Jest |
| SOAK-TC-01 | Perf | Short soak 5min, 10 VUs | `npm run k6:soak:short` |
| SOAK-TC-02 | Perf | Default soak 1h, 200 VUs | `npm run k6:soak` |
| SOAK-TC-03 | Perf | Full soak 4h, 500 VUs | `npm run k6:soak:full` |
| SOAK-TC-04 | Visual | Grafana dashboard panels render | `docker compose up` + browser |
| SOAK-TC-05 | Visual | Grafana alerts fire on threshold breach | Inject artificial load |

---

## 6. Risk & Mitigation

| # | Risk | Impact | Mitigation |
|---|------|--------|------------|
| 1 | DB 膨胀: 长时间 orders 写入 | p95 退化 | `npm run restart:clean` 内置于 soak scripts |
| 2 | Soak 4h 中断 (机器睡眠/网络) | 数据丢失 | k6 `--out influxdb` 实时写入，不怕中断 |
| 3 | heapUsed 波动导致误判 | 假阳性 leak | 50% threshold + warning at 25% 两级缓冲 |
| 4 | Grafana alert 在 InfluxDB 1.x 的局限 | 复杂查询不支持 | 使用 panel-level alerts (非 unified alerting) |
| 5 | k6 ES module 不能 require() CJS | 代码重复 | leak-detection 逻辑两份: CJS (Jest) + ESM (k6 helper) |

---

## 7. Prerequisites

| # | 依赖 | 验证命令 | 已就绪 |
|---|------|----------|--------|
| 1 | Node.js ≥ 18 | `node -v` | ✅ v25.8.1 |
| 2 | k6 ≥ 1.0 | `k6 version` | ✅ v1.7.0 |
| 3 | Docker + Compose | `docker compose version` | 需验证 |
| 4 | InfluxDB (via Docker) | `curl http://localhost:8086/ping` | 需 `docker compose up` |
| 5 | Grafana (via Docker) | `curl http://localhost:3010` | 需 `docker compose up` |

---

## 8. Plan Reviewer 修复记录

> Plan Reviewer 执行结果: **Approved** (2 issues + 1 advisory)

| # | 级别 | 问题 | 修复 |
|---|------|------|------|
| 1 | Minor | SOAK-01 已由 Phase 2 实现，计划未明确说明 | 在 §1.3 后新增 SOAK-01 状态说明 |
| 2 | Important | SOAK-04 缺少 auth latency p99 指标 | 新增 `soak_auth_latency` Trend + setup 注册 soakuser + default 中 2% 采样 login |
| R1 | Advisory | `randomIntBetween` 返回整数 (0 或 1) | 改用 `Math.random() + 0.5` 实现 0.5~1.5s 小数 sleep |
