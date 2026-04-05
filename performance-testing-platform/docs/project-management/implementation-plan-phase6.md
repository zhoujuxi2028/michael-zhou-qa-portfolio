# Implementation Plan — Phase 6: 测试能力扩展

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Issue:** [#86](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/86)
**Branch:** `feature/performance-testing`
**Date:** 2026-04-04
**前置依赖:** Phase 5 (#85) 已完成（env.js / data.js / profile.js helpers 就绪）

**Goal:** 统一 k6 脚本架构 (helpers 提取 + 现有脚本迁移)、新增 breakpoint 崩溃测试和 API 限流/熔断测试、自动生成执行摘要报告。

**Tech Stack:** k6 (ES6 modules), Express + express-rate-limit, Jest + Supertest, jq, Bash

---

## 1. 架构设计

### 1.1 k6 Helpers 层 (ENT-CONSISTENCY)

```
tests/performance/helpers/
├── utils.js          ← 已有: checkStatus(), checkDuration(), pollMetrics()
├── env.js            ← 已有 (Phase 5): 环境配置加载
├── data.js           ← 已有 (Phase 5): CSV 数据加载
├── profile.js        ← 已有 (Phase 5): 负载 profile 加载
├── thinkTime.js      ← 新增: 统一 sleep 模式
├── funnel.js         ← 新增: 漏斗逻辑 (60/30/10)
└── healthCheck.js    ← 新增: setup() 中验证服务可用
```

### 1.2 Rate Limiter 中间件 (ENT-RESILIENCE)

```
Express Middleware Chain (src/app.js):
  express.json()
  → rateLimiter (新增, RATE_LIMIT_ENABLED 开关)
  → metricsMiddleware
  → healthRoutes / productRoutes / authRoutes / orderRoutes
```

**设计决策：** `RATE_LIMIT_ENABLED` 环境变量开关，默认关闭，保持向后兼容（同 Phase 3 AUTH_ENABLED 模式）。

### 1.3 Breakpoint Test 流程 (ENT-BREAKPOINT)

```
breakpoint.k6.js (ramping-arrival-rate)
  ┌──────────────────────────────────────────────┐
  │  options:                                     │
  │    executor: 'ramping-arrival-rate'            │
  │    startRate: 50 req/s                        │
  │    stages: 每 30s 递增 100 req/s               │
  │    maxDuration: 10min (安全上限)               │
  │    thresholds:                                │
  │      http_req_failed: [{ threshold: 'rate>0.5', abortOnFail: true }] │
  │                                               │
  │  default():                                   │
  │    └── funnel (60/30/10) + checkStatus()      │
  │                                               │
  │  handleSummary(data):                         │
  │    └── 输出崩溃点 RPS + 崩溃类型分类           │
  └──────────────────────────────────────────────┘
```

### 1.4 执行摘要报告流程 (ENT-REPORT)

```
k6 run --out json=reports/k6-result.json smoke.k6.js
                    │
                    ▼
scripts/generate-summary.sh reports/k6-result.json
  ├── jq 解析: p95, error_rate, throughput, http_req_duration
  ├── SLA 判定: p95 < 500ms? error < 1%?
  ├── Top 5 慢接口 (按 p95 排序)
  └── 输出 → reports/k6-summary.md (Markdown)
```

---

## 2. 文件结构

### 新增文件

| 文件 | 类型 | 需求 ID |
|------|------|---------|
| `tests/performance/helpers/thinkTime.js` | k6 helper | ENT-CONSISTENCY-02 |
| `tests/performance/helpers/funnel.js` | k6 helper | ENT-CONSISTENCY-03 |
| `tests/performance/helpers/healthCheck.js` | k6 helper | ENT-CONSISTENCY-04 |
| `tests/performance/breakpoint.k6.js` | k6 脚本 | ENT-BREAKPOINT-01/02 |
| `tests/performance/rate-limit.k6.js` | k6 脚本 | ENT-RESILIENCE-02 |
| `src/middleware/rateLimiter.js` | Express 中间件 | ENT-RESILIENCE-01 |
| `scripts/generate-summary.sh` | Bash 脚本 | ENT-REPORT-01 |
| `tests/unit/middleware/rateLimiter.test.js` | Jest 测试 | ENT-RESILIENCE-01 |

### 修改文件

| 文件 | 改动 | 需求 ID |
|------|------|---------|
| `src/app.js` | 添加 rateLimiter 中间件（条件加载） | ENT-RESILIENCE-01 |
| `package.json` | 添加 express-rate-limit 依赖 + npm scripts | ENT-RESILIENCE-01 |
| `tests/performance/load.k6.js` | import funnel/thinkTime helpers，移除内联代码 | ENT-CONSISTENCY-05 |
| `tests/performance/stress.k6.js` | 同上 | ENT-CONSISTENCY-05 |
| `tests/performance/capacity.k6.js` | 同上 | ENT-CONSISTENCY-05 |
| `tests/performance/soak.k6.js` | 同上 | ENT-CONSISTENCY-05 |
| `tests/performance/soak-short.k6.js` | 同上 | ENT-CONSISTENCY-05 |
| `tests/performance/auth-login.k6.js` | 替换直接 check() 为 checkStatus() | ENT-CONSISTENCY-01 |
| `tests/performance/auth-journey.k6.js` | 替换直接 check() 为 checkStatus() | ENT-CONSISTENCY-01 |

---

## 3. 任务拆分

### Task 1: k6 Helpers 提取 (ENT-CONSISTENCY-01~03)

- [ ] **1.1** 新增 `helpers/thinkTime.js`
  ```javascript
  import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
  import { sleep } from 'k6';
  export function thinkTime(min = 0.5, max = 1.0) {
    sleep(randomIntBetween(min, max));
  }
  ```
- [ ] **1.2** 新增 `helpers/funnel.js`
  ```javascript
  import http from 'k6/http';
  import { checkStatus } from './utils.js';
  import { thinkTime } from './thinkTime.js';
  
  export function executeFunnel(baseUrl, options = {}) {
    const { browseWeight = 0.6, detailWeight = 0.3 } = options;
    const rand = Math.random();
    
    // 60% browse
    const listRes = http.get(`${baseUrl}/api/products?page=1&limit=10`);
    checkStatus(listRes, 200, 'browse products');
    thinkTime();
    
    // 30% detail
    if (rand < browseWeight + detailWeight) {
      const id = Math.ceil(Math.random() * 5);
      const detailRes = http.get(`${baseUrl}/api/products/${id}`);
      checkStatus(detailRes, 200, 'product detail');
      thinkTime();
    }
    
    // 10% order
    if (rand >= browseWeight + detailWeight) {
      const orderRes = http.post(`${baseUrl}/api/orders`,
        JSON.stringify({ product_id: Math.ceil(Math.random() * 5), quantity: 1 }),
        { headers: { 'Content-Type': 'application/json' } }
      );
      checkStatus(orderRes, 201, 'create order');
    }
  }
  ```
- [ ] **1.3** 新增 `helpers/healthCheck.js`
  ```javascript
  import http from 'k6/http';
  export function verifyHealth(baseUrl) {
    const res = http.get(`${baseUrl}/health`, { tags: { test_phase: 'setup' } });
    if (res.status !== 200) throw new Error(`Health check failed: ${res.status}`);
    return true;
  }
  ```
- [ ] **1.4** commit: `feat(perf): add k6 helpers — thinkTime, funnel, healthCheck (#86)`

### Task 2: 现有脚本迁移 (ENT-CONSISTENCY-04~05)

- [ ] **2.1** `load.k6.js` — import funnel + thinkTime，移除内联漏斗逻辑
- [ ] **2.2** `stress.k6.js` — 同上
- [ ] **2.3** `capacity.k6.js` — import funnel，保留 custom metrics polling
- [ ] **2.4** `soak.k6.js` + `soak-short.k6.js` — import funnel，保留 auth sampling + leak detection
- [ ] **2.5** `auth-login.k6.js` + `auth-journey.k6.js` — 替换直接 `check()` 为 `checkStatus()`
- [ ] **2.6** `smoke.k6.js` + `spike.k6.js` — 添加 `verifyHealth()` 到 setup()（已有 inline health check，改为 helper 调用）
- [ ] **2.7** 回归验证：`npm run k6:smoke` 确认 p95/error rate 无变化
- [ ] **2.8** commit: `refactor(perf): migrate k6 scripts to shared helpers (#86)`

### Task 3: Rate Limiter 中间件 (ENT-RESILIENCE-01)

- [ ] **3.1** `npm install express-rate-limit`
- [ ] **3.2** 新增 `src/middleware/rateLimiter.js`
  ```javascript
  const rateLimit = require('express-rate-limit');
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' }
  });
  module.exports = limiter;
  ```
- [ ] **3.3** `src/app.js` 条件加载：
  ```javascript
  if (process.env.RATE_LIMIT_ENABLED === 'true') {
    app.use(require('./middleware/rateLimiter'));
  }
  ```
- [ ] **3.4** 单元测试 `tests/unit/middleware/rateLimiter.test.js`
  - 正常请求返回 200
  - 超过 max 后返回 429 + 正确 error message
  - 窗口过后恢复 200
  - RATE_LIMIT_ENABLED=false 时不启用
- [ ] **3.5** commit: `feat(perf): add express-rate-limit middleware with env toggle (#86)`

### Task 4: k6 限流测试脚本 (ENT-RESILIENCE-02~03)

- [ ] **4.1** 新增 `rate-limit.k6.js`
  - Phase 1: 正常流量验证 (低于限额，全部 200)
  - Phase 2: 超限验证 (burst > max，验证 429 返回)
  - Phase 3: 恢复验证 (等待窗口过后，恢复 200)
  - Phase 4: 熔断恢复 (持续超载后停止，测量恢复时间)
- [ ] **4.2** npm script: `"k6:rate-limit": "mkdir -p reports && k6 run --out 'web-dashboard=export=reports/k6-rate-limit.html' tests/performance/rate-limit.k6.js"`
- [ ] **4.3** commit: `feat(perf): add rate-limit k6 test script (#86)`

### Task 5: Breakpoint Test (ENT-BREAKPOINT-01~02)

- [ ] **5.1** 新增 `breakpoint.k6.js`
  - executor: `ramping-arrival-rate`
  - 从 50 req/s 开始，每 30s 递增 100 req/s
  - maxDuration: 10min
  - abortOnFail: error rate > 50%
  - `handleSummary()` 输出崩溃点 RPS 和崩溃类型
- [ ] **5.2** 崩溃类型分类逻辑：
  - **Graceful degradation**: p95 渐进增长，error rate 缓慢上升
  - **Catastrophic failure**: error rate 从 <1% 突跳到 >50%，或完全无响应
- [ ] **5.3** npm script: `"k6:breakpoint": "npm run preflight && npm run restart:clean && mkdir -p reports && k6 run --out 'web-dashboard=export=reports/k6-breakpoint.html' tests/performance/breakpoint.k6.js"`
- [ ] **5.4** commit: `feat(perf): add breakpoint test — find crash point (#86)`

### Task 6: 执行摘要报告 (ENT-REPORT-01)

- [ ] **6.1** 新增 `scripts/generate-summary.sh`
  - 输入: k6 JSON output 文件路径
  - 解析: jq 提取 p95, error_rate, throughput, http_req_duration 分布
  - SLA 判定: p95 < 500ms ✅/❌, error < 1% ✅/❌
  - Top 5 慢接口 (按 p95 排序)
  - 输出: Markdown 到 `reports/k6-summary.md`
- [ ] **6.2** npm script: `"generate-summary": "bash scripts/generate-summary.sh"`
- [ ] **6.3** commit: `feat(perf): add generate-summary.sh for k6 execution report (#86)`

### Task 7: 文档更新

- [ ] **7.1** 更新 `docs/architecture/architecture.md` — Phase 6 章节
- [ ] **7.2** 更新 `docs/qa/test-cases/index.md` — Phase 6 测试用例表
- [ ] **7.3** 更新 `docs/project-management/risks.md` — Phase 6 新风险
- [ ] **7.4** 更新 `CLAUDE.md` — Phase 6 命令
- [ ] **7.5** commit: `docs(perf): add Phase 6 architecture, test cases, risk updates (#86)`

---

## 4. 验收标准

| 需求 ID | 验收方式 | 命令 |
|---------|---------|------|
| ENT-CONSISTENCY-01~05 | ≥4 个脚本使用统一 helpers，无内联重复 | `grep -L "import.*funnel" tests/performance/{load,stress,capacity,soak}.k6.js` 返回空 |
| ENT-BREAKPOINT-01 | breakpoint.k6.js 输出崩溃点 RPS | `npm run k6:breakpoint` 完成，报告含崩溃点 |
| ENT-BREAKPOINT-02 | 崩溃类型分类 | handleSummary 输出 graceful/catastrophic |
| ENT-RESILIENCE-01 | Rate limiter 单元测试通过 | `npm test -- rateLimiter` |
| ENT-RESILIENCE-02 | 超限返回 429，窗口后恢复 200 | `RATE_LIMIT_ENABLED=true npm start && npm run k6:rate-limit` |
| ENT-REPORT-01 | 生成 Markdown 摘要 | `npm run generate-summary` 输出 reports/k6-summary.md |
| 回归 | 现有测试不受影响 | `npm test` (71+ tests PASS) + `npm run k6:smoke` (thresholds PASS) |

---

## 5. Prerequisites

| 工具 | 验证命令 | 最低版本 |
|------|---------|---------|
| Node.js | `node -v` | v18+ |
| k6 | `k6 version` | v1.7.0 |
| jq | `jq --version` | 1.6+ |
| express-rate-limit | Task 3.1 安装 | v7+ |

---

## 6. 迁移前后对比策略 (回归验证)

```bash
# Step 1: 迁移前基线
npm run k6:smoke 2>&1 | tee /tmp/smoke-before.txt

# Step 2: 执行 helpers 迁移 (Task 2)

# Step 3: 迁移后验证
npm run k6:smoke 2>&1 | tee /tmp/smoke-after.txt

# Step 4: 对比 p95 和 error rate
diff <(grep 'p(95)' /tmp/smoke-before.txt) <(grep 'p(95)' /tmp/smoke-after.txt)
```

无显著差异 (p95 偏差 < 10%, error rate 不变) 即为迁移成功。
