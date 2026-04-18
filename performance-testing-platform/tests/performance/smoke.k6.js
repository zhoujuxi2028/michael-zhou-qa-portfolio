import http from 'k6/http';
import { sleep } from 'k6';
import { BASE_URL, checkStatus, checkDuration } from './helpers/utils.js';
import { randomProduct } from './helpers/data.js';
import { loadProfile } from './helpers/profile.js';

export const options = loadProfile('smoke');

export default function () {
  const health = http.get(`${BASE_URL}/health`, { tags: { endpoint: '/health' } });
  checkStatus(health, 200, 'health');
  checkDuration(health, 200, 'health');

  const products = http.get(`${BASE_URL}/api/products`, { tags: { endpoint: '/api/products' } });
  checkStatus(products, 200, 'products');

  const p = randomProduct();
  const product = http.get(`${BASE_URL}/api/products/${p.id}`, { tags: { endpoint: '/api/products/:id' } });
  checkStatus(product, 200, 'product');

  sleep(1);
}
