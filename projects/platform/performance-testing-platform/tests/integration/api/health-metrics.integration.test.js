/**
 * METRICS-INT-01~06: 健康检查与指标采集集成测试
 *
 * 验证 /health, /ready, /metrics 端点返回的完整指标结构。
 * 跨模块集成：health routes + metrics middleware + business metrics
 */
const {
  createTestClient,
  resetTestEnvironment,
  createTestProduct,
} = require('../setup/test-server');

describe('健康与指标集成测试 (METRICS-INT)', () => {
  let agent;

  beforeEach(() => {
    resetTestEnvironment();
    agent = createTestClient();
  });

  afterEach(() => {
    resetTestEnvironment();
  });

  // METRICS-INT-01: /health 返回正确结构
  test('METRICS-INT-01: /health 应返回 status:ok 和 timestamp', async () => {
    const res = await agent.get('/health').expect(200);

    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('timestamp');
    expect(new Date(res.body.timestamp).getTime()).not.toBeNaN();
  });

  // METRICS-INT-02: /ready 返回就绪状态
  test('METRICS-INT-02: /ready 应返回 ready:true', async () => {
    const res = await agent.get('/ready').expect(200);
    expect(res.body.ready).toBe(true);
  });

  // METRICS-INT-03: /metrics 返回完整指标结构（CPU/Memory/EventLoop/Business）
  test('METRICS-INT-03: /metrics 应返回 CPU、内存、事件循环和业务指标', async () => {
    const res = await agent.get('/metrics').expect(200);
    const m = res.body;

    // CPU 指标
    expect(m.cpu).toBeDefined();
    expect(typeof m.cpu.userPercent).toBe('number');
    expect(typeof m.cpu.systemPercent).toBe('number');
    expect(m.cpu.loadavg).toHaveLength(3);

    // 内存指标
    expect(m.memory).toBeDefined();
    expect(m.memory.rss).toBeGreaterThan(0);
    expect(m.memory.heapUsed).toBeGreaterThan(0);
    expect(m.memory.heapTotal).toBeGreaterThan(0);
    expect(m.memory.totalMem).toBeGreaterThan(0);
    expect(m.memory.freeMem).toBeGreaterThan(0);

    // 事件循环
    expect(m.eventLoop).toBeDefined();
    expect(typeof m.eventLoop.lag).toBe('number');

    // 业务指标
    expect(m.business).toBeDefined();
    expect(typeof m.business.orderSuccess).toBe('number');
    expect(typeof m.business.orderConflict).toBe('number');
    expect(m.business).toHaveProperty('orderConflictRate');
    expect(m.business).toHaveProperty('authLatencyMs');
  });

  // METRICS-INT-04: 请求后 requestCount 递增
  test('METRICS-INT-04: 发送多个请求后 requestCount 应递增', async () => {
    // Act: 发送 5 个请求
    for (let i = 0; i < 5; i++) {
      await agent.get('/health').expect(200);
    }

    // Assert: requestCount ≥ 5
    const res = await agent.get('/metrics').expect(200);
    expect(res.body.requestCount).toBeGreaterThanOrEqual(5);
  });

  // METRICS-INT-05: 订单操作后业务指标更新
  test('METRICS-INT-05: 创建订单后 orderSuccess 指标应递增', async () => {
    // Arrange: 使用 seed 产品下单
    await agent.post('/api/orders').send({ product_id: 1, quantity: 1 }).expect(201);

    // Act: 查询指标
    const res = await agent.get('/metrics').expect(200);

    // Assert
    expect(res.body.business.orderSuccess).toBeGreaterThanOrEqual(1);
  });

  // METRICS-INT-06: 库存冲突后 orderConflict 指标更新
  test('METRICS-INT-06: 库存冲突后 orderConflict 指标应递增', async () => {
    // Arrange: 创建库存仅 1 的产品
    const product = await createTestProduct(agent, {
      name: 'ConflictMetric',
      price: 10,
      stock: 1,
    });

    // Act: 第 1 次下单成功
    await agent.post('/api/orders').send({ product_id: product.id, quantity: 1 }).expect(201);
    // 第 2 次下单触发冲突
    await agent.post('/api/orders').send({ product_id: product.id, quantity: 1 }).expect(409);

    // Assert
    const res = await agent.get('/metrics').expect(200);
    expect(res.body.business.orderConflict).toBeGreaterThanOrEqual(1);
    expect(res.body.business.orderSuccess).toBeGreaterThanOrEqual(1);
  });
});
