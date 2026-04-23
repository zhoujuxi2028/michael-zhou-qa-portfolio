/**
 * Trend reporting tests
 * TDD: Write tests first, implement after
 */
const fs = require('fs');
const path = require('path');
const { generateTrendMarkdown } = require('../../../src/utils/trend');

describe('trend reporting', () => {
  const testDir = path.join(__dirname, '../../fixtures/trend');
  const trendFile = path.join(testDir, 'trend.json');
  const reportFile = path.join(testDir, 'trend.md');
  const nestedReportDir = path.join(testDir, 'nested', 'reports');
  const nestedReportFile = path.join(nestedReportDir, 'trend.md');

  beforeAll(() => {
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(trendFile)) fs.unlinkSync(trendFile);
    if (fs.existsSync(reportFile)) fs.unlinkSync(reportFile);
    if (fs.existsSync(nestedReportDir)) fs.rmSync(path.join(testDir, 'nested'), { recursive: true, force: true });
  });

  // TREND-01: 生成 reports/trend.md 趋势表
  test('TREND-01: should generate trend.md with recent N runs', () => {
    const trendData = [
      { run: 1, date: '2026-04-17T12:00Z', p95_ms: 420, error_rate: 0.003, throughput_rps: 45.2 },
      { run: 2, date: '2026-04-17T12:30Z', p95_ms: 425, error_rate: 0.004, throughput_rps: 45.0 },
      { run: 3, date: '2026-04-17T13:00Z', p95_ms: 430, error_rate: 0.005, throughput_rps: 44.8 },
    ];
    fs.writeFileSync(trendFile, JSON.stringify(trendData, null, 2));

    generateTrendMarkdown(trendFile, reportFile);

    expect(fs.existsSync(reportFile)).toBe(true);
    const content = fs.readFileSync(reportFile, 'utf-8');
    expect(content).toContain('| run | date | p95_ms | error_rate | throughput_rps |');
    expect(content).toContain('| 1 | 2026-04-17T12:00Z | 420 | 0.003 | 45.2 |');
    expect(content).toContain('| 3 | 2026-04-17T13:00Z | 430 | 0.005 | 44.8 |');
  });

  // TREND-02: trend.json 数组增长
  test('TREND-02: should track JSON array length growth', () => {
    const entry1 = { run: 1, date: '2026-04-17T12:00Z', p95_ms: 420 };
    const entry2 = { run: 2, date: '2026-04-17T12:30Z', p95_ms: 425 };

    fs.writeFileSync(trendFile, JSON.stringify([entry1], null, 2));
    let data = JSON.parse(fs.readFileSync(trendFile, 'utf-8'));
    expect(data).toHaveLength(1);

    // Simulate append
    data.push(entry2);
    fs.writeFileSync(trendFile, JSON.stringify(data, null, 2));
    data = JSON.parse(fs.readFileSync(trendFile, 'utf-8'));
    expect(data).toHaveLength(2);
  });

  // TREND-03: 空数据优雅处理
  test('TREND-03: should handle empty trend.json gracefully', () => {
    fs.writeFileSync(trendFile, JSON.stringify([], null, 2));

    generateTrendMarkdown(trendFile, reportFile);

    expect(fs.existsSync(reportFile)).toBe(true);
    const content = fs.readFileSync(reportFile, 'utf-8');
    expect(content).toContain('No trend data');
  });

  // TREND-04: trend.json 缺失时优雅降级
  test('TREND-04: should handle missing trend.json gracefully', () => {
    generateTrendMarkdown(trendFile, reportFile);

    expect(fs.existsSync(reportFile)).toBe(true);
    const content = fs.readFileSync(reportFile, 'utf-8');
    expect(content).toContain('No trend data');
  });

  // TREND-05: 非数组 JSON 自动降级为空数据
  test('TREND-05: should fallback when trend.json is not an array', () => {
    fs.writeFileSync(trendFile, JSON.stringify({ run: 1, date: '2026-04-17T12:00Z' }, null, 2));

    generateTrendMarkdown(trendFile, reportFile);

    expect(fs.existsSync(reportFile)).toBe(true);
    const content = fs.readFileSync(reportFile, 'utf-8');
    expect(content).toContain('No trend data');
  });

  // TREND-06: 无效 JSON 不应抛错，且自动创建输出目录
  test('TREND-06: should recover from invalid JSON and create nested report directory', () => {
    fs.writeFileSync(trendFile, '{invalid json');

    generateTrendMarkdown(trendFile, nestedReportFile);

    expect(fs.existsSync(nestedReportDir)).toBe(true);
    expect(fs.existsSync(nestedReportFile)).toBe(true);
    const content = fs.readFileSync(nestedReportFile, 'utf-8');
    expect(content).toContain('No trend data');
  });
});
