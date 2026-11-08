/**
 * CROSS-INT-01~05: 跨模块认证保护路由集成测试
 *
 * 验证 AUTH_ENABLED 环境变量对订单路由的保护效果。
 * 跨模块集成：authenticate middleware + orders routes + auth routes + database
 *
 * 注意：AUTH_ENABLED 通过环境变量在请求时动态检查。
 */
const request = require('supertest');
const { resetTestEnvironment } = require('../setup/test-server');

describe('跨模块认证保护路由集成测试 (CROSS-INT)', () => {
  let originalAuthEnabled;

  beforeEach(() => {
    originalAuthEnabled = process.env.AUTH_ENABLED;
    resetTestEnvironment();
  });

  afterEach(() => {
    // 恢复环境变量
    if (originalAuthEnabled !== undefined) {
      process.env.AUTH_ENABLED = originalAuthEnabled;
    } else {
      delete process.env.AUTH_ENABLED;
    }
    resetTestEnvironment();
  });

  // CROSS-INT-01: 认证开启时 → 订单创建需要 token
  test('CROSS-INT-01: AUTH_ENABLED=true 时无 token 创建订单应返回 401', async () => {
    // Arrange
    process.env.AUTH_ENABLED = 'true';
    const app = require('../../../src/app');
    const agent = request(app);

    // Act
    const res = await agent.post('/api/orders').send({ product_id: 1, quantity: 1 });

    // Assert
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/authorization required/i);
  });

  // CROSS-INT-02: 认证开启时 → 有效 token 可以创建订单
  test('CROSS-INT-02: AUTH_ENABLED=true 时有效 token 应可创建订单', async () => {
    // Arrange
    process.env.AUTH_ENABLED = 'true';
    const app = require('../../../src/app');
    const agent = request(app);

    // 注册并登录
    await agent.post('/api/auth/register').send({ username: 'cross_user', password: 'Pass123' });
    const loginRes = await agent
      .post('/api/auth/login')
      .send({ username: 'cross_user', password: 'Pass123' });
    const token = loginRes.body.accessToken;

    // Act
    const orderRes = await agent
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ product_id: 1, quantity: 1 });

    // Assert
    expect(orderRes.status).toBe(201);
    expect(orderRes.body.status).toBe('confirmed');
  });

  // CROSS-INT-03: 认证开启时 → 登出后 token 被拒绝
  test('CROSS-INT-03: AUTH_ENABLED=true 时登出后 token 不应再有效', async () => {
    // Arrange
    process.env.AUTH_ENABLED = 'true';
    const app = require('../../../src/app');
    const agent = request(app);

    await agent.post('/api/auth/register').send({ username: 'logout_user', password: 'Pass123' });
    const loginRes = await agent
      .post('/api/auth/login')
      .send({ username: 'logout_user', password: 'Pass123' });
    const token = loginRes.body.accessToken;

    // Act: 登出
    await agent.post('/api/auth/logout').set('Authorization', `Bearer ${token}`).expect(200);

    // Assert: 使用已登出的 token 创建订单应被拒绝
    const orderRes = await agent
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ product_id: 1, quantity: 1 });

    expect(orderRes.status).toBe(401);
  });

  // CROSS-INT-04: 认证关闭时 → 无 token 也可创建订单
  test('CROSS-INT-04: AUTH_ENABLED 未设置时无 token 应可创建订单', async () => {
    // Arrange
    delete process.env.AUTH_ENABLED;
    const app = require('../../../src/app');
    const agent = request(app);

    // Act
    const res = await agent.post('/api/orders').send({ product_id: 1, quantity: 1 });

    // Assert
    expect(res.status).toBe(201);
  });

  // CROSS-INT-05: 完整用户旅程: 注册 → 登录 → 下单 → 查看订单 → 登出
  test('CROSS-INT-05: 完整用户旅程应端到端通过', async () => {
    // Arrange
    process.env.AUTH_ENABLED = 'true';
    const app = require('../../../src/app');
    const agent = request(app);

    // Step 1: 注册
    const regRes = await agent
      .post('/api/auth/register')
      .send({ username: 'journey_user', password: 'Journey123' });
    expect(regRes.status).toBe(201);

    // Step 2: 登录
    const loginRes = await agent
      .post('/api/auth/login')
      .send({ username: 'journey_user', password: 'Journey123' });
    expect(loginRes.status).toBe(200);
    const { accessToken, refreshToken } = loginRes.body;

    // Step 3: 下单（使用 seed 产品）
    const orderRes = await agent
      .post('/api/orders')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ product_id: 1, quantity: 2 });
    expect(orderRes.status).toBe(201);
    expect(orderRes.body.quantity).toBe(2);

    // Step 4: 查看订单列表
    const ordersRes = await agent.get('/api/orders').expect(200);
    expect(ordersRes.body.total).toBeGreaterThanOrEqual(1);

    // Step 5: 登出
    const logoutRes = await agent
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ refreshToken });
    expect(logoutRes.status).toBe(200);

    // Step 6: 登出后无法下单
    const failedOrder = await agent
      .post('/api/orders')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ product_id: 1, quantity: 1 });
    expect(failedOrder.status).toBe(401);
  });
});
