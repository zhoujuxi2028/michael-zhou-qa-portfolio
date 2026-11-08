const jwt = require('jsonwebtoken');
const { getDatabase } = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'perf-test-secret-key';

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization required' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const db = getDatabase();
    const blacklisted = db
      .prepare('SELECT id FROM token_blacklist WHERE token_jti = ?')
      .get(decoded.jti);
    if (blacklisted) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }

    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { authenticate };
