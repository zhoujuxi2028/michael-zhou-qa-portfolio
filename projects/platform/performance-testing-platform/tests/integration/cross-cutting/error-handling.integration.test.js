/**
 * ERR-INT-01~05: 错误处理集成测试
 *
 * 验证 API 层面的统一错误处理和边界条件。
 * 跨模块集成：Express error handling + routes + middleware
 */
const { createTestClient, resetTestEnvironment } = require('../setup/test-server');

describe('错误处理集成测试 (ERR-INT)', () => {
  let agent;

  beforeEach(() => {
    resetTestEnvironment();
    agent = createTestClient();
  });

  afterEach(() => {
    resetTestEnvironment();
  });

  // ERR-INT-01: 无效 JSON body 返回错误
  test('ERR-INT-01: 发送无效 JSON 应返回 400 错误', async () => {
    const res = await agent
      .post('/api/products')
      .set('Content-Type', 'application/json')
      .send('{ invalid json }');

    // Express json parser 默认返回 400
    expect(res.status).toBe(400);
  });

  // ERR-INT-02: 空 body 创建产品返回 400
  test('ERR-INT-02: 空 body 创建产品应返回 400', async () => {
    const res = await agent.post('/api/products').send({}).expect(400);

    expect(res.body.error).toBeDefined();
  });

  // ERR-INT-03: 无效分页参数应使用默认值
  test('ERR-INT-03: 无效分页参数应回退到默认值而不报错', async () => {
    // page 和 limit 是 NaN 时应使用默认值
    const res = await agent.get('/api/products?page=abc&limit=xyz').expect(200);

    // parseInt('abc') = NaN → default page=1, limit=10
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(10);
  });

  // ERR-INT-04: 超大 quantity 值处理
  test('ERR-INT-04: 订单 quantity 超过库存应返回 409', async () => {
    const res = await agent
      .post('/api/orders')
      .send({ product_id: 1, quantity: 999999999 })
      .expect(409);

    expect(res.body.error).toMatch(/insufficient stock/i);
  });

  // ERR-INT-05: 多种错误场景的响应格式一致性
  test('ERR-INT-05: 所有错误响应应包含统一的 error 字段', async () => {
    // 400: 缺少字段
    const res400 = await agent.post('/api/products').send({}).expect(400);
    expect(res400.body).toHaveProperty('error');

    // 404: 资源不存在
    const res404 = await agent.get('/api/products/99999').expect(404);
    expect(res404.body).toHaveProperty('error');

    // 409: 库存冲突
    const res409 = await agent
      .post('/api/orders')
      .send({ product_id: 1, quantity: 999999999 })
      .expect(409);
    expect(res409.body).toHaveProperty('error');
  });
});
