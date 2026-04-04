import http from 'k6/http';
import { sleep } from 'k6';
import { BASE_URL, checkStatus } from './helpers/utils.js';
import { randomProduct } from './helpers/data.js';
import { loadProfile } from './helpers/profile.js';

export const options = loadProfile('stress');

export default function () {
  const products = http.get(`${BASE_URL}/api/products`);
  checkStatus(products, 200, 'products');

  const p = randomProduct();
  http.post(`${BASE_URL}/api/orders`, JSON.stringify({ product_id: p.id, quantity: 1 }), {
    headers: { 'Content-Type': 'application/json' },
  });

  sleep(0.3);
}
