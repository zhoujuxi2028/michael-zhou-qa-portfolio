# Phase 6 Stage 3 开发清单（完整可执行）

**Project:** Performance Testing Platform  
**Issue:** #86 — 测试能力扩展  
**Branch:** `feature/performance-testing`  
**Start Date:** 2026-04-14  
**Definition of Done:** 代码 + 单元测试 + 集成测试 + 文档完整

---

## 前置条件检查

- [ ] Node.js ≥ 18 → `node -v`
- [ ] k6 ≥ 1.7.0 → `k6 version`
- [ ] jq ≥ 1.6 → `jq --version`
- [ ] npm 项目已初始化 → `npm list express` 确认依赖环境
- [ ] 分支已切换到 `feature/performance-testing` → `git branch`

**若有未通过，执行：**
```bash
cd performance-testing-platform
npm install
npm run setup  # 一键初始化 lint + test
```

---

## Task 1: k6 Helpers 提取（ENT-CONSISTENCY-01~03）

**文件输出：** 3 个新 helpers  
**单元测试：** 无（k6 ES module 不兼容 Jest）  
**集成测试：** K6-HLP-INT-01~02 (SKIP 态)  
**预期时间：** ~30 min

- [ ] **1.1** 新增 `tests/performance/helpers/thinkTime.js`
  ```bash
  touch tests/performance/helpers/thinkTime.js
  # 编写 randomIntBetween() + thinkTime(min, max) 函数（含代码注释）
  ```
  ✓ Checklist: 含 `export function thinkTime`、`export function randomIntBetween`

- [ ] **1.2** 新增 `tests/performance/helpers/funnel.js`
  ```bash
  touch tests/performance/helpers/funnel.js
  # 编写 executeFunnel(baseUrl, options) 函数
  # 导入：data.js 的 randomProduct()，utils.js 的 checkStatus()，thinkTime.js
  ```
  ✓ Checklist: 
    - 含 100% browse 阶段（`GET /api/products`）
    - 含 50% detail 阶段（`GET /api/products/{id}`，嵌套概率）
    - 含 33% order 阶段（`POST /api/orders`，嵌套概率）
    - 含 `onOrder` 回调 hook（用于 soak）
    - **无 CDN import**（内联 randomIntBetween）

- [ ] **1.3** 新增 `tests/performance/helpers/healthCheck.js`
  ```bash
  touch tests/performance/helpers/healthCheck.js
  # 编写 verifyHealth(baseUrl) 函数
  ```
  ✓ Checklist:
    - `GET /health` 调用含 `tags: { test_phase: 'setup' }`
    - status 不等 200 时 throw 错误

- [ ] **1.4** 本地验证
  ```bash
  cd performance-testing-platform
  # k6 语法检查（无运行，仅 import 验证）
  grep -l "export function" tests/performance/helpers/{thinkTime,funnel,healthCheck}.js
  # 期望输出：3 个文件
  ```

- [ ] **1.5** Commit
  ```bash
  git add tests/performance/helpers/{thinkTime,funnel,healthCheck}.js
  git commit -m "feat(perf): add k6 helpers — thinkTime, funnel, healthCheck (#86)"
  ```

---

## Task 2: k6 脚本迁移（ENT-CONSISTENCY-04~05）

**文件修改：** 9 个现有脚本  
**单元测试：** 无新增  
**集成测试：** 无新增（通过 k6:smoke 间接验证）  
**预期时间：** ~60 min  
**回归验证：** p95 偏差 < 10%

### 2.1-2.6 逐脚本迁移

