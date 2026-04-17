import http from 'k6/http';
import { BASE_URL, checkStatus } from './helpers/utils.js';
import { loadProfile } from './helpers/profile.js';
import { thinkTime } from './helpers/thinkTime.js';
import { randomProduct } from './helpers/data.js';

export const options = loadProfile('stress');

/**
 * Execute e-commerce user journey through product browse → detail → order
 * Nested probability model: 100% browse → 50% detail → 33% order
 * Actual traffic ratio: browse 100%, detail ~50%, order ~16.5%
 */
function executeFunnel(baseUrl, options = {}) {
  const { detailProb = 0.5, orderProb = 0.33, onOrder = null } = options;
  const product = randomProduct();

  // 100% browse products list
  const browseRes = http.get(`${baseUrl}/api/products`);
  checkStatus(browseRes, 200, 'browse products');
  thinkTime();

  // ~50% of browsers view product detail (nested probability)
  if (Math.random() < detailProb) {
    const detailRes = http.get(`${baseUrl}/api/products/${product.id}`);
    checkStatus(detailRes, 200, 'product detail');
    thinkTime();

    // ~33% of detail viewers place order (nested probability)
    // Total order ratio: 100% × 50% × 33% ≈ 16.5%
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

      // Invoke callback hook for custom metrics (e.g., soak script tracking)
      if (onOrder && typeof onOrder === 'function') {
        onOrder(orderRes);
      }
    }
  }
}

export default function () {
  executeFunnel(BASE_URL);
}
