const request = require('supertest');

jest.mock('../../../services/order-service/src/services/inventory-client', () => ({
  checkAndDeduct: jest.fn().mockResolvedValue({
    productId: 'PROD-001',
    deducted: 2,
    remaining: 98,
    orderId: 'ORD-001',
  }),
}));

jest.mock('../../../services/order-service/src/services/redis-publisher', () => ({
  publishOrderCreated: jest.fn().mockResolvedValue(undefined),
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
}));

process.env.DB_PATH = ':memory:';

const db = require('../../../services/order-service/src/db/init');
const app = require('../../../services/order-service/src/app');

beforeEach(() => {
  jest.clearAllMocks();
  // Clear orders table between tests
  db.exec('DELETE FROM orders');
});

afterAll(() => {
  db.close();
});

describe('Order Routes', () => {
  describe('POST /api/orders', () => {
    test('creates order with valid payload', async () => {
      const res = await request(app)
        .post('/api/orders')
        .send({ productId: 'PROD-001', quantity: 2, unitPrice: 29.99 });

      expect(res.status).toBe(201);
      expect(res.body.id).toMatch(/^ORD-/);
      expect(res.body.status).toBe('confirmed');
      expect(res.body.totalAmount).toBe(59.98);
    });

    test('returns 400 when productId is missing', async () => {
      const res = await request(app)
        .post('/api/orders')
        .send({ quantity: 2, unitPrice: 29.99 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/orders/:id', () => {
    test('returns order when it exists', async () => {
      const create = await request(app)
        .post('/api/orders')
        .send({ productId: 'PROD-001', quantity: 1, unitPrice: 10 });

      const res = await request(app).get(`/api/orders/${create.body.id}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(create.body.id);
    });

    test('returns 404 for non-existent order', async () => {
      const res = await request(app).get('/api/orders/ORD-99999999-999');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('ORDER_NOT_FOUND');
    });
  });

  describe('PATCH /api/orders/:id/status', () => {
    test('updates order status', async () => {
      const create = await request(app)
        .post('/api/orders')
        .send({ productId: 'PROD-001', quantity: 1, unitPrice: 10 });

      const res = await request(app)
        .patch(`/api/orders/${create.body.id}/status`)
        .send({ status: 'paid', paymentId: 'PAY-001' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('paid');
    });
  });

  describe('GET /health', () => {
    test('returns healthy status', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body.service).toBe('order-service');
      expect(res.body.status).toBe('healthy');
    });
  });
});
