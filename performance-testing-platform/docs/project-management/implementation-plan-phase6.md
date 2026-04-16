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

| 文件                                        | 类型           | 需求 ID              |
| ------------------------------------------- | -------------- | -------------------- |
| `tests/performance/helpers/thinkTime.js`    | k6 helper      | ENT-CONSISTENCY-02   |
| `tests/performance/helpers/funnel.js`       | k6 helper      | ENT-CONSISTENCY-03   |
| `tests/performance/helpers/healthCheck.js`  | k6 helper      | ENT-CONSISTENCY-04   |
| `tests/performance/breakpoint.k6.js`        | k6 脚本        | ENT-BREAKPOINT-01/02 |
| `tests/performance/rate-limit.k6.js`        | k6 脚本        | ENT-RESILIENCE-02    |
| `src/middleware/rateLimiter.js`             | Express 中间件 | ENT-RESILIENCE-01    |
| `scripts/generate-summary.sh`               | Bash 脚本      | ENT-REPORT-01        |
| `tests/unit/middleware/rateLimiter.test.js` | Jest 测试      | ENT-RESILIENCE-01    |

### 修改文件

| 文件                                   | 改动                                                | 需求 ID            |
| -------------------------------------- | --------------------------------------------------- | ------------------ |
| `src/app.js`                           | 添加 rateLimiter 中间件（条件加载）                 | ENT-RESILIENCE-01  |
| `package.json`                         | 添加 express-rate-limit 依赖 + npm scripts          | ENT-RESILIENCE-01  |
| `tests/performance/load.k6.js`         | import funnel/thinkTime helpers，移除内联代码       | ENT-CONSISTENCY-05 |
| `tests/performance/stress.k6.js`       | 同上                                                | ENT-CONSISTENCY-05 |
| `tests/performance/capacity.k6.js`     | 同上                                                | ENT-CONSISTENCY-05 |
| `tests/performance/soak.k6.js`         | 同上                                                | ENT-CONSISTENCY-05 |
| `tests/performance/soak-short.k6.js`   | 同上                                                | ENT-CONSISTENCY-05 |
| `tests/performance/auth-login.k6.js`   | 替换直接 check() 为 checkStatus() + 移除 CDN import | ENT-CONSISTENCY-01 |
| `tests/performance/auth-refresh.k6.js` | 替换直接 check() 为 checkStatus() + 移除 CDN import | ENT-CONSISTENCY-01 |
| `tests/performance/auth-journey.k6.js` | 替换直接 check() 为 checkStatus() + 移除 CDN import | ENT-CONSISTENCY-01 |

---

## 3. 任务拆分

### Task 0: 环境检测 — Stage 4 前置条件

**目标:** 验证 Stage 4 集成测试的基础设施准备就绪

- [ ] **0.1** 运行 Stage 4 环境检测脚本
  ```bash
  bash scripts/preflight-check.sh --stage4
  ```
  **预期结果:** exit 0，所有检查通过（包括 Docker daemon）
- [ ] **0.2** 本地记录检测结果
  - Load Average < 5 ✅
  - 可用内存 > 2 GB ✅
  - CPU Idle > 50% ✅
  - Docker daemon 运行 ✅

- [ ] **0.3** 如果任何检查失败
  - 按脚本输出的修复提示操作
  - 修复后重新运行 `bash scripts/preflight-check.sh --stage4`
  - 确保全部 ✅ 后才能进入后续 Tasks

---

### Task 1: k6 Helpers 提取 (ENT-CONSISTENCY-01~03)

- [ ] **1.1** 新增 `helpers/thinkTime.js`
  ```javascript
  import { sleep } from 'k6';
  // 内联实现，不依赖 jslib CDN（同 Phase 5 去 CDN 策略）
  export function randomIntBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  export function thinkTime(min = 0.5, max = 1.0) {
    sleep(min + Math.random() * (max - min));
  }
  ```
  > **Note:** `randomIntBetween` 也导出，替代所有脚本中的 jslib CDN import。
