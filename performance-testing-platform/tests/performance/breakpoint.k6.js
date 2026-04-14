import http from 'k6/http';
import { BASE_URL, checkStatus } from './helpers/utils.js';
import { thinkTime } from './helpers/thinkTime.js';

// RESILIENCE-BREAKPOINT: Find absolute breaking point of the API
// Ramps load until system breaks (p95 > 2s OR error > 20%)
// No SLA thresholds — exploratory test
//
// Output: Log identifies max sustainable load, breaking point VUs

export const options = {
  stages: [
    { duration: '30s', target: 100 }, // Ramp 1: 100 VUs
    { duration: '30s', target: 500 }, // Ramp 2: 500 VUs
    { duration: '30s', target: 1000 }, // Ramp 3: 1000 VUs
    { duration: '30s', target: 2000 }, // Ramp 4: 2000 VUs
    { duration: '30s', target: 5000 }, // Ramp 5: 5000 VUs (typical breaking point)
    { duration: '30s', target: 10000 }, // Ramp 6: 10000 VUs (hard limit)
  ],
};

let breakingPoint = null;
let lastSafeVUs = 0;

export default function () {
  const res = http.get(`${BASE_URL}/api/products`, {
    tags: { test_type: 'breakpoint' },
  });

  checkStatus(res, 200, 'products');
  thinkTime(0.5, 1.0);
}

export function handleSummary(data) {
  const metrics = data.metrics;

  // Extract metrics
  const p95 = metrics.http_req_duration.values.p95;
  const errorRate = metrics.http_req_failed?.values['value'] || 0;
  const vus = __VU;

  // Determine breaking point
  const isBreaking = p95 > 2000 || errorRate > 0.2;

  if (isBreaking && !breakingPoint) {
    breakingPoint = vus;
    console.log(
      `⚠️  BREAKING POINT FOUND at ${vus} VUs: p95=${p95.toFixed(0)}ms, error_rate=${(errorRate * 100).toFixed(1)}%`
    );
  } else if (!isBreaking) {
    lastSafeVUs = vus;
  }

  return {
    stdout: `
Performance Summary:
==================
Max Sustainable Load: ${lastSafeVUs} VUs
Breaking Point: ${breakingPoint ? `${breakingPoint} VUs` : 'Not reached (exceeded 10000 VUs)'}

Metrics at current load:
- p95 latency: ${p95.toFixed(0)}ms
- Error rate: ${(errorRate * 100).toFixed(1)}%
- Virtual Users: ${vus}
`,
  };
}
