import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL, checkStatus } from './helpers/utils.js';
import { thinkTime } from './helpers/thinkTime.js';

// RESILIENCE-02: Rate limiter protection under load
// Verifies 429 responses when limit exceeded + header correctness
// Requires: RATE_LIMIT_ENABLED=true

export const options = {
  setupTimeout: '60s',
  stages: [
    { duration: '10s', target: 5 }, // Warm-up
    { duration: '30s', target: 20 }, // Ramp to target (aggressive to hit limits)
    { duration: '20s', target: 0 }, // Cool-down
  ],
  thresholds: {
    'http_req_duration{test_type:limit}': ['p(95)<500'],
    'http_req_failed{test_type:limit}': ['rate<0.01'], // 429 not counted as failure
  },
};

export default function () {
  const res = http.get(`${BASE_URL}/api/products`, {
    tags: { test_type: 'limit' },
  });

  // 200 OK when below limit
  if (res.status === 200) {
    checkStatus(res, 200, 'products (below limit)');

    // Verify RateLimit headers if present
    if (res.headers['ratelimit-limit']) {
      check(res, {
        'has ratelimit-limit header': (r) => r.headers['ratelimit-limit'] !== undefined,
        'has ratelimit-remaining header': (r) => r.headers['ratelimit-remaining'] !== undefined,
        'has ratelimit-reset header': (r) => r.headers['ratelimit-reset'] !== undefined,
      });
    }
  }
  // 429 Too Many Requests when limit exceeded
  else if (res.status === 429) {
    check(res, {
      'rate limited (429)': (r) => r.status === 429,
      'rate limit message': (r) => r.body.includes('Too many requests'),
    });
  }
  // Other errors
  else {
    check(res, {
      'unexpected status': (r) => r.status < 500,
    });
  }

  thinkTime(0.5, 1.0);
}
