# 测试执行报告 (Test Execution Report)

**日期:** 2026-04-05
**Commit:** `5b054eca` (test(perf): add automated integration test runner for Phase 1-5)
**CI Run:** [#23992786381](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/actions/runs/23992786381)
**Branch:** `main`

---

## 1. 执行摘要

| 检查项 | 优先级 | 结果 | 备注 |
|--------|--------|------|------|
| 单元测试 | P0 | **95/95 PASS** | 14 suites, 44.9s |
| Lint (ESLint) | P0 | **PASS** | 0 errors |
| 覆盖率 | P0 | **PASS** | 全部达标 |
| 集成测试 | P1 | **21 Pass / 0 Fail / 2 Skip** | SOAK-TC-04~05 手动项 |
| CI 流水线 | P1 | **4/4 jobs PASS** | lint → unit → k6 smoke → JMeter smoke |
| JMeter dry-run | P0 | **PASS** | 字段名/状态码正确 |

**总体结论: 全部通过**

---

## 2. 单元测试详情

### 本地执行

```
Test Suites: 14 passed, 14 total
Tests:       95 passed, 95 total
Snapshots:   0 total
Time:        44.969 s
```

### Per-Suite 结果

| Suite | Tests | 状态 |
|-------|-------|------|
| tests/unit/routes/health.test.js | 2 | PASS |
| tests/unit/routes/products.test.js | 6 | PASS |
| tests/unit/routes/orders.test.js | 5 | PASS |
| tests/unit/routes/auth.test.js | 10 | PASS |
| tests/unit/middleware/metrics.test.js | 2 | PASS |
| tests/unit/middleware/authenticate.test.js | 7 | PASS |
| tests/unit/db/database.test.js | 3 | PASS |
| tests/unit/utils/delay.test.js | 2 | PASS |
| tests/unit/scripts/server-sh.test.js | 8 | PASS |
| tests/unit/scripts/preflight-check.test.js | 15 | PASS |
| tests/unit/scripts/soak-leak-detection.test.js | 7 | PASS |
| tests/unit/helpers/env.test.js | 7 | PASS |
| tests/unit/helpers/data.test.js | 8 | PASS |
| tests/unit/helpers/profile.test.js | 9 | PASS |

---

## 3. 覆盖率详情

### 阈值 vs 实际

| 指标 | 阈值 | 实际 | 结果 |
|------|------|------|------|
| Statements | ≥ 80% | **92.15%** | PASS |
| Branches | ≥ 70% | **89.34%** | PASS |
| Functions | ≥ 80% | **97.91%** | PASS |
| Lines | ≥ 80% | **94.22%** | PASS |

### Per-File 覆盖率

```
--------------------|---------|----------|---------|---------|-------------------
File                | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
--------------------|---------|----------|---------|---------|-------------------
All files           |   92.15 |    89.34 |   97.91 |   94.22 |                   
 src                |   53.84 |        0 |       0 |   58.33 |                   
  app.js            |     100 |      100 |     100 |     100 |                   
  cluster.js        |       0 |        0 |       0 |       0 | 1-13              
 src/db             |      88 |    83.33 |     100 |   86.36 |                   
  database.js       |      88 |    83.33 |     100 |   86.36 | 9-11              
 src/middleware     |    97.5 |    91.66 |     100 |     100 |                   
  authenticate.js   |     100 |      100 |     100 |     100 |                   
  metrics.js        |   95.65 |       75 |     100 |     100 | 10                
 src/routes         |   97.08 |    91.07 |     100 |   98.44 |                   
  auth.js           |   93.84 |    85.71 |     100 |   96.72 | 78,103            
  health.js         |     100 |      100 |     100 |     100 |                   
  orders.js         |     100 |      100 |     100 |     100 |                   
  products.js       |     100 |    91.66 |     100 |     100 | 29                
 src/utils          |   94.87 |     91.3 |     100 |   98.41 |                   
  csv-loader.js     |   95.65 |       80 |     100 |     100 | 13-20             
  delay.js          |     100 |      100 |     100 |     100 |                   
  env-loader.js     |      90 |     87.5 |     100 |   94.11 | 25                
  leak-detection.js |     100 |      100 |     100 |     100 |                   
  profile-parser.js |      95 |    95.45 |     100 |     100 | 2                 
--------------------|---------|----------|---------|---------|-------------------
```

---

## 4. 集成测试详情 (scripts/integration-test.sh)

| Phase | ID | 结果 | 详情 |
|-------|----|------|------|
| 1 | JM-GRF-01 | PASS | InfluxDB has N measurements |
| 1 | JM-GRF-02 | PASS | Dashboard loaded with N panels |
| 1 | JM-GRF-03 | PASS | VUs panel: N data points |
| 1 | JM-GRF-04 | PASS | Response Time panel: N data points |
| 2 | SM-UT-01 | PASS | /metrics CPU ok |
| 2 | SM-UT-02 | PASS | /metrics memory ok |
| 2 | SM-UT-03 | PASS | /metrics eventLoop ok |
| 2 | SM-IT-01 | PASS | CSV generated |
| 2 | SM-IT-02 | PASS | Per-second recording |
| 2 | SM-IT-03 | PASS | Last row complete |
| 2 | CLU-01 | PASS | Cluster mode running, health=ok |
| 2 | CLU-02 | PASS | Multi-worker: requestCount > 0 |
| 2 | CLU-03 | PASS | Worker killed → master restarted → health=ok |
| 3 | AUTH-INT-01 | PASS | register=201, login returned token |
| 3 | AUTH-INT-02 | PASS | Protected API with token: 201 |
| 3 | AUTH-INT-03 | PASS | No token → 401 Unauthorized |
| 4 | SOAK-TC-04 | SKIP | Requires Grafana + soak run (manual verification) |
| 4 | SOAK-TC-05 | SKIP | Requires alert rule trigger (manual verification) |
| 5 | K6-INT-01 | PASS | env defaults: 100% checks, localhost |
| 5 | K6-INT-02 | PASS | env staging: requests sent to staging.example.com |
| 5 | K6-INT-03 | PASS | CSV data: product detail 200 (randomProduct works) |
| 5 | K6-INT-04 | PASS | Profile loaded: threshold p(95)<500 from smoke.json |
| 5 | K6-INT-05 | PASS | CSV missing: clear 'no such file' error |

**Total: 23 | Pass: 21 | Fail: 0 | Skip: 2**

---

## 5. CI 流水线详情

**Workflow:** `performance-ci.yml`
**Run ID:** 23992786381
**Trigger:** push to main

### Job 结果

| Job | 状态 | 耗时 | 时间 |
|-----|------|------|------|
| lint | SUCCESS | 13s | 02:46:07 → 02:46:20 |
| unit-test | SUCCESS | 31s | 02:46:24 → 02:46:55 |
| jmeter-smoke-test | SUCCESS | 1m49s | 02:46:58 → 02:48:47 |
| smoke-test (k6) | SUCCESS | 1m20s | 02:46:58 → 02:48:18 |

### CI unit-test 结果

```
Test Suites: 14 passed, 14 total
Tests:       95 passed, 95 total
Time:        11.932 s
```

### CI k6 smoke 结果

```
█ THRESHOLDS 

  http_req_duration
  ✓ 'p(95)<500' p(95)=1.72ms

  http_req_failed
  ✓ 'rate<0.01' rate=0.00%

█ TOTAL RESULTS 

  checks_total.......: 1200    19.934501/s
  checks_succeeded...: 100.00% 1200 out of 1200
  checks_failed......: 0.00%   0 out of 1200

  ✓ health status 200
  ✓ health duration < 200ms
  ✓ products status 200
  ✓ product status 200

  HTTP
  http_req_duration..: avg=873.21µs min=286.53µs med=699.26µs max=21.93ms p(90)=1.41ms p(95)=1.72ms
  http_req_failed....: 0.00%  0 out of 900
  http_reqs..........: 900    14.950876/s

  EXECUTION
  iterations.........: 300    4.983625/s
  vus................: 5      min=5  max=5
```

### CI JMeter smoke 结果

CI JMeter smoke gate 通过 (error rate < 1%)。

---

## 6. Lint 详情

```
$ npx eslint .
(no output — 0 errors, 0 warnings)
```

---

## 7. 未覆盖项

| 项 | 原因 | 处理方式 |
|----|------|---------|
| SOAK-TC-04 (Grafana 面板) | 需 Docker + 长时间 soak 运行 | 手动验证 |
| SOAK-TC-05 (告警规则) | 需 Grafana alert rule 触发 | 手动验证 |
| cluster.js (0% coverage) | 多进程 fork 逻辑，Jest 无法测试 | 集成测试 CLU-01~03 覆盖 |
| P2 CI 报红验证 | 待执行 | 下一步 |
| P2 CI workaround 复验 | 待执行 | 下一步 |

---

## 8. 环境信息

| 项 | 值 |
|----|-----|
| OS | macOS Darwin 25.3.0 |
| Node.js | 本地运行 |
| CI Runner | ubuntu-latest (GitHub Actions) |
| Jest | ^29.7.0 |
| k6 | ≥ 0.50 |
| JMeter | ≥ 5.6 |
