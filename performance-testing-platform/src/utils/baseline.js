/**
 * Performance baseline regression detection and trend tracking
 */
const fs = require('fs');
const path = require('path');

/**
 * Compare current metrics with previous baseline
 * @param {object} current - Current test metrics { p95_ms, error_rate, throughput_rps }
 * @param {object} previous - Previous baseline metrics (null if first run)
 * @returns {object} { status: 'PASS'|'WARNING'|'FAIL'|'BASELINE_SET', delta: number }
 */
function compareWithBaseline(current, previous) {
  if (!previous) {
    return { status: 'BASELINE_SET', delta: 0 };
  }

  if (typeof previous.p95_ms !== 'number' || previous.p95_ms < 0) {
    throw new Error('Invalid baseline: p95_ms must be a positive number');
  }
  if (typeof current.p95_ms !== 'number' || current.p95_ms < 0) {
    throw new Error('Invalid current metrics: p95_ms must be a positive number');
  }

  const delta = (current.p95_ms - previous.p95_ms) / previous.p95_ms;

  let status = 'PASS';
  if (delta > 0.5) status = 'FAIL';
  else if (delta > 0.2) status = 'WARNING';

  return { status, delta };
}

/**
 * Append entry to trend.json (keep entries from last 90 days)
 * Changed from max 30 rows to 90-day retention policy (PERF-TREND-RETENTION-001)
 * @param {object} entry - Trend entry { run, date, p95_ms, error_rate, ... }
 * @param {string} filePath - Path to trend.json
 * @param {number} retentionDays - Keep entries from last N days (default 90)
 */
function appendTrend(entry, filePath, retentionDays = 90) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  let data = [];
  if (fs.existsSync(filePath)) {
    try {
      data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (!Array.isArray(data)) data = [];
    } catch (e) {
      data = [];
    }
  }

  data.push(entry);

  // Filter entries older than retentionDays
  const now = new Date();
  const cutoffDate = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
  data = data.filter((e) => {
    if (!e.date) return true; // Keep entries without date
    try {
      const entryDate = new Date(e.date);
      return entryDate >= cutoffDate;
    } catch {
      return true; // Keep entries with invalid dates
    }
  });

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/**
 * Load baseline.json
 * @param {string} filePath - Path to baseline.json
 * @returns {object|null} Baseline object or null if not found
 */
function loadBaseline(filePath) {
  if (!fs.existsSync(filePath)) return null;

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (e) {
    return null;
  }
}

/**
 * Save baseline.json
 * @param {object} data - Baseline data
 * @param {string} filePath - Path to baseline.json
 */
