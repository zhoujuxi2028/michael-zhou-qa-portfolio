import http from 'k6/http';
import { check, sleep } from 'k6';

// PT-01: Single service load - Order API
export const options = {
  scenarios: {
    order_api_load: {
      executor: 'constant-vus',
      vus: 50,
      duration: '30s',
      exec: 'orderApiLoad',
      tags: { scenario: 'order_api_load' },
    },
    inventory_api_load: {
      executor: 'constant-vus',
      vus: 50,
      duration: '30s',
      exec: 'inventoryApiLoad',
      tags: { scenario: 'inventory_api_load' },
      startTime: '35s',
    },
  },
  thresholds: {
    'http_req_duration{scenario:order_api_load}': ['p(95)<200'],
    'http_req_duration{scenario:inventory_api_load}': ['p(95)<100'],
  },
};

const ORDER_URL = __ENV.ORDER_URL || 'http://localhost:3001';
const INVENTORY_URL = __ENV.INVENTORY_URL || 'http://localhost:3002';

// PT-01: Order API load test
export function orderApiLoad() {
  const res = http.get(`${ORDER_URL}/api/orders?page=1&limit=10`);
  check(res, {
    'order list status 200': (r) => r.status === 200,
    'order list has data': (r) => JSON.parse(r.body).data !== undefined,
  });
  sleep(0.1);
}

// PT-02: Inventory API load test
export function inventoryApiLoad() {
  const res = http.get(`${INVENTORY_URL}/api/inventory/PROD-001`);
  check(res, {
    'inventory status 200': (r) => r.status === 200,
    'inventory has quantity': (r) => JSON.parse(r.body).quantity !== undefined,
  });
  sleep(0.1);
}
