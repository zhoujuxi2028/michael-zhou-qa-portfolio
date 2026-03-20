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

async function publishPaymentCompleted(payment, correlationId) {
  if (!redis) await connect();
  const payload = JSON.stringify({
    paymentId: payment.id,
    orderId: payment.order_id,
    status: payment.status,
    timestamp: new Date().toISOString(),
    correlationId,
  });
  await redis.publish(EVENTS.PAYMENT_COMPLETED, payload);
  logger.info('Published payment.completed', { paymentId: payment.id, correlationId });
}

module.exports = { connect, disconnect, publishPaymentCompleted };
