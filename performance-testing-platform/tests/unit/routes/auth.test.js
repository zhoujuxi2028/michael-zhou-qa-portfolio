const request = require('supertest');
const app = require('../../../src/app');
const { resetDatabase } = require('../../../src/db/database');

afterEach(() => resetDatabase());

describe('POST /api/auth/register', () => {
  test('UT-AUTH-01: register success', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'testuser', password: 'pass123' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.username).toBe('testuser');
    expect(res.body).not.toHaveProperty('password_hash');
  });

  test('UT-AUTH-02: register missing fields', async () => {
    const res = await request(app).post('/api/auth/register').send({});
    expect(res.status).toBe(400);
  });

  test('UT-AUTH-03: register duplicate username', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'dupuser', password: 'pass123' });
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'dupuser', password: 'pass456' });
    expect(res.status).toBe(409);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'loginuser', password: 'pass123' });
  });

  test('UT-AUTH-04: login success', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'loginuser', password: 'pass123' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
  });

  test('UT-AUTH-05: login wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'loginuser', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  test('UT-AUTH-06: login non-existent user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'nouser', password: 'pass123' });
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/refresh', () => {
  let refreshToken;

  beforeEach(async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'refreshuser', password: 'pass123' });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ username: 'refreshuser', password: 'pass123' });
    refreshToken = login.body.refreshToken;
  });

  test('UT-AUTH-07: refresh success', async () => {
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
  });

  test('UT-AUTH-08: refresh invalid token', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'invalid-token' });
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  let accessToken;
  let refreshToken;

  beforeEach(async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'logoutuser', password: 'pass123' });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ username: 'logoutuser', password: 'pass123' });
    accessToken = login.body.accessToken;
    refreshToken = login.body.refreshToken;
  });

  test('UT-AUTH-09: logout success', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Logged out');
  });

  test('UT-AUTH-10: refresh fails after logout (jti blacklisted)', async () => {
    await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ refreshToken });
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(res.status).toBe(401);
  });
});
