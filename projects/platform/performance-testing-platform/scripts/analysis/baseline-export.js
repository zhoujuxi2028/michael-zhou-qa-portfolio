/**
 * 导出 k6 smoke 结果到 baseline.json
 * 读取 k6 summary.json，提取 p95、error_rate、throughput
 * Usage: node scripts/analysis/baseline-export.js [summary.json] [output.json]
 *
 * 该脚本只做编排：参数解析 + 文件 I/O + 终端输出。
 * 解析与字段兜底逻辑放在 src/utils/baseline.js（纯函数，便于单测）。
 */
const fs = require('fs');
const {
  saveBaseline,
  validateBaseline,
  extractBaselineFromSummary,
  buildPlaceholderBaseline,
} = require('../../src/utils/baseline');

const summaryFile = process.argv[2] || 'summary.json';
const outputFile = process.argv[3] || 'reports/baseline.json';

try {
  let baseline;
  if (!fs.existsSync(summaryFile)) {
    console.warn(`⚠️  summary.json not found at ${summaryFile}, using placeholder baseline`);
    baseline = buildPlaceholderBaseline();
  } else {
    const summary = JSON.parse(fs.readFileSync(summaryFile, 'utf-8'));
    baseline = extractBaselineFromSummary(summary);
  }

  validateBaseline(baseline);
  saveBaseline(baseline, outputFile);
  console.log(`✅ Baseline exported to ${outputFile}:`, baseline);
} catch (e) {
  console.error(`❌ Error exporting baseline: ${e.message}`);
  process.exit(1);
}
