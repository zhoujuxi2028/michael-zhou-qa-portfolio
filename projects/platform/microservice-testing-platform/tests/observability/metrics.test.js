/**
 * Observability Tests: Prometheus Metrics
 * Verifies metrics endpoints output correct format.
 */
const request = require('supertest');

describe('Observability: Prometheus Metrics', () => {
  // OB-08: Request counter
  test('inventory /metrics includes http_requests_total', async () => {
    jest.resetModules();
    process.env.DB_PATH = ':memory:';
    const db = require('../../services/inventory-service/src/db/init');
    const app = require('../../services/inventory-service/src/app');

    // Make a request to generate metrics
    await request(app).get('/api/inventory/PROD-001');

    const res = await request(app).get('/metrics');

    expect(res.status).toBe(200);
    expect(res.text).toContain('http_requests_total');
    db.close();
  });

  // OB-09: Request duration histogram
  test('inventory /metrics includes http_request_duration_seconds', async () => {
    jest.resetModules();
    process.env.DB_PATH = ':memory:';
    const db = require('../../services/inventory-service/src/db/init');
    const app = require('../../services/inventory-service/src/app');

    const res = await request(app).get('/metrics');

    expect(res.status).toBe(200);
    expect(res.text).toContain('http_request_duration_seconds');
    db.close();
  });

  // OB-10: Custom business metrics
  test('order service exposes orders_created_total metric', async () => {
    jest.resetModules();
    process.env.DB_PATH = ':memory:';

    jest.mock('../../services/order-service/src/services/inventory-client', () => ({
      checkAndDeduct: jest.fn().mockResolvedValue({
        productId: 'PROD-001',
        deducted: 1,
        remaining: 99,
        orderId: 'ORD-001',
      }),
    }));
    jest.mock('../../services/order-service/src/services/redis-publisher', () => ({
      publishOrderCreated: jest.fn().mockResolvedValue(undefined),
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
    }));

    const db = require('../../services/order-service/src/db/init');
    const app = require('../../services/order-service/src/app');

    const res = await request(app).get('/metrics');

    expect(res.status).toBe(200);
    expect(res.text).toContain('orders_created_total');
    db.close();
  });
});
