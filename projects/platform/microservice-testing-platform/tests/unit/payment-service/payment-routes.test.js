const request = require('supertest');

jest.mock('../../../services/payment-service/src/services/redis-subscriber', () => ({
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../services/payment-service/src/services/redis-publisher', () => ({
  publishPaymentCompleted: jest.fn().mockResolvedValue(undefined),
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../services/payment-service/src/services/order-client', () => ({
  updateOrderStatus: jest.fn().mockResolvedValue(undefined),
}));

process.env.DB_PATH = ':memory:';

const db = require('../../../services/payment-service/src/db/init');
const app = require('../../../services/payment-service/src/app');
const paymentModel = require('../../../services/payment-service/src/models/payment');

beforeEach(() => {
  jest.clearAllMocks();
  db.exec('DELETE FROM payments');
});

afterAll(() => {
  db.close();
});

describe('Payment Routes', () => {
  describe('GET /api/payments/:orderId', () => {
    test('returns payment for existing order', async () => {
      paymentModel.processPayment({
        orderId: 'ORD-001',
        amount: 59.98,
        correlationId: 'corr-001',
      });

      const res = await request(app).get('/api/payments/ORD-001');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        orderId: 'ORD-001',
        amount: 59.98,
        status: 'completed',
      });
      expect(res.body.id).toMatch(/^PAY-/);
    });

    test('returns 404 for non-existent payment', async () => {
      const res = await request(app).get('/api/payments/ORD-999');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('PAYMENT_NOT_FOUND');
    });
  });

  describe('GET /health', () => {
    test('returns healthy status', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body.service).toBe('payment-service');
      expect(res.body.status).toBe('healthy');
    });
  });
});
