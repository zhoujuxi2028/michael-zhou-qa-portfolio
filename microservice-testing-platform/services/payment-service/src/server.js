const app = require('./app');
const logger = require('./utils/logger');
const redisSubscriber = require('./services/redis-subscriber');
const redisPublisher = require('./services/redis-publisher');

const PORT = process.env.PORT || 3003;

async function start() {
  await redisPublisher.connect();
  await redisSubscriber.connect();
  app.listen(PORT, () => {
    logger.info(`Payment service started on port ${PORT}`);
  });
}

start();
