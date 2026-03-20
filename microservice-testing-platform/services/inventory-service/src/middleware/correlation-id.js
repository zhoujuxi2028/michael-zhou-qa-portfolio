const { v4: uuidv4 } = require('uuid');

function correlationId(req, _res, next) {
  req.correlationId = req.headers['x-correlation-id'] || uuidv4();
  next();
}

module.exports = correlationId;
