import http from 'k6/http';
import { sleep } from 'k6';
import { BASE_URL, checkStatus } from './helpers/utils.js';
import { randomProduct } from './helpers/data.js';
import { loadProfile } from './helpers/profile.js';

export const options = loadProfile('load');

export default function () {
  const products = http.get(`${BASE_URL}/api/products?page=1&limit=5`);
  checkStatus(products, 200, 'list products');

  const p = randomProduct();
  const detail = http.get(`${BASE_URL}/api/products/${p.id}`);
  checkStatus(detail, 200, 'product detail');

  const order = http.post(
    `${BASE_URL}/api/orders`,
    JSON.stringify({ product_id: p.id, quantity: 1 }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  checkStatus(order, 201, 'create order');

  sleep(0.5);
}
