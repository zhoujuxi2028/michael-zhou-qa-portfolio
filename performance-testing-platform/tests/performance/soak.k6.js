import http from 'k6/http';
import { sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import {
  BASE_URL,
  checkStatus,
  pollMetrics,
  checkMemoryLeak,
  LEAK_THRESHOLD,
} from './helpers/utils.js';
import { executeFunnel } from './helpers/funnel.js';

// Custom metrics (SOAK-04)
const soakHeapUsedMb = new Trend('soak_heap_used_mb');
const soakEventLoopLag = new Trend('soak_event_loop_lag');
const soakOrderSuccess = new Counter('soak_order_success');
const soakOrderFailure = new Counter('soak_order_failure');
const soakAuthLatency = new Trend('soak_auth_latency');

// Configurable via env: SOAK_VUS (default 200), SOAK_DURATION (default 1h)
const SOAK_VUS = parseInt(__ENV.SOAK_VUS || '200');
const SOAK_DURATION = __ENV.SOAK_DURATION || '1h';

export const options = {
  setupTimeout: '30s',
  stages: [
    { duration: '2m', target: SOAK_VUS }, // ramp-up
    { duration: SOAK_DURATION, target: SOAK_VUS }, // steady state
    { duration: '1m', target: 0 }, // ramp-down
  ],
  thresholds: {
    'http_req_duration{test_phase:!setup}': ['p(95)<500'],
    'http_req_failed{test_phase:!setup}': ['rate<0.01'],
  },
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

export default function () {
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

  // Poll server metrics every ~5% of iterations
  if (Math.random() < 0.05) {
    pollMetrics({
      heapUsedMb: soakHeapUsedMb,
      eventLoopLag: soakEventLoopLag,
    });
  }

  // Fault injection: 50% probability sleep 2s to simulate delayed response handling (K6-RECOVERY)
  if (Math.random() < 0.5) {
    sleep(2);
  } else {
    sleep(Math.random() + 0.5); // 0.5~1.5s fractional sleep
  }
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
