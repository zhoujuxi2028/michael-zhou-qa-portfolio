import http from 'k6/http';
import { sleep } from 'k6';
import { BASE_URL, checkStatus } from './helpers/utils.js';

export const options = {
  stages: [
    { duration: '10s', target: 5 },
    { duration: '5s', target: 100 },
    { duration: '30s', target: 100 },
    { duration: '10s', target: 5 },
    { duration: '30s', target: 5 },
    { duration: '5s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.10'],
  },
};

export default function () {
  const health = http.get(`${BASE_URL}/health`);
  checkStatus(health, 200, 'health');

  const products = http.get(`${BASE_URL}/api/products`);
  checkStatus(products, 200, 'products');

  sleep(0.2);
}
