const request = require('supertest');
const app = require('../../../src/app');
const { resetMetrics } = require('../../../src/middleware/metrics');
const { resetDatabase } = require('../../../src/db/database');

beforeEach(() => resetMetrics());
afterEach(() => resetDatabase());

describe('metrics middleware', () => {
  test('tracks request count', async () => {
    await request(app).get('/health');
    await request(app).get('/health');
    const res = await request(app).get('/metrics');
    expect(res.body.requestCount).toBe(2);
  });

  test('tracks average duration', async () => {
    await request(app).get('/health');
    const res = await request(app).get('/metrics');
    expect(res.body.avgDuration).toBeGreaterThanOrEqual(0);
  });
});
