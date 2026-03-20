// Contract schemas for Inventory Service API
// Consumer: Order Service

const getInventoryResponse = {
  type: 'object',
  required: ['productId', 'productName', 'quantity', 'reserved', 'available'],
  properties: {
    productId: { type: 'string', pattern: '^PROD-\\d{3}$' },
    productName: { type: 'string', minLength: 1 },
    quantity: { type: 'integer', minimum: 0 },
    reserved: { type: 'integer', minimum: 0 },
    available: { type: 'integer', minimum: 0 },
  },
  additionalProperties: false,
};

const deductResponse = {
  type: 'object',
  required: ['productId', 'deducted', 'remaining', 'orderId'],
  properties: {
    productId: { type: 'string' },
    deducted: { type: 'integer', minimum: 0 },
    remaining: { type: 'integer', minimum: 0 },
    orderId: { type: 'string' },
    alreadyDeducted: { type: 'boolean' },
  },
  additionalProperties: false,
};

const rollbackResponse = {
  type: 'object',
  required: ['productId', 'rolledBack', 'remaining', 'orderId'],
  properties: {
    productId: { type: 'string' },
    rolledBack: { type: 'integer', minimum: 0 },
    remaining: { type: 'integer', minimum: 0 },
    orderId: { type: 'string' },
    alreadyRolledBack: { type: 'boolean' },
  },
  additionalProperties: false,
};

const insufficientStockError = {
  type: 'object',
  required: ['error'],
  properties: {
    error: { type: 'string', const: 'INSUFFICIENT_STOCK' },
    message: { type: 'string' },
    available: { type: 'integer', minimum: 0 },
    requested: { type: 'integer', minimum: 1 },
  },
};

const notFoundError = {
  type: 'object',
  required: ['error', 'message'],
  properties: {
    error: { type: 'string', const: 'PRODUCT_NOT_FOUND' },
    message: { type: 'string' },
  },
};

module.exports = {
  getInventoryResponse,
  deductResponse,
  rollbackResponse,
  insufficientStockError,
  notFoundError,
};
