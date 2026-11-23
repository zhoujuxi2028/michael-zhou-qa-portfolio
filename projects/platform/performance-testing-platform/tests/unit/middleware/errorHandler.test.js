/**
 * UT-ERR-01~09: JSON error responses without stack traces (DEF-028, CWE-209)
 */
const express = require('express');
const request = require('supertest');
const app = require('../../../src/app');
const { resetDatabase } = require('../../../src/db/database');
const { errorHandler, notFoundHandler } = require('../../../src/middleware/errorHandler');

const LEAK_PATTERN = /\bat .+\(|node_modules|[\\/]src[\\/]|Error:/;

function expectSafeJson(res, status, error) {
  expect(res.status).toBe(status);
  expect(res.headers['content-type']).toMatch(/application\/json/);
  expect(res.body).toEqual({ error });
  expect(res.text).not.toMatch(LEAK_PATTERN);
}

function buildApp(handler) {
  const mini = express();
  mini.get('/boom', handler);
  mini.use(notFoundHandler);
  mini.use(errorHandler);
  return mini;
}

afterEach(() => resetDatabase());

describe('errorHandler middleware', () => {
  test('UT-ERR-01: sync throw → 500 generic JSON, no stack', async () => {
    const mini = buildApp(() => {
      throw new Error('db password=secret at /srv/app/src/db.js');
    });
    expectSafeJson(await request(mini).get('/boom'), 500, 'Internal server error');
  });

  test('UT-ERR-02: async rejection → 500 generic JSON', async () => {
    const mini = buildApp(async () => {
      throw new Error('async failure');
    });
    expectSafeJson(await request(mini).get('/boom'), 500, 'Internal server error');
  });

  test('UT-ERR-03: client error status → status text only, not err.message', async () => {
    const mini = buildApp(() => {
      const err = new Error('internal detail');
      err.status = 413;
      throw err;
    });
    expectSafeJson(await request(mini).get('/boom'), 413, 'Payload Too Large');
  });

  test.each([[200], [99], ['abc'], [700]])(
    'UT-ERR-04: invalid err.status %p → 500',
    async (status) => {
      const mini = buildApp(() => {
        const err = new Error('x');
        err.status = status;
        throw err;
      });
      expectSafeJson(await request(mini).get('/boom'), 500, 'Internal server error');
    }
  );

  test('UT-ERR-05: headers already sent → delegates to next(err)', () => {
    const next = jest.fn();
    const err = new Error('late');
    errorHandler(err, {}, { headersSent: true }, next);
    expect(next).toHaveBeenCalledWith(err);
  });
});

describe('app error responses', () => {
  test('UT-ERR-06: malformed JSON → 400 JSON', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Content-Type', 'application/json')
      .send('{bad');
    expectSafeJson(res, 400, 'Invalid JSON body');
  });

  test('UT-ERR-07: unknown route → 404 JSON', async () => {
    expectSafeJson(await request(app).get('/nope'), 404, 'Not found');
    expectSafeJson(await request(app).post('/api/nope').send({}), 404, 'Not found');
  });

  test('UT-ERR-08: payload too large → 413 JSON', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ x: 'a'.repeat(200000) }));
    expectSafeJson(res, 413, 'Payload Too Large');
  });

  test('UT-ERR-09: no stack trace even when NODE_ENV=development', async () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    try {
      const res = await request(app)
        .post('/api/orders')
        .set('Content-Type', 'application/json; charset=foo')
        .send('{}');
      expectSafeJson(res, 415, 'Unsupported Media Type');
    } finally {
      process.env.NODE_ENV = original;
    }
  });
});