| 脚本 | 变更 | 验证命令 |
|------|------|---------|
| load.k6.js | `import { executeFunnel } from './helpers/funnel.js'` 替换内联漏斗 | `grep "executeFunnel" tests/performance/load.k6.js` |
| stress.k6.js | 同上 | `grep "executeFunnel" tests/performance/stress.k6.js` |
| capacity.k6.js | 同上 + 移除 jslib CDN import | `grep -i "jslib" tests/performance/capacity.k6.js` → 无输出 |
| soak.k6.js | `import { executeFunnel }` + 保留 auth/leak detection | `grep "executeFunnel" tests/performance/soak.k6.js` |
| soak-short.k6.js | 同上 | `grep "executeFunnel" tests/performance/soak-short.k6.js` |
| auth-login.k6.js | `check()` → `checkStatus()` + 移除 CDN | `grep "check(" tests/performance/auth-login.k6.js` → 无输出（仅 checkStatus） |
| auth-refresh.k6.js | 同上 | `grep "check(" tests/performance/auth-refresh.k6.js` → 无输出 |
| auth-journey.k6.js | 同上 | `grep "check(" tests/performance/auth-journey.k6.js` → 无输出 |
| smoke.k6.js | `verifyHealth()` 加到 setup()；default() 中 health check 保留 | `grep "verifyHealth" tests/performance/smoke.k6.js` |
| spike.k6.js | 同上 | `grep "verifyHealth" tests/performance/spike.k6.js` |

- [ ] **2.1-2.6** 逐个修改上述 9 个脚本（可并行）

- [ ] **2.7** 回归验证（Stage 3 DoD）
  ```bash
  # 记录迁移前的 p95
  npm run k6:smoke > /tmp/smoke-after.txt 2>&1
  # 期望：✓ 'p(95)<2000' p(95)=XX ms，与迁移前偏差 < 10%
  # 期望：checks_failed 无变化
  ```

- [ ] **2.8** Commit
  ```bash
  git add tests/performance/*.k6.js
  git commit -m "refactor(perf): migrate k6 scripts to shared helpers (#86)"
  ```

---

## Task 3: Rate Limiter 中间件 + 单元 + 集成测试（ENT-RESILIENCE-01）

**文件输出：** 3 个（rateLimiter.js + test + integration-test.sh section）  
**单元测试：** UT-RL-01~06 (6 cases)  
**集成测试：** RL-INT-01~03 (3 cases)  
**预期时间：** ~90 min  
**验收：** `npm test -- rateLimiter` PASS + `bash scripts/integration-test.sh | grep RL-INT` PASS

### 3.1-3.3 实现 Rate Limiter

- [ ] **3.1** 安装依赖
  ```bash
  npm install express-rate-limit
  # 确认 package.json 已更新
  grep "express-rate-limit" package.json
  ```

- [ ] **3.2** 新增中间件 `src/middleware/rateLimiter.js`
  ```javascript
  // 使用 env vars: RATE_LIMIT_WINDOW_MS(default 60000), RATE_LIMIT_MAX(default 100)
  // 启用 standardHeaders: true 返回 RateLimit-* headers
  // 禁用 legacyHeaders: false
  ```
  ✓ Checklist:
    - 含 `module.exports = limiter;`（CommonJS）
    - env 变量使用 `parseInt()` 防止字符串比较错误
    - message 为 `{ error: "Too many requests..." }`

- [ ] **3.3** 条件加载到 `src/app.js`
  ```javascript
  // 在 express.json() 之后、routes 之前
  if (process.env.RATE_LIMIT_ENABLED === 'true') {
    app.use(require('./middleware/rateLimiter'));
  }
  ```

### 3.4 单元测试（UT-RL-01~06，修复 PoC stub）

- [ ] **3.4.1** 修复 UT-RL-02（断言 429）
  ```bash
  # 使用 jest.isolateModules() + jest.resetModules()
  # 设 RATE_LIMIT_ENABLED=true, RATE_LIMIT_MAX=2
  # 发 3 次请求，第 3 次应返回 429
  # expect(res3.status).toBe(429)
  ```

- [ ] **3.4.2** 修复 UT-RL-03（窗口恢复）
  ```bash
  # 使用 jest.useFakeTimers()
  # 耗尽限额（> max），再 advanceTimersByTime(windowMs+100)
  # 最后一次请求应返回 200
  ```

- [ ] **3.4.3** 修复 UT-RL-06（headers 断言）
  ```bash
  # 使用 jest.isolateModules() 强制 RATE_LIMIT_ENABLED=true
  # expect(res.headers['ratelimit-limit']).toBeDefined()
  # expect(res.headers['ratelimit-remaining']).toBeDefined()
  # expect(res.headers['ratelimit-reset']).toBeDefined()
  # 无条件断言（非 if (env === 'true')）
  ```

