const client = require('prom-client');

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'path', 'status'],
  registers: [register],
});

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path'],
  registers: [register],
});

const paymentsProcessedTotal = new client.Counter({
  name: 'payments_processed_total',
  help: 'Total payments processed',
  labelNames: ['result'],
  registers: [register],
});

module.exports = { register, httpRequestsTotal, httpRequestDuration, paymentsProcessedTotal };
