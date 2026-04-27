/**
 * Trend reporting and visualization utilities
 */
const fs = require('fs');
const path = require('path');

/**
 * 检测连续 N 次劣化（PERF-CI-BL-FR-007）
 *
 * 判定规则：取末尾 window+1 条（即 window 个相邻 pair），若每个 pair 的指标
 * 增长率均 > minDeltaPct，则认为已发生「连续 N 次劣化」。
 *
 * @param {Array<object>} trendData - 趋势数据，按时间顺序
 * @param {object} [options]
 * @param {number} [options.window=3] - 连续判定窗口 N
 * @param {string} [options.metric='p95_ms'] - 检测指标
 * @param {number} [options.minDeltaPct=0.05] - 单步劣化阈值（5%）
 * @returns {{degraded: boolean, window: number, metric: string, deltas: number[], totalDeltaPct: number, message: string}}
 */
function detectConsecutiveDegradation(trendData, options = {}) {
  const { window = 3, metric = 'p95_ms', minDeltaPct = 0.05 } = options;
  const data = Array.isArray(trendData) ? trendData : [];

  if (data.length < window + 1) {
    return {
      degraded: false,
      window,
      metric,
      deltas: [],
      totalDeltaPct: 0,
      message: `历史数据不足 ${window + 1} 条，跳过连续劣化判定`,
    };
  }

  const recent = data.slice(-(window + 1));
  const deltas = [];
  let allDegraded = true;

  for (let i = 1; i < recent.length; i++) {
    const prev = recent[i - 1][metric];
    const curr = recent[i][metric];
    if (typeof prev !== 'number' || typeof curr !== 'number' || prev <= 0) {
      allDegraded = false;
      deltas.push(0);
      continue;
    }
    const delta = (curr - prev) / prev;
    deltas.push(delta);
    if (delta <= minDeltaPct) allDegraded = false;
  }

  const first = recent[0][metric];
  const last = recent[recent.length - 1][metric];
  const totalDeltaPct =
    typeof first === 'number' && typeof last === 'number' && first > 0 ? (last - first) / first : 0;

  const message = allDegraded
    ? `⚠️ 连续 ${window} 次劣化告警：${metric} 每步增长均 > ${(minDeltaPct * 100).toFixed(1)}%，累计劣化 ${(totalDeltaPct * 100).toFixed(1)}%`
    : `✅ 未触发连续 ${window} 次劣化（阈值：每步 > ${(minDeltaPct * 100).toFixed(1)}%）`;

  return {
    degraded: allDegraded,
    window,
    metric,
    deltas,
    totalDeltaPct,
    message,
  };
}

/**
 * Generate Markdown trend report from trend.json
 * @param {string} trendFilePath - Path to trend.json
 * @param {string} reportFilePath - Path to output trend.md
 * @param {object} [options]
 * @param {object} [options.degradation] - detectConsecutiveDegradation 结果，若提供则在报告顶部嵌入告警 callout
 */
function generateTrendMarkdown(trendFilePath, reportFilePath, options = {}) {
  // Read trend data
  let trendData = [];
  if (fs.existsSync(trendFilePath)) {
    try {
      trendData = JSON.parse(fs.readFileSync(trendFilePath, 'utf-8'));
      if (!Array.isArray(trendData)) trendData = [];
    } catch (e) {
      trendData = [];
    }
  }

  // Create report directory if needed
  const reportDir = path.dirname(reportFilePath);
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  // Generate Markdown content
  let markdown = '# Performance Trend Report\n\n';

  // 顶部告警 callout（PERF-CI-BL-FR-007）
  if (options.degradation && options.degradation.degraded) {
    markdown += `> ${options.degradation.message}\n\n`;
  }

  if (trendData.length === 0) {
    markdown += 'No trend data available.\n';
  } else {
    markdown += '| run | date | p95_ms | error_rate | throughput_rps |\n';
    markdown += '|-----|------|--------|-----------|----------------|\n';

    for (const entry of trendData) {
      markdown += `| ${entry.run} | ${entry.date} | ${entry.p95_ms} | ${entry.error_rate} | ${entry.throughput_rps} |\n`;
    }
  }

  // Write report
  fs.writeFileSync(reportFilePath, markdown);
}

module.exports = {
  generateTrendMarkdown,
  detectConsecutiveDegradation,
};
