# RTM — JMeter Requirements Traceability Matrix

**Purpose:** 确保实施计划的每个需求都有对应的测试用例，且每个测试用例都在 Phase 4 中被验证。

---

## 需求 → 设计 → 测试用例 → Phase 4 验证

| 需求 (Implementation Plan) | 设计文件 | 测试用例 ID | Phase 4 验证项 | 状态 |
|---------------------------|----------|------------|---------------|------|
| **J1: Smoke Test Plan** | smoke.jmx + smoke.properties | JM-SMOKE-01~04 | 运行 `npm run jmeter:smoke`，检查 HTML 报告 | PASS |
| **J2: Load Test Plan** | load.jmx + load.properties | JM-LOAD-01~03 | 运行 `npm run jmeter:load`，检查 HTML 报告 | PASS |
| **J3: Stress Test Plan** | stress.jmx + stress.properties | JM-STRESS-01~03 | 运行 `npm run jmeter:stress`，检查 HTML 报告 | PASS |
| **J4: Spike Test Plan** | spike.jmx + spike.properties | JM-SPIKE-01~03 | 运行 `npm run jmeter:spike`，检查 HTML 报告 | PASS |
| **J5: HTML Report** | — | JM-RPT-01~03 | 每个报告含 index.html + Summary + 图表 | PASS |
| **J5: Grafana Dashboard** | jmeter-results.json | JM-GRF-01~04 | Docker 环境下验证面板渲染 | SKIP (需 Docker) |
| **J6: npm Scripts** | package.json | — | 4 个 `jmeter:*` script 均可运行 | PASS |
| **J7: CI Pipeline** | performance-ci.yml | JM-CI-01~03 | CI 全部 job 通过 | PENDING |

## 测试用例 → 验收标准 → 实际结果

### J1 Smoke

| 用例 ID | 验收标准 | 实际结果 |
|---------|---------|---------|
| JM-SMOKE-01 | GET /health 返回 200 | PASS, 0 errors |
| JM-SMOKE-02 | GET /api/products 返回 200 | PASS |
| JM-SMOKE-03 | GET /api/products/1 返回 200 | PASS |
| JM-SMOKE-04 | error rate < 1%, HTML 报告可读 | PASS, 0%, 90 samples |

### J2 Load

| 用例 ID | 验收标准 | 实际结果 |
|---------|---------|---------|
| JM-LOAD-01 | 混合流量 50 threads 运行 5m | PASS, 2074 samples, 4m |
| JM-LOAD-02 | 吞吐量 > 10 req/s | **FAIL**: 8.6 req/s (think time 1000ms 限制) |
| JM-LOAD-03 | error rate < 1% | PASS, 0% (修复 product_id 后) |

### J3 Stress

| 用例 ID | 验收标准 | 实际结果 |
|---------|---------|---------|
| JM-STRESS-01 | 200 threads 运行 3.5m | PASS, 29095 samples |
| JM-STRESS-02 | error rate < 5% | PASS, 0% |
| JM-STRESS-03 | 记录性能拐点 | PASS, max 165ms, 无降级 |

### J4 Spike

| 用例 ID | 验收标准 | 实际结果 |
|---------|---------|---------|
| JM-SPIKE-01 | 5→100 threads 突增 | PASS, 3240 samples |
| JM-SPIKE-02 | error rate < 10% | PASS, 0% |
| JM-SPIKE-03 | 恢复到基线 | PASS, spike 后 Active 降至 5 |

### J5 HTML Reports

| 用例 ID | 验收标准 | 实际结果 |
|---------|---------|---------|
| JM-RPT-01 | 每个报告含 index.html | PASS, 4 个报告均生成 |
| JM-RPT-02 | 报告含 Summary 统计 | PASS |
| JM-RPT-03 | 报告含 Response Time 图表 | PASS |

### J5 Grafana (Docker 环境)

| 用例 ID | 验收标准 | 实际结果 |
|---------|---------|---------|
| JM-GRF-01~04 | Dashboard JSON 存在 + 面板配置正确 | SKIP (需 Docker + InfluxDB 环境) |

### J6 npm Scripts

| 验证项 | 实际结果 |
|--------|---------|
| `npm run jmeter:smoke` | PASS |
| `npm run jmeter:load` | PASS |
| `npm run jmeter:stress` | PASS |
| `npm run jmeter:spike` | PASS |

### J7 CI Pipeline

| 用例 ID | 验收标准 | 实际结果 |
|---------|---------|---------|
| JM-CI-01 | JMeter smoke job 成功 | PENDING (修复提交后确认) |
| JM-CI-02 | 错误率 > 1% 时 CI 失败 | 已有逻辑，设计阶段验证 |
| JM-CI-03 | .jtl 上传为 artifact | 已有逻辑 |

---

## 发现的缺陷

| # | 发现阶段 | 缺陷 | 影响 | Issue | 状态 |
|---|---------|------|------|-------|------|
| 1 | Phase 4 | smoke.properties 参数过小 (threads=2, duration=30) | 报告数据不足 | #45 | Fixed |
| 2 | Phase 4 | 设计文档指定 smoke 参数过小 | #45 根因 | #47 | Open |
| 3 | Phase 4 | load/stress/spike 未纳入验收 checklist | 遗漏 3 个级别验证 | #48 | Fixed |
| 4 | Phase 4 | load.jmx + stress.jmx: productId → product_id | load test 32.5% 错误率 | TBD | Fixed |
| 5 | Phase 4 | JM-LOAD-02: 吞吐量 8.6/s < 10 req/s 阈值 | 与 think time 配置相关 | TBD | Open |
