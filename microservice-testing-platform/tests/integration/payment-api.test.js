/**
 * Integration Tests: Payment Service API
 * Tests with real SQLite DB, mocked Redis/Order client.
 */
const request = require('supertest');

jest.mock('../../services/payment-service/src/services/redis-subscriber', () => ({
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../services/payment-service/src/services/redis-publisher', () => ({
  publishPaymentCompleted: jest.fn().mockResolvedValue(undefined),
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../services/payment-service/src/services/order-client', () => ({
  updateOrderStatus: jest.fn().mockResolvedValue({}),
}));

process.env.DB_PATH = ':memory:';
const db = require('../../services/payment-service/src/db/init');
const app = require('../../services/payment-service/src/app');
const paymentModel = require('../../services/payment-service/src/models/payment');

beforeEach(() => {
  db.exec('DELETE FROM payments');
});

afterAll(() => db.close());

describe('Payment API Integration', () => {
  // IT-P-01: Payment record persisted
  test('persists payment to database', () => {
    const payment = paymentModel.processPayment({
      orderId: 'ORD-IT-P01',
      amount: 59.98,
      correlationId: 'corr-001',
    });

    const row = db.prepare('SELECT * FROM payments WHERE id = ?').get(payment.id);
    expect(row).toBeTruthy();
    expect(row.order_id).toBe('ORD-IT-P01');
    expect(row.status).toBe('completed');
  });

  // IT-P-02: Query payment via API
  test('returns payment via REST endpoint', async () => {
    paymentModel.processPayment({
      orderId: 'ORD-IT-P02',
      amount: 25.0,
      correlationId: 'corr-002',
    });

    const res = await request(app).get('/api/payments/ORD-IT-P02');

    expect(res.status).toBe(200);
    expect(res.body.orderId).toBe('ORD-IT-P02');
    expect(res.body.amount).toBe(25.0);
  });

  // IT-P-03: Failed payment persisted
  test('persists failed payment with correct status', () => {
    const payment = paymentModel.processPayment({
      orderId: 'ORD-IT-P03',
      amount: 999.99,
      correlationId: 'corr-003',
    });

    expect(payment.status).toBe('failed');

    const row = db.prepare('SELECT * FROM payments WHERE id = ?').get(payment.id);
    expect(row.status).toBe('failed');
  });

  // IT-P-04: Idempotent payment processing
  test('does not create duplicate payment for same order', () => {
    paymentModel.processPayment({
      orderId: 'ORD-IT-P04',
      amount: 50.0,
      correlationId: 'corr-004',
    });

    paymentModel.processPayment({
      orderId: 'ORD-IT-P04',
      amount: 50.0,
      correlationId: 'corr-004',
    });

    const rows = db.prepare('SELECT * FROM payments WHERE order_id = ?').all('ORD-IT-P04');
    expect(rows.length).toBe(1);
  });

  // IT-P-05: Correlation ID stored
  test('stores correlation ID in payment record', () => {
    paymentModel.processPayment({
      orderId: 'ORD-IT-P05',
      amount: 30.0,
      correlationId: 'corr-test-123',
    });

    const row = db.prepare('SELECT * FROM payments WHERE order_id = ?').get('ORD-IT-P05');
    expect(row.correlation_id).toBe('corr-test-123');
  });

  // IT-P-06: Event parsing - valid
  test('parses valid order event', () => {
    const event = paymentModel.parseOrderEvent(
      JSON.stringify({
        orderId: 'ORD-001',
        productId: 'PROD-001',
        quantity: 2,
        totalAmount: 59.98,
        correlationId: 'corr-001',
      })
    );

    expect(event).toBeTruthy();
    expect(event.orderId).toBe('ORD-001');
  });

  // IT-P-07: Event parsing - invalid JSON
  test('returns null for invalid JSON event', () => {
    const event = paymentModel.parseOrderEvent('not json');
    expect(event).toBeNull();
  });

  // IT-P-08: Callback payload construction
  test('builds correct callback for completed payment', () => {
    const payment = paymentModel.processPayment({
      orderId: 'ORD-IT-P08',
      amount: 50.0,
      correlationId: 'corr-008',
    });

    const callback = paymentModel.buildCallbackPayload(payment);
    expect(callback.status).toBe('paid');
    expect(callback.paymentId).toBe(payment.id);
  });
});
