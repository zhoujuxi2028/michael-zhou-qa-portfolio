/**
 * PROD-INT-01~06: 产品 API 集成测试
 *
 * 验证产品的 CRUD 操作与数据库的完整集成。
 * 跨模块集成：products routes + database + pagination
 */
const {
  createTestClient,
  resetTestEnvironment,
  createTestProduct,
} = require('../setup/test-server');

describe('产品 API 集成测试 (PROD-INT)', () => {
  let agent;

  beforeEach(() => {
    resetTestEnvironment();
    agent = createTestClient();
  });

  afterEach(() => {
    resetTestEnvironment();
  });

  // PROD-INT-01: 创建产品 → 查询验证
  test('PROD-INT-01: 创建产品后通过 ID 查询应返回一致的数据', async () => {
    // Arrange & Act: 创建产品
    const product = await createTestProduct(agent, {
      name: 'Integration Laptop',
      price: 1299.99,
      stock: 50,
    });

    // Act: 通过 ID 查询
    const res = await agent.get(`/api/products/${product.id}`).expect(200);

    // Assert: 数据一致性
    expect(res.body.name).toBe('Integration Laptop');
    expect(res.body.price).toBe(1299.99);
    expect(res.body.stock).toBe(50);
  });

  // PROD-INT-02: 分页查询验证
  test('PROD-INT-02: 产品列表应支持分页并返回正确的分页元数据', async () => {
    // Arrange: seed 数据有 5 个产品，再创建 3 个
    await createTestProduct(agent, { name: 'Extra1', price: 10, stock: 1 });
    await createTestProduct(agent, { name: 'Extra2', price: 20, stock: 2 });
    await createTestProduct(agent, { name: 'Extra3', price: 30, stock: 3 });

    // Act: 第 1 页，每页 3 条
    const page1 = await agent.get('/api/products?page=1&limit=3').expect(200);

    // Assert: 分页元数据
    expect(page1.body.data).toHaveLength(3);
    expect(page1.body.page).toBe(1);
    expect(page1.body.limit).toBe(3);
    expect(page1.body.total).toBe(8); // 5 seed + 3 new

    // Act: 第 2 页
    const page2 = await agent.get('/api/products?page=2&limit=3').expect(200);
    expect(page2.body.data).toHaveLength(3);
    expect(page2.body.page).toBe(2);

    // Act: 最后一页（不满）
    const page3 = await agent.get('/api/products?page=3&limit=3').expect(200);
    expect(page3.body.data).toHaveLength(2);
  });

  // PROD-INT-03: 查询不存在的产品返回 404
  test('PROD-INT-03: 查询不存在的产品 ID 应返回 404', async () => {
    const res = await agent.get('/api/products/99999').expect(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  // PROD-INT-04: 缺少必填字段创建产品返回 400
  test('PROD-INT-04: 创建产品缺少 name 字段应返回 400', async () => {
    const res = await agent.post('/api/products').send({ price: 100 }).expect(400);

    expect(res.body.error).toMatch(/name.*price.*required/i);
  });

  // PROD-INT-05: 创建多个产品 → 列表应包含所有
  test('PROD-INT-05: 批量创建产品后列表应返回全部（含 seed 数据）', async () => {
    // Arrange: 创建 5 个新产品
    for (let i = 0; i < 5; i++) {
      await createTestProduct(agent, { name: `Batch_${i}`, price: i * 10, stock: i });
    }

    // Act
    const res = await agent.get('/api/products?limit=100').expect(200);

    // Assert: 5 seed + 5 new = 10
    expect(res.body.total).toBe(10);
    expect(res.body.data).toHaveLength(10);
  });

  // PROD-INT-06: 默认分页参数验证
  test('PROD-INT-06: 不指定分页参数时应使用默认值 page=1, limit=10', async () => {
    const res = await agent.get('/api/products').expect(200);

    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(10);
    expect(res.body.total).toBe(5); // seed 数据
  });
});