- [ ] **3.4.4** 验证单元测试
  ```bash
  npm test -- tests/unit/middleware/rateLimiter.test.js
  # 期望：6 tests PASS, 0 FAIL
  ```

### 3.4b 集成测试（RL-INT-01~03）

- [ ] **3.4b.1** 打开 `scripts/integration-test.sh`，在 Phase 5 section 之后新增 Phase 6 section
  ```bash
  # 结构参考：现有 Phase 3 AUTH-INT 的 start/stop 模式
  echo "=========================================="
  echo " Phase 6: Rate Limiter (RL-INT-01~03)"
  echo "=========================================="
  
  # RL-INT-01: burst > max → 429
  RATE_LIMIT_ENABLED=true RATE_LIMIT_MAX=3 RATE_LIMIT_WINDOW_MS=5000 npm run start:single &
  sleep 2
  for i in {1..4}; do
    res=$(curl -s -w "%{http_code}" -o /dev/null http://localhost:3000/api/products)
    # res1-3 should be 200, res4 should be 429
  done
  npm stop
  
  # RL-INT-02: ratelimit-remaining header
  RATE_LIMIT_ENABLED=true RATE_LIMIT_MAX=3 ... npm run start:single &
  # curl -i 检查 ratelimit-remaining: 2, 1, 0
  npm stop
  
  # RL-INT-03: window recovery
  # 同上，但最后加 sleep 6，验证恢复
  ```

- [ ] **3.4b.2** 验证集成测试
  ```bash
  bash scripts/integration-test.sh
  # 期望：RL-INT-01 PASS, RL-INT-02 PASS, RL-INT-03 PASS
  # 期望：总计 21 PASS + 3 新增 PASS + 2 SKIP（k6 helpers）= 26 PASS
  ```

### 3.4c 本地验证

- [ ] **3.4c** 完整验证
  ```bash
  npm test -- rateLimiter  # 单元
  bash scripts/integration-test.sh | grep -A 2 "RL-INT"  # 集成
  # 两个都要 PASS
  ```

### 3.5 Commit

- [ ] **3.5** 提交
  ```bash
  git add src/middleware/rateLimiter.js src/app.js tests/unit/middleware/rateLimiter.test.js scripts/integration-test.sh
  git commit -m "feat(perf): add express-rate-limit middleware with env toggle + RL-INT-01~03 (#86)"
  ```

---

## Task 4: k6 限流测试脚本（ENT-RESILIENCE-02~03）

**文件输出：** rate-limit.k6.js  
**单元测试：** 无  
**集成测试：** 无新增（k6 脚本自身已是性能测试）  
**预期时间：** ~45 min

- [ ] **4.1** 新增 `tests/performance/rate-limit.k6.js`
  ```javascript
  // Phase 1: 正常流量 (低于限额) → 全部 200
  // Phase 2: 超限验证 (VUs 突增) → 验证 429 返回
  // Phase 3: 恢复验证 (等待窗口) → 恢复 200
  // Phase 4: 熔断恢复 (持续超载后停止) → 测量恢复时间
  ```
  ✓ Checklist:
    - 引入 funnel helper + checkStatus
    - 明确 Stage/Phase 注释
    - thresholds 定义清晰

- [ ] **4.2** npm script: 添加到 `package.json`
  ```json
  "k6:rate-limit": "mkdir -p reports && k6 run --out 'web-dashboard=export=reports/k6-rate-limit.html' tests/performance/rate-limit.k6.js"
  ```

- [ ] **4.3** 本地验证（性能脚本可跳过运行，仅检查语法）
  ```bash
  k6 parse tests/performance/rate-limit.k6.js
  # 期望：无错误
  ```

- [ ] **4.4** Commit
  ```bash
  git add tests/performance/rate-limit.k6.js package.json
  git commit -m "feat(perf): add rate-limit k6 test script (#86)"
  ```

---

## Task 5: Breakpoint Test（ENT-BREAKPOINT-01~02）

**文件输出：** breakpoint.k6.js  
**单元测试：** 无  
**集成测试：** 无新增（k6 脚本自身已是性能测试）  
**预期时间：** ~45 min

