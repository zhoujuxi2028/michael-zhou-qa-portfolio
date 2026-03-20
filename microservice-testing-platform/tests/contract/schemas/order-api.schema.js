// Contract schemas for Order Service API
// Consumer: Payment Service (callback)

const orderResponse = {
  type: 'object',
  required: ['id', 'productId', 'quantity', 'unitPrice', 'totalAmount', 'status'],
  properties: {
    id: { type: 'string', pattern: '^ORD-' },
    productId: { type: 'string' },
    quantity: { type: 'integer', minimum: 1 },
    unitPrice: { type: 'number', exclusiveMinimum: 0 },
    totalAmount: { type: 'number', exclusiveMinimum: 0 },
    status: { type: 'string', enum: ['pending', 'confirmed', 'cancelled', 'paid', 'failed', 'completed'] },
    paymentId: { type: ['string', 'null'] },
    createdAt: { type: 'string' },
    updatedAt: { type: 'string' },
  },
};

const statusUpdateResponse = {
  type: 'object',
  required: ['id', 'status'],
  properties: {
    id: { type: 'string', pattern: '^ORD-' },
    status: { type: 'string', enum: ['pending', 'confirmed', 'cancelled', 'paid', 'failed', 'completed'] },
    paymentId: { type: ['string', 'null'] },
  },
};

const orderNotFoundError = {
  type: 'object',
  required: ['error', 'message'],
  properties: {
    error: { type: 'string', const: 'ORDER_NOT_FOUND' },
    message: { type: 'string' },
  },
};

const invalidTransitionError = {
  type: 'object',
  required: ['error', 'message'],
  properties: {
    error: { type: 'string', const: 'INVALID_STATUS_TRANSITION' },
    message: { type: 'string' },
  },
};

module.exports = { orderResponse, statusUpdateResponse, orderNotFoundError, invalidTransitionError };
