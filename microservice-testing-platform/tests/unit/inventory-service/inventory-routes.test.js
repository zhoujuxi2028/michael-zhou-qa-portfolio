const request = require('supertest');

let app;
let db;

beforeEach(() => {
  jest.resetModules();
  process.env.DB_PATH = ':memory:';
  db = require('../../../services/inventory-service/src/db/init');
  app = require('../../../services/inventory-service/src/app');
});

afterEach(() => {
  db.close();
});

describe('Inventory Routes', () => {
  describe('GET /api/inventory/:productId', () => {
    test('returns inventory for existing product', async () => {
      const res = await request(app).get('/api/inventory/PROD-001');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        productId: 'PROD-001',
        productName: 'Widget A',
        quantity: 100,
        reserved: 0,
        available: 100,
      });
    });

    test('returns 404 for non-existent product', async () => {
      const res = await request(app).get('/api/inventory/PROD-999');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('PRODUCT_NOT_FOUND');
    });
  });

  describe('POST /api/inventory/:productId/deduct', () => {
    test('deducts inventory successfully', async () => {
      const res = await request(app)
        .post('/api/inventory/PROD-001/deduct')
        .send({ quantity: 2, orderId: 'ORD-001' });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        productId: 'PROD-001',
        deducted: 2,
        remaining: 98,
        orderId: 'ORD-001',
      });
    });

    test('returns 409 when stock insufficient', async () => {
      const res = await request(app)
        .post('/api/inventory/PROD-001/deduct')
        .send({ quantity: 200, orderId: 'ORD-001' });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('INSUFFICIENT_STOCK');
    });

    test('returns 400 when quantity missing', async () => {
      const res = await request(app)
        .post('/api/inventory/PROD-001/deduct')
        .send({ orderId: 'ORD-001' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/inventory/:productId/rollback', () => {
    test('rolls back inventory successfully', async () => {
      await request(app)
        .post('/api/inventory/PROD-001/deduct')
        .send({ quantity: 5, orderId: 'ORD-001' });

      const res = await request(app)
        .post('/api/inventory/PROD-001/rollback')
        .send({ quantity: 5, orderId: 'ORD-001', reason: 'payment_failed' });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        productId: 'PROD-001',
        rolledBack: 5,
        remaining: 100,
      });
    });
  });

  describe('GET /health', () => {
    test('returns healthy status', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        status: 'healthy',
        service: 'inventory-service',
      });
      expect(res.body.dependencies.database).toBe('connected');
    });
  });
});
