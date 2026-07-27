const { ORDER_STATUS, ERROR_CODES } = require('../../../shared/constants');

let db;
let orderModel;

beforeEach(() => {
  jest.resetModules();
  process.env.DB_PATH = ':memory:';
  db = require('../../../services/order-service/src/db/init');
  orderModel = require('../../../services/order-service/src/models/order');
});

afterEach(() => {
  db.close();
});

describe('Order Model', () => {
  // UT-O-01: Create order - valid payload
  test('creates order with valid payload', () => {
    const result = orderModel.create({
      productId: 'PROD-001',
      quantity: 2,
      unitPrice: 29.99,
    });

    expect(result.id).toMatch(/^ORD-\d{8}-\d{3}$/);
    expect(result.product_id).toBe('PROD-001');
    expect(result.quantity).toBe(2);
    expect(result.unit_price).toBe(29.99);
    expect(result.total_amount).toBe(59.98);
    expect(result.status).toBe(ORDER_STATUS.PENDING);
  });

  // UT-O-02: Create order - missing productId
  test('throws VALIDATION_ERROR when productId is missing', () => {
    expect(() => {
      orderModel.create({ quantity: 2, unitPrice: 29.99 });
    }).toThrow(ERROR_CODES.VALIDATION_ERROR);
  });

  // UT-O-03: Create order - quantity <= 0
  test('throws VALIDATION_ERROR when quantity is zero or negative', () => {
    expect(() => {
      orderModel.create({ productId: 'PROD-001', quantity: 0, unitPrice: 29.99 });
    }).toThrow(ERROR_CODES.VALIDATION_ERROR);
  });

  // UT-O-04: Create order - unitPrice <= 0
  test('throws VALIDATION_ERROR when unitPrice is zero or negative', () => {
    expect(() => {
      orderModel.create({ productId: 'PROD-001', quantity: 2, unitPrice: -1 });
    }).toThrow(ERROR_CODES.VALIDATION_ERROR);
  });

  // UT-O-05: Calculate totalAmount
  test('calculates totalAmount correctly', () => {
    const result = orderModel.create({
      productId: 'PROD-001',
      quantity: 3,
      unitPrice: 10.5,
    });

    expect(result.total_amount).toBe(31.5);
  });

  // UT-O-06: Order ID format
  test('generates order ID in correct format', () => {
    const result = orderModel.create({
      productId: 'PROD-001',
      quantity: 1,
      unitPrice: 10,
    });

    expect(result.id).toMatch(/^ORD-\d{8}-\d{3}$/);
  });

  // UT-O-07: Get order - exists
  test('returns order when it exists', () => {
    const created = orderModel.create({
      productId: 'PROD-001',
      quantity: 1,
      unitPrice: 10,
    });

    const result = orderModel.getById(created.id);
    expect(result.id).toBe(created.id);
    expect(result.product_id).toBe('PROD-001');
  });

  // UT-O-08: Get order - not found
  test('returns null when order does not exist', () => {
    const result = orderModel.getById('ORD-99999999-999');
    expect(result).toBeNull();
  });

  // UT-O-09: Update status - valid transition
  test('updates order status with valid transition', () => {
    const created = orderModel.create({
      productId: 'PROD-001',
      quantity: 1,
      unitPrice: 10,
    });

    const result = orderModel.updateStatus(created.id, ORDER_STATUS.CONFIRMED);
    expect(result.status).toBe(ORDER_STATUS.CONFIRMED);
  });

  // UT-O-10: Update status - invalid transition
  test('throws INVALID_STATUS_TRANSITION for invalid transition', () => {
    const created = orderModel.create({
      productId: 'PROD-001',
      quantity: 1,
      unitPrice: 10,
    });

    // paid is not reachable from pending
    expect(() => {
      orderModel.updateStatus(created.id, ORDER_STATUS.PAID);
    }).toThrow(ERROR_CODES.INVALID_STATUS_TRANSITION);
  });

  // UT-O-11: Update status - non-existent order
  test('throws ORDER_NOT_FOUND when updating status of non-existent order', () => {
    expect(() => {
      orderModel.updateStatus('ORD-99999999-999', ORDER_STATUS.CONFIRMED);
    }).toThrow(ERROR_CODES.ORDER_NOT_FOUND);
  });

  // UT-O-12: List - negative page number
  test('treats negative page offset as no offset, returns all rows', () => {
    orderModel.create({ productId: 'PROD-001', quantity: 1, unitPrice: 10 });
    const result = orderModel.list({ page: -1, limit: 10 });
    // SQLite treats negative OFFSET as 0 (no offset)
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.pagination.page).toBe(-1);
  });

  // UT-O-13: List - zero limit
  test('returns empty data for zero limit', () => {
    const result = orderModel.list({ page: 1, limit: 0 });
    expect(result.data).toEqual([]);
    expect(result.pagination.limit).toBe(0);
  });

  // UT-O-14: List - non-numeric page causes SQL error
  test('throws on non-numeric page value', () => {
    expect(() => {
      orderModel.list({ page: 'abc', limit: 10 });
    }).toThrow();
  });

  // UT-O-15: Create - extreme values (large quantity * unitPrice)
  test('handles extreme quantity and unitPrice values', () => {
    const result = orderModel.create({
      productId: 'PROD-001',
      quantity: 999999,
      unitPrice: 999999.99,
    });
    expect(result.total_amount).toBeGreaterThan(0);
    expect(result.status).toBe(ORDER_STATUS.PENDING);
  });
});
