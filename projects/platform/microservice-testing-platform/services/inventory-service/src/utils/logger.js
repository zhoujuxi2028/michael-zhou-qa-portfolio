const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  defaultMeta: { service: 'inventory-service' },
  transports: [
    new winston.transports.Console({
      silent: process.env.NODE_ENV === 'test',
    }),
  ],
});

module.exports = logger;
