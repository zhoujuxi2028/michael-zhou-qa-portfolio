# Baseline JSON Schema 设计

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
| run_id         | string | 40 chars | git sha | GitHub run context      |
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
