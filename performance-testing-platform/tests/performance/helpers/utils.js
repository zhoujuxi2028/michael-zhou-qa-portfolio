import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL } from './env.js';

export { BASE_URL };

export const LEAK_THRESHOLD = 0.5;
export const WARN_THRESHOLD = 0.25;

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

export function pollMetrics(customMetrics) {
  const m = http.get(`${BASE_URL}/metrics`);
  if (m.status === 200) {
    try {
      const body = JSON.parse(m.body);
      if (body.memory && customMetrics.heapUsedMb) {
        customMetrics.heapUsedMb.add(body.memory.heapUsed / 1024 / 1024);
      }
      if (body.eventLoop && customMetrics.eventLoopLag) {
        customMetrics.eventLoopLag.add(body.eventLoop.lag);
      }
    } catch {
      /* ignore parse errors */
    }
  }
}

export function checkMemoryLeak(baselineBytes, finalBytes) {
  if (baselineBytes <= 0) return { leaked: false, ratio: 0, level: 'ok' };
  const ratio = (finalBytes - baselineBytes) / baselineBytes;
  if (ratio > LEAK_THRESHOLD) return { leaked: true, ratio, level: 'critical' };
  if (ratio > WARN_THRESHOLD) return { leaked: false, ratio, level: 'warning' };
  return { leaked: false, ratio, level: 'ok' };
}
