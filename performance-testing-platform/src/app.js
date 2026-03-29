const express = require('express');
const { metricsMiddleware } = require('./middleware/metrics');
const healthRoutes = require('./routes/health');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');

const app = express();
app.use(express.json());
app.use(metricsMiddleware);
app.use(healthRoutes);
app.use(productRoutes);
app.use(orderRoutes);

module.exports = app;
