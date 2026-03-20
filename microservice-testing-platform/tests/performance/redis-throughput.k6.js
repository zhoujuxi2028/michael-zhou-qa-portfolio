import http from 'k6/http';
import { check, sleep } from 'k6';

// PT-05: Redis message throughput test
// Tests order creation rate (each triggers Redis publish)
export const options = {
  scenarios: {
    redis_throughput: {
      executor: 'constant-arrival-rate',
      rate: 100,
      timeUnit: '1s',
      duration: '30s',
      preAllocatedVUs: 50,
      maxVUs: 100,
      exec: 'createOrder',
      tags: { scenario: 'redis_throughput' },
    },
  },
  thresholds: {
    'http_req_failed{scenario:redis_throughput}': ['rate<0.01'],
    'http_req_duration{scenario:redis_throughput}': ['p(95)<1000'],
  },
};

const ORDER_URL = __ENV.ORDER_URL || 'http://localhost:3001';

export function createOrder() {
  const payload = JSON.stringify({
    productId: `PROD-00${Math.floor(Math.random() * 3) + 1}`,
    quantity: 1,
    unitPrice: 10,
  });

  const params = { headers: { 'Content-Type': 'application/json' } };
  const res = http.post(`${ORDER_URL}/api/orders`, payload, params);

  check(res, {
    'order processed': (r) => r.status === 201 || r.status === 409,
  });
}
