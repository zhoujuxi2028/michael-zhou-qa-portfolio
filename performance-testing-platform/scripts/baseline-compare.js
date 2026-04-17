/**
 * Compare current baseline with previous baseline
 * Reads reports/baseline.json and downloads previous from artifacts
 * Usage: node scripts/baseline-compare.js
 */
const fs = require('fs');
const path = require('path');
const { compareWithBaseline, loadBaseline } = require('../src/utils/baseline');

const baselineFile = 'reports/baseline.json';
const prevBaselineFile = 'reports/baseline.prev.json';

try {
  const current = loadBaseline(baselineFile);
  if (!current) {
    console.log('⚠️  No baseline.json found, skipping comparison');
    process.exit(0);
  }

  // Check if previous baseline exists (would be downloaded from CI artifacts)
  if (!fs.existsSync(prevBaselineFile)) {
    console.log('ℹ️  No previous baseline found, skipping comparison');
    process.exit(0);
  }

  const previous = loadBaseline(prevBaselineFile);
  const result = compareWithBaseline(current, previous);

  console.log(`\nBaseline Comparison Result:`);
  console.log(`Status: ${result.status}`);
  console.log(`Delta: ${(result.delta * 100).toFixed(1)}%`);

  // Print detailed metrics
  console.log(`\nMetrics:`);
  console.log(`  p95_ms: ${previous.p95_ms}ms → ${current.p95_ms}ms (${result.delta > 0 ? '+' : ''}${(result.delta * 100).toFixed(1)}%)`);
  console.log(`  error_rate: ${(previous.error_rate * 100).toFixed(2)}% → ${(current.error_rate * 100).toFixed(2)}%`);
  console.log(`  throughput_rps: ${previous.throughput_rps.toFixed(1)} → ${current.throughput_rps.toFixed(1)}`);

  // Gate: fail if FAIL status
  if (result.status === 'FAIL') {
    console.error(`\n❌ BASELINE REGRESSION DETECTED: p95 degraded by ${(result.delta * 100).toFixed(1)}% (threshold: 50%)`);
    process.exit(1);
  } else if (result.status === 'WARNING') {
    console.warn(`\n⚠️  BASELINE WARNING: p95 degraded by ${(result.delta * 100).toFixed(1)}% (threshold: 20%)`);
    process.exit(0); // Warning does not block
  } else {
    console.log(`\n✅ Baseline within acceptable range`);
    process.exit(0);
  }
} catch (e) {
  console.error(`❌ Error comparing baseline: ${e.message}`);
  process.exit(1);
}