- [ ] **5.1** 新增 `tests/performance/breakpoint.k6.js`
  ```javascript
  // executor: ramping-arrival-rate
  // startRate: 50 req/s，每 30s 递增 100 req/s
  // maxDuration: 10min（安全阀）
  // abortOnFail: error rate > 50%
  // handleSummary(): 输出崩溃点 RPS + 崩溃类型（graceful vs catastrophic）
  ```
  ✓ Checklist:
    - stages 配置正确
    - thresholds 含 `error > 0.5` abortOnFail
    - handleSummary() 输出格式清晰

- [ ] **5.2** npm script: 添加到 `package.json`
  ```json
  "k6:breakpoint": "npm run preflight && npm run restart:clean && mkdir -p reports && k6 run --out 'web-dashboard=export=reports/k6-breakpoint.html' tests/performance/breakpoint.k6.js"
  ```

- [ ] **5.3** 本地验证
  ```bash
  k6 parse tests/performance/breakpoint.k6.js
  # 期望：无错误
  ```

- [ ] **5.4** Commit
  ```bash
  git add tests/performance/breakpoint.k6.js package.json
  git commit -m "feat(perf): add breakpoint test — find crash point (#86)"
  ```

---

## Task 6: 执行摘要报告（ENT-REPORT-01）

**文件输出：** generate-summary.sh  
**单元测试：** 无  
**集成测试：** GEN-INT-01~03 (3 cases)  
**预期时间：** ~60 min  
**验收：** `bash scripts/generate-summary.sh <json>` 生成 Markdown + `bash scripts/integration-test.sh | grep GEN-INT` PASS

### 6.1-6.2 实现摘要脚本

- [ ] **6.1** 新增 `scripts/generate-summary.sh`
  ```bash
  #!/bin/bash
  set -e
  
  # 输入校验
  if [ -z "$1" ] || [ ! -f "$1" ]; then
    echo "Usage: $0 <k6-json-file>"
    exit 1
  fi
  
  # jq 解析
  # 提取：p95, error_rate, throughput, top 5 slowest endpoints
  # SLA 判定：p95 < 500ms, error < 1%
  # 输出：reports/k6-summary.md
  ```
  ✓ Checklist:
    - `$1` 存在性检查 + exit 1
    - jq 字段提取 (p95/error rate/throughput)
    - Markdown 格式（含 `# k6 Execution Summary`）
    - 输出路径 `reports/k6-summary.md`

- [ ] **6.2** npm script: 添加到 `package.json`
  ```json
  "generate-summary": "bash scripts/generate-summary.sh reports/k6-result.json"
  ```

### 6.2b 集成测试（GEN-INT-01~03）

- [ ] **6.2b.1** 打开 `scripts/integration-test.sh`，在 RL-INT section 之后新增 GEN-INT section
  ```bash
  echo "=========================================="
  echo " Phase 6: generate-summary.sh (GEN-INT-01~03)"
  echo "=========================================="
  
  # GEN-INT-01: 有效输入 → exit 0
  # 创建 fixture，验证 exit code 和输出
  
  # GEN-INT-02: 不存在文件 → exit 1
  # 调用脚本，验证 exit 1
  
  # GEN-INT-03: 错误率计算
  # 创建 2/10 错误率 fixture，验证输出含 20%
  ```

- [ ] **6.2b.2** 验证集成测试
  ```bash
  bash scripts/integration-test.sh
  # 期望：GEN-INT-01 PASS, GEN-INT-02 PASS, GEN-INT-03 PASS
  # 期望：总计 26 PASS + 2 SKIP = 28 cases
  ```

### 6.2c 本地验证

- [ ] **6.2c** 完整验证
  ```bash
  # 手工测试脚本（需 k6 JSON 真实数据，或 fixture）
  bash scripts/generate-summary.sh reports/k6-result.json
  # 期望：reports/k6-summary.md 生成，含 SLA 判定

  # 集成测试验证
  bash scripts/integration-test.sh | grep -A 2 "GEN-INT"
  # 期望：3 cases PASS
  ```

### 6.3 Commit

- [ ] **6.3** 提交
  ```bash
  git add scripts/generate-summary.sh scripts/integration-test.sh package.json
  git commit -m "feat(perf): add generate-summary.sh for k6 execution report + GEN-INT-01~03 (#86)"
  ```

