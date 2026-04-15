const express = require('express');
const helmet = require('helmet');
const { metricsMiddleware } = require('./middleware/metrics');
const rateLimiter = require('./middleware/rateLimiter');
const healthRoutes = require('./routes/health');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const authRoutes = require('./routes/auth');

const app = express();

// Security headers via helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    frameguard: { action: 'deny' },
    referrerPolicy: { policy: 'no-referrer' },
    xssFilter: false,
    noSniff: true,
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Hide server information
app.disable('x-powered-by');

// Trust proxy for proper IP handling
app.set('trust proxy', 1);

// Ensure XSS Protection header is properly set
app.use((req, res, next) => {
  res.set('X-XSS-Protection', '1; mode=block');
  next();
});

app.use(express.json());
app.use(rateLimiter);
app.use(metricsMiddleware);
app.use(healthRoutes);
app.use(productRoutes);
app.use(authRoutes);
app.use(orderRoutes);

module.exports = app;
