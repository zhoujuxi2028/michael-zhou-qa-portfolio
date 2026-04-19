/**
 * ORD-INT-01~07: 订单工作流集成测试
 *
 * 验证订单创建、库存扣减、冲突处理等完整业务流程。
 * 跨模块集成：orders routes + products + database + delay + metrics
 */
const {
  createTestClient,
  resetTestEnvironment,
  createTestProduct,
} = require('../setup/test-server');

describe('订单工作流集成测试 (ORD-INT)', () => {
  let agent;

  beforeEach(() => {
    resetTestEnvironment();
    agent = createTestClient();
  });

  afterEach(() => {
    resetTestEnvironment();
  });

  // ORD-INT-01: 创建订单 → 库存扣减验证
  test('ORD-INT-01: 创建订单后产品库存应正确扣减', async () => {
    // Arrange: 创建库存为 100 的产品
    const product = await createTestProduct(agent, {
      name: 'StockTest',
      price: 50,
      stock: 100,
    });

    // Act: 下单 30 个
    const orderRes = await agent
      .post('/api/orders')
      .send({ product_id: product.id, quantity: 30 })
      .expect(201);

    // Assert: 订单创建成功
    expect(orderRes.body.product_id).toBe(product.id);
    expect(orderRes.body.quantity).toBe(30);
    expect(orderRes.body.total).toBe(50 * 30);
    expect(orderRes.body.status).toBe('confirmed');

    // Assert: 库存扣减到 70
    const productRes = await agent.get(`/api/products/${product.id}`).expect(200);
    expect(productRes.body.stock).toBe(70);
  });

  // ORD-INT-02: 库存不足返回 409 Conflict
  test('ORD-INT-02: 订单数量超过库存应返回 409 冲突', async () => {
    // Arrange: 库存仅 5 个
    const product = await createTestProduct(agent, {
      name: 'LowStock',
      price: 100,
      stock: 5,
    });

    // Act: 下单 10 个（超过库存）
    const res = await agent
      .post('/api/orders')
      .send({ product_id: product.id, quantity: 10 })
      .expect(409);

    // Assert
    expect(res.body.error).toMatch(/insufficient stock/i);

    // Assert: 库存未变
    const productRes = await agent.get(`/api/products/${product.id}`).expect(200);
    expect(productRes.body.stock).toBe(5);
  });

  // ORD-INT-03: 不存在的产品返回 404
  test('ORD-INT-03: 对不存在的产品下单应返回 404', async () => {
    const res = await agent
      .post('/api/orders')
      .send({ product_id: 99999, quantity: 1 })
      .expect(404);

    expect(res.body.error).toMatch(/product not found/i);
  });

  // ORD-INT-04: 订单列表分页
  test('ORD-INT-04: 订单列表应支持分页查询', async () => {
    // Arrange: 创建 5 个订单
    const product = await createTestProduct(agent, {
      name: 'PaginationTest',
      price: 10,
      stock: 1000,
    });
    for (let i = 0; i < 5; i++) {
      await agent
        .post('/api/orders')
        .send({ product_id: product.id, quantity: 1 });
    }

    // Act
    const res = await agent.get('/api/orders?page=1&limit=3').expect(200);

    // Assert
    expect(res.body.data).toHaveLength(3);
    expect(res.body.total).toBe(5);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(3);
  });

  // ORD-INT-05: 多次下单 → 库存递减验证
  test('ORD-INT-05: 连续多次下单后库存应累计递减', async () => {
    // Arrange
    const product = await createTestProduct(agent, {
      name: 'MultiOrder',
      price: 25,
      stock: 100,
    });

    // Act: 连续下单 3 次
    await agent.post('/api/orders').send({ product_id: product.id, quantity: 10 }).expect(201);
    await agent.post('/api/orders').send({ product_id: product.id, quantity: 20 }).expect(201);
    await agent.post('/api/orders').send({ product_id: product.id, quantity: 15 }).expect(201);

    // Assert: 库存 = 100 - 10 - 20 - 15 = 55
    const productRes = await agent.get(`/api/products/${product.id}`).expect(200);
    expect(productRes.body.stock).toBe(55);
  });

  // ORD-INT-06: 缺少必填字段返回 400
  test('ORD-INT-06: 创建订单缺少 product_id 应返回 400', async () => {
    const res = await agent
      .post('/api/orders')
      .send({ quantity: 1 })
      .expect(400);

    expect(res.body.error).toMatch(/product_id.*quantity.*required/i);
  });

  // ORD-INT-07: 订单金额自动计算验证
  test('ORD-INT-07: 订单总金额应等于 price × quantity', async () => {
    // Arrange
    const product = await createTestProduct(agent, {
      name: 'PriceCalcTest',
      price: 33.33,
      stock: 100,
    });

    // Act
    const orderRes = await agent
      .post('/api/orders')
      .send({ product_id: product.id, quantity: 3 })
      .expect(201);

    // Assert: total = 33.33 * 3 = 99.99
    expect(orderRes.body.total).toBeCloseTo(99.99, 2);
  });
});
