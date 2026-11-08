/**
 * Integration Tests: Inventory Service API
 * Tests with real SQLite DB.
 */
const request = require('supertest');

process.env.DB_PATH = ':memory:';
const db = require('../../services/inventory-service/src/db/init');
const app = require('../../services/inventory-service/src/app');

afterAll(() => db.close());

describe('Inventory API Integration', () => {
  // IT-I-01: Deduct inventory - DB update
  test('deducts quantity from database', async () => {
    const res = await request(app)
      .post('/api/inventory/PROD-001/deduct')
      .send({ quantity: 5, orderId: 'ORD-IT-001' });

    expect(res.status).toBe(200);

    const row = db.prepare('SELECT * FROM inventory WHERE product_id = ?').get('PROD-001');
    expect(row.quantity).toBe(95);
  });

  // IT-I-02: Rollback inventory - DB restore
  test('restores quantity in database after rollback', async () => {
    await request(app)
      .post('/api/inventory/PROD-002/deduct')
      .send({ quantity: 3, orderId: 'ORD-IT-002' });

    await request(app)
      .post('/api/inventory/PROD-002/rollback')
      .send({ quantity: 3, orderId: 'ORD-IT-002', reason: 'payment_failed' });

    const row = db.prepare('SELECT * FROM inventory WHERE product_id = ?').get('PROD-002');
    expect(row.quantity).toBe(50);
  });

  // IT-I-03: Concurrent deduction safety
  test('prevents overselling with concurrent deductions', async () => {
    // PROD-004 has quantity=10
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(
        request(app)
          .post('/api/inventory/PROD-004/deduct')
          .send({ quantity: 3, orderId: `ORD-IT-CONC-${i}` })
      );
    }

    const results = await Promise.all(promises);
    const successes = results.filter((r) => r.status === 200);
    const failures = results.filter((r) => r.status === 409);

    expect(successes.length).toBe(3); // 3 × 3 = 9, only 10 available
    expect(failures.length).toBe(2); // 4th and 5th would exceed

    const row = db.prepare('SELECT * FROM inventory WHERE product_id = ?').get('PROD-004');
    expect(row.quantity).toBe(1); // 10 - 9 = 1
  });

  // IT-I-04: Seed data loaded correctly
  test('loads seed data on initialization', async () => {
    const res = await request(app).get('/api/inventory/PROD-003');

    expect(res.status).toBe(200);
    expect(res.body.productName).toBe('Widget C');
  });

  // IT-I-05: Deduct + rollback transaction integrity
  test('maintains data integrity through deduct and rollback', async () => {
    const initial = await request(app).get('/api/inventory/PROD-003');
    const originalQty = initial.body.quantity;

    await request(app)
      .post('/api/inventory/PROD-003/deduct')
      .send({ quantity: 10, orderId: 'ORD-IT-INTEGRITY' });

    await request(app)
      .post('/api/inventory/PROD-003/rollback')
      .send({ quantity: 10, orderId: 'ORD-IT-INTEGRITY', reason: 'test' });

    const afterRollback = await request(app).get('/api/inventory/PROD-003');
    expect(afterRollback.body.quantity).toBe(originalQty);
  });

  // IT-I-06: Transaction records
  test('records transactions for audit trail', async () => {
    await request(app)
      .post('/api/inventory/PROD-003/deduct')
      .send({ quantity: 1, orderId: 'ORD-IT-AUDIT' });

    const tx = db
      .prepare('SELECT * FROM inventory_transactions WHERE order_id = ?')
      .get('ORD-IT-AUDIT');
    expect(tx).toBeTruthy();
    expect(tx.type).toBe('deduct');
    expect(tx.quantity).toBe(1);
  });
});
