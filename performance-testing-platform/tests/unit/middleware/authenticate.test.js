const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../../src/app');
const { getDatabase, resetDatabase } = require('../../../src/db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'perf-test-secret-key';

afterEach(() => resetDatabase());

describe('authenticate middleware', () => {
  test('UT-MW-01: valid token passes through', async () => {
    const token = jwt.sign(
      { sub: 1, username: 'test', type: 'access', jti: 'valid-jti' },
      JWT_SECRET,
      { expiresIn: '15m' }
    );
    // Use a protected endpoint — register user, then order with token
    const db = getDatabase();
    // Need AUTH_ENABLED for this test — tested separately in UT-MW-07
    // Here just verify the middleware function itself by importing it
    const { authenticate } = require('../../../src/middleware/authenticate');
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    authenticate(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toHaveProperty('sub', 1);
  });

  test('UT-MW-02: missing Authorization header', async () => {
    const { authenticate } = require('../../../src/middleware/authenticate');
    const req = { headers: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('UT-MW-03: invalid token', async () => {
    const { authenticate } = require('../../../src/middleware/authenticate');
    const req = { headers: { authorization: 'Bearer invalid-token' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('UT-MW-04: expired token', async () => {
    const token = jwt.sign({ sub: 1, type: 'access', jti: 'expired-jti' }, JWT_SECRET, {
      expiresIn: '0s',
    });
    // Wait a tick for expiry
    await new Promise((r) => setTimeout(r, 10));
    const { authenticate } = require('../../../src/middleware/authenticate');
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('UT-MW-05: blacklisted token', async () => {
    const token = jwt.sign({ sub: 1, type: 'access', jti: 'blacklisted-jti' }, JWT_SECRET, {
      expiresIn: '15m',
    });
    const db = getDatabase();
    db.prepare('INSERT INTO token_blacklist (token_jti, expired_at) VALUES (?, ?)').run(
      'blacklisted-jti',
      new Date(Date.now() + 900000).toISOString()
    );
    const { authenticate } = require('../../../src/middleware/authenticate');
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();
    authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('AUTH_ENABLED integration', () => {
  test('UT-MW-06: AUTH_ENABLED=false — orders without token succeeds', async () => {
    delete process.env.AUTH_ENABLED;
    const res = await request(app).post('/api/orders').send({ product_id: 1, quantity: 1 });
    expect(res.status).toBe(201);
  });

  test('UT-MW-07: AUTH_ENABLED=true — orders requires token', async () => {
    process.env.AUTH_ENABLED = 'true';
    // Without token — should fail
    const noAuth = await request(app).post('/api/orders').send({ product_id: 1, quantity: 1 });
    expect(noAuth.status).toBe(401);

    // With valid token — should succeed
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'authuser', password: 'pass123' });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ username: 'authuser', password: 'pass123' });
    const token = login.body.accessToken;
    const withAuth = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ product_id: 1, quantity: 1 });
    expect(withAuth.status).toBe(201);

    delete process.env.AUTH_ENABLED;
  });
});
