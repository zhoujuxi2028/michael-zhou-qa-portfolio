const logger = require('../utils/logger');

const INVENTORY_URL = process.env.INVENTORY_SERVICE_URL || 'http://localhost:3004';

async function checkAndDeduct(productId, quantity, orderId, correlationId) {
  const response = await fetch(`${INVENTORY_URL}/api/inventory/${productId}/deduct`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Correlation-ID': correlationId,
    },
    body: JSON.stringify({ quantity, orderId }),
  });

  const data = await response.json();

  if (!response.ok) {
    logger.warn('Inventory deduction failed', { productId, orderId, error: data });
    const err = new Error(data.error);
    err.code = data.error;
    err.available = data.available;
    err.requested = data.requested;
    throw err;
  }

  return data;
}

async function rollback(productId, quantity, orderId, reason, correlationId) {
  const response = await fetch(`${INVENTORY_URL}/api/inventory/${productId}/rollback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Correlation-ID': correlationId,
    },
    body: JSON.stringify({ quantity, orderId, reason }),
  });

  return response.json();
}

module.exports = { checkAndDeduct, rollback };
