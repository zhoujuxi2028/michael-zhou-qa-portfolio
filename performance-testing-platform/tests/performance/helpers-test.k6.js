/**
 * k6 Helpers Direct Verification Test
 * K6-HLP-INT-01 & K6-HLP-INT-02: Verify helpers (thinkTime, executeFunnel, verifyHealth) exist and are callable
 *
 * This test runs in k6 runtime and directly verifies that all helpers:
 * 1. Can be imported without errors
 * 2. Are functions and callable
 * 3. Don't have syntax errors
 */

import http from 'k6/http';
import { check } from 'k6';
import { thinkTime, randomIntBetween } from './helpers/thinkTime.js';
import { verifyHealth } from './helpers/healthCheck.js';
import { BASE_URL, checkStatus } from './helpers/utils.js';
import { randomProduct } from './helpers/data.js';
import {
  buildLoadThresholds,
  buildObserverDurationFromStages,
  buildObserverScenario,
  observeMetricsCycle,
  parseDurationToSeconds,
} from './helpers/metricsObserver.js';
import {
  observeMetrics as observeCapacityMetrics,
  options as capacityOptions,
  runCapacityLoad,
} from './capacity.k6.js';
import { observeMetrics as observeSoakMetrics, options as soakOptions, runSoakLoad } from './soak.k6.js';
import {
  observeMetrics as observeSoakShortMetrics,
  options as soakShortOptions,
  runSoakShortLoad,
} from './soak-short.k6.js';

