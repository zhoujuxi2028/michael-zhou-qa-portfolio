const request = require('supertest');
const app = require('../../../src/app');
const { resetDatabase } = require('../../../src/db/database');

afterEach(() => resetDatabase());

describe('GET /api/products', () => {
  test('returns paginated product list', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(5);
    expect(res.body.total).toBe(5);
  });

  test('supports pagination params', async () => {
    const res = await request(app).get('/api/products?page=1&limit=2');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });
});

describe('GET /api/products/:id', () => {
  test('returns product by id', async () => {
    const res = await request(app).get('/api/products/1');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Laptop');
  });

  test('returns 404 for missing product', async () => {
    const res = await request(app).get('/api/products/999');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/products', () => {
  test('creates a new product', async () => {
    const res = await request(app)
      .post('/api/products')
      .send({ name: 'Monitor', price: 299.99, stock: 30 });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Monitor');
  });

  test('returns 400 when name missing', async () => {
    const res = await request(app).post('/api/products').send({ price: 100 });
    expect(res.status).toBe(400);
  });
});
