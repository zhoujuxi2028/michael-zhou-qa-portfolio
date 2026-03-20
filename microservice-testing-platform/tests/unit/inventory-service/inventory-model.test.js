const { ERROR_CODES } = require('../../../shared/constants');

let db;
let inventoryModel;

beforeEach(() => {
  jest.resetModules();
  // Use in-memory DB for tests
  process.env.DB_PATH = ':memory:';
  db = require('../../../services/inventory-service/src/db/init');
  inventoryModel = require('../../../services/inventory-service/src/models/inventory');
});

afterEach(() => {
  db.close();
});

describe('Inventory Model', () => {
  // UT-I-01: Query inventory - product exists
  test('returns inventory info when product exists', () => {
    const result = inventoryModel.getByProductId('PROD-001');

    expect(result).toMatchObject({
      product_id: 'PROD-001',
      product_name: 'Widget A',
      quantity: 100,
      reserved: 0,
    });
    expect(result.available).toBe(100);
  });

  // UT-I-02: Query inventory - product not found
  test('returns null when product does not exist', () => {
    const result = inventoryModel.getByProductId('PROD-999');

    expect(result).toBeNull();
  });

  // UT-I-03: Deduct inventory - sufficient stock
  test('deducts inventory when stock is sufficient', () => {
    const result = inventoryModel.deduct('PROD-001', 2, 'ORD-001');

    expect(result).toMatchObject({
      productId: 'PROD-001',
      deducted: 2,
      remaining: 98,
      orderId: 'ORD-001',
    });
  });

  // UT-I-04: Deduct inventory - insufficient stock
  test('throws INSUFFICIENT_STOCK when stock is insufficient', () => {
    expect(() => {
      inventoryModel.deduct('PROD-001', 200, 'ORD-001');
    }).toThrow(ERROR_CODES.INSUFFICIENT_STOCK);
  });

  // UT-I-05: Deduct inventory - exact amount
  test('deducts inventory when requesting exact available amount', () => {
    const result = inventoryModel.deduct('PROD-004', 10, 'ORD-001');

    expect(result.remaining).toBe(0);
  });

  // UT-I-06: Deduct inventory - quantity <= 0
  test('throws VALIDATION_ERROR when deduct quantity is zero or negative', () => {
    expect(() => {
      inventoryModel.deduct('PROD-001', 0, 'ORD-001');
    }).toThrow(ERROR_CODES.VALIDATION_ERROR);

    expect(() => {
      inventoryModel.deduct('PROD-001', -1, 'ORD-002');
    }).toThrow(ERROR_CODES.VALIDATION_ERROR);
  });

  // UT-I-07: Rollback inventory - normal rollback
  test('rolls back inventory after deduction', () => {
    inventoryModel.deduct('PROD-001', 5, 'ORD-001');
    const result = inventoryModel.rollback('PROD-001', 5, 'ORD-001', 'payment_failed');

    expect(result).toMatchObject({
      productId: 'PROD-001',
      rolledBack: 5,
      remaining: 100,
      orderId: 'ORD-001',
    });
  });

  // UT-I-08: Rollback inventory - duplicate rollback (idempotent)
  test('handles duplicate rollback idempotently', () => {
    inventoryModel.deduct('PROD-001', 5, 'ORD-001');
    inventoryModel.rollback('PROD-001', 5, 'ORD-001', 'payment_failed');
    const result = inventoryModel.rollback('PROD-001', 5, 'ORD-001', 'payment_failed');

    expect(result).toMatchObject({
      productId: 'PROD-001',
      rolledBack: 0,
      orderId: 'ORD-001',
      alreadyRolledBack: true,
    });
  });

  // UT-I-09: Duplicate deduction (idempotent)
  test('handles duplicate deduction idempotently', () => {
    const first = inventoryModel.deduct('PROD-001', 5, 'ORD-001');
    const second = inventoryModel.deduct('PROD-001', 5, 'ORD-001');

    expect(first.deducted).toBe(5);
    expect(second.deducted).toBe(0);
    expect(second.alreadyDeducted).toBe(true);
  });

  // UT-I-10: Available calculation
  test('calculates available as quantity minus reserved', () => {
    inventoryModel.deduct('PROD-001', 5, 'ORD-001');
    const result = inventoryModel.getByProductId('PROD-001');

    expect(result.quantity).toBe(95);
    expect(result.available).toBe(95);
  });
});