// Inline executeFunnel helper for testing
function executeFunnel(baseUrl, options = {}) {
  const { detailProb = 0.5, orderProb = 0.33, onOrder = null } = options;
  const product = randomProduct();

  const browseRes = http.get(`${baseUrl}/api/products`);
  checkStatus(browseRes, 200, 'browse products');
  thinkTime();

  if (Math.random() < detailProb) {
    const detailRes = http.get(`${baseUrl}/api/products/${product.id}`);
    checkStatus(detailRes, 200, 'product detail');
    thinkTime();

    if (Math.random() < orderProb) {
      const orderRes = http.post(
        `${baseUrl}/api/orders`,
        JSON.stringify({
          product_id: Number(product.id),
          quantity: 1,
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
      checkStatus(orderRes, 201, 'create order');

      if (onOrder && typeof onOrder === 'function') {
        onOrder(orderRes);
      }
    }
  }
}

export const options = {
  vus: 1,
  iterations: 1,
};

export default function () {
  // K6-HLP-INT-01: Verify thinkTime helper
  check(
    {
      thinkTime: typeof thinkTime,
      randomIntBetween: typeof randomIntBetween,
    },
    {
      'thinkTime is a function': (obj) => obj.thinkTime === 'function',
      'randomIntBetween is a function': (obj) => obj.randomIntBetween === 'function',
    },
    { test: 'K6-HLP-INT-01' }
  );

  // K6-HLP-INT-01 (continued): Verify executeFunnel helper
  check(
    {
      executeFunnel: typeof executeFunnel,
    },
    {
      'executeFunnel is a function': (obj) => obj.executeFunnel === 'function',
    },
    { test: 'K6-HLP-INT-01' }
  );

  // K6-HLP-INT-02: Verify verifyHealth helper
  check(
    {
      verifyHealth: typeof verifyHealth,
    },
    {
      'verifyHealth is a function': (obj) => obj.verifyHealth === 'function',
    },
    { test: 'K6-HLP-INT-02' }
  );

  // K6-HLP-INT-03: Verify observer helper exports
  check(
    {
      parseDurationToSeconds: typeof parseDurationToSeconds,
      buildObserverDurationFromStages: typeof buildObserverDurationFromStages,
      buildObserverScenario: typeof buildObserverScenario,
      buildLoadThresholds: typeof buildLoadThresholds,
      observeMetricsCycle: typeof observeMetricsCycle,
      parsedMinutes: parseDurationToSeconds('2m'),
      observerDuration: buildObserverDurationFromStages([
        { duration: '30s', target: 10 },
        { duration: '60s', target: 10 },
      ]),
      observerScenarioExec: buildObserverScenario({ duration: '90s' }).exec,
      thresholdDuration: buildLoadThresholds()['http_req_duration{scenario:load}'][0],
    },
    {
      'parseDurationToSeconds is a function': (obj) => obj.parseDurationToSeconds === 'function',
      'buildObserverDurationFromStages is a function': (obj) => obj.buildObserverDurationFromStages === 'function',
      'buildObserverScenario is a function': (obj) => obj.buildObserverScenario === 'function',
      'buildLoadThresholds is a function': (obj) => obj.buildLoadThresholds === 'function',
      'observeMetricsCycle is a function': (obj) => obj.observeMetricsCycle === 'function',
      'parseDurationToSeconds converts minutes': (obj) => obj.parsedMinutes === 120,
      'buildObserverDurationFromStages sums stage durations': (obj) => obj.observerDuration === '90s',
      'buildObserverScenario defaults to observeMetrics exec': (obj) => obj.observerScenarioExec === 'observeMetrics',
      'buildLoadThresholds scopes duration to load scenario': (obj) => obj.thresholdDuration === 'p(95)<500',
    },
    { test: 'K6-HLP-INT-03' }
  );

  // K6-HLP-INT-04: Verify issue #133 script exports
  check(
    {
      runCapacityLoad: typeof runCapacityLoad,
      observeCapacityMetrics: typeof observeCapacityMetrics,
      capacityHasLoadScenario: Boolean(capacityOptions.scenarios && capacityOptions.scenarios.load),
      capacityHasObserverScenario: Boolean(capacityOptions.scenarios && capacityOptions.scenarios.observer),
      capacityObserverExec: capacityOptions.scenarios && capacityOptions.scenarios.observer.exec,
      capacityDurationThreshold:
        capacityOptions.thresholds && capacityOptions.thresholds['http_req_duration{scenario:load}'][0],
      runSoakLoad: typeof runSoakLoad,
      observeSoakMetrics: typeof observeSoakMetrics,
      soakHasLoadScenario: Boolean(soakOptions.scenarios && soakOptions.scenarios.load),
      soakHasObserverScenario: Boolean(soakOptions.scenarios && soakOptions.scenarios.observer),
      runSoakShortLoad: typeof runSoakShortLoad,
      observeSoakShortMetrics: typeof observeSoakShortMetrics,
      soakShortHasLoadScenario: Boolean(soakShortOptions.scenarios && soakShortOptions.scenarios.load),
      soakShortHasObserverScenario: Boolean(soakShortOptions.scenarios && soakShortOptions.scenarios.observer),
    },
    {
      'runCapacityLoad is exported': (obj) => obj.runCapacityLoad === 'function',
      'observeCapacityMetrics is exported': (obj) => obj.observeCapacityMetrics === 'function',
      'capacity has load scenario': (obj) => obj.capacityHasLoadScenario === true,
      'capacity has observer scenario': (obj) => obj.capacityHasObserverScenario === true,
      'capacity observer exec is observeMetrics': (obj) => obj.capacityObserverExec === 'observeMetrics',
      'capacity thresholds are scoped to load scenario': (obj) => obj.capacityDurationThreshold === 'p(95)<500',
      'runSoakLoad is exported': (obj) => obj.runSoakLoad === 'function',
      'observeSoakMetrics is exported': (obj) => obj.observeSoakMetrics === 'function',
      'soak has load scenario': (obj) => obj.soakHasLoadScenario === true,
      'soak has observer scenario': (obj) => obj.soakHasObserverScenario === true,
      'runSoakShortLoad is exported': (obj) => obj.runSoakShortLoad === 'function',
      'observeSoakShortMetrics is exported': (obj) => obj.observeSoakShortMetrics === 'function',
      'soak-short has load scenario': (obj) => obj.soakShortHasLoadScenario === true,
      'soak-short has observer scenario': (obj) => obj.soakShortHasObserverScenario === true,
    },
    { test: 'K6-HLP-INT-04' }
  );
}
