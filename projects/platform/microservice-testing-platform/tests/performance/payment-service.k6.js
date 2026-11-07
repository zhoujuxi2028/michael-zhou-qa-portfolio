import http from 'k6/http';
import { check, sleep } from 'k6';

// PT-06: Payment service load test
export const options = {
  scenarios: {
    payment_api_read: {
      executor: 'constant-vus',
      vus: 30,
      duration: '30s',
      exec: 'paymentApiRead',
      tags: { scenario: 'payment_api_read' },
    },
    payment_api_not_found: {
      executor: 'constant-vus',
      vus: 10,
      duration: '30s',
      exec: 'paymentApiNotFound',
      tags: { scenario: 'payment_api_not_found' },
      startTime: '35s',
    },
  },
  thresholds: {
    'http_req_duration{scenario:payment_api_read}': ['p(95)<200'],
    'http_req_failed{scenario:payment_api_not_found}': ['rate<0.1'],
  },
};

const PAYMENT_URL = __ENV.PAYMENT_URL || 'http://localhost:3005';

export function paymentApiRead() {
  const res = http.get(`${PAYMENT_URL}/api/payments/ORD-001`);

  check(res, {
    'payment status 200 or 404': (r) => r.status === 200 || r.status === 404,
    'payment response has expected fields': (r) => {
      if (r.status === 200) {
        const body = JSON.parse(r.body);
        return body.orderId !== undefined && body.amount !== undefined;
      }
      return true;
    },
  });

  sleep(0.1);
}

export function paymentApiNotFound() {
  const res = http.get(`${PAYMENT_URL}/api/payments/ORD-NONEXISTENT`);

  check(res, {
    'not found returns 404': (r) => r.status === 404,
    'not found has error code': (r) => JSON.parse(r.body).error === 'PAYMENT_NOT_FOUND',
  });

  sleep(0.1);
}
