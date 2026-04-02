const { Router } = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getDatabase } = require('../db/database');

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'perf-test-secret-key';
const JWT_ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || '15m';
const JWT_REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '7d';

function signToken(payload, expiresIn) {
  return jwt.sign({ ...payload, jti: crypto.randomUUID() }, JWT_SECRET, { expiresIn });
}

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

router.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const db = getDatabase();
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  if (!bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const accessToken = signToken(
    { sub: user.id, username: user.username, type: 'access' },
    JWT_ACCESS_EXPIRES
  );
  const refreshToken = signToken({ sub: user.id, type: 'refresh' }, JWT_REFRESH_EXPIRES);
  res.json({ accessToken, refreshToken });
});

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
