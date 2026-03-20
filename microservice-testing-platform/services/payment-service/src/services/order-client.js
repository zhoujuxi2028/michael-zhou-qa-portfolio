const logger = require('../utils/logger');

const ORDER_URL = process.env.ORDER_SERVICE_URL || 'http://localhost:3001';

async function updateOrderStatus(orderId, payload, correlationId) {
  const response = await fetch(`${ORDER_URL}/api/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-Correlation-ID': correlationId,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    logger.warn('Order status update failed', { orderId, status: response.status });
  }

  return response.json();
}

module.exports = { updateOrderStatus };
