import http from 'k6/http';
import { sleep } from 'k6';
import { BASE_URL, checkStatus, checkDuration } from './helpers/utils.js';

export const options = {
  vus: 2,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const health = http.get(`${BASE_URL}/health`);
  checkStatus(health, 200, 'health');
  checkDuration(health, 200, 'health');

  const products = http.get(`${BASE_URL}/api/products`);
  checkStatus(products, 200, 'products');

  const product = http.get(`${BASE_URL}/api/products/1`);
  checkStatus(product, 200, 'product');

  sleep(1);
}
