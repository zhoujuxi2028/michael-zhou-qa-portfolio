import http from 'k6/http';
import { check, sleep } from 'k6';

// PT-03: Full flow stress test
// PT-04: Ramping VUs
export const options = {
  scenarios: {
    full_flow_stress: {
      executor: 'constant-vus',
      vus: 20,
      duration: '60s',
      exec: 'fullFlowStress',
      tags: { scenario: 'full_flow_stress' },
    },
    ramping_load: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '15s', target: 50 },
        { duration: '15s', target: 100 },
        { duration: '15s', target: 50 },
        { duration: '15s', target: 0 },
      ],
      exec: 'rampingLoad',
      tags: { scenario: 'ramping_load' },
      startTime: '65s',
    },
  },
  thresholds: {
    'http_req_duration{scenario:full_flow_stress}': ['p(95)<500'],
    'http_req_failed{scenario:full_flow_stress}': ['rate<0.1'],
    'http_req_failed{scenario:ramping_load}': ['rate<0.1'],
  },
};

const ORDER_URL = __ENV.ORDER_URL || 'http://localhost:3003';
const INVENTORY_URL = __ENV.INVENTORY_URL || 'http://localhost:3004';

// PT-03: Full flow - create order (triggers inventory deduction)
export function fullFlowStress() {
  const payload = JSON.stringify({
    productId: `PROD-00${Math.floor(Math.random() * 3) + 1}`,
    quantity: 1,
    unitPrice: Math.round(Math.random() * 100 * 100) / 100,
  });

  const params = { headers: { 'Content-Type': 'application/json' } };
  const res = http.post(`${ORDER_URL}/api/orders`, payload, params);

  check(res, {
    'order created or conflict': (r) => r.status === 201 || r.status === 409,
  });

  sleep(0.5);
}

// PT-04: Ramping load - read operations
export function rampingLoad() {
  const res = http.get(`${INVENTORY_URL}/api/inventory/PROD-001`);
  check(res, {
    'status 200': (r) => r.status === 200,
  });
  sleep(0.1);
}
