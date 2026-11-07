const app = require('./app');
const logger = require('./utils/logger');
const redisPublisher = require('./services/redis-publisher');

const PORT = process.env.PORT || 3003;

async function start() {
  await redisPublisher.connect();
  app.listen(PORT, () => {
    logger.info(`Order service started on port ${PORT}`);
  });
}

start();
