const express = require('express');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('../docs/swagger');
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
    xssFilter: true,
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

app.use(express.json());

// Swagger UI - available at /api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(rateLimiter);
app.use(metricsMiddleware);
app.use(healthRoutes);
app.use(productRoutes);
app.use(authRoutes);
app.use(orderRoutes);

module.exports = app;
