import { sleep } from 'k6';
import { pollMetrics } from './utils.js';

export const DEFAULT_METRICS_POLL_INTERVAL_MS = 5000;
export const DEFAULT_OBSERVER_VUS = 1;

export function parseDurationToSeconds(duration) {
  const match = /^(\d+)([smh])$/.exec(duration);
  if (!match) {
    throw new Error(`Unsupported duration format: ${duration}`);
  }

  const value = Number(match[1]);
  const unit = match[2];

  if (unit === 's') return value;
  if (unit === 'm') return value * 60;
  return value * 3600;
}

export function buildObserverDurationFromStages(stages) {
  const totalSeconds = stages.reduce((sum, stage) => sum + parseDurationToSeconds(stage.duration), 0);
  return `${totalSeconds}s`;
}

export function buildObserverScenario({ duration, exec = 'observeMetrics', vus = DEFAULT_OBSERVER_VUS } = {}) {
  return {
    executor: 'constant-vus',
    exec,
    vus,
    duration,
    gracefulStop: '0s',
  };
}

export function buildLoadThresholds({
  durationThreshold = 'p(95)<500',
  failedThreshold = 'rate<0.01',
} = {}) {
  return {
    'http_req_duration{scenario:load}': [durationThreshold],
    'http_req_failed{scenario:load}': [failedThreshold],
  };
}

export function observeMetricsCycle(customMetrics) {
  const intervalMs = Number(__ENV.METRICS_POLL_INTERVAL_MS || DEFAULT_METRICS_POLL_INTERVAL_MS);
  pollMetrics(customMetrics, { test_phase: 'observer', endpoint: '/metrics' });
  sleep(intervalMs / 1000);
}
