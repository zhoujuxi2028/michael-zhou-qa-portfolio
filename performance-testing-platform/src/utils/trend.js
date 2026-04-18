/**
 * Trend reporting and visualization utilities
 */
const fs = require('fs');
const path = require('path');

/**
 * Generate Markdown trend report from trend.json
 * @param {string} trendFilePath - Path to trend.json
 * @param {string} reportFilePath - Path to output trend.md
 */
function generateTrendMarkdown(trendFilePath, reportFilePath) {
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
};
