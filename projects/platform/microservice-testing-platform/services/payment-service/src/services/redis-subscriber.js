const Redis = require('ioredis');
const { EVENTS } = require('../../../../shared/constants');
const logger = require('../utils/logger');
const paymentModel = require('../models/payment');
const redisPublisher = require('./redis-publisher');
const orderClient = require('./order-client');

let redis = null;

async function connect() {
  if (redis) return;
  redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

  redis.on('error', (err) => logger.error('Redis subscriber error', { error: err.message }));

  await redis.subscribe(EVENTS.ORDER_CREATED);
  logger.info('Subscribed to order.created');

  redis.on('message', async (_channel, message) => {
    const event = paymentModel.parseOrderEvent(message);
    if (!event) {
      logger.error('Invalid order event', { message });
      return;
    }

    try {
      const payment = paymentModel.processPayment({
        orderId: event.orderId,
        amount: event.totalAmount,
        correlationId: event.correlationId,
      });

      if (!payment.alreadyProcessed) {
        const callback = paymentModel.buildCallbackPayload(payment);
        await orderClient.updateOrderStatus(event.orderId, callback, event.correlationId);
        await redisPublisher.publishPaymentCompleted(payment, event.correlationId);
      }
    } catch (err) {
      logger.error('Payment processing failed', { orderId: event.orderId, error: err.message });
    }
  });
}

async function disconnect() {
  if (redis) {
    await redis.unsubscribe();
    await redis.quit();
    redis = null;
  }
}

module.exports = { connect, disconnect };
