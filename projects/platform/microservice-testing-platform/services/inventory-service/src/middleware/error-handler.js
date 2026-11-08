const logger = require('../utils/logger');
const { ERROR_CODES } = require('../../../../shared/constants');

function errorHandler(err, req, res, _next) {
  logger.error('Unhandled error', {
    correlationId: req.correlationId,
    error: err.message,
    stack: err.stack,
  });

  const statusMap = {
    [ERROR_CODES.VALIDATION_ERROR]: 400,
    [ERROR_CODES.PRODUCT_NOT_FOUND]: 404,
    [ERROR_CODES.INSUFFICIENT_STOCK]: 409,
  };

  const status = statusMap[err.code] || 500;
  const response = { error: err.code || 'INTERNAL_ERROR', message: err.message };

  if (err.code === ERROR_CODES.INSUFFICIENT_STOCK) {
    response.available = err.available;
    response.requested = err.requested;
  }

  res.status(status).json(response);
}

module.exports = errorHandler;
