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
    [ERROR_CODES.ORDER_NOT_FOUND]: 404,
    [ERROR_CODES.INSUFFICIENT_STOCK]: 409,
    [ERROR_CODES.INVALID_STATUS_TRANSITION]: 400,
  };

  const status = statusMap[err.code] || 500;
  res.status(status).json({ error: err.code || 'INTERNAL_ERROR', message: err.message });
}

module.exports = errorHandler;
