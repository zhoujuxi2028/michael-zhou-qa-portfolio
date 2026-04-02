import http from 'k6/http';
import { sleep, check } from 'k6';
import { BASE_URL } from './helpers/utils.js';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// AUTH-PERF-01: High-concurrency login
// bcrypt 10 rounds ~100ms/call, 8 Workers → ~80 login/s max
// 100 VUs sufficient to demonstrate CPU-bound bottleneck

export const options = {
  stages: [
    { duration: '30s', target: 10 }, // Warm-up
    { duration: '60s', target: 100 }, // Ramp to target
    { duration: '60s', target: 100 }, // Hold steady
    { duration: '30s', target: 0 }, // Cool-down
  ],
  thresholds: {
    'http_req_duration{test_type:login}': ['p(95)<2000'],
    'http_req_failed{test_type:login}': ['rate<0.01'],
  },
};

export function setup() {
  const users = [];
  const count = 100; // 1 user per VU
  for (let i = 0; i < count; i++) {
    const username = `logintest_${i}`;
    const password = 'testpass123';
    const res = http.post(`${BASE_URL}/api/auth/register`, JSON.stringify({ username, password }), {
      headers: { 'Content-Type': 'application/json' },
    });
    if (res.status === 201 || res.status === 409) {
      users.push({ username, password });
    }
  }
  return { users };
}

export default function (data) {
  const idx = Math.floor(Math.random() * data.users.length);
  const user = data.users[idx];

  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ username: user.username, password: user.password }),
    { headers: { 'Content-Type': 'application/json' }, tags: { test_type: 'login' } }
  );

  check(res, {
    'login status 200': (r) => r.status === 200,
    'login has accessToken': (r) => r.json('accessToken') !== undefined,
  });

  sleep(randomIntBetween(0.5, 1.0));
}
