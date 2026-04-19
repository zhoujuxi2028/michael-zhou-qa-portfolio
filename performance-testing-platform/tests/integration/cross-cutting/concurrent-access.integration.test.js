/**
 * CONC-INT-01~03: 并发访问集成测试
 *
 * 验证数据库在顺序快速请求下的数据一致性和事务完整性。
 * 跨模块集成：orders routes + products + SQLite WAL + transaction
 *
 * 注意：supertest 在同进程内运行，SQLite 事务串行化保证原子性。
 * 这里测试的是事务逻辑正确性而非真正的网络级并发。
 */
const {
  createTestClient,
  resetTestEnvironment,
  createTestProduct,
} = require('../setup/test-server');

describe('并发访问集成测试 (CONC-INT)', () => {
  let agent;

  beforeEach(() => {
    resetTestEnvironment();
    agent = createTestClient();
  });

  afterEach(() => {
    resetTestEnvironment();
  });

  // CONC-INT-01: 连续快速下单 → 库存耗尽后返回 409
  test('CONC-INT-01: 库存耗尽后继续下单应返回 409 冲突', async () => {
    // Arrange: 创建库存仅 3 的产品
    const product = await createTestProduct(agent, {
      name: 'StockExhaust',
      price: 100,
      stock: 3,
    });

    // Act: 顺序发送 5 个下单请求
    const results = [];
    for (let i = 0; i < 5; i++) {
      const res = await agent
        .post('/api/orders')
        .send({ product_id: product.id, quantity: 1 });
      results.push(res);
    }

    // Assert: 前 3 个成功，后 2 个冲突
    const successCount = results.filter(r => r.status === 201).length;
    const conflictCount = results.filter(r => r.status === 409).length;

    expect(successCount).toBe(3);
    expect(conflictCount).toBe(2);

    // Assert: 最终库存为 0
    const productRes = await agent.get(`/api/products/${product.id}`).expect(200);
    expect(productRes.body.stock).toBe(0);
  });

  // CONC-INT-02: 重复注册相同用户名应返回 409
  test('CONC-INT-02: 重复注册相同用户名第二次应返回 409', async () => {
    // Act: 第一次注册
    const first = await agent
      .post('/api/auth/register')
      .send({ username: 'unique_user', password: 'Pass123' });

    // Act: 第二次注册相同用户名
    const second = await agent
      .post('/api/auth/register')
      .send({ username: 'unique_user', password: 'DiffPass' });

    // Assert
    expect(first.status).toBe(201);
    expect(second.status).toBe(409);
    expect(second.body.error).toMatch(/already exists/i);
  });

  // CONC-INT-03: 批量创建不同产品全部成功
  test('CONC-INT-03: 批量顺序创建不同产品应全部成功', async () => {
    // Act: 创建 10 个不同产品
    const results = [];
    for (let i = 0; i < 10; i++) {
      const res = await agent
        .post('/api/products')
        .send({ name: `Batch_${i}`, price: i * 10 + 1, stock: 100 });
      results.push(res);
    }

    // Assert: 全部成功
    results.forEach(r => {
      expect(r.status).toBe(201);
    });

    // Assert: 总产品数正确 = 5(seed) + 10(new)
    const listRes = await agent.get('/api/products?limit=100').expect(200);
    expect(listRes.body.total).toBe(15);
  });
});
