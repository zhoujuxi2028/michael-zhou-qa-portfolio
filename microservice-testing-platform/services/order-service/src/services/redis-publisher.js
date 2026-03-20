const Redis = require('ioredis');
const { EVENTS } = require('../../../../shared/constants');
const logger = require('../utils/logger');

let redis = null;

async function connect() {
  if (redis) return;
  redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  redis.on('error', (err) => logger.error('Redis publisher error', { error: err.message }));
}

async function disconnect() {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}

async function publishOrderCreated(order, correlationId) {
  if (!redis) await connect();
  const payload = JSON.stringify({
    orderId: order.id,
    productId: order.product_id,
    quantity: order.quantity,
    totalAmount: order.total_amount,
    timestamp: new Date().toISOString(),
    correlationId,
  });
  await redis.publish(EVENTS.ORDER_CREATED, payload);
  logger.info('Published order.created', { orderId: order.id, correlationId });
}

module.exports = { connect, disconnect, publishOrderCreated };