- [ ] **1.2** 新增 `helpers/funnel.js`

  ```javascript
  import http from 'k6/http';
  import { checkStatus } from './utils.js';
  import { thinkTime } from './thinkTime.js';
  import { randomProduct } from './data.js';

  // 嵌套漏斗模型（与现有脚本行为一致）：
  // 嵌套概率：100% browse → 50% detail → 33% order
  // 实际流量占比：browse 100%, detail ~50%, order ~16.5%
  // 注: 需求文档 "60/30/10" 指的是电商漏斗设计意图，
  //     实际概率使用嵌套模型以匹配现有脚本行为。
  export function executeFunnel(baseUrl, options = {}) {
    const { detailProb = 0.5, orderProb = 0.33, onOrder = null } = options;
    const p = randomProduct(); // Phase 5 CSV 数据，避免硬编码

    // 100% browse
    const listRes = http.get(`${baseUrl}/api/products`);
    checkStatus(listRes, 200, 'browse products');
    thinkTime();

    // ~50% detail (嵌套)
    if (Math.random() < detailProb) {
      const detailRes = http.get(`${baseUrl}/api/products/${p.id}`);
      checkStatus(detailRes, 200, 'product detail');
      thinkTime();

      // ~33% of detail viewers → order (嵌套)
      if (Math.random() < orderProb) {
        const orderRes = http.post(
          `${baseUrl}/api/orders`,
          JSON.stringify({ product_id: Number(p.id), quantity: 1 }),
          { headers: { 'Content-Type': 'application/json' } }
        );
        checkStatus(orderRes, 201, 'create order');
        // 回调 hook：soak 脚本用于记录自定义 metrics
        if (onOrder) onOrder(orderRes);
      }
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
- [ ] **2.3** `capacity.k6.js` — import funnel + thinkTime，**移除 jslib CDN import**，保留 custom metrics polling
- [ ] **2.4** `soak.k6.js` + `soak-short.k6.js` — import funnel，保留 auth sampling + leak detection
- [ ] **2.5** `auth-login.k6.js` + `auth-refresh.k6.js` + `auth-journey.k6.js` — 替换直接 `check()` 为 `checkStatus()` + **移除 jslib CDN import**，改用 `thinkTime()` from helpers
- [ ] **2.6** `smoke.k6.js` + `spike.k6.js` — **新增** `verifyHealth()` 到 setup() 作为前置验证；smoke 的 default() 中的 health check **保留**（每轮迭代监控）
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
    message: { error: 'Too many requests, please try again later.' },
  });
  module.exports = limiter;
  ```
- [ ] **3.3** `src/app.js` 条件加载：
  ```javascript
  if (process.env.RATE_LIMIT_ENABLED === 'true') {
    app.use(require('./middleware/rateLimiter'));
  }
  ```
- [ ] **3.4** 单元测试 `tests/unit/middleware/rateLimiter.test.js` (UT-RL-01~06)
  - UT-RL-01: 正常请求返回 200
  - UT-RL-02: 超过 max 后返回 429 + 正确 error message
  - UT-RL-03: 窗口过后恢复 200
  - UT-RL-04: RATE_LIMIT_ENABLED=false 时不启用
  - UT-RL-05: 自定义 windowMs + max 环境变量覆盖默认值
  - UT-RL-06: 返回标准 RateLimit headers (RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset)
- [ ] **3.4b** 集成测试 `RL-INT-01~03` 添加到 `scripts/integration-test.sh` 的 Phase 6 section（Stage 3 DoD）
  - RL-INT-01: RATE_LIMIT_ENABLED=true, RATE_LIMIT_MAX=3，发 4 次请求 → 前 3 次 200，第 4 次 429
  - RL-INT-02: 同上，检查 ratelimit-remaining header 递减 (2 → 1 → 0)
  - RL-INT-03: 耗尽限额后 sleep 6s（窗口过期），恢复 200
- [ ] **3.4c** 本地验证：`bash scripts/integration-test.sh | grep -A 1 "RL-INT"`，确认 3 cases PASS
- [ ] **3.5** commit: `feat(perf): add express-rate-limit middleware with env toggle + RL-INT-01~03 (#86)`

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
  - 输入校验: 检查 `$1` 是否存在且为有效 JSON 文件，否则输出 usage 提示并 exit 1
  - 解析: jq 提取 p95, error_rate, throughput, http_req_duration 分布
  - SLA 判定: p95 < 500ms ✅/❌, error < 1% ✅/❌
  - Top 5 慢接口 (按 p95 排序)
  - 输出: Markdown 到 `reports/k6-summary.md`
- [ ] **6.2** npm script: `"generate-summary": "bash scripts/generate-summary.sh"`
- [ ] **6.2b** 集成测试 `GEN-INT-01~03` 添加到 `scripts/integration-test.sh` 的 Phase 6 section（Stage 3 DoD）
  - GEN-INT-01: 有效 k6 JSON fixture → exit 0，输出含 `# k6 Execution Summary`
  - GEN-INT-02: 不存在的文件路径 → exit 1，stderr 含 usage 提示
  - GEN-INT-03: 2/10 错误率 fixture → 输出 Markdown 含 `20%`
