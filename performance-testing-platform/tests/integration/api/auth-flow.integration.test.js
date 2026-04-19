/**
 * AUTH-INT-01~08: 认证流程集成测试
 *
 * 验证完整的用户认证生命周期：注册 → 登录 → Token 刷新 → 登出 → 黑名单
 * 跨模块集成：auth routes + database + JWT + bcrypt + token blacklist
 */
const {
  createTestClient,
  resetTestEnvironment,
  registerAndLogin,
} = require('../setup/test-server');

describe('认证流程集成测试 (AUTH-INT)', () => {
  let agent;

  beforeEach(() => {
    resetTestEnvironment();
    agent = createTestClient();
  });

  afterEach(() => {
    resetTestEnvironment();
  });

  // AUTH-INT-01: 注册 → 登录 → 获取 token 完整流程
  test('AUTH-INT-01: 注册新用户后登录应返回有效的 accessToken 和 refreshToken', async () => {
    // Arrange
    const userData = { username: 'newuser', password: 'SecurePass123' };

    // Act: 注册
    const regRes = await agent.post('/api/auth/register').send(userData).expect(201);

    // Assert: 注册返回用户信息
    expect(regRes.body).toHaveProperty('id');
    expect(regRes.body.username).toBe('newuser');

    // Act: 登录
    const loginRes = await agent.post('/api/auth/login').send(userData).expect(200);

    // Assert: 登录返回双 token
    expect(loginRes.body).toHaveProperty('accessToken');
    expect(loginRes.body).toHaveProperty('refreshToken');
    expect(typeof loginRes.body.accessToken).toBe('string');
    expect(typeof loginRes.body.refreshToken).toBe('string');
  });

  // AUTH-INT-02: Token 刷新流程
  test('AUTH-INT-02: 使用有效 refreshToken 应能获取新的 accessToken', async () => {
    // Arrange
    const { refreshToken } = await registerAndLogin(agent);

    // Act: 刷新 token
    const refreshRes = await agent.post('/api/auth/refresh').send({ refreshToken }).expect(200);

    // Assert: 返回新的 accessToken
    expect(refreshRes.body).toHaveProperty('accessToken');
    expect(typeof refreshRes.body.accessToken).toBe('string');
  });

  // AUTH-INT-03: 登出 → Token 黑名单流程
  test('AUTH-INT-03: 登出后 token 应进入黑名单不可再使用', async () => {
    // Arrange
    const { accessToken, refreshToken } = await registerAndLogin(agent);

    // Act: 登出（同时提交 refreshToken）
    await agent
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ refreshToken })
      .expect(200);

    // Assert: 使用已登出的 refreshToken 刷新应被拒绝
    const refreshRes = await agent.post('/api/auth/refresh').send({ refreshToken }).expect(401);

    expect(refreshRes.body.error).toMatch(/revoked/i);
  });

  // AUTH-INT-04: 无效 token 格式被拒绝
  test('AUTH-INT-04: 使用无效格式的 token 进行登出应返回 401', async () => {
    // Act & Assert
    const res = await agent
      .post('/api/auth/logout')
      .set('Authorization', 'Bearer invalid.token.format')
      .expect(401);

    expect(res.body.error).toMatch(/invalid/i);
  });

  // AUTH-INT-05: 刷新 token 被撤销后无法使用
  test('AUTH-INT-05: 登出撤销 refreshToken 后尝试刷新应返回 401', async () => {
    // Arrange
    const { accessToken, refreshToken } = await registerAndLogin(agent);

    // Act: 登出并撤销 refreshToken
    await agent
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ refreshToken })
      .expect(200);

    // Assert: 尝试用已撤销的 refreshToken 刷新
    const res = await agent.post('/api/auth/refresh').send({ refreshToken }).expect(401);

    expect(res.body.error).toBeDefined();
  });

  // AUTH-INT-06: 重复注册被拒绝 (409 Conflict)
  test('AUTH-INT-06: 使用已存在的用户名注册应返回 409', async () => {
    // Arrange
    const userData = { username: 'duplicate_user', password: 'Pass123' };
    await agent.post('/api/auth/register').send(userData).expect(201);

    // Act: 重复注册
    const res = await agent.post('/api/auth/register').send(userData).expect(409);

    // Assert
    expect(res.body.error).toMatch(/already exists/i);
  });

  // AUTH-INT-07: 缺少必填字段注册应返回 400
  test('AUTH-INT-07: 注册缺少 username 应返回 400', async () => {
    const res = await agent
      .post('/api/auth/register')
      .send({ password: 'OnlyPassword' })
      .expect(400);

    expect(res.body.error).toMatch(/username.*password.*required/i);
  });

  // AUTH-INT-08: 凭证错误登录应返回 401
  test('AUTH-INT-08: 使用错误密码登录应返回 401', async () => {
    // Arrange: 先注册
    await agent
      .post('/api/auth/register')
      .send({ username: 'wrongpass_user', password: 'CorrectPass' })
      .expect(201);

    // Act: 错误密码登录
    const res = await agent
      .post('/api/auth/login')
      .send({ username: 'wrongpass_user', password: 'WrongPass' })
      .expect(401);

    // Assert
    expect(res.body.error).toMatch(/invalid credentials/i);
  });
});
