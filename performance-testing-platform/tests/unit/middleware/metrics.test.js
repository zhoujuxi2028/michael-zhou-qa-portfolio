const request = require('supertest');
const app = require('../../../src/app');
const { resetMetrics, getMetrics, recordOrderSuccess, recordOrderConflict, recordAuthLatency } = require('../../../src/middleware/metrics');
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
    // 多核系统上 CPU 占用率可超过 100%（N核最高NX100%）
    expect(typeof res.body.cpu.userPercent).toBe('number');
    expect(res.body.cpu.systemPercent).toBeGreaterThanOrEqual(0);
    expect(typeof res.body.cpu.systemPercent).toBe('number');
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

// BM-01: 业务指标单元测试 (Issue #137)
describe('business metrics', () => {
  test('orderSuccess 计数正确', () => {
    recordOrderSuccess();
    recordOrderSuccess();
    recordOrderSuccess();
    const m = getMetrics();
    expect(m.business.orderSuccess).toBe(3);
  });

  test('orderConflict 计数与 orderConflictRate 计算正确', () => {
    recordOrderSuccess();
    recordOrderSuccess();
    recordOrderSuccess();
    recordOrderConflict();
    const m = getMetrics();
    expect(m.business.orderConflict).toBe(1);
    // 1/(3+1) = 25%
    expect(m.business.orderConflictRate).toBe('25.00%');
  });

  test('orderConflictRate 无订单时为 0%', () => {
    const m = getMetrics();
    expect(m.business.orderConflictRate).toBe('0.00%');
  });

  test('authLatencyMs 平均值计算正确', () => {
    recordAuthLatency(100);
    recordAuthLatency(200);
    recordAuthLatency(300);
    const m = getMetrics();
    // (100+200+300)/3 = 200
    expect(m.business.authLatencyMs).toBe(200);
  });

  test('resetMetrics() 会清空业务指标', () => {
    recordOrderSuccess();
    recordOrderConflict();
    recordAuthLatency(150);
    resetMetrics();
    const m = getMetrics();
    expect(m.business.orderSuccess).toBe(0);
    expect(m.business.orderConflict).toBe(0);
    expect(m.business.authLatencyMs).toBe(0);
  });

  test('authLatencyMs 仅保留最近 100 条样本', () => {
    // 写入 105 条数据
    for (let i = 1; i <= 105; i++) {
      recordAuthLatency(i);
    }
    const m = getMetrics();
    // 保留最近100条: 6~105, 平均值 = (6+105)/2 = 55.5 → 56 (四舍五入)
    expect(m.business.authLatencyMs).toBe(56);
  });
});
