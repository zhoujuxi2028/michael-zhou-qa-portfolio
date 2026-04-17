import http from 'k6/http';
import { Trend } from 'k6/metrics';
import { BASE_URL, checkStatus } from './helpers/utils.js';
import { executeFunnel } from './helpers/funnel.js';
import { thinkTime } from './helpers/thinkTime.js';

// Custom metrics: server-side indicators (polled from /metrics)
const serverEventLoopLag = new Trend('server_event_loop_lag');
const serverHeapUsedMb = new Trend('server_heap_used_mb');
const serverCpuUser = new Trend('server_cpu_user');

export const options = {
  stages: [
    { duration: '30s', target: 10 }, // Warm-up (TQ-02)
    { duration: '60s', target: 5000 }, // Default: stable PASS baseline (max safe ~6000 VUs)
    { duration: '60s', target: 5000 }, // Hold steady
    { duration: '60s', target: 5000 }, // Hold steady
    { duration: '30s', target: 0 }, // Cool-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  executeFunnel(BASE_URL);

  // Poll server metrics every ~10 iterations
  if (Math.random() < 0.1) {
    const m = http.get(`${BASE_URL}/metrics`);
    if (m.status === 200) {
      try {
        const body = JSON.parse(m.body);
        if (body.eventLoop) serverEventLoopLag.add(body.eventLoop.lag);
        if (body.memory) serverHeapUsedMb.add(body.memory.heapUsed / 1024 / 1024);
        if (body.cpu) serverCpuUser.add(body.cpu.user / 1000); // µs → ms
      } catch {
        // ignore parse errors
      }
    }
  }

  thinkTime(0.5, 1.0);
}
