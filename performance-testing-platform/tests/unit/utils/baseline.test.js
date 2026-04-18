/**
 * Baseline comparison and regression detection tests
 * TDD: Write tests first, implement after
 */
const fs = require('fs');
const path = require('path');
const { compareWithBaseline, appendTrend, loadBaseline, saveBaseline } = require('../../../src/utils/baseline');

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
    const fiftyDaysAgo = new Date(now.getTime() - 50 * 24 * 60 * 60 * 1000);  // 50 天前（在 90 天内）
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
