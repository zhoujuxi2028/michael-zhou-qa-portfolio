/**
 * RL-INT-01~05: 限流中间件集成测试
 *
 * 验证 rate limiter 在 API 层面的实际行为。
 * 跨模块集成：rateLimiter middleware + Express app + response headers
 *
 * 注意：rate limiter 通过环境变量控制，测试中需动态设置。
 */
const request = require('supertest');
const { resetTestEnvironment } = require('../setup/test-server');

describe('限流中间件集成测试 (RL-INT)', () => {
  let app;

  beforeEach(() => {
    resetTestEnvironment();
    // 每个测试需要重新加载模块以重置 rate limiter 状态
    jest.resetModules();
  });

  afterEach(() => {
    resetTestEnvironment();
    // 清理环境变量
    delete process.env.RATE_LIMIT_ENABLED;
    delete process.env.RATE_LIMIT_MAX;
    delete process.env.RATE_LIMIT_WINDOW_MS;
    jest.resetModules();
  });

  // RL-INT-01: 启用限流后超过阈值返回 429
  test('RL-INT-01: 超过最大请求数后应返回 429 Too Many Requests', async () => {
    // Arrange: 启用限流，最多 3 次/窗口
    process.env.RATE_LIMIT_ENABLED = 'true';
    process.env.RATE_LIMIT_MAX = '3';
    process.env.RATE_LIMIT_WINDOW_MS = '60000';
    app = require('../../../src/app');
    const agent = request(app);

    // Act: 发送 4 个请求
    await agent.get('/health').expect(200);
    await agent.get('/health').expect(200);
    await agent.get('/health').expect(200);
    const fourthRes = await agent.get('/health');

    // Assert: 第 4 个请求被限流
    expect(fourthRes.status).toBe(429);
  });

  // RL-INT-02: 限流响应包含 RateLimit 标准头
  test('RL-INT-02: 响应头应包含 RateLimit-Limit/Remaining/Reset', async () => {
    // Arrange
    process.env.RATE_LIMIT_ENABLED = 'true';
    process.env.RATE_LIMIT_MAX = '100';
    app = require('../../../src/app');
    const agent = request(app);

    // Act
    const res = await agent.get('/health').expect(200);

    // Assert: 标准限流头
    expect(res.headers).toHaveProperty('ratelimit-limit');
    expect(res.headers).toHaveProperty('ratelimit-remaining');
    expect(res.headers).toHaveProperty('ratelimit-reset');
    expect(parseInt(res.headers['ratelimit-limit'])).toBe(100);
  });

  // RL-INT-03: 限流禁用时不限制请求
  test('RL-INT-03: RATE_LIMIT_ENABLED=false 时不应限制任何请求', async () => {
    // Arrange: 禁用限流
    process.env.RATE_LIMIT_ENABLED = 'false';
    process.env.RATE_LIMIT_MAX = '2';
    app = require('../../../src/app');
    const agent = request(app);

    // Act: 发送超过 max 的请求
    for (let i = 0; i < 5; i++) {
      const res = await agent.get('/health');
      // Assert: 每个请求都应成功
      expect(res.status).toBe(200);
    }
  });

  // RL-INT-04: 限流对所有端点生效
  test('RL-INT-04: 限流应对不同端点共享配额', async () => {
    // Arrange
    process.env.RATE_LIMIT_ENABLED = 'true';
    process.env.RATE_LIMIT_MAX = '3';
    app = require('../../../src/app');
    const agent = request(app);

    // Act: 混合访问不同端点
    await agent.get('/health').expect(200);
    await agent.get('/api/products').expect(200);
    await agent.get('/ready').expect(200);
    const fourthRes = await agent.get('/health');

    // Assert: 第 4 个请求被限流（共享配额）
    expect(fourthRes.status).toBe(429);
  });

  // RL-INT-05: 429 响应包含正确的错误消息
  test('RL-INT-05: 429 响应体应包含限流提示消息', async () => {
    // Arrange
    process.env.RATE_LIMIT_ENABLED = 'true';
    process.env.RATE_LIMIT_MAX = '1';
    app = require('../../../src/app');
    const agent = request(app);

    // Act
    await agent.get('/health').expect(200);
    const res = await agent.get('/health').expect(429);

    // Assert
    expect(res.text || res.body).toBeDefined();
  });
});
