/**
 * Compare current baseline with previous baseline
 * Reads reports/baseline.json and downloads previous from artifacts
 * Usage: node scripts/baseline-compare.js [--test-mode]
 *   --test-mode: use built-in fixture data for integration testing
 */
const fs = require('fs');
const { compareWithBaseline, loadBaseline } = require('../src/utils/baseline');

const isTestMode = process.argv.includes('--test-mode');
const baselineFile = 'reports/baseline.json';
const prevBaselineFile = 'reports/baseline.prev.json';

try {
  // --test-mode: 使用内置 fixture 数据进行集成验证
  if (isTestMode) {
    const testCurrent = { p95_ms: 180, error_rate: 0.005, throughput_rps: 500 };
    const testPrevious = { p95_ms: 150, error_rate: 0.003, throughput_rps: 520 };
    const result = compareWithBaseline(testCurrent, testPrevious);

    console.log('\n[Test Mode] Baseline Comparison Result:');
    console.log(`Status: ${result.status}`);
    console.log(`Delta: ${(result.delta * 100).toFixed(1)}%`);
    console.log(`\nMetrics:`);
    console.log(
      `  p95_ms: ${testPrevious.p95_ms}ms → ${testCurrent.p95_ms}ms (${result.delta > 0 ? '+' : ''}${(result.delta * 100).toFixed(1)}%)`
    );
    console.log(
      `  error_rate: ${(testPrevious.error_rate * 100).toFixed(2)}% → ${(testCurrent.error_rate * 100).toFixed(2)}%`
    );

    if (result.status === 'FAIL') {
      console.log('\n❌ Regression DETECTED (test mode)');
    } else if (result.status === 'WARNING') {
      console.log('\n⚠️  Regression WARNING (test mode)');
    } else {
      console.log('\n✅ No Regression detected (test mode)');
    }
    process.exit(0);
  }

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
  console.log(
    `  p95_ms: ${previous.p95_ms}ms → ${current.p95_ms}ms (${result.delta > 0 ? '+' : ''}${(result.delta * 100).toFixed(1)}%)`
  );
  console.log(
    `  error_rate: ${(previous.error_rate * 100).toFixed(2)}% → ${(current.error_rate * 100).toFixed(2)}%`
  );
  console.log(
    `  throughput_rps: ${previous.throughput_rps.toFixed(1)} → ${current.throughput_rps.toFixed(1)}`
  );

  // Gate: fail if FAIL status
  if (result.status === 'FAIL') {
    console.error(
      `\n❌ BASELINE REGRESSION DETECTED: p95 degraded by ${(result.delta * 100).toFixed(1)}% (threshold: 50%)`
    );
    process.exit(1);
  } else if (result.status === 'WARNING') {
    console.warn(
      `\n⚠️  BASELINE WARNING: p95 degraded by ${(result.delta * 100).toFixed(1)}% (threshold: 20%)`
    );
    process.exit(0); // Warning does not block
  } else {
    console.log(`\n✅ Baseline within acceptable range`);
    process.exit(0);
  }
} catch (e) {
  console.error(`❌ Error comparing baseline: ${e.message}`);
  process.exit(1);
}
