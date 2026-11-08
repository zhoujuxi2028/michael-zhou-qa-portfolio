/**
 * Baseline comparison and regression detection tests
 * TDD: Write tests first, implement after
 */
const fs = require('fs');
const path = require('path');
const {
  compareWithBaseline,
  appendTrend,
  loadBaseline,
  saveBaseline,
} = require('../../../src/utils/baseline');

describe('baseline regression detection', () => {
  const testDir = path.join(__dirname, '../../fixtures/baseline');
  const baselineFile = path.join(testDir, 'baseline.json');
  const trendFile = path.join(testDir, 'trend.json');

  beforeAll(() => {
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(baselineFile)) fs.unlinkSync(baselineFile);
    if (fs.existsSync(trendFile)) fs.unlinkSync(trendFile);
  });

  // UT-BL-01: p95 偏差 < 20% → PASS
  test('UT-BL-01: p95 within 20% deviation should return PASS', () => {
    const previous = { p95_ms: 420 };
    const current = { p95_ms: 450 };
    const result = compareWithBaseline(current, previous);
    expect(result.status).toBe('PASS');
    expect(result.delta).toBeLessThanOrEqual(0.2);
  });

  // UT-BL-02: p95 退化 20-50% → WARNING
  test('UT-BL-02: p95 degradation 20-50% should return WARNING', () => {
    const previous = { p95_ms: 400 };
    const current = { p95_ms: 550 };
    const result = compareWithBaseline(current, previous);
    expect(result.status).toBe('WARNING');
    expect(result.delta).toBeGreaterThan(0.2);
    expect(result.delta).toBeLessThanOrEqual(0.5);
  });

  // UT-BL-03: p95 退化 > 50% → FAIL
  test('UT-BL-03: p95 degradation >50% should return FAIL', () => {
    const previous = { p95_ms: 320 };
    const current = { p95_ms: 510 };
    const result = compareWithBaseline(current, previous);
    expect(result.status).toBe('FAIL');
    expect(result.delta).toBeGreaterThan(0.5);
  });

  // UT-BL-04: 首次运行（无baseline） → BASELINE_SET
  test('UT-BL-04: first run with no baseline should return BASELINE_SET', () => {
    const current = { p95_ms: 420, error_rate: 0.003 };
    const result = compareWithBaseline(current, null);
    expect(result.status).toBe('BASELINE_SET');
  });

  // UT-BL-05: JSON 格式异常 → 错误提示，不crash
  test('UT-BL-05: malformed JSON should throw error with clear message', () => {
    const malformedBaseline = { p95_ms: 'invalid' }; // invalid type
    const current = { p95_ms: 420 };
    expect(() => compareWithBaseline(current, malformedBaseline)).toThrow(
      /baseline|format|invalid/i
    );
  });

  // UT-BL-07: 负数基线 → 错误提示（对应 baseline.js 里 p95_ms < 0 的防御分支）
  test('UT-BL-07: negative baseline p95_ms should throw error', () => {
    const previousNegative = { p95_ms: -10 };
    const current = { p95_ms: 420 };
    expect(() => compareWithBaseline(current, previousNegative)).toThrow(
      /baseline|positive|invalid/i
    );
  });

  // UT-BL-07b: 负数当前指标也应抛错（对称性保护）
  test('UT-BL-07b: negative current p95_ms should throw error', () => {
    const previous = { p95_ms: 420 };
    const currentNegative = { p95_ms: -1 };
    expect(() => compareWithBaseline(currentNegative, previous)).toThrow(
      /current|positive|invalid/i
    );
  });

  // UT-BL-06: 趋势数据追加（保留历史）
  test('UT-BL-06: appendTrend should append entry and keep history', () => {
    const entry1 = { run: 1, p95_ms: 420, error_rate: 0.003 };
    const entry2 = { run: 2, p95_ms: 425, error_rate: 0.004 };

    appendTrend(entry1, trendFile);
    appendTrend(entry2, trendFile);

    const data = JSON.parse(fs.readFileSync(trendFile, 'utf-8'));
    expect(data).toHaveLength(2);
    expect(data[0].run).toBe(1);
    expect(data[1].run).toBe(2);
  });

  // 趋势数据保留 90 天（基于时间戳）
  test('appendTrend should retain entries from last 90 days', () => {
    const now = new Date();
    const fiftyDaysAgo = new Date(now.getTime() - 50 * 24 * 60 * 60 * 1000); // 50 天前（在 90 天内）
    const ninetyFiveDaysAgo = new Date(now.getTime() - 95 * 24 * 60 * 60 * 1000); // 95 天前（超过 90 天）

    // 添加超过 90 天的条目（应被过滤）
    appendTrend({ run: 1, date: ninetyFiveDaysAgo.toISOString(), p95_ms: 421 }, trendFile);
    // 添加 90 天内的条目（应保留）
    appendTrend({ run: 2, date: fiftyDaysAgo.toISOString(), p95_ms: 422 }, trendFile);
    // 添加最近的条目（应保留）
    appendTrend({ run: 3, date: now.toISOString(), p95_ms: 423 }, trendFile);

    const data = JSON.parse(fs.readFileSync(trendFile, 'utf-8'));
    // 应该只保留 run 2 和 run 3（run 1 已过期）
    expect(data).toHaveLength(2);
    expect(data[0].run).toBe(2);
    expect(data[1].run).toBe(3);
  });

  // loadBaseline / saveBaseline 互操作性
  test('saveBaseline and loadBaseline should round-trip correctly', () => {
    const baseline = { p95_ms: 420, error_rate: 0.003, run_id: 'abc123' };
    saveBaseline(baseline, baselineFile);
    const loaded = loadBaseline(baselineFile);
    expect(loaded).toEqual(baseline);
  });

  // loadBaseline 不存在时返回 null
  test('loadBaseline should return null if file does not exist', () => {
    const result = loadBaseline(path.join(testDir, 'nonexistent.json'));
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// extractBaselineFromSummary / validateBaseline / buildPlaceholderBaseline
// 纯函数单测：覆盖 k6 summary 字段兼容性、各分支与 schema 校验
// 对应 DEF-011（#230）修复回归
// ---------------------------------------------------------------------------
const {
  extractBaselineFromSummary,
  validateBaseline,
  buildPlaceholderBaseline,
} = require('../../../src/utils/baseline');

describe('extractBaselineFromSummary', () => {
  const fixedNow = new Date('2026-04-27T00:00:00.000Z');

  test('UT-EX-01: 解析 values 形态的 p(95) 字段', () => {
    const baseline = extractBaselineFromSummary(
      {
        metrics: {
          http_req_duration: { values: { 'p(95)': 3.085, avg: 1.43 } },
          http_req_failed: { value: 0 },
          http_reqs: { count: 900, rate: 14.92 },
        },
        state: { testRunDurationMs: 60313 },
      },
      { runId: 'local', now: fixedNow }
    );
    expect(baseline).toEqual({
      p95_ms: 3,
      error_rate: 0,
      throughput_rps: 14.9,
      run_id: 'local',
      timestamp: '2026-04-27T00:00:00.000Z',
    });
  });

  test('UT-EX-02: 解析顶层 p(95) 字段（旧 k6 形态）', () => {
    const baseline = extractBaselineFromSummary(
      {
        metrics: {
          http_req_duration: { 'p(95)': 3.69 },
          http_req_failed: { value: 0 },
          http_reqs: { count: 885 },
        },
        state: { testRunDurationMs: 60100 },
      },
      { runId: 'local', now: fixedNow }
    );
    expect(baseline.p95_ms).toBe(4);
    expect(baseline.throughput_rps).toBe(14.7);
  });

  test('UT-EX-03: 解析 p(0.95) 字段（备选写法）', () => {
    const baseline = extractBaselineFromSummary(
      {
        metrics: {
          http_req_duration: { values: { 'p(0.95)': 12.3 } },
          http_req_failed: { value: 0 },
          http_reqs: { count: 100 },
        },
        state: { testRunDurationMs: 60000 },
      },
      { runId: 'local', now: fixedNow }
    );
    expect(baseline.p95_ms).toBe(12);
  });

  test('UT-EX-04: http_req_failed 缺失时回退到 checks 通过率', () => {
    const baseline = extractBaselineFromSummary(
      {
        metrics: {
          http_req_duration: { values: { 'p(95)': 5 } },
          http_reqs: { count: 200 },
        },
        checks: [{ passes: true }, { passes: true }, { passes: false }, { passes: true }],
        state: { testRunDurationMs: 60000 },
      },
      { runId: 'local', now: fixedNow }
    );
    // 1/4 = 0.25
    expect(baseline.error_rate).toBe(0.25);
  });

  test('UT-EX-05: checks 与 http_req_failed 都缺失时使用兜底 0.01', () => {
    const baseline = extractBaselineFromSummary(
      {
        metrics: {
          http_req_duration: { values: { 'p(95)': 5 } },
          http_reqs: { count: 100 },
        },
        state: { testRunDurationMs: 60000 },
      },
      { runId: 'local', now: fixedNow }
    );
    expect(baseline.error_rate).toBe(0.01);
  });

  test('UT-EX-06: http_reqs / 时长缺失时 throughput 兜底为 50', () => {
    const baseline = extractBaselineFromSummary(
      {
        metrics: {
          http_req_duration: { values: { 'p(95)': 5 } },
          http_req_failed: { value: 0 },
        },
      },
      { runId: 'local', now: fixedNow }
    );
    expect(baseline.throughput_rps).toBe(50);
  });

  test('UT-EX-07: http_reqs.value（备选字段）也能被识别', () => {
    const baseline = extractBaselineFromSummary(
      {
        metrics: {
          http_req_duration: { values: { 'p(95)': 5 } },
          http_req_failed: { value: 0 },
          http_reqs: { value: 600 },
        },
        state: { testRunDurationMs: 60000 },
      },
      { runId: 'local', now: fixedNow }
    );
    expect(baseline.throughput_rps).toBe(10);
  });

  test('UT-EX-08: GITHUB_SHA 存在时 run_id 取 sha', () => {
    const original = process.env.GITHUB_SHA;
    process.env.GITHUB_SHA = 'abcdef1234567890';
    try {
      const baseline = extractBaselineFromSummary(
        {
          metrics: {
            http_req_duration: { values: { 'p(95)': 5 } },
            http_req_failed: { value: 0 },
            http_reqs: { count: 100 },
          },
          state: { testRunDurationMs: 60000 },
        },
        { now: fixedNow }
      );
      expect(baseline.run_id).toBe('abcdef1234567890');
    } finally {
      if (original === undefined) delete process.env.GITHUB_SHA;
      else process.env.GITHUB_SHA = original;
    }
  });

  test('UT-EX-09: summary 非对象时抛错', () => {
    expect(() => extractBaselineFromSummary(null)).toThrow(/Invalid k6 summary/);
    expect(() => extractBaselineFromSummary('not-an-object')).toThrow(/Invalid k6 summary/);
  });
});

describe('validateBaseline', () => {
  const validBaseline = {
    p95_ms: 420,
    error_rate: 0.003,
    throughput_rps: 45.2,
    run_id: 'sha-83b6451d',
    timestamp: '2026-04-17T12:30:00.000Z',
  };

  test('UT-VB-01: 合法 baseline 通过校验', () => {
    expect(validateBaseline(validBaseline)).toBe(true);
  });

  test('UT-VB-02: 非对象抛错', () => {
    expect(() => validateBaseline(null)).toThrow(/must be an object/);
  });

  test('UT-VB-03: 缺字段或类型错误抛错', () => {
    expect(() => validateBaseline({ ...validBaseline, p95_ms: '420' })).toThrow(/p95_ms/);
    expect(() => validateBaseline({ ...validBaseline, run_id: '' })).toThrow(/run_id/);
  });

  test('UT-VB-04: 数值越界抛错', () => {
    expect(() => validateBaseline({ ...validBaseline, p95_ms: -1 })).toThrow(/>= 0/);
    expect(() => validateBaseline({ ...validBaseline, error_rate: 1.5 })).toThrow(/<= 1/);
    expect(() => validateBaseline({ ...validBaseline, throughput_rps: NaN })).toThrow(/finite/);
  });
});

describe('buildPlaceholderBaseline', () => {
  test('UT-PH-01: 默认占位值符合 schema', () => {
    const fixedNow = new Date('2026-04-27T00:00:00.000Z');
    const baseline = buildPlaceholderBaseline({ runId: 'placeholder', now: fixedNow });
    expect(baseline).toEqual({
      p95_ms: 500,
      error_rate: 0.01,
      throughput_rps: 50,
      run_id: 'placeholder',
      timestamp: '2026-04-27T00:00:00.000Z',
    });
    expect(validateBaseline(baseline)).toBe(true);
  });
});