---

## Task 7: 文档更新（已在 Stage 2 完成）

文档更新已在 Stage 2 完成（commit `2f51da69`）：

- [x] **7.1** `docs/architecture/architecture.md` — Phase 6 helpers 结构已更新
- [x] **7.2** `docs/qa/test-cases/index.md` — Phase 6 用例计数已同步（212 cases）
- [x] **7.3** `docs/project-management/risks.md` — R-14 已移入历史 (H-11)
- [x] **7.4** `dev-process-checklist.md` — Stage 3 DoD 已规范化
- [x] **7.5** `test-plan.md` — 集成测试 23→28 已更新

**此处 Task 7 仅补充：**
- [ ] **7.6** 更新 `CLAUDE.md` — 添加 Phase 6 命令
  ```markdown
  npm run k6:rate-limit          # Rate Limiter 压测
  npm run k6:breakpoint          # Breakpoint 崩溃测试
  npm run generate-summary       # k6 执行摘要报告
  ```

- [ ] **7.7** Commit
  ```bash
  git add CLAUDE.md
  git commit -m "docs(perf): add Phase 6 quick commands"
  ```

---

## Stage 3 DoD 最终清单

**回到 main 前，确认以下全部通过：**

- [ ] **单元测试**
  ```bash
  npm test
  # 期望：95+ tests PASS, 0 FAIL
  ```

- [ ] **单元测试 (Rate Limiter 特别)**
  ```bash
  npm test -- tests/unit/middleware/rateLimiter.test.js
  # 期望：6 tests PASS (UT-RL-01~06)
  ```

- [ ] **集成测试**
  ```bash
  bash scripts/integration-test.sh
  # 期望：
  # - Phase 1~5: 原有 21 cases PASS
  # - Phase 6 RL-INT: 3 cases PASS
  # - Phase 6 GEN-INT: 3 cases PASS
  # - Phase 6 K6-HLP-INT: 2 cases SKIP (明确理由)
  # - 总计：26 PASS, 0 FAIL, 2 SKIP
  ```

- [ ] **k6 smoke 回归**
  ```bash
  npm run k6:smoke
  # 期望：✓ 'p(95)<2000'，与迁移前偏差 < 10%
  ```

- [ ] **Lint**
  ```bash
  npm run lint
  # 期望：0 errors
  ```

- [ ] **Git 历史**
  ```bash
  git log --oneline feature/performance-testing | head -10
  # 期望：7 个 commits（Tasks 1-7）
  ```

---

## 风险和常见坑

| 坑 | 症状 | 解决 |
|---|------|------|
| Rate Limiter env 未被读取 | `npm test` 时 UT-RL-02 未返回 429 | 使用 `jest.isolateModules()` 重新 require，不能中途修改 `process.env` |
| k6 helper import 失败 | `k6 run` 时 "Cannot find module" | 检查路径是 `../../../` vs `../../`（Phase 5 已解决，遵循同规范） |
| generate-summary.sh 权限不足 | `bash scripts/generate-summary.sh` 返回 "command not found" | `chmod +x scripts/generate-summary.sh` |
| integration-test.sh 格式错误 | `bash scripts/integration-test.sh` 报红 | 检查 `log_result` 调用是否包含 "PASS\|FAIL\|SKIP"，参考 Phase 3 AUTH-INT 格式 |
| jest fake timers 冲突 | UT-RL-03 `advanceTimersByTime` 无效 | 确保 `jest.useFakeTimers()` 在 test block 开始，不在 beforeEach |

---

## 验收和移交

**Stage 3 完成后：**
1. ✅ 所有代码 committed to `feature/performance-testing`
2. ✅ 所有测试通过（unit + integration）
3. ✅ k6 smoke 回归验证通过（p95 < 10% 偏差）
4. ✅ 风险清单已同步（如有新风险，补充到 risks.md）
5. ✅ 本清单中所有 checkbox 已勾选

**移交给 Stage 4：**
- 暂停等待 Code Review（Plan Review）
- Stage 4 将运行 CI，验证 lint + unit + integration + coverage 全绿
- 期间不补写新测试（所有测试代码应在 Stage 3 完成）

