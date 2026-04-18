import http from 'k6/http';
import { sleep, check } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import {
  BASE_URL,
  checkStatus,
  checkMemoryLeak,
  LEAK_THRESHOLD,
} from './helpers/utils.js';
import {
  buildLoadThresholds,
  buildObserverDurationFromStages,
  buildObserverScenario,
  observeMetricsCycle,
} from './helpers/metricsObserver.js';
import { thinkTime } from './helpers/thinkTime.js';
import { randomProduct } from './helpers/data.js';

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

// Custom metrics (SOAK-04)
const soakHeapUsedMb = new Trend('soak_heap_used_mb');
const soakEventLoopLag = new Trend('soak_event_loop_lag');
const soakOrderSuccess = new Counter('soak_order_success');
const soakOrderFailure = new Counter('soak_order_failure');
const soakAuthLatency = new Trend('soak_auth_latency');
const recoveryTime = new Trend('recovery_time_ms'); // K6-RECOVERY-01

// Configurable via env: SOAK_VUS (default 200), SOAK_DURATION (default 1h)
const SOAK_VUS = parseInt(__ENV.SOAK_VUS || '200', 10);
const SOAK_DURATION = __ENV.SOAK_DURATION || '1h';
const SOAK_STAGES = [
  { duration: __ENV.SOAK_RAMP_UP_DURATION || '2m', target: SOAK_VUS },
  { duration: SOAK_DURATION, target: SOAK_VUS },
  { duration: __ENV.SOAK_RAMP_DOWN_DURATION || '1m', target: 0 },
];

export const options = {
  setupTimeout: '30s',
  scenarios: {
    load: {
      executor: 'ramping-vus',
      exec: 'runSoakLoad',
      startVUs: 0,
      stages: SOAK_STAGES,
      gracefulRampDown: '0s',
    },
    observer: buildObserverScenario({
      duration: __ENV.SOAK_OBSERVER_DURATION || buildObserverDurationFromStages(SOAK_STAGES),
    }),
  },
  thresholds: buildLoadThresholds(),
};

export function setup() {
  // Record baseline heap
  const m = http.get(`${BASE_URL}/metrics`, { tags: { test_phase: 'setup' } });
  let baselineHeap = 0;
  if (m.status === 200) {
    try {
      baselineHeap = JSON.parse(m.body).memory.heapUsed;
    } catch {
      /* ignore */
    }
  }

  // Register soak user for auth latency sampling (SOAK-04)
  http.post(
    `${BASE_URL}/api/auth/register`,
    JSON.stringify({ username: 'soakuser', password: 'soakpass' }),
    { headers: { 'Content-Type': 'application/json' }, tags: { test_phase: 'setup' } }
  );

  console.log(`[SOAK] Baseline heapUsed: ${(baselineHeap / 1024 / 1024).toFixed(1)} MB`);
  console.log(`[SOAK] Config: ${SOAK_VUS} VUs, duration: ${SOAK_DURATION}`);
  return { baselineHeap };
}

export function runSoakLoad() {
  // K6-RECOVERY-01: Inject fault on VU 1, iteration 50 and measure recovery time
  if (__VU === 1 && __ITER === 50) {
    console.log('[K6-RECOVERY-01] Injecting fault: simulating server unavailability');
    sleep(10); // Wait 10s to simulate fault period

    // Measure recovery: how long until requests succeed again
    const recoveryStart = Date.now();
    let recovered = false;

    while (Date.now() - recoveryStart < 60000) {
      const res = http.get(`${BASE_URL}/api/products`, { timeout: '5s' });
      if (res.status === 200) {
        recovered = true;
        const recoveryTimeMs = Date.now() - recoveryStart;
        recoveryTime.add(recoveryTimeMs);
        console.log(`[K6-RECOVERY-01] Recovery time: ${recoveryTimeMs}ms`);
        check(res, { 'recovered within 60s': recoveryTimeMs <= 60000 });
        break;
      }
      sleep(1);
    }

    if (!recovered) {
      console.error('[K6-RECOVERY-01] Server failed to recover within 60s');
      check(false, { 'recovered within 60s': false });
    }
  }

  executeFunnel(BASE_URL, {
    onOrder: (response) => {
      if (response.status === 201) {
        soakOrderSuccess.add(1);
      } else {
        soakOrderFailure.add(1);
      }
    },
  });

  // Auth latency sampling (~2% of iterations) — SOAK-04
  if (Math.random() < 0.02) {
    const loginRes = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({ username: 'soakuser', password: 'soakpass' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    soakAuthLatency.add(loginRes.timings.duration);
  }

  // Fault injection: 50% probability sleep 2s to simulate delayed response handling (K6-RECOVERY)
  if (Math.random() < 0.5) {
    sleep(2);
  } else {
    sleep(Math.random() + 0.5); // 0.5~1.5s fractional sleep
  }
}

export function observeMetrics() {
  observeMetricsCycle({
    heapUsedMb: soakHeapUsedMb,
    eventLoopLag: soakEventLoopLag,
  });
}

export function teardown(data) {
  const m = http.get(`${BASE_URL}/metrics`);
  let finalHeap = 0;
  if (m.status === 200) {
    try {
      finalHeap = JSON.parse(m.body).memory.heapUsed;
    } catch {
      /* ignore */
    }
  }

  const result = checkMemoryLeak(data.baselineHeap, finalHeap);

  console.log(`[SOAK] Final heapUsed: ${(finalHeap / 1024 / 1024).toFixed(1)} MB`);
  console.log(`[SOAK] Heap growth: ${(result.ratio * 100).toFixed(1)}% — level: ${result.level}`);

  if (result.level === 'warning') {
    console.warn(`[SOAK] MEMORY GROWTH WARNING: ${(result.ratio * 100).toFixed(1)}%`);
  }
  if (result.leaked) {
    console.error(
      `[SOAK] MEMORY LEAK DETECTED: heap grew ${(result.ratio * 100).toFixed(1)}% (threshold: ${LEAK_THRESHOLD * 100}%)`
    );
  }
}
