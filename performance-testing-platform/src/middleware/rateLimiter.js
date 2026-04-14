/**
 * Rate Limiter Middleware
 * Protects API from overload using express-rate-limit
 * Environment variables (with defaults):
 * - RATE_LIMIT_ENABLED: true|false (default: false for backward compatibility)
 * - RATE_LIMIT_WINDOW_MS: milliseconds per rate limit window (default: 60000 = 1 min)
 * - RATE_LIMIT_MAX: max requests per window (default: 100)
 */
const rateLimit = require('express-rate-limit');

const enabled = process.env.RATE_LIMIT_ENABLED === 'true';
const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
const max = parseInt(process.env.RATE_LIMIT_MAX || '100', 10);

// Create limiter instance (MemoryStore is per-worker in Cluster mode)
const limiter = rateLimit({
  windowMs, // Time window in milliseconds
  max, // Max requests per window
  message: 'Too many requests, please try again later',
  statusCode: 429, // HTTP 429 Too Many Requests
  standardHeaders: true, // RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  skip: () => !enabled, // Skip if disabled
});

module.exports = limiter;
