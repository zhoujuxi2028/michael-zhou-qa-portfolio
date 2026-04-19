/**
 * TREND-INT-01~04: 趋势采集集成测试
 *
 * 验证趋势数据追加、保留策略和 Markdown 报告生成。
 * 跨模块集成：baseline.js (appendTrend) + trend.js (generateTrendMarkdown) + 文件 I/O
 */
const os = require('os');
const fs = require('fs');
const path = require('path');
const { appendTrend } = require('../../../src/utils/baseline');
const { generateTrendMarkdown } = require('../../../src/utils/trend');

describe('趋势采集集成测试 (TREND-INT)', () => {
  const tmpDir = path.join(os.tmpdir(), 'trend-int-test');
  const trendFile = path.join(tmpDir, 'trend.json');
  const reportFile = path.join(tmpDir, 'trend.md');

  beforeEach(() => {
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // TREND-INT-01: 趋势数据追加
  test('TREND-INT-01: 多次追加趋势数据应累积保存', () => {
    // Act
    for (let i = 1; i <= 5; i++) {
      appendTrend(
        {
          run: i,
          date: new Date().toISOString(),
          p95_ms: 100 + i * 10,
          error_rate: 0.005,
          throughput_rps: 50,
        },
        trendFile
      );
    }

    // Assert
    const data = JSON.parse(fs.readFileSync(trendFile, 'utf-8'));
    expect(data).toHaveLength(5);
    expect(data[0].run).toBe(1);
    expect(data[4].run).toBe(5);
    expect(data[4].p95_ms).toBe(150);
  });

  // TREND-INT-02: 90天保留策略清理旧数据
  test('TREND-INT-02: 超过 90 天的趋势数据应被自动清理', () => {
    // Arrange: 添加旧数据（91 天前）
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 91);
    appendTrend(
      { run: 1, date: oldDate.toISOString(), p95_ms: 200, error_rate: 0.01, throughput_rps: 30 },
      trendFile
    );

    // Arrange: 添加新数据
    appendTrend(
      { run: 2, date: new Date().toISOString(), p95_ms: 100, error_rate: 0.005, throughput_rps: 50 },
      trendFile
    );

    // Assert: 旧数据被清理，只保留新数据
    const data = JSON.parse(fs.readFileSync(trendFile, 'utf-8'));
    expect(data).toHaveLength(1);
    expect(data[0].run).toBe(2);
  });

  // TREND-INT-03: 趋势报告 Markdown 生成
  test('TREND-INT-03: 应从趋势数据生成格式正确的 Markdown 报告', () => {
    // Arrange: 准备趋势数据
    for (let i = 1; i <= 3; i++) {
      appendTrend(
        {
          run: i,
          date: `2026-04-${10 + i}`,
          p95_ms: 100 + i * 5,
          error_rate: 0.005,
          throughput_rps: 50,
        },
        trendFile
      );
    }

    // Act: 生成报告
    generateTrendMarkdown(trendFile, reportFile);

    // Assert: 报告文件存在且格式正确
    expect(fs.existsSync(reportFile)).toBe(true);
    const content = fs.readFileSync(reportFile, 'utf-8');
    expect(content).toContain('# Performance Trend Report');
    expect(content).toContain('| run | date | p95_ms | error_rate | throughput_rps |');
    expect(content).toContain('| 1 |');
    expect(content).toContain('| 3 |');
  });

  // TREND-INT-04: 空趋势数据生成报告
  test('TREND-INT-04: 无趋势数据时报告应提示无数据', () => {
    // Act
    generateTrendMarkdown(trendFile, reportFile);

    // Assert
    const content = fs.readFileSync(reportFile, 'utf-8');
    expect(content).toContain('No trend data available');
  });
});
