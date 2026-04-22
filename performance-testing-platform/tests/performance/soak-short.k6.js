import http from 'k6/http';
import { sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { BASE_URL, checkStatus, checkMemoryLeak, LEAK_THRESHOLD } from './helpers/utils.js';
import {
  buildLoadThresholds,
  buildObserverDurationFromStages,
  buildObserverScenario,
  observeMetricsCycle,
} from './helpers/metricsObserver.js';

// Custom metrics (SOAK-04)
const soakHeapUsedMb = new Trend('soak_heap_used_mb');
const soakEventLoopLag = new Trend('soak_event_loop_lag');
const soakOrderSuccess = new Counter('soak_order_success');
const soakOrderFailure = new Counter('soak_order_failure');
const soakAuthLatency = new Trend('soak_auth_latency');

const SOAK_SHORT_STAGES = [
  { duration: __ENV.SOAK_SHORT_RAMP_UP_DURATION || '30s', target: 10 },
  { duration: __ENV.SOAK_SHORT_STEADY_DURATION || '4m', target: 10 },
  { duration: __ENV.SOAK_SHORT_RAMP_DOWN_DURATION || '30s', target: 0 },
];

export const options = {
  setupTimeout: '30s',
  scenarios: {
    load: {
      executor: 'ramping-vus',
      exec: 'runSoakShortLoad',
      startVUs: 0,
      stages: SOAK_SHORT_STAGES,
      gracefulRampDown: '0s',
    },
    observer: buildObserverScenario({
      duration:
        __ENV.SOAK_SHORT_OBSERVER_DURATION || buildObserverDurationFromStages(SOAK_SHORT_STAGES),
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

  console.log(`[SOAK-SHORT] Baseline heapUsed: ${(baselineHeap / 1024 / 1024).toFixed(1)} MB`);
  return { baselineHeap };
}

export function runSoakShortLoad() {
  // Funnel: 60% browse → 30% detail → 10% order
  const products = http.get(`${BASE_URL}/api/products`);
  checkStatus(products, 200, 'products');

  if (Math.random() < 0.5) {
    const id = Math.ceil(Math.random() * 5);
    const detail = http.get(`${BASE_URL}/api/products/${id}`);
    checkStatus(detail, 200, 'product detail');

    if (Math.random() < 0.33) {
      const order = http.post(
        `${BASE_URL}/api/orders`,
        JSON.stringify({ product_id: id, quantity: 1 }),
        { headers: { 'Content-Type': 'application/json' } }
      );
      if (order.status === 201) {
        soakOrderSuccess.add(1);
      } else {
        soakOrderFailure.add(1);
      }
    }
  }

  // Auth latency sampling (~2% of iterations) — SOAK-04
  if (Math.random() < 0.02) {
    const loginRes = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({ username: 'soakuser', password: 'soakpass' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    soakAuthLatency.add(loginRes.timings.duration);
  }

  sleep(1);
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
  console.log(`[SOAK-SHORT] Final heapUsed: ${(finalHeap / 1024 / 1024).toFixed(1)} MB`);
  console.log(
    `[SOAK-SHORT] Heap growth: ${(result.ratio * 100).toFixed(1)}% — level: ${result.level}`
  );

  if (result.leaked) {
    console.error(
      `[SOAK-SHORT] MEMORY LEAK DETECTED: heap grew ${(result.ratio * 100).toFixed(1)}% (threshold: ${LEAK_THRESHOLD * 100}%)`
    );
  }
}