- [ ] **6.2c** 本地验证：`bash scripts/integration-test.sh | grep -A 1 "GEN-INT"`，确认 3 cases PASS
- [ ] **6.3** commit: `feat(perf): add generate-summary.sh for k6 execution report + GEN-INT-01~03 (#86)`

### Task 7: 文档更新

- [ ] **7.1** 更新 `docs/architecture/architecture.md` — Phase 6 章节
- [ ] **7.2** 更新 `docs/qa/test-cases/index.md` — Phase 6 测试用例表
- [ ] **7.3** 更新 `docs/project-management/risks.md` — Phase 6 新风险
- [ ] **7.4** 更新 `CLAUDE.md` — Phase 6 命令
- [ ] **7.5** commit: `docs(perf): add Phase 6 architecture, test cases, risk updates (#86)`

---

## 4. 验收标准

| 需求 ID               | 验收方式                              | 命令                                                                                  |
| --------------------- | ------------------------------------- | ------------------------------------------------------------------------------------- |
| ENT-CONSISTENCY-01~05 | ≥4 个脚本使用统一 helpers，无内联重复 | `grep -L "import.*funnel" tests/performance/{load,stress,capacity,soak}.k6.js` 返回空 |
| ENT-BREAKPOINT-01     | breakpoint.k6.js 输出崩溃点 RPS       | `npm run k6:breakpoint` 完成，报告含崩溃点                                            |
| ENT-BREAKPOINT-02     | 崩溃类型分类                          | handleSummary 输出 graceful/catastrophic                                              |
| ENT-RESILIENCE-01     | Rate limiter 单元测试通过             | `npm test -- rateLimiter`                                                             |
| ENT-RESILIENCE-02     | 超限返回 429，窗口后恢复 200          | `RATE_LIMIT_ENABLED=true npm start && npm run k6:rate-limit`                          |
| ENT-REPORT-01         | 生成 Markdown 摘要                    | `npm run generate-summary` 输出 reports/k6-summary.md                                 |
| 回归                  | 现有测试不受影响                      | `npm test` (95 tests PASS) + `npm run k6:smoke` (thresholds PASS)                     |

---

## 5. Prerequisites

| 工具               | 验证命令       | 最低版本 |
| ------------------ | -------------- | -------- |
| Node.js            | `node -v`      | v18+     |
| k6                 | `k6 version`   | v1.7.0   |
| jq                 | `jq --version` | 1.6+     |
| express-rate-limit | Task 3.1 安装  | v7+      |

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

---

## 7. Plan Review 修复记录

| ID   | 级别     | 问题                                                                               | 修复                                                                |
| ---- | -------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| C-01 | CRITICAL | capacity.k6.js 的 jslib CDN import 未在迁移计划中提及                              | Task 2.3 明确标注移除 CDN import                                    |
| C-02 | CRITICAL | auth-login/refresh/journey 的 jslib CDN import 未提及；auth-refresh.k6.js 完全遗漏 | Task 2.5 扩展范围，覆盖 3 个 auth 脚本；修改文件表新增 auth-refresh |
| C-03 | CRITICAL | 测试数量过时 (71+ → 95)                                                            | 验收标准已更新                                                      |
| W-01 | WARNING  | funnel.js 逻辑与现有脚本不一致（扁平 vs 嵌套模型）                                 | 重写为嵌套模型：100% browse → 50% detail → 33% order                |
| W-02 | WARNING  | soak 脚本的自定义 metrics (soakOrderSuccess/Failure) 会在 funnel 迁移后丢失        | executeFunnel() 新增 `onOrder` 回调 hook                            |
| W-03 | WARNING  | smoke.k6.js health check 迁移歧义 (replace vs add)                                 | 明确：setup() 新增 verifyHealth()，default() 保留原有 health check  |
| W-04 | WARNING  | thinkTime.js 未导出 randomIntBetween                                               | 改为 named export，替代所有 CDN import                              |
| W-05 | WARNING  | product_id parseInt 不一致                                                         | 统一使用 `Number(p.id)`                                             |
| W-06 | WARNING  | funnel 概率注释与需求 "60/30/10" 不一致                                            | 注释补充说明：需求是设计意图，实际使用嵌套模型匹配现有脚本行为      |
| W-07 | WARNING  | Task 3.4 只列 4 个测试，测试用例表有 6 个 (UT-RL-01~06)                            | 补充 UT-RL-05 (自定义环境变量) + UT-RL-06 (RateLimit headers)       |
| W-08 | WARNING  | generate-summary.sh 未提及输入校验                                                 | Task 6.1 补充：检查 $1 存在且为有效文件，否则 usage + exit 1        |
