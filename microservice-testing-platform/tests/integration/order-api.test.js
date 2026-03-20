/**
 * Integration Tests: Order Service API
 * Tests with real SQLite DB, mocked external dependencies.
 */
const request = require('supertest');

jest.mock('../../services/order-service/src/services/inventory-client', () => ({
  checkAndDeduct: jest.fn().mockResolvedValue({
    productId: 'PROD-001',
    deducted: 2,
    remaining: 98,
    orderId: 'ORD-001',
  }),
  rollback: jest.fn().mockResolvedValue({}),
}));

jest.mock('../../services/order-service/src/services/redis-publisher', () => ({
  publishOrderCreated: jest.fn().mockResolvedValue(undefined),
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
}));

process.env.DB_PATH = ':memory:';
const db = require('../../services/order-service/src/db/init');
const app = require('../../services/order-service/src/app');
const inventoryClient = require('../../services/order-service/src/services/inventory-client');

beforeEach(() => {
  jest.clearAllMocks();
  db.exec('DELETE FROM orders');
});

afterAll(() => db.close());

describe('Order API Integration', () => {
  // IT-O-01: Create order - full flow with DB write
  test('creates order and persists to database', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({ productId: 'PROD-001', quantity: 2, unitPrice: 29.99 });

    expect(res.status).toBe(201);

    // Verify DB persistence
    const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(res.body.id);
    expect(row).toBeTruthy();
    expect(row.product_id).toBe('PROD-001');
    expect(row.status).toBe('confirmed');
  });

  // IT-O-02: Query order - DB read
  test('reads order from database', async () => {
    const create = await request(app)
      .post('/api/orders')
      .send({ productId: 'PROD-001', quantity: 1, unitPrice: 10 });

    const res = await request(app).get(`/api/orders/${create.body.id}`);

    expect(res.status).toBe(200);
    expect(res.body.productId).toBe('PROD-001');
  });

  // IT-O-03: Order list - pagination
  test('returns paginated order list', async () => {
    for (let i = 0; i < 3; i++) {
      await request(app)
        .post('/api/orders')
        .send({ productId: 'PROD-001', quantity: 1, unitPrice: 10 });
    }

    const res = await request(app).get('/api/orders?page=1&limit=2');

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
    expect(res.body.pagination.total).toBe(3);
    expect(res.body.pagination.page).toBe(1);
  });

  // IT-O-04: Order list - status filter
  test('filters orders by status', async () => {
    await request(app)
      .post('/api/orders')
      .send({ productId: 'PROD-001', quantity: 1, unitPrice: 10 });

    const res = await request(app).get('/api/orders?status=confirmed');

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    res.body.data.forEach((order) => {
      expect(order.status).toBe('confirmed');
    });
  });

  // IT-O-05: Status update - DB persistence
  test('persists status update to database', async () => {
    const create = await request(app)
      .post('/api/orders')
      .send({ productId: 'PROD-001', quantity: 1, unitPrice: 10 });

    await request(app)
      .patch(`/api/orders/${create.body.id}/status`)
      .send({ status: 'paid', paymentId: 'PAY-001' });

    const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(create.body.id);
    expect(row.status).toBe('paid');
    expect(row.payment_id).toBe('PAY-001');
  });

  // IT-O-06: Inventory failure cancels order
  test('cancels order when inventory deduction fails', async () => {
    inventoryClient.checkAndDeduct.mockRejectedValueOnce(
      Object.assign(new Error('INSUFFICIENT_STOCK'), { code: 'INSUFFICIENT_STOCK' })
    );

    const res = await request(app)
      .post('/api/orders')
      .send({ productId: 'PROD-001', quantity: 200, unitPrice: 10 });

    expect(res.status).toBe(409);

    // Verify order is cancelled in DB
    const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(res.body.orderId);
    expect(row.status).toBe('cancelled');
  });
});
