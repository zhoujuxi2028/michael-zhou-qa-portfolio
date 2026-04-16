/**
 * k6 Helpers Direct Verification Test
 * K6-HLP-INT-01 & K6-HLP-INT-02: Verify helpers (thinkTime, executeFunnel, verifyHealth) exist and are callable
 *
 * This test runs in k6 runtime and directly verifies that all helpers:
 * 1. Can be imported without errors
 * 2. Are functions and callable
 * 3. Don't have syntax errors
 */

import { thinkTime, randomIntBetween } from './helpers/thinkTime.js';
import { executeFunnel } from './helpers/funnel.js';
import { verifyHealth } from './helpers/healthCheck.js';
import { check } from 'k6';

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
}
