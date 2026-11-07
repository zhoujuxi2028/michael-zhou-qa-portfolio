/**
 * Consumer Contract Tests: Order Service → Inventory Service
 * Validates that Inventory API responses match the contract Order expects.
 */
const request = require('supertest');
const Ajv = require('ajv');
const schemas = require('../schemas/inventory-api.schema');

const ajv = new Ajv();

process.env.DB_PATH = ':memory:';
const db = require('../../../services/inventory-service/src/db/init');
const app = require('../../../services/inventory-service/src/app');

afterAll(() => db.close());

describe('Contract: Order → Inventory', () => {
  // CT-OI-01: Query inventory - success
  test('GET /api/inventory/:productId returns contract-compliant response', async () => {
    const res = await request(app).get('/api/inventory/PROD-001');

    expect(res.status).toBe(200);
    const valid = ajv.validate(schemas.getInventoryResponse, res.body);
    expect(ajv.errors).toBeNull();
    expect(valid).toBe(true);
  });

  // CT-OI-02: Query inventory - not found
  test('GET /api/inventory/:productId returns contract-compliant 404', async () => {
    const res = await request(app).get('/api/inventory/PROD-999');

    expect(res.status).toBe(404);
    const valid = ajv.validate(schemas.notFoundError, res.body);
    expect(ajv.errors).toBeNull();
    expect(valid).toBe(true);
  });

  // CT-OI-03: Deduct inventory - success
  test('POST /api/inventory/:productId/deduct returns contract-compliant response', async () => {
    const res = await request(app)
      .post('/api/inventory/PROD-002/deduct')
      .send({ quantity: 1, orderId: 'ORD-CT-001' });

    expect(res.status).toBe(200);
    const valid = ajv.validate(schemas.deductResponse, res.body);
    expect(ajv.errors).toBeNull();
    expect(valid).toBe(true);
  });

  // CT-OI-04: Deduct inventory - insufficient stock
  test('POST /api/inventory/:productId/deduct returns contract-compliant 409', async () => {
    const res = await request(app)
      .post('/api/inventory/PROD-005/deduct')
      .send({ quantity: 10, orderId: 'ORD-CT-002' });

    expect(res.status).toBe(409);
    const valid = ajv.validate(schemas.insufficientStockError, res.body);
    expect(ajv.errors).toBeNull();
    expect(valid).toBe(true);
  });

  // CT-OI-05: Rollback inventory - success
  test('POST /api/inventory/:productId/rollback returns contract-compliant response', async () => {
    await request(app)
      .post('/api/inventory/PROD-003/deduct')
      .send({ quantity: 3, orderId: 'ORD-CT-003' });

    const res = await request(app)
      .post('/api/inventory/PROD-003/rollback')
      .send({ quantity: 3, orderId: 'ORD-CT-003', reason: 'payment_failed' });

    expect(res.status).toBe(200);
    const valid = ajv.validate(schemas.rollbackResponse, res.body);
    expect(ajv.errors).toBeNull();
    expect(valid).toBe(true);
  });
});
