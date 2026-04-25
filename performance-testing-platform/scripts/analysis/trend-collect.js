/**
 * Collect k6 baseline metrics into trend.json
 * Reads reports/baseline.json and appends to reports/trend.json
 * Usage: node scripts/analysis/trend-collect.js [--test-mode]
 *   --test-mode: use built-in fixture data for self-verification (symmetric
 *                with baseline-compare.js --test-mode); writes to an isolated
 *                temporary trend.json under the OS tmp dir and does not touch
 *                reports/.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { appendTrend, loadBaseline } = require('../../src/utils/baseline');

const isTestMode = process.argv.includes('--test-mode');
const baselineFile = 'reports/baseline.json';
const trendFile = 'reports/trend.json';

try {
  // --test-mode: 使用内置 fixture 数据进行自检，不依赖真实 artifact/reports
  if (isTestMode) {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'trend-collect-test-'));
    const testTrendFile = path.join(tmpDir, 'trend.json');
    const testEntry = {
      run: 1,
      date: new Date().toISOString(),
      p95_ms: 180,
      error_rate: 0.005,
      throughput_rps: 500,
    };

    appendTrend(testEntry, testTrendFile);

    const written = JSON.parse(fs.readFileSync(testTrendFile, 'utf-8'));
    console.log('\n[Test Mode] Trend Collection Self-Check:');
    console.log(`  Output file: ${testTrendFile}`);
    console.log(`  Entries written: ${written.length}`);
    console.log(`  Latest entry:`, written[written.length - 1]);
    console.log('\n✅ trend-collect self-check passed (test mode)');
    process.exit(0);
  }

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
