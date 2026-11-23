const express = require('express');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('../docs/swagger');
const { metricsMiddleware } = require('./middleware/metrics');
const rateLimiter = require('./middleware/rateLimiter');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
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

// Express 5 leaves req.body undefined when no body is sent; restore the Express 4
// default so routes can destructure it safely (DEF-026)
app.use((req, _res, next) => {
  if (req.body === undefined) req.body = {};
  next();
});

// Swagger UI - available at /api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(rateLimiter);
app.use(metricsMiddleware);
app.use(healthRoutes);
app.use(productRoutes);
app.use(authRoutes);
app.use(orderRoutes);

// Must stay last: JSON 404 + error responses without stack traces (DEF-028)
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
