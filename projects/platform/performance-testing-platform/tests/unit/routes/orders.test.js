const request = require('supertest');
const app = require('../../../src/app');
const { resetDatabase } = require('../../../src/db/database');

afterEach(() => resetDatabase());

describe('GET /api/orders', () => {
  test('returns empty order list initially', async () => {
    const res = await request(app).get('/api/orders');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });
});

describe('POST /api/orders', () => {
  test('creates order and decrements stock', async () => {
    const res = await request(app).post('/api/orders').send({ product_id: 1, quantity: 2 });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('confirmed');
    expect(res.body.total).toBe(1999.98);
  });

  test('returns 404 for invalid product', async () => {
    const res = await request(app).post('/api/orders').send({ product_id: 999, quantity: 1 });
    expect(res.status).toBe(404);
  });

  test('returns 409 when insufficient stock', async () => {
    const res = await request(app).post('/api/orders').send({ product_id: 1, quantity: 200000 });
    expect(res.status).toBe(409);
  });

  test('returns 400 when fields missing', async () => {
    const res = await request(app).post('/api/orders').send({});
    expect(res.status).toBe(400);
  });
});
