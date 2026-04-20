# Phase 7 Stage 4 验收清单

**日期:** _(待填写，执行验收时更新)_
**分支:** `feature/performance-testing`
**版本:** Phase 7 Stage 4

---

## 📋 相关文档导航

| 文档 | 用途 | 位置 |
|------|------|------|
| **测试计划** | 进入/退出标准、SLA 定义 | [`docs/qa/test-plan.md`](test-plan.md) |
| **Phase 7 用例** | CI/CD + 可观测性详细用例 | [`docs/qa/test-cases/phase7-cicd.md`](test-cases/phase7-cicd.md) |
| **设计文档汇总** | 架构设计 + 实现路线图 | [`docs/design/phase7/`](../design/phase7/) |
| **集成测试设计** | integration-test-phase7-soak.sh 架构设计 | [`docs/design/integration-test-design.md`](../design/integration-test-design.md) |

---

## 进入标准检查 (Entry Criteria)

> 参照 `test-plan.md §7.3`

| 检查项 | 验证命令 | 状态 |
|--------|---------|------|
| 单元测试全部通过 (≥217) | `npm test` | ⬜ |
| 代码覆盖率达标 (stmt≥80 / branch≥70 / func≥80 / line≥80) | `npm test -- --coverage` | ⬜ |
| k6 smoke 无报错 | `npm run k6:smoke` | ⬜ |
| ESLint 0 errors | `npx eslint .` | ⬜ |
| Prettier 格式一致 | `npm run format:check` | ⬜ |
| 环境检测通过（Docker daemon 运行中） | `bash scripts/preflight-check.sh --stage4` | ⬜ |

---

## 第1轮：单元测试 + 覆盖率（~5 min）

### 基线回归单元测试 (`UT-BL-01~06`)

| 用例 ID | 验证项 | 执行命令 | 预期 | 状态 |
|---------|-------|---------|------|------|
| UT-BL-01 | p95 偏差 < 20% → pass | `npm test -- baseline` | PASS | ⬜ |
| UT-BL-02 | p95 退化 > 20% → warning | `npm test -- baseline` | WARNING | ⬜ |
| UT-BL-03 | p95 退化 > 50% → fail | `npm test -- baseline` | FAIL | ⬜ |
| UT-BL-04 | 首次运行无 baseline | `npm test -- baseline` | PASS (首次建基线) | ⬜ |
| UT-BL-05 | baseline JSON 格式异常 | `npm test -- baseline` | 报错提示，不 crash | ⬜ |
| UT-BL-06 | 趋势数据追加 | `npm test -- baseline` | trend.json 新增一行 | ⬜ |

### k6 脚本能力单元测试 (`K6-CLASS-01~02`, `K6-FUNNEL-01~03`)

| 用例 ID | 验证项 | 执行命令 | 预期 | 状态 |
|---------|-------|---------|------|------|
| K6-CLASS-01 | breakpoint graceful 分类 | `npm test -- breakpoint-classification` | 7/7 PASS | ⬜ |
| K6-CLASS-02 | breakpoint catastrophic 分类 | `npm test -- breakpoint-classification` | 7/7 PASS | ⬜ |
| K6-FUNNEL-01~03 | stress/capacity/soak funnel 迁移 | `npm test -- funnel` | PASS | ⬜ |

### 业务指标单元测试 (`BM-UT-01~06`)

| 用例 ID | 验证项 | 执行命令 | 预期 | 状态 |
|---------|-------|---------|------|------|
| BM-UT-01~06 | 业务指标计数/计算/重置 | `npm test -- metrics` | 6/6 PASS | ⬜ |

### 覆盖率门禁 (`CI-COV-01~04`)

| 用例 ID | 验证项 | 执行命令 | 预期 | 状态 |
|---------|-------|---------|------|------|
| CI-COV-01 | 覆盖率报告生成 | `npm test -- --coverage` | `coverage/` 目录生成 | ⬜ |
| CI-COV-02 | statements ≥ 80% | `npm test -- --coverage` | CI PASS | ⬜ |
| CI-COV-03 | statements < 80% 时 CI FAIL | (故意删减测试验证) | CI FAIL | ⬜ |
| CI-COV-04 | coverage artifact 可下载 | GitHub Actions 检查 | Artifacts 存在 | ⬜ |

---

## 第2轮：基线建立（~2 min）

### k6 Smoke Gate + Baseline 导出 (`CI-BL-01~04`)

