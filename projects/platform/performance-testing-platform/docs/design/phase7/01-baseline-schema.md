# Baseline JSON Schema 设计

## Usage（如何使用 `baseline-export`）

把 k6 smoke / load 跑出的 `summary.json` 提炼为一份 baseline.json，用于后续 `baseline-compare` 的回归比对与 `trend-collect` 的长期趋势追踪。

### 命令

```bash
# 默认：从项目根读 summary.json，写到 reports/baseline.json
npm run baseline:export

# 显式指定输入 / 输出
node scripts/analysis/baseline-export.js [summaryFile] [outputFile]

# 例：
node scripts/analysis/baseline-export.js reports/k6-smoke-summary.json reports/baseline.json
```

### 参数

| 参数               | 默认值                  | 说明                                                       |
| ------------------ | ----------------------- | ---------------------------------------------------------- |
| `argv[2]` summaryFile | `summary.json`          | k6 `--summary-export` 产出的 JSON 文件路径                |
| `argv[3]` outputFile  | `reports/baseline.json` | 写出的基线文件路径；不存在的目录会自动 `mkdir -p` 创建    |

### 行为分支

| 场景                                      | 退出码 | 输出与副作用                                                                                   |
| ----------------------------------------- | ------ | ---------------------------------------------------------------------------------------------- |
| summary 文件存在且为合法 JSON             | 0      | 解析后写入 `outputFile`；stdout 打印 baseline                                                  |
| summary 文件**不存在**                    | 0      | 写入 placeholder（`p95_ms=500, error_rate=0.01, throughput_rps=50`）；stderr 提示 placeholder |
| summary **JSON 不合法** / 字段越界        | 1      | stderr `❌ Error exporting baseline: ...`；**不写**输出文件                                    |

### 字段来源（兼容多种 k6 summary 形态）

| 字段             | 提取顺序                                                                                                                                  | 默认值（字段缺失时） |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------- |
| `p95_ms`         | `metrics.http_req_duration.values['p(95)']` → 顶层 `'p(95)'` → `'p(0.95)'`                                                                  | 500                  |
| `error_rate`     | `metrics.http_req_failed.value` → 回退到 `summary.checks` 的失败比例                                                                       | 0.01                 |
| `throughput_rps` | `metrics.http_reqs.count ?? metrics.http_reqs.value` ÷ `state.testRunDurationMs / 1000`                                                     | 50                   |
| `run_id`         | `process.env.GITHUB_SHA` → 本地缺省 `'local'`（summary 缺失走 placeholder 时缺省 `'placeholder'`，但若已设置 `GITHUB_SHA` 仍优先取之） | —                    |
| `timestamp`      | `new Date().toISOString()`                                                                                                                  | —                    |

### 典型工作流

```bash
# 1. 跑 smoke 并产出 summary.json
k6 run --summary-export=reports/k6-smoke-summary.json tests/performance/smoke.k6.js

# 2. 提炼基线
node scripts/analysis/baseline-export.js reports/k6-smoke-summary.json reports/baseline.json

# 3. 与上一次基线对比（独立脚本）
node scripts/analysis/baseline-compare.js

# 4. 追加到长期趋势
npm run trend:collect
```

CI 流水线中的串接顺序见本仓库 `docs/architecture/architecture.md` "回归对比流程"小节。

### 相关代码与测试

| 路径                                                          | 职责                                              |
| ------------------------------------------------------------- | ------------------------------------------------- |
| `scripts/analysis/baseline-export.js`                         | CLI 编排层（参数解析 + 文件 I/O + 终端输出）       |
| `src/utils/baseline.js`                                       | 纯函数：`extractBaselineFromSummary` / `validateBaseline` / `buildPlaceholderBaseline` |
| `tests/unit/utils/baseline.test.js`                           | 解析 / schema 校验各分支的单元测试                 |
| `tests/integration/scripts/baseline-export.integration.test.js` | CLI 行为集成测试（退出码、stderr、placeholder） |

---

## baseline.json 结构

```json
{
  "p95_ms": 420,
  "error_rate": 0.003,
  "throughput_rps": 45.2,
  "run_id": "sha-83b6451d",
  "timestamp": "2026-04-17T12:30:00Z"
}
```

| 字段           | 类型   | 范围     | 单位    | 来源                    |
| -------------- | ------ | -------- | ------- | ----------------------- |
| p95_ms         | number | 0-∞      | 毫秒    | k6 smoke test threshold |
| error_rate     | number | 0-1      | 比例    | k6 summary.checks       |
| throughput_rps | number | 0-∞      | 请求/秒 | k6 summary.rate         |
| run_id         | string | 40 chars | git sha | GitHub run context（CI 取 `GITHUB_SHA`；本地缺省为 `'local'`；summary.json 缺失走 placeholder 时缺省为 `'placeholder'`，若已设置 `GITHUB_SHA` 仍优先取之） |
| timestamp      | string | ISO 8601 | -       | date.now()              |

## trend.json 结构

```json
[
  { "run": 1, "date": "2026-04-17T12:00Z", "p95_ms": 420, "error_rate": 0.003, "throughput_rps": 45.2 },
  { "run": 2, "date": "2026-04-17T12:30Z", "p95_ms": 425, "error_rate": 0.004, "throughput_rps": 45.0 },
  ...
]
```

**追加策略**：CI smoke gate 后，json 格式追加到 `reports/trend.json`，按时间戳过滤保留最近 **90 天**数据（PERF-TREND-RETENTION-001）。每条 entry 必须包含 `date` 字段（ISO 8601），超过 90 天的条目在下次 append 时自动清理。

## 生成触发

| 触发点          | job                    | 条件              | 输出                          |
| --------------- | ---------------------- | ----------------- | ----------------------------- |
| smoke gate 完成 | lint → unit → k6 smoke | 总是              | baseline.json → CI artifact   |
| 基线对比        | (独立 job)             | 存在上次 artifact | baseline-diff.json (对比结果) |
| 趋势收集        | post-smoke             | 总是              | trend.json append             |

## 回归阈值

| 退化程度 | 条件              | 动作                |
| -------- | ----------------- | ------------------- |
| 正常     | p95 同比 ≤ +20%   | ✅ PASS             |
| 警告     | +20% < p95 ≤ +50% | ⚠️ WARNING (非阻塞) |
| 失败     | p95 > +50%        | ❌ FAIL (阻塞合并)  |

## 单元测试示例

```js
// tests/unit/baseline.test.js
describe('baseline regression', () => {
  it('should detect >50% p95 increase', () => {
    const current = { p95_ms: 510 };
    const previous = { p95_ms: 320 };
    expect(calculateRegression(current, previous)).toBe('FAIL');
  });

  it('should handle first run (no baseline)', () => {
    expect(compareWithBaseline(first_run, null)).toBe('BASELINE_SET');
  });
});
```
