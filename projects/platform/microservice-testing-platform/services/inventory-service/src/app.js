const express = require('express');
const cors = require('cors');
const correlationId = require('./middleware/correlation-id');
const requestLogger = require('./middleware/request-logger');
const errorHandler = require('./middleware/error-handler');
const inventoryRoutes = require('./routes/inventory');
const { register } = require('./utils/metrics');

const app = express();

app.use(cors());
app.use(express.json());
app.use(correlationId);
app.use(requestLogger);

app.use('/api/inventory', inventoryRoutes);

app.get('/health', (_req, res) => {
  let dbStatus = 'connected';
  try {
    const db = require('./db/init');
    db.prepare('SELECT 1').get();
  } catch (_e) {
    dbStatus = 'disconnected';
  }

  res.json({
    status: dbStatus === 'connected' ? 'healthy' : 'unhealthy',
    service: 'inventory-service',
    uptime: process.uptime(),
    dependencies: { database: dbStatus },
  });
});

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.use(errorHandler);

module.exports = app;
