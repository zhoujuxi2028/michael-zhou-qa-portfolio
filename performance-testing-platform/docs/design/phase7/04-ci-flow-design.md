# CI 流程设计

## Baseline Artifact 生成

**触发点**: k6 smoke test gate 完成后

| Job | 输入 | 输出 | 保留 |
|-----|------|------|------|
| `smoke-gate` (existing) | lint → unit → k6 smoke | `reports/baseline.json` + k6 summary | CI artifact (7 days) |
| `baseline-compare` (new) | 当前 + 上次 artifact | `reports/baseline-diff.json` | 显示在 PR comment |
| `trend-collect` (new) | baseline.json | append 到 `reports/trend.json` | 永久保留 |

**baseline.json 时机**: smoke gate 后，立即导出 (已在 Phase 7 k6 改动中集成)

---

## 基线对比逻辑

**触发条件**: 存在上次 CI artifact 时，创建对比

**退化判定**:
```
prev_p95 = 上次 p95_ms
curr_p95 = 当前 p95_ms
regression = (curr_p95 - prev_p95) / prev_p95

| 范围 | 动作 | 处理 |
|------|------|------|
| ≤ +20% | ✅ PASS | 质量门通过 |
| +20% ~ +50% | ⚠️ WARNING | 在 PR comment 与 CI log 中显式标记，需人工复核 |
| > +50% | ❌ FAIL | 质量门失败，阻塞合并 |
```

**对标字段**:
- `p95_ms` (主要)
- `error_rate` (辅助，>2x warning)
- `throughput_rps` (可选)

---

## 趋势数据收集

**格式**: `reports/trend.json` (数组)

```json
[
  { "run": 1, "date": "2026-04-17T12:00Z", "p95_ms": 420, "error_rate": 0.003 },
  { "run": 2, "date": "2026-04-17T12:30Z", "p95_ms": 425, "error_rate": 0.004 },
  ...
]
```

**策略**: 每次 smoke gate 后，append 新行，按时间戳过滤保留最近 **90 天**数据。每条 entry 必须包含 `date` 字段（ISO 8601），超过 90 天的条目在下次 append 时自动清理。

> **权威来源**: 保留策略统一为 90 天，详见 `01-baseline-schema.md`。

---

## 覆盖率门禁

**工具**: Jest coverage / Istanbul

| 指标 | 阈值 | 不达标 |
|------|------|--------|
| statements | ≥ 80% | ❌ FAIL |
| branches | ≥ 70% | ❌ FAIL |
| functions | ≥ 80% | ❌ FAIL |
| lines | ≥ 80% | ❌ FAIL |

**触发**: 单元测试完成后（`npm test` 阶段）

**门禁策略**: 任一指标低于阈值即 fail，阻塞合并。

---

## Workflow 结构 (performance-ci.yml)

```yaml
jobs:
  lint:
    - npx eslint src/ tests/unit/ --ext .js
    - npx prettier --check 'src/**/*.js' 'tests/unit/**/*.js'

  unit-test:
    - npx jest tests/unit/ --coverage --coverageReporters=text --coverageReporters=lcov

  smoke-test:
    - k6 run tests/performance/smoke.k6.js
    - export baseline.json

  jmeter-smoke-test:
    - jmeter -n -t tests/jmeter/smoke.jmx ...
    - check error rate + p95 latency

  baseline-compare:  # 独立 job，smoke-test 后执行
    - download previous baseline artifact
    - compare baseline (regression detection)

  trend-collect:  # 独立 job，smoke-test 后执行
    - append to trend.json (保留最近 90 天)
```

**当前实现**: 见根目录 `.github/workflows/performance-ci.yml`  
**Phase 7 目标**: 在现有 4 个 job 基础上补独立的 baseline-compare / trend-collect job（从 smoke-test 中分离，保持关注点分离），不改变 fail-fast 原则。

**Artifact 保留**: 7 天（baseline / coverage）；定时调度 artifact 另按 30 天设计

---

## 文件位置

- 对比逻辑: `src/ci/baseline-compare.js` (utility)
- 趋势收集: `src/ci/trend-collect.js` (utility)
- Workflow: `.github/workflows/performance-ci.yml`
