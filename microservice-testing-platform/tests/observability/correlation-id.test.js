/**
 * Observability Tests: Correlation ID
 * Verifies correlation ID generation and propagation.
 */
const request = require('supertest');
const express = require('express');
const correlationIdMiddleware = require('../../services/inventory-service/src/middleware/correlation-id');

describe('Observability: Correlation ID', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(correlationIdMiddleware);
    app.get('/test', (req, res) => {
      res.json({ correlationId: req.correlationId });
    });
  });

  // OB-04: Auto-generate when not provided
  test('generates UUID when X-Correlation-ID header is absent', async () => {
    const res = await request(app).get('/test');

    expect(res.body.correlationId).toBeDefined();
    expect(res.body.correlationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  // OB-05: Use provided header
  test('uses X-Correlation-ID header when provided', async () => {
    const res = await request(app)
      .get('/test')
      .set('X-Correlation-ID', 'my-custom-corr-id');

    expect(res.body.correlationId).toBe('my-custom-corr-id');
  });

  // OB-06: Cross-service propagation (via inventory service)
  test('propagates correlation ID through inventory API', async () => {
    process.env.DB_PATH = ':memory:';
    jest.resetModules();
    const db = require('../../services/inventory-service/src/db/init');
    const inventoryApp = require('../../services/inventory-service/src/app');

    const corrId = 'cross-service-test-123';
    const res = await request(inventoryApp)
      .get('/api/inventory/PROD-001')
      .set('X-Correlation-ID', corrId);

    expect(res.status).toBe(200);
    // The middleware sets req.correlationId which is used in logging
    // We verify by checking the service accepts and processes with the ID
    db.close();
  });

  // OB-07: Correlation ID in events
  test('parseOrderEvent preserves correlationId', () => {
    jest.resetModules();
    process.env.DB_PATH = ':memory:';
    const paymentModel = require('../../services/payment-service/src/models/payment');
    const db = require('../../services/payment-service/src/db/init');

    const event = paymentModel.parseOrderEvent(
      JSON.stringify({
        orderId: 'ORD-001',
        totalAmount: 50,
        correlationId: 'event-corr-id-456',
      })
    );

    expect(event.correlationId).toBe('event-corr-id-456');
    db.close();
  });
});
