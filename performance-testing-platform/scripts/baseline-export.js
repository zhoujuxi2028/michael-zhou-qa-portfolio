/**
 * Export k6 smoke test results to baseline.json
 * Reads k6 summary.json and extracts p95, error_rate, throughput
 * Usage: node scripts/baseline-export.js [summary.json] [output.json]
 */
const fs = require('fs');
const path = require('path');
const { saveBaseline } = require('../src/utils/baseline');

const summaryFile = process.argv[2] || 'summary.json';
const outputFile = process.argv[3] || 'reports/baseline.json';

try {
  if (!fs.existsSync(summaryFile)) {
    console.warn(`⚠️  summary.json not found at ${summaryFile}, using placeholder baseline`);
    const placeholder = {
      p95_ms: 500,
      error_rate: 0.01,
      throughput_rps: 50,
      run_id: 'placeholder',
      timestamp: new Date().toISOString(),
    };
    saveBaseline(placeholder, outputFile);
    console.log(`✅ Placeholder baseline written to ${outputFile}`);
    process.exit(0);
  }

  const summary = JSON.parse(fs.readFileSync(summaryFile, 'utf-8'));

  // Extract k6 metrics
  const metrics = summary.metrics || {};
  const duration = metrics.http_req_duration?.values || {};
  const p95 = duration.p('0.95') || duration['p(95)'] || 500;

  const checks = summary.checks || [];
  const totalChecks = checks.length;
  const failedChecks = checks.filter(c => !c.passes).length;
  const errorRate = totalChecks > 0 ? failedChecks / totalChecks : 0.01;

  const http_reqs = metrics.http_reqs?.value || 0;
  const testDuration = (summary.state?.testRunDurationMs || 60000) / 1000; // seconds
  const throughput_rps = testDuration > 0 ? http_reqs / testDuration : 50;

  const baseline = {
    p95_ms: Math.round(p95),
    error_rate: Math.round(errorRate * 1000) / 1000,
    throughput_rps: Math.round(throughput_rps * 10) / 10,
    run_id: process.env.GITHUB_SHA || 'local',
    timestamp: new Date().toISOString(),
  };

  saveBaseline(baseline, outputFile);
  console.log(`✅ Baseline exported to ${outputFile}:`, baseline);
} catch (e) {
  console.error(`❌ Error exporting baseline: ${e.message}`);
  process.exit(1);
}
