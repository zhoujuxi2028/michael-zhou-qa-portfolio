import http from 'k6/http';
import { Trend } from 'k6/metrics';
import { BASE_URL, checkStatus } from './helpers/utils.js';
import { thinkTime } from './helpers/thinkTime.js';
import { randomProduct } from './helpers/data.js';

// RESILIENCE-BREAKPOINT: Find absolute breaking point of the API
// Ramps load until system breaks (p95 > 2s OR error > 20%)
// No SLA thresholds — exploratory test
// Classifies degradation as graceful (gradual) or catastrophic (sudden)

/**
 * Execute e-commerce user journey through product browse → detail → order
 * Nested probability model: 100% browse → 50% detail → 33% order
 * Actual traffic ratio: browse 100%, detail ~50%, order ~16.5%
 */
function executeFunnel(baseUrl, options = {}) {
  const { detailProb = 0.5, orderProb = 0.33, onOrder = null } = options;
  const product = randomProduct();

  // 100% browse products list
  const browseRes = http.get(`${baseUrl}/api/products`);
  checkStatus(browseRes, 200, 'browse products');
  thinkTime();

  // ~50% of browsers view product detail (nested probability)
  if (Math.random() < detailProb) {
    const detailRes = http.get(`${baseUrl}/api/products/${product.id}`);
    checkStatus(detailRes, 200, 'product detail');
    thinkTime();

    // ~33% of detail viewers place order (nested probability)
    // Total order ratio: 100% × 50% × 33% ≈ 16.5%
    if (Math.random() < orderProb) {
      const orderRes = http.post(
        `${baseUrl}/api/orders`,
        JSON.stringify({
          product_id: Number(product.id),
          quantity: 1,
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
      checkStatus(orderRes, 201, 'create order');

      // Invoke callback hook for custom metrics (e.g., soak script tracking)
      if (onOrder && typeof onOrder === 'function') {
        onOrder(orderRes);
      }
    }
  }
}

const stageP95 = new Trend('stage_p95');

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
  executeFunnel(BASE_URL);
}

export function handleSummary(data) {
  const metrics = data.metrics;

  // Extract p95 and error rate
  const p95 = metrics.http_req_duration?.values?.p95 || 0;
  const errorRate = metrics.http_req_failed?.values?.['value'] || 0;

  // Classify crash type: graceful vs catastrophic (K6-CLASS-01/02)
  // Catastrophic: error rate > 50% indicates system overwhelm
  // Graceful: error rate ≤ 50% indicates controlled degradation
  const crashType = errorRate > 0.5 ? 'catastrophic' : 'graceful';

  // Determine breaking point
  const isBreaking = p95 > 2000 || errorRate > 0.2;
  if (isBreaking && !breakingPoint) {
    breakingPoint = __VU || 10000;
  }
  if (!isBreaking) {
    lastSafeVUs = __VU || 0;
  }

  return {
    stdout: `
Performance Summary:
==================
Max Sustainable Load: ${lastSafeVUs} VUs
Breaking Point: ${breakingPoint ? `${breakingPoint} VUs` : 'Not reached (exceeded 10000 VUs)'}
Crash Classification: ${crashType}

Metrics at current load:
- p95 latency: ${p95.toFixed(0)}ms
- Error rate: ${(errorRate * 100).toFixed(1)}%
`,
  };
}
