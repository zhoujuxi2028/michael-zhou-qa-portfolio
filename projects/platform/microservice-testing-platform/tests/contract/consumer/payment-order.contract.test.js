/**
 * Consumer Contract Tests: Payment Service → Order Service
 * Validates that Order API responses match the contract Payment expects.
 */
const request = require('supertest');
const Ajv = require('ajv');
const schemas = require('../schemas/order-api.schema');

const ajv = new Ajv();

jest.mock('../../../services/order-service/src/services/inventory-client', () => ({
  checkAndDeduct: jest.fn().mockResolvedValue({
    productId: 'PROD-001',
    deducted: 1,
    remaining: 99,
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

afterAll(() => db.close());

describe('Contract: Payment → Order', () => {
  let orderId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({ productId: 'PROD-001', quantity: 1, unitPrice: 50 });
    orderId = res.body.id;
  });

  // CT-PO-01: Update status to paid
  test('PATCH /api/orders/:id/status (paid) returns contract-compliant response', async () => {
    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .send({ status: 'paid', paymentId: 'PAY-001' });

    expect(res.status).toBe(200);
    const valid = ajv.validate(schemas.statusUpdateResponse, res.body);
    expect(ajv.errors).toBeNull();
    expect(valid).toBe(true);
    expect(res.body.status).toBe('paid');
  });

  // CT-PO-02: Update status to failed (need a new order)
  test('PATCH /api/orders/:id/status (failed) returns contract-compliant response', async () => {
    const create = await request(app)
      .post('/api/orders')
      .send({ productId: 'PROD-001', quantity: 1, unitPrice: 20 });

    const res = await request(app)
      .patch(`/api/orders/${create.body.id}/status`)
      .send({ status: 'failed' });

    expect(res.status).toBe(200);
    const valid = ajv.validate(schemas.statusUpdateResponse, res.body);
    expect(ajv.errors).toBeNull();
    expect(valid).toBe(true);
    expect(res.body.status).toBe('failed');
  });

  // CT-PO-03: Order not found
  test('PATCH non-existent order returns contract-compliant 404', async () => {
    const res = await request(app)
      .patch('/api/orders/ORD-99999999-999/status')
      .send({ status: 'paid' });

    expect(res.status).toBe(404);
    const valid = ajv.validate(schemas.orderNotFoundError, res.body);
    expect(ajv.errors).toBeNull();
    expect(valid).toBe(true);
  });

  // CT-PO-04: Invalid status transition
  test('PATCH invalid transition returns contract-compliant 400', async () => {
    // orderId is already 'paid', trying to set 'pending' is invalid
    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .send({ status: 'pending' });

    expect(res.status).toBe(400);
    const valid = ajv.validate(schemas.invalidTransitionError, res.body);
    expect(ajv.errors).toBeNull();
    expect(valid).toBe(true);
  });

  // CT-PO-05: Query order
  test('GET /api/orders/:id returns contract-compliant response', async () => {
    const res = await request(app).get(`/api/orders/${orderId}`);

    expect(res.status).toBe(200);
    const valid = ajv.validate(schemas.orderResponse, res.body);
    expect(ajv.errors).toBeNull();
    expect(valid).toBe(true);
  });
});
