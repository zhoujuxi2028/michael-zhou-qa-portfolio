import http from 'k6/http';
import { sleep, check } from 'k6';
import { BASE_URL } from './helpers/utils.js';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// AUTH-PERF-02: Token refresh performance
// JWT verify + sign only, no bcrypt — should be fast (p95 < 200ms)

export const options = {
  stages: [
    { duration: '30s', target: 10 }, // Warm-up
    { duration: '60s', target: 200 }, // Ramp to target
    { duration: '60s', target: 200 }, // Hold steady
    { duration: '30s', target: 0 }, // Cool-down
  ],
  thresholds: {
    'http_req_duration{test_type:refresh}': ['p(95)<200'],
    'http_req_failed{test_type:refresh}': ['rate<0.01'],
  },
};

export function setup() {
  const tokens = [];
  const count = 200; // 1 per VU
  for (let i = 0; i < count; i++) {
    const username = `refreshtest_${i}`;
    const password = 'testpass123';
    http.post(`${BASE_URL}/api/auth/register`, JSON.stringify({ username, password }), {
      headers: { 'Content-Type': 'application/json' },
    });
    const login = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({ username, password }), {
      headers: { 'Content-Type': 'application/json' },
    });
    if (login.status === 200) {
      tokens.push(login.json('refreshToken'));
    }
  }
  return { tokens };
}

export default function (data) {
  const idx = Math.floor(Math.random() * data.tokens.length);
  const refreshToken = data.tokens[idx];

  const res = http.post(`${BASE_URL}/api/auth/refresh`, JSON.stringify({ refreshToken }), {
    headers: { 'Content-Type': 'application/json' },
    tags: { test_type: 'refresh' },
  });

  check(res, {
    'refresh status 200': (r) => r.status === 200,
    'refresh has accessToken': (r) => r.json('accessToken') !== undefined,
  });

  sleep(randomIntBetween(0.5, 1.0));
}
