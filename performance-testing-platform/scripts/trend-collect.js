/**
 * Collect k6 baseline metrics into trend.json
 * Reads reports/baseline.json and appends to reports/trend.json
 * Usage: node scripts/trend-collect.js
 */
const fs = require('fs');
const path = require('path');
const { appendTrend, loadBaseline } = require('../src/utils/baseline');

const baselineFile = 'reports/baseline.json';
const trendFile = 'reports/trend.json';

try {
  const baseline = loadBaseline(baselineFile);
  if (!baseline) {
    console.log('⚠️  No baseline.json found, skipping trend collection');
    process.exit(0);
  }

  // Determine run number from trend file
  let runNumber = 1;
  if (fs.existsSync(trendFile)) {
    const trend = JSON.parse(fs.readFileSync(trendFile, 'utf-8'));
    if (Array.isArray(trend) && trend.length > 0) {
      runNumber = (trend[trend.length - 1].run || 0) + 1;
    }
  }

  const entry = {
    run: runNumber,
    date: new Date().toISOString(),
    p95_ms: baseline.p95_ms,
    error_rate: baseline.error_rate,
    throughput_rps: baseline.throughput_rps,
  };

  appendTrend(entry, trendFile);
  console.log(`✅ Trend entry appended (run ${runNumber}):`, entry);
} catch (e) {
  console.error(`❌ Error collecting trend: ${e.message}`);
  process.exit(1);
}