function saveBaseline(data, filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/**
 * Baseline schema (见 docs/design/phase7/01-baseline-schema.md)
 *  - p95_ms: number ≥ 0（毫秒）
 *  - error_rate: number ∈ [0, 1]
 *  - throughput_rps: number ≥ 0（请求/秒）
 *  - run_id: string，CI 场景为 git sha；本地默认 'local'
 *  - timestamp: ISO 8601 字符串
 */
const BASELINE_FIELD_SPECS = [
  { key: 'p95_ms', type: 'number', min: 0 },
  { key: 'error_rate', type: 'number', min: 0, max: 1 },
  { key: 'throughput_rps', type: 'number', min: 0 },
  { key: 'run_id', type: 'string', minLength: 1 },
  { key: 'timestamp', type: 'string', minLength: 1 },
];

/**
 * 校验 baseline 对象是否符合 schema
 * @param {object} baseline
 * @throws {Error} 字段缺失 / 类型不符 / 取值越界时抛错
 */
function validateBaseline(baseline) {
  if (!baseline || typeof baseline !== 'object') {
    throw new Error('Invalid baseline: must be an object');
  }
  for (const spec of BASELINE_FIELD_SPECS) {
    const value = baseline[spec.key];
    if (typeof value !== spec.type) {
      throw new Error(`Invalid baseline.${spec.key}: expected ${spec.type}, got ${typeof value}`);
    }
    if (spec.type === 'number') {
      if (!Number.isFinite(value)) {
        throw new Error(`Invalid baseline.${spec.key}: must be a finite number`);
      }
      if (typeof spec.min === 'number' && value < spec.min) {
        throw new Error(`Invalid baseline.${spec.key}: must be >= ${spec.min}`);
      }
      if (typeof spec.max === 'number' && value > spec.max) {
        throw new Error(`Invalid baseline.${spec.key}: must be <= ${spec.max}`);
      }
    }
    if (spec.type === 'string' && spec.minLength && value.length < spec.minLength) {
      throw new Error(`Invalid baseline.${spec.key}: must be a non-empty string`);
    }
  }
  return true;
}

/**
 * 从 k6 summary 对象中提取 baseline 指标（纯函数，便于单测）
 *
 * 兼容多种 k6 summary 形态：
 *   - http_req_duration.values['p(95)'] 或 http_req_duration['p(95)']
 *   - 同时兼容 'p(0.95)' 写法
 *   - http_req_failed.value（新版）或 summary.checks（旧版）
 *   - http_reqs.count / http_reqs.value（吞吐量分子）
 *
 * @param {object} summary - k6 summary.json 解析后的对象
 * @param {object} [opts]
 * @param {string} [opts.runId] - 默认从 GITHUB_SHA 读取，否则 'local'
 * @param {Date}   [opts.now]   - 可注入的当前时间，便于测试
 * @returns {object} baseline 对象
 */
function extractBaselineFromSummary(summary, opts = {}) {
  if (!summary || typeof summary !== 'object') {
    throw new Error('Invalid k6 summary: expected an object');
  }
  const metrics = summary.metrics || {};
  const durationMetric = metrics.http_req_duration || {};
  const duration = durationMetric.values || durationMetric;
  const p95Raw = duration['p(95)'] ?? duration['p(0.95)'] ?? 500;
  const p95 = Number.isFinite(p95Raw) ? p95Raw : 500;

  let errorRate;
  if (typeof metrics.http_req_failed?.value === 'number') {
    errorRate = metrics.http_req_failed.value;
  } else {
    const checks = Array.isArray(summary.checks) ? summary.checks : [];
    const totalChecks = checks.length;
    const failedChecks = checks.filter((c) => !c.passes).length;
    errorRate = totalChecks > 0 ? failedChecks / totalChecks : 0.01;
  }

  const httpReqs = metrics.http_reqs?.count ?? metrics.http_reqs?.value ?? 0;
  const testDurationSec = (summary.state?.testRunDurationMs || 60000) / 1000;
  const throughputRps = testDurationSec > 0 && httpReqs > 0 ? httpReqs / testDurationSec : 50;

  const runId = opts.runId ?? process.env.GITHUB_SHA ?? 'local';
  const now = opts.now ?? new Date();

  return {
    p95_ms: Math.round(p95),
    error_rate: Math.round(errorRate * 1000) / 1000,
    throughput_rps: Math.round(throughputRps * 10) / 10,
    run_id: runId,
    timestamp: now.toISOString(),
  };
}

/**
 * 生成 placeholder baseline（summary.json 缺失时使用）
 * @param {object} [opts]
 * @param {string} [opts.runId]
 * @param {Date}   [opts.now]
 * @returns {object}
 */
function buildPlaceholderBaseline(opts = {}) {
  const runId = opts.runId ?? process.env.GITHUB_SHA ?? 'placeholder';
  const now = opts.now ?? new Date();
  return {
    p95_ms: 500,
    error_rate: 0.01,
    throughput_rps: 50,
    run_id: runId,
    timestamp: now.toISOString(),
  };
}

module.exports = {
  compareWithBaseline,
  appendTrend,
  loadBaseline,
  saveBaseline,
  validateBaseline,
  extractBaselineFromSummary,
  buildPlaceholderBaseline,
};
