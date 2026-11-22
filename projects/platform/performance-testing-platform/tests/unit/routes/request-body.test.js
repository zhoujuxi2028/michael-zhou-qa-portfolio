/**
 * UT-BODY-01~05: POST without a request body (DEF-026)
 *
 * Express 5 leaves req.body undefined when no body is sent; routes that
 * destructure req.body must respond like an empty JSON body, not 500.
 */
const request = require('supertest');
const app = require('../../../src/app');
const { resetDatabase } = require('../../../src/db/database');

afterEach(() => resetDatabase());

describe('POST without request body', () => {
  test.each([
    ['UT-BODY-01', '/api/auth/register', 400],
    ['UT-BODY-02', '/api/auth/login', 401],
    ['UT-BODY-03', '/api/auth/refresh', 401],
    ['UT-BODY-04', '/api/products', 400],
    ['UT-BODY-05', '/api/orders', 400],
  ])('%s: %s responds %i, same as empty JSON body', async (_id, url, status) => {
    const noBody = await request(app).post(url);
    const emptyBody = await request(app).post(url).send({});
    expect(noBody.status).toBe(status);
    expect(noBody.body).toEqual(emptyBody.body);
  });
});
