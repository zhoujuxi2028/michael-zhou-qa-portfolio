/**
 * SEC-INT-01~04: 安全头集成测试
 *
 * 验证 Helmet 中间件设置的 HTTP 安全头。
 * 跨模块集成：Helmet config + Express app + custom XSS middleware
 */
const {
  createTestClient,
  resetTestEnvironment,
} = require('../setup/test-server');

describe('安全头集成测试 (SEC-INT)', () => {
  let agent;

  beforeEach(() => {
    resetTestEnvironment();
    agent = createTestClient();
  });

  afterEach(() => {
    resetTestEnvironment();
  });

  // SEC-INT-01: Helmet 安全头验证（CSP, HSTS, X-Frame-Options）
  test('SEC-INT-01: 响应应包含 Content-Security-Policy 和 Strict-Transport-Security', async () => {
    const res = await agent.get('/health').expect(200);
    const headers = res.headers;

    // Content-Security-Policy
    expect(headers['content-security-policy']).toBeDefined();
    expect(headers['content-security-policy']).toContain("default-src 'self'");

    // Strict-Transport-Security (HSTS)
    expect(headers['strict-transport-security']).toBeDefined();
    expect(headers['strict-transport-security']).toContain('max-age=31536000');
    expect(headers['strict-transport-security']).toContain('includeSubDomains');

    // X-Frame-Options
    expect(headers['x-frame-options']).toBe('DENY');
  });

  // SEC-INT-02: X-Powered-By 被移除
  test('SEC-INT-02: 响应不应包含 X-Powered-By 头', async () => {
    const res = await agent.get('/health').expect(200);
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  // SEC-INT-03: XSS Protection 头设置
  test('SEC-INT-03: 响应应包含 X-XSS-Protection: 1; mode=block', async () => {
    const res = await agent.get('/health').expect(200);
    expect(res.headers['x-xss-protection']).toBe('1; mode=block');
  });

  // SEC-INT-04: Referrer-Policy 和 Cross-Origin 头
  test('SEC-INT-04: 响应应包含 Referrer-Policy 和 Cross-Origin 安全头', async () => {
    const res = await agent.get('/health').expect(200);
    const headers = res.headers;

    // Referrer-Policy
    expect(headers['referrer-policy']).toBe('no-referrer');

    // Cross-Origin headers
    expect(headers['cross-origin-embedder-policy']).toBeDefined();
    expect(headers['cross-origin-opener-policy']).toBeDefined();
    expect(headers['cross-origin-resource-policy']).toBe('cross-origin');

    // X-Content-Type-Options
    expect(headers['x-content-type-options']).toBe('nosniff');
  });
});
