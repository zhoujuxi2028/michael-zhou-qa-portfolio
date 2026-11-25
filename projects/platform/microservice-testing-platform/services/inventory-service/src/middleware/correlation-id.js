const { randomUUID } = require('node:crypto');

function correlationId(req, _res, next) {
  req.correlationId = req.headers['x-correlation-id'] || randomUUID();
  next();
}

module.exports = correlationId;
