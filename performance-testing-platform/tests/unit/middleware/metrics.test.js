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

  // SM-01: Process-level CPU
  test('/metrics returns cpu object with userPercent, systemPercent, loadavg', async () => {
    const res = await request(app).get('/metrics');
    expect(res.body.cpu).toBeDefined();
    expect(res.body.cpu.userPercent).toBeGreaterThanOrEqual(0);
    expect(res.body.cpu.systemPercent).toBeGreaterThanOrEqual(0);
    expect(res.body.cpu.loadavg).toHaveLength(3);
  });

  // SM-02: Process-level memory
  test('/metrics returns memory object with rss, heapUsed, freeMem', async () => {
    const res = await request(app).get('/metrics');
    expect(res.body.memory).toBeDefined();
    expect(res.body.memory.rss).toBeGreaterThan(0);
    expect(res.body.memory.heapUsed).toBeGreaterThan(0);
    expect(res.body.memory.freeMem).toBeGreaterThan(0);
  });

  // SM-03: Event loop lag
  test('/metrics returns eventLoop object with lag >= 0', async () => {
    const res = await request(app).get('/metrics');
    expect(res.body.eventLoop).toBeDefined();
    expect(res.body.eventLoop.lag).toBeGreaterThanOrEqual(0);
  });
});
