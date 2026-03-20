const { PAYMENT_FAILURE_THRESHOLD } = require('../../../shared/constants');

let db;
let paymentModel;

beforeEach(() => {
  jest.resetModules();
  process.env.DB_PATH = ':memory:';
  db = require('../../../services/payment-service/src/db/init');
  paymentModel = require('../../../services/payment-service/src/models/payment');
});

afterEach(() => {
  db.close();
});

describe('Payment Model', () => {
  // UT-P-01: Process payment - valid amount
  test('creates payment with completed status for valid amount', () => {
    const result = paymentModel.processPayment({
      orderId: 'ORD-001',
      amount: 59.98,
      correlationId: 'corr-001',
    });

    expect(result.id).toMatch(/^PAY-\d{3}$/);
    expect(result.order_id).toBe('ORD-001');
    expect(result.amount).toBe(59.98);
    expect(result.status).toBe('completed');
  });

  // UT-P-02: Process payment - amount is 0
  test('throws error when amount is zero', () => {
    expect(() => {
      paymentModel.processPayment({ orderId: 'ORD-001', amount: 0 });
    }).toThrow();
  });

  // UT-P-03: Process payment - simulated failure
  test('creates payment with failed status for amount >= threshold', () => {
    const result = paymentModel.processPayment({
      orderId: 'ORD-001',
      amount: PAYMENT_FAILURE_THRESHOLD,
      correlationId: 'corr-001',
    });

    expect(result.status).toBe('failed');
  });

  // UT-P-04: Payment ID format
  test('generates payment ID in correct format', () => {
    const result = paymentModel.processPayment({
      orderId: 'ORD-001',
      amount: 10,
      correlationId: 'corr-001',
    });

    expect(result.id).toMatch(/^PAY-\d{3}$/);
  });

  // UT-P-05: Duplicate payment - idempotent
  test('returns existing payment for duplicate orderId', () => {
    const first = paymentModel.processPayment({
      orderId: 'ORD-001',
      amount: 59.98,
      correlationId: 'corr-001',
    });
    const second = paymentModel.processPayment({
      orderId: 'ORD-001',
      amount: 59.98,
      correlationId: 'corr-001',
    });

    expect(second.id).toBe(first.id);
    expect(second.alreadyProcessed).toBe(true);
  });

  // UT-P-06: Get payment - exists
  test('returns payment when it exists', () => {
    paymentModel.processPayment({
      orderId: 'ORD-001',
      amount: 59.98,
      correlationId: 'corr-001',
    });

    const result = paymentModel.getByOrderId('ORD-001');
    expect(result.order_id).toBe('ORD-001');
  });

  // UT-P-07: Get payment - not found
  test('returns null when payment does not exist', () => {
    const result = paymentModel.getByOrderId('ORD-999');
    expect(result).toBeNull();
  });

  // UT-P-08: Parse event - valid payload
  test('parses valid order.created event payload', () => {
    const payload = JSON.stringify({
      orderId: 'ORD-001',
      productId: 'PROD-001',
      quantity: 2,
      totalAmount: 59.98,
      correlationId: 'corr-001',
    });

    const result = paymentModel.parseOrderEvent(payload);
    expect(result.orderId).toBe('ORD-001');
    expect(result.totalAmount).toBe(59.98);
  });

  // UT-P-09: Parse event - missing field
  test('returns null for event missing required fields', () => {
    const payload = JSON.stringify({ productId: 'PROD-001' });
    const result = paymentModel.parseOrderEvent(payload);
    expect(result).toBeNull();
  });

  // UT-P-10: Build callback payload
  test('builds correct callback payload', () => {
    const payment = {
      id: 'PAY-001',
      order_id: 'ORD-001',
      status: 'completed',
    };

    const result = paymentModel.buildCallbackPayload(payment);
    expect(result).toEqual({
      status: 'paid',
      paymentId: 'PAY-001',
    });
  });
});
