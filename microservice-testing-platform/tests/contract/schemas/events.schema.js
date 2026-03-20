// Contract schemas for Redis Pub/Sub events

const orderCreatedEvent = {
  type: 'object',
  required: ['orderId', 'productId', 'quantity', 'totalAmount', 'timestamp', 'correlationId'],
  properties: {
    orderId: { type: 'string', pattern: '^ORD-' },
    productId: { type: 'string', pattern: '^PROD-' },
    quantity: { type: 'integer', minimum: 1 },
    totalAmount: { type: 'number', exclusiveMinimum: 0 },
    timestamp: { type: 'string', format: 'date-time' },
    correlationId: { type: 'string', minLength: 1 },
  },
  additionalProperties: false,
};

const paymentCompletedEvent = {
  type: 'object',
  required: ['paymentId', 'orderId', 'status', 'timestamp', 'correlationId'],
  properties: {
    paymentId: { type: 'string', pattern: '^PAY-' },
    orderId: { type: 'string', pattern: '^ORD-' },
    status: { type: 'string', enum: ['completed', 'failed'] },
    timestamp: { type: 'string', format: 'date-time' },
    correlationId: { type: 'string', minLength: 1 },
  },
  additionalProperties: false,
};

module.exports = { orderCreatedEvent, paymentCompletedEvent };
