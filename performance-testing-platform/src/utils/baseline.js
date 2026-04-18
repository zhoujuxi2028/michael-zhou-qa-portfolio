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
 * Append entry to trend.json (max 30 entries)
 * @param {object} entry - Trend entry { run, p95_ms, error_rate, ... }
 * @param {string} filePath - Path to trend.json
 * @param {number} maxRows - Max entries to keep (default 30)
 */
function appendTrend(entry, filePath, maxRows = 30) {
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

  // Keep only the last maxRows entries
  if (data.length > maxRows) {
    data = data.slice(data.length - maxRows);
  }

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

module.exports = {
  compareWithBaseline,
  appendTrend,
  loadBaseline,
  saveBaseline,
};
