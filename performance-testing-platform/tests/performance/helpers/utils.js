import { check } from 'k6';

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export function checkStatus(res, expectedStatus, name) {
  check(res, {
    [`${name} status ${expectedStatus}`]: (r) => r.status === expectedStatus,
  });
}

export function checkDuration(res, maxMs, name) {
  check(res, {
    [`${name} duration < ${maxMs}ms`]: (r) => r.timings.duration < maxMs,
  });
}
