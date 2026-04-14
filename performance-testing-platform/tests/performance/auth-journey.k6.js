import http from 'k6/http';
import { sleep, check } from 'k6';
import { BASE_URL, checkStatus } from './helpers/utils.js';
import { thinkTime } from './helpers/thinkTime.js';

// AUTH-PERF-03: Complete authenticated user journey
// login (once per VU) → browse → detail → order (with Bearer token)
// AUTH-PERF-04: ~10% invalid token requests (verify 401, no 5xx)

export const options = {
  setupTimeout: '120s',
  stages: [
    { duration: '30s', target: 50 }, // Warm-up
    { duration: '60s', target: 500 }, // Ramp to target
    { duration: '120s', target: 500 }, // Hold steady
    { duration: '30s', target: 0 }, // Cool-down
  ],
  thresholds: {
    'http_req_duration{test_type:normal}': ['p(95)<500'],
    'http_req_failed{test_type:normal}': ['rate<0.01'],
  },
};

const tokenCache = {};

export function setup() {
  const users = [];
  const count = 500; // 1 per VU
  for (let i = 0; i < count; i++) {
    const username = `journey_${i}`;
    const password = 'testpass123';
    http.post(`${BASE_URL}/api/auth/register`, JSON.stringify({ username, password }), {
      headers: { 'Content-Type': 'application/json' },
      tags: { test_phase: 'setup' },
    });
    users.push({ username, password });
  }
  return { users };
}

export default function (data) {
  const vuId = __VU % data.users.length;
  const user = data.users[vuId];

  // Login once per VU, cache token
  const normalTags = { tags: { test_type: 'normal' } };

  if (!tokenCache[vuId]) {
    const login = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({ username: user.username, password: user.password }),
      { headers: { 'Content-Type': 'application/json' }, ...normalTags }
    );
    checkStatus(login, 200, 'login');
    if (login.status === 200) {
      tokenCache[vuId] = login.json('accessToken');
    }
  }

  const token = tokenCache[vuId];
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // AUTH-PERF-04: ~10% invalid token requests
  if (Math.random() < 0.1) {
    const badRes = http.get(`${BASE_URL}/api/products`, {
      headers: { Authorization: 'Bearer invalid-token-xxx' },
      tags: { test_type: 'invalid_token' },
    });
    // Public endpoint should still return 200 even with bad token
    check(badRes, { 'public endpoint with bad token still 200': (r) => r.status === 200 });

    const badOrder = http.post(
      `${BASE_URL}/api/orders`,
      JSON.stringify({ product_id: 1, quantity: 1 }),
      {
        headers: { ...authHeaders, Authorization: 'Bearer invalid-token-xxx' },
        tags: { test_type: 'invalid_token' },
      }
    );
    check(badOrder, {
      'invalid token order returns 401': (r) => r.status === 401,
      'no 5xx on invalid token': (r) => r.status < 500,
    });
    thinkTime(0.5, 1.0);
    return;
  }

  // Normal flow: browse → detail → order
  const products = http.get(`${BASE_URL}/api/products`, normalTags);
  checkStatus(products, 200, 'products');

  if (Math.random() < 0.5) {
    const id = Math.ceil(Math.random() * 5);
    const detail = http.get(`${BASE_URL}/api/products/${id}`, normalTags);
    checkStatus(detail, 200, 'product detail');

    if (Math.random() < 0.33) {
      const order = http.post(
        `${BASE_URL}/api/orders`,
        JSON.stringify({ product_id: id, quantity: 1 }),
        { headers: authHeaders, ...normalTags }
      );
      checkStatus(order, 201, 'create order');
    }
  }

  thinkTime(0.5, 1.0);
}
