import http from 'k6/http';
import { sleep } from 'k6';
import { BASE_URL, checkStatus } from './helpers/utils.js';

export const options = {
  stages: [
    { duration: '1m', target: 20 },
    { duration: '3m', target: 50 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000', 'p(99)<3000'],
    http_req_failed: ['rate<0.01'],
    http_reqs: ['rate>8'],
  },
};

export default function () {
  const products = http.get(`${BASE_URL}/api/products?page=1&limit=5`);
  checkStatus(products, 200, 'list products');

  const productId = Math.ceil(Math.random() * 5);
  const detail = http.get(`${BASE_URL}/api/products/${productId}`);
  checkStatus(detail, 200, 'product detail');

  const order = http.post(
    `${BASE_URL}/api/orders`,
    JSON.stringify({ product_id: productId, quantity: 1 }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  checkStatus(order, 201, 'create order');

  sleep(0.5);
}
