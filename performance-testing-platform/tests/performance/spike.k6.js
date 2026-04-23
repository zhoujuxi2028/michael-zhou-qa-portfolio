import http from 'k6/http';
import { sleep } from 'k6';
import { BASE_URL, checkStatus } from './helpers/utils.js';
import { loadProfile } from './helpers/profile.js';

export const options = loadProfile('spike');

export default function () {
  const health = http.get(`${BASE_URL}/health`);
  checkStatus(health, 200, 'health');

  const products = http.get(`${BASE_URL}/api/products`);
  checkStatus(products, 200, 'products');

  sleep(0.2);
}
