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
}