| 用例 ID | 验证项 | 执行命令 | 预期 | 状态 |
|---------|-------|---------|------|------|
| CI-BL-01 | smoke gate 后存储 baseline artifact | `npm run k6:smoke` | `reports/baseline.json` 生成，含 p95/error_rate/throughput | ⬜ |
| CI-BL-02 | 下次 CI 对比上次 baseline | CI baseline-compare job | 对比结果输出到 CI log | ⬜ |
| CI-BL-03 | p95 退化 > 50% 时 CI fail | (人工修改 baseline.json 验证) | job 失败 | ⬜ |
| CI-BL-04 | 首次运行无 baseline 正常通过 | CI 首次运行 | 不报错，存储当前为基线 | ⬜ |

验证命令：
```bash
npm run k6:smoke
# 验证 baseline.json 已生成
cat reports/baseline.json
```

---

## 第3轮：趋势报告（~1 min）

### 趋势数据收集 (`TREND-01~03`)

| 用例 ID | 验证项 | 执行命令 | 预期 | 状态 |
|---------|-------|---------|------|------|
| TREND-01 | 生成趋势报告 | `node scripts/trend-collect.js` | `reports/trend.json` 包含最近 N 次指标 | ⬜ |
| TREND-02 | 趋势数据累积 | 连续运行 2 次 | JSON 数组长度递增 | ⬜ |
| TREND-03 | 空 trend.json 不 crash | 首次运行 | 输出 "No trend data" | ⬜ |

---

## 第4轮：完整性能测试套件（~30 min）

> **SLA 标准:** p95 < 500ms，error rate < 1%

### 标准负载场景

| 场景 | 命令 | SLA 标准 | 状态 |
|------|------|---------|------|
| k6 Load | `npm run k6:load` | p95 < 500ms, error < 1% | ⬜ |
| k6 Stress | `npm run k6:stress` | p95 < 500ms (渐进式压力) | ⬜ |
| k6 Spike | `npm run k6:spike` | 突发后恢复到正常水位 | ⬜ |
| JMeter Smoke | `npm run jmeter:smoke` | error < 1% | ⬜ |
| JMeter Dry-run | `npm run jmeter:dryrun` | 0 errors，字段名/状态码正确 | ⬜ |

### Breakpoint 崩溃测试 (`ENT-BREAKPOINT-01~02`)

| 用例 ID | 验证项 | 命令 | 预期 | 状态 |
|---------|-------|------|------|------|
| ENT-BREAKPOINT-01 | 输出崩溃点 VU 数 | `npm run k6:breakpoint` | 输出含 "Breaking Point: XXX VUs" | ⬜ |
| ENT-BREAKPOINT-02 | Crash 分类输出 | `npm run k6:breakpoint` | 输出含 "Crash Classification: graceful/catastrophic" | ⬜ |

```bash
# 验证脚本
npm run k6:breakpoint 2>&1 | grep -q "Breaking Point" && echo "✅ ENT-BREAKPOINT-01 PASS"
npm run k6:breakpoint 2>&1 | grep -q "Crash Classification:" && echo "✅ ENT-BREAKPOINT-02 PASS"
```

### Rate Limit 验收

| 验证项 | 命令 | 预期 | 状态 |
|-------|------|------|------|
| 限流测试（429 / 恢复行为） | `RATE_LIMIT_ENABLED=true npm run start:single && npm run k6:rate-limit` | 429 → 窗口期后 200 | ⬜ |

---

## 第5轮：Grafana 集成 + Soak 验收（Docker，~10 min）

### Grafana Soak 集成测试 (`K6-SOAK-INT-01~02`)

> **执行方式:** `bash scripts/integration-test-phase7-soak.sh`
> **依赖:** Docker daemon 运行中
> **设计文档:** [`integration-test-design.md §3.5.2`](../design/integration-test-design.md)

| 用例 ID | 验证项 | 预期 | 状态 |
|---------|-------|------|------|
| K6-SOAK-INT-01 | k6 soak → InfluxDB 数据流 | ✓ InfluxDB metric count 增长 ✓ soak_heap_used_mb 存在 | ⬜ |
| K6-SOAK-INT-02 | Grafana 告警规则配置 | ✓ Grafana API 可达 ✓ 告警资产存在 ✓ soak-results dashboard 可查询 | ⬜ |

```bash
bash scripts/integration-test-phase7-soak.sh
```

### Grafana 面板手工验证 (`GRF-ERR-01`, `GRF-HEAT-01`, `GRF-CUSTOM-01`)

> 需要 Docker 环境，浏览器访问 `http://localhost:3010`

| 用例 ID | 面板 | 验证方式 | 状态 |
|---------|-----|---------|------|
| GRF-ERR-01 | 错误分布面板 | 按 endpoint 分组，颜色正确 | ⬜ |
| GRF-HEAT-01 | 延迟热力图 | heatmap panel 有数据 | ⬜ |
| GRF-CUSTOM-01 | 自定义指标（heap/event_loop/order_success） | 3 个时序图均有数据 | ⬜ |

