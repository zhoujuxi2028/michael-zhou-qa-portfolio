import http from 'k6/http';
import { check, sleep } from 'k6';

// PT-07: Status transition performance test
// Tests PATCH endpoint under load (order create → status update flow)
export const options = {
  scenarios: {
    status_transition_load: {
      executor: 'constant-vus',
      vus: 5,
      duration: '30s',
      exec: 'statusTransition',
      tags: { scenario: 'status_transition_load' },
    },
  },
  thresholds: {
    'http_req_duration{scenario:status_transition_load}': ['p(95)<500'],
    'http_req_failed{scenario:status_transition_load}': ['rate<0.1'],
  },
};

const ORDER_URL = __ENV.ORDER_URL || 'http://localhost:3003';

export function statusTransition() {
  const productId = `PROD-00${Math.floor(Math.random() * 3) + 1}`;
  const createPayload = JSON.stringify({
    productId,
    quantity: 1,
    unitPrice: 29.99,
  });

  const params = { headers: { 'Content-Type': 'application/json' } };
  const createRes = http.post(`${ORDER_URL}/api/orders`, createPayload, params);

  check(createRes, {
    'order created (201) or rate-limited (409)': (r) => r.status === 201 || r.status === 409,
  });

  if (createRes.status === 201) {
    const orderId = JSON.parse(createRes.body).id;

    const patchPayload = JSON.stringify({
      status: 'paid',
      paymentId: 'PAY-PT-001',
    });

    const patchRes = http.patch(`${ORDER_URL}/api/orders/${orderId}/status`, patchPayload, params);

    check(patchRes, {
      'status updated to paid': (r) => r.status === 200,
      'paid status in response': (r) => JSON.parse(r.body).status === 'paid',
    });
  }

  sleep(0.5);
}
