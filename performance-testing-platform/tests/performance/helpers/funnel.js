/**
 * E-commerce funnel execution helper
 * Nested probability model: 100% browse → 50% detail → 33% order
 * Actual traffic ratio: browse 100%, detail ~50%, order ~16.5%
 *
 * Design note: Requirements define 60/30/10 as the e-commerce funnel design intent.
 * Implementation uses nested model (vs flat) to match existing script behavior.
 */
import http from 'k6/http';
import { checkStatus } from './utils.js';
import { thinkTime } from './thinkTime.js';
import { randomProduct } from './data.js';

/**
 * Execute e-commerce user journey through product browse → detail → order
 * @param {string} baseUrl - API base URL
 * @param {object} options - Execution options
 *   - detailProb: Probability of viewing product detail (default 0.5 = 50%)
 *   - orderProb: Probability of placing order after viewing detail (default 0.33 = 33%)
 *   - onOrder: Callback function invoked when order placed, receives response object
 */
export function executeFunnel(baseUrl, options = {}) {
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
