const logger = require('../utils/logger');
const { ERROR_CODES, PRODUCT_ID_PATTERN } = require('../../../../shared/constants');

const INVENTORY_URL = process.env.INVENTORY_SERVICE_URL || 'http://localhost:3004';

// Reject ids that could alter the request path (CodeQL js/request-forgery, #872)
function productPath(productId, action) {
  if (typeof productId !== 'string' || !PRODUCT_ID_PATTERN.test(productId)) {
    const err = new Error(ERROR_CODES.VALIDATION_ERROR);
    err.code = ERROR_CODES.VALIDATION_ERROR;
    throw err;
  }
  return `${INVENTORY_URL}/api/inventory/${encodeURIComponent(productId)}/${action}`;
}

async function checkAndDeduct(productId, quantity, orderId, correlationId) {
  const response = await fetch(productPath(productId, 'deduct'), {
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
  const response = await fetch(productPath(productId, 'rollback'), {
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
