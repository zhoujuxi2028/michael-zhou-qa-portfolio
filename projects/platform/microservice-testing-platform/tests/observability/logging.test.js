/**
 * Observability Tests: Structured Logging
 * Verifies log output format and content.
 */
const winston = require('winston');
const Transport = require('winston-transport');

// Custom transport to capture log output
class CapturingTransport extends Transport {
  constructor() {
    super();
    this.logs = [];
  }
  log(info, callback) {
    this.logs.push(info);
    callback();
  }
}

describe('Observability: Logging', () => {
  let capture;
  let logger;

  beforeEach(() => {
    capture = new CapturingTransport();
    logger = winston.createLogger({
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      defaultMeta: { service: 'test-service' },
      transports: [capture],
    });
  });

  // OB-01: Log format - JSON structure
  test('logs contain required fields: timestamp, level, message, service', () => {
    logger.info('Test message');

    expect(capture.logs.length).toBe(1);
    const log = capture.logs[0];
    expect(log.timestamp).toBeDefined();
    expect(log.level).toBe('info');
    expect(log.message).toBe('Test message');
    expect(log.service).toBe('test-service');
  });

  // OB-02: Log level - info for normal requests
  test('normal operations logged at info level', () => {
    logger.info('Request completed', { method: 'GET', path: '/api/orders', status: 200 });

    const log = capture.logs[0];
    expect(log.level).toBe('info');
  });

  // OB-03: Log level - error with stack trace
  test('errors logged at error level with stack trace', () => {
    const error = new Error('Something broke');
    logger.error('Unhandled error', { error: error.message, stack: error.stack });

    const log = capture.logs[0];
    expect(log.level).toBe('error');
    expect(log.error).toBe('Something broke');
    expect(log.stack).toContain('Error: Something broke');
  });
});