### 短时 Soak 验收 (`SOAK-TC-01`)

| 用例 ID | 验证项 | 命令 | 预期 | 状态 |
|---------|-------|------|------|------|
| SOAK-TC-01 | 10 分钟 heap 增长 < 50% | `npm run k6:soak:short` | heap 增长率 < 50% | ⬜ |

---

## 第6轮：CI Workflow 验收（~2 min）

### 定时调度配置验证 (`SCHED-01~04`)

| 用例 ID | 验证项 | 命令 | 预期 | 状态 |
|---------|-------|------|------|------|
| SCHED-01 | cron workflow 语法正确 | `npx actionlint .github/workflows/performance-ci.yml` | 0 errors | ⬜ |
| SCHED-02 | nightly soak-short 配置 | 检查 workflow cron 表达式 | cron: 每天 03:00 UTC | ⬜ |
| SCHED-03 | weekly capacity 配置 | 检查 workflow cron 表达式 | cron: 每周日 06:00 UTC | ⬜ |
| SCHED-04 | artifact 归档保留 30 天 | 检查 workflow retention-days | retention-days: 30 | ⬜ |

---

## CI 流水线验收

| 检查项 | 验证方式 | 预期 | 状态 |
|-------|---------|------|------|
| CI 全部 job 绿灯 | push → GitHub Actions | lint + unit-test + k6 + jmeter + baseline + trend 全绿 | ⬜ |
| 故意失败验证（CI 报红验证） | 临时删一行断言，push | CI 正确报红 | ⬜ |
| 无 `continue-on-error` workaround | `grep -r "continue-on-error" .github/workflows/` | 0 matches | ⬜ |

---

## 执行摘要验收

| 验证项 | 命令 | 预期 | 状态 |
|-------|------|------|------|
| 生成执行摘要报告 | `npm run generate-summary` | `reports/k6-summary.md` 生成 | ⬜ |
| 摘要包含 p95/error_rate/throughput | `cat reports/k6-summary.md` | 指标值存在 | ⬜ |

---

## 评审检查清单 (Exit Criteria)

| 项目 | 通过标准 | 状态 |
|------|---------|------|
| 第1轮（单元 + 覆盖率）全部 PASS | `npm test` 输出 ≥217/217 PASS，coverage ≥80% | ⬜ |
| k6 smoke / load / stress / spike 通过 SLA | p95 < 500ms，error < 1% | ⬜ |
| JMeter smoke + dry-run 通过 | 0 errors | ⬜ |
| Breakpoint 输出崩溃点 + 分类 | ENT-BREAKPOINT-01/02 验证通过 | ⬜ |
| Grafana Soak 集成测试 2/2 PASS | K6-SOAK-INT-01/02 通过 | ⬜ |
| baseline.json 生成并上传 CI | CI artifact 可下载 | ⬜ |
| trend.json 追加机制正常 | TREND-01~03 通过 | ⬜ |
| CI 全部 job 绿灯 | GitHub Actions 6 jobs 全绿 | ⬜ |
| 无 P0/P1 级别未修复 Bug | Bug 列表清零或降级为 P2 | ⬜ |
| 测试报告已归档 | `reports/` + `coverage/` 目录完整 | ⬜ |

---

## 风险评估

> 参照 `docs/project-management/risks.md`，记录 Stage 4 新发现的风险。

| 风险 ID | 风险描述 | 影响 | 缓解措施 | 状态 |
|---------|---------|------|---------|------|
| R-19 | CI 集成待定（Phase 6 遗留） | JM-GRF-01~04 可能 SKIP | Phase 7 处理 | ⏳ |
| R-21 | breakpoint abort 行为未充分验证 | 极端负载可能影响后续测试 | maxDuration 安全阀 + 独立执行 | ⏳ |
| _(Stage 4 新发现)_ | | | | |

---

## 最终验收结论

> _(待执行验收后填写)_

```
✅/❌ 单元测试:       ___/217 PASS
✅/❌ 集成测试:       ___/60 PASS
✅/❌ 性能测试:       k6 smoke/load/stress/spike/soak ___
✅/❌ Grafana 集成:   K6-SOAK-INT-01/02 ___
✅/❌ CI 流水线:      ___
✅/❌ Lint:           ___
✅/❌ 覆盖率:         stmt ___% / branch ___% / func ___% / line ___%
```

**Stage 4 Status: ⬜ PENDING**
**Ready for Stage 5: 收尾（PR + 文档同步）**
