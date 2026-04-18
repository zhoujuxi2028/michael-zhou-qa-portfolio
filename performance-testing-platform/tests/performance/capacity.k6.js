import http from 'k6/http';
import { Trend } from 'k6/metrics';
import { BASE_URL, checkStatus } from './helpers/utils.js';
import {
  buildLoadThresholds,
  buildObserverDurationFromStages,
  buildObserverScenario,
  observeMetricsCycle,
} from './helpers/metricsObserver.js';
import { thinkTime } from './helpers/thinkTime.js';
import { randomProduct } from './helpers/data.js';

// Custom metrics: server-side indicators (polled from /metrics)
const serverEventLoopLag = new Trend('server_event_loop_lag');
const serverHeapUsedMb = new Trend('server_heap_used_mb');
const serverCpuUser = new Trend('server_cpu_user');

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

const CAPACITY_TARGET_VUS = parseInt(__ENV.CAPACITY_TARGET_VUS || '5000', 10);
const CAPACITY_STAGES = [
  { duration: __ENV.CAPACITY_WARMUP_DURATION || '30s', target: 10 }, // Warm-up (TQ-02)
  { duration: __ENV.CAPACITY_HOLD_DURATION || '60s', target: CAPACITY_TARGET_VUS }, // PASS baseline
  { duration: __ENV.CAPACITY_HOLD_DURATION || '60s', target: CAPACITY_TARGET_VUS }, // Hold steady
  { duration: __ENV.CAPACITY_HOLD_DURATION || '60s', target: CAPACITY_TARGET_VUS }, // Hold steady
  { duration: __ENV.CAPACITY_COOLDOWN_DURATION || '30s', target: 0 }, // Cool-down
];

export const options = {
  scenarios: {
    load: {
      executor: 'ramping-vus',
      exec: 'runCapacityLoad',
      startVUs: 0,
      stages: CAPACITY_STAGES,
      gracefulRampDown: '0s',
    },
    observer: buildObserverScenario({
      duration: __ENV.CAPACITY_OBSERVER_DURATION || buildObserverDurationFromStages(CAPACITY_STAGES),
    }),
  },
  thresholds: buildLoadThresholds(),
};

export function runCapacityLoad() {
  executeFunnel(BASE_URL);
  thinkTime(0.5, 1.0);
}

export function observeMetrics() {
  observeMetricsCycle({
    eventLoopLag: serverEventLoopLag,
    heapUsedMb: serverHeapUsedMb,
    cpuUser: serverCpuUser,
  });
}
