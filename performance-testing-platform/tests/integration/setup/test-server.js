/**
 * 集成测试共享环境配置
 *
 * 提供统一的测试服务器启动/关闭、数据库重置、认证工具等。
 * 所有集成测试文件通过引用此模块实现环境隔离。
 */
const request = require('supertest');
const app = require('../../../src/app');
const { resetDatabase } = require('../../../src/db/database');
const { resetMetrics } = require('../../../src/middleware/metrics');

/**
 * 创建测试客户端（supertest agent）
 * 每个测试套件使用独立的 agent 以保持 cookie/session 隔离
 */
function createTestClient() {
  return request(app);
}

/**
 * 重置测试环境（数据库 + 指标）
 * 在 beforeEach/afterEach 中调用确保测试隔离
 */
function resetTestEnvironment() {
  resetDatabase();
  resetMetrics();
}

/**
 * 认证辅助工具：注册 → 登录 → 返回 token
 * @param {object} agent - supertest agent
 * @param {object} opts - { username, password }
 * @returns {Promise<{ accessToken, refreshToken, userId }>}
 */
async function registerAndLogin(agent, opts = {}) {
  const username = opts.username || `testuser_${Date.now()}`;
  const password = opts.password || 'TestPass123';

  const regRes = await agent
    .post('/api/auth/register')
    .send({ username, password })
    .expect(201);

  const loginRes = await agent
    .post('/api/auth/login')
    .send({ username, password })
    .expect(200);

  return {
    userId: regRes.body.id,
    username,
    accessToken: loginRes.body.accessToken,
    refreshToken: loginRes.body.refreshToken,
  };
}

/**
 * 创建测试产品
 * @param {object} agent - supertest agent
 * @param {object} data - { name, price, stock }
 * @returns {Promise<object>} 创建的产品对象
 */
async function createTestProduct(agent, data = {}) {
  const res = await agent
    .post('/api/products')
    .send({
      name: data.name || `Product_${Date.now()}`,
      price: data.price || 99.99,
      stock: data.stock || 1000,
    })
    .expect(201);
  return res.body;
}

/**
 * 创建测试订单
 * @param {object} agent - supertest agent
 * @param {object} data - { product_id, quantity }
 * @param {string} token - 可选的 JWT token
 * @returns {Promise<object>} 创建的订单对象
 */
async function createTestOrder(agent, data, token) {
  const req = agent.post('/api/orders').send(data);
  if (token) {
    req.set('Authorization', `Bearer ${token}`);
  }
  const res = await req.expect(201);
  return res.body;
}

module.exports = {
  app,
  createTestClient,
  resetTestEnvironment,
  registerAndLogin,
  createTestProduct,
  createTestOrder,
};
