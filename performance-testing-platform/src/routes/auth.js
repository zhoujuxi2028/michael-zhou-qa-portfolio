const { Router } = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getDatabase } = require('../db/database');
const { recordAuthLatency } = require('../middleware/metrics');

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'perf-test-secret-key';
const JWT_ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || '15m';
const JWT_REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '7d';

function signToken(payload, expiresIn) {
  return jwt.sign({ ...payload, jti: crypto.randomUUID() }, JWT_SECRET, { expiresIn });
}

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: 用户注册
 *     description: 创建新用户账户。注册成功后可使用用户名和密码登录。
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: 用户名（唯一）
 *               password:
 *                 type: string
 *                 description: 密码
 *     responses:
 *       201:
 *         description: 注册成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: number
 *                 username:
 *                   type: string
 *       400:
 *         description: 缺少用户名或密码
 *       409:
 *         description: 用户名已存在
 */
router.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password required' });
  }

  const db = getDatabase();
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(409).json({ error: 'Username already exists' });
  }

  const password_hash = bcrypt.hashSync(password, 10);
  const result = db
    .prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
    .run(username, password_hash);
  res.status(201).json({ id: result.lastInsertRowid, username });
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: 用户登录
 *     description: 使用用户名和密码登录，获取访问令牌和刷新令牌。在 Swagger UI 中使用 accessToken 填充 "Authorize" 字段。
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: 登录成功，返回访问令牌和刷新令牌
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                   description: JWT 访问令牌（15分钟有效期）
 *                 refreshToken:
 *                   type: string
 *                   description: JWT 刷新令牌（7天有效期）
 *       401:
 *         description: 凭证无效
 */
router.post('/api/auth/login', (req, res) => {
  const startTime = Date.now();
  const { username, password } = req.body;
  const db = getDatabase();
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) {
    recordAuthLatency(Date.now() - startTime);  // 记录认证延迟
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (!bcrypt.compareSync(password, user.password_hash)) {
    recordAuthLatency(Date.now() - startTime);  // 记录认证延迟
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const accessToken = signToken(
    { sub: user.id, username: user.username, type: 'access' },
    JWT_ACCESS_EXPIRES
  );
  const refreshToken = signToken({ sub: user.id, type: 'refresh' }, JWT_REFRESH_EXPIRES);
  recordAuthLatency(Date.now() - startTime);  // 记录认证延迟
  res.json({ accessToken, refreshToken });
});

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: 刷新访问令牌
 *     description: 使用刷新令牌获取新的访问令牌。当访问令牌过期时使用此端点。
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: 之前获得的刷新令牌
 *     responses:
 *       200:
 *         description: 成功获取新的访问令牌
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                   description: 新的 JWT 访问令牌
 *       401:
 *         description: 刷新令牌无效或已过期
 */
router.post('/api/auth/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ error: 'Refresh token required' });

  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET);
    if (decoded.type !== 'refresh') return res.status(401).json({ error: 'Invalid token type' });

    const db = getDatabase();
    const blacklisted = db
      .prepare('SELECT id FROM token_blacklist WHERE token_jti = ?')
      .get(decoded.jti);
    if (blacklisted) return res.status(401).json({ error: 'Token has been revoked' });

    const accessToken = signToken({ sub: decoded.sub, type: 'access' }, JWT_ACCESS_EXPIRES);
    res.json({ accessToken });
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: 用户登出
 *     description: 撤销当前访问令牌和可选的刷新令牌。登出后令牌将被加入黑名单。
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: 可选的刷新令牌，也会被撤销
 *     responses:
 *       200:
 *         description: 成功登出
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: 需要有效的授权令牌
 */
router.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization required' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const db = getDatabase();
    const blacklist = db.prepare(
      'INSERT OR IGNORE INTO token_blacklist (token_jti, expired_at) VALUES (?, ?)'
    );
    blacklist.run(decoded.jti, new Date(decoded.exp * 1000).toISOString());

    // Also blacklist the refresh token if provided
    const { refreshToken } = req.body;
    if (refreshToken) {
      try {
        const refreshDecoded = jwt.verify(refreshToken, JWT_SECRET);
        blacklist.run(refreshDecoded.jti, new Date(refreshDecoded.exp * 1000).toISOString());
      } catch {
        // ignore invalid refresh token during logout
      }
    }

    res.json({ message: 'Logged out' });
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
