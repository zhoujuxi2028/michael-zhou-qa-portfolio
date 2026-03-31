import http from 'k6/http';
import { sleep } from 'k6';
import { Trend } from 'k6/metrics';
import { BASE_URL, checkStatus } from './helpers/utils.js';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics: server-side indicators (polled from /metrics)
const serverEventLoopLag = new Trend('server_event_loop_lag');
const serverHeapUsedMb = new Trend('server_heap_used_mb');
const serverCpuUser = new Trend('server_cpu_user');

// Binary search stages: coarse-grained first round (10 → 50 → 100 → 150 → 200)
// After finding the inflection zone, manually adjust stages for fine-grained search.
export const options = {
  stages: [
    { duration: '30s', target: 10 }, // Warm-up (TQ-02)
    { duration: '60s', target: 10 }, // Baseline
    { duration: '60s', target: 50 },
    { duration: '60s', target: 100 },
    { duration: '60s', target: 150 },
    { duration: '60s', target: 200 },
    { duration: '30s', target: 0 }, // Cool-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

// Funnel model: 60% browse → 30% detail → 10% order
export default function () {
  // 100% of users browse product list
  const products = http.get(`${BASE_URL}/api/products`);
  checkStatus(products, 200, 'products');

  // 50% of browsers view detail (60% × 50% = 30% overall)
  if (Math.random() < 0.5) {
    const id = Math.ceil(Math.random() * 5);
    const detail = http.get(`${BASE_URL}/api/products/${id}`);
    checkStatus(detail, 200, 'product detail');

    // 33% of detail viewers place order (30% × 33% ≈ 10% overall)
    if (Math.random() < 0.33) {
      const order = http.post(
        `${BASE_URL}/api/orders`,
        JSON.stringify({ product_id: id, quantity: 1 }),
        { headers: { 'Content-Type': 'application/json' } }
      );
      checkStatus(order, 201, 'create order');
    }
  }

  // Poll server metrics every ~10 iterations
  if (Math.random() < 0.1) {
    const m = http.get(`${BASE_URL}/metrics`);
    if (m.status === 200) {
      try {
        const body = JSON.parse(m.body);
        if (body.eventLoop) serverEventLoopLag.add(body.eventLoop.lag);
        if (body.memory) serverHeapUsedMb.add(body.memory.heapUsed / 1024 / 1024);
        if (body.cpu) serverCpuUser.add(body.cpu.user / 1000); // µs → ms
      } catch {
        // ignore parse errors
      }
    }
  }

  sleep(randomIntBetween(0.5, 1.0));
}
