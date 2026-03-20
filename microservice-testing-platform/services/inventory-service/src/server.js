const app = require('./app');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3002;

app.listen(PORT, () => {
  logger.info(`Inventory service started on port ${PORT}`);
});
