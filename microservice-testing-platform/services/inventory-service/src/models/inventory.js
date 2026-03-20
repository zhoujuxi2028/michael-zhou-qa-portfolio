const { ERROR_CODES } = require('../../../../shared/constants');

let _db;
function getDb() {
  if (!_db) _db = require('../db/init');
  return _db;
}

function getByProductId(productId) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM inventory WHERE product_id = ?').get(productId);
  if (!row) return null;
  return {
    ...row,
    available: row.quantity - row.reserved,
  };
}

function deduct(productId, quantity, orderId) {
  const db = getDb();

  if (!quantity || quantity <= 0) {
    const err = new Error(ERROR_CODES.VALIDATION_ERROR);
    err.code = ERROR_CODES.VALIDATION_ERROR;
    throw err;
  }

  // Idempotency check
  const existing = db
    .prepare('SELECT * FROM inventory_transactions WHERE order_id = ? AND type = ?')
    .get(orderId, 'deduct');
  if (existing) {
    const current = db.prepare('SELECT * FROM inventory WHERE product_id = ?').get(productId);
    return {
      productId,
      deducted: 0,
      remaining: current.quantity,
      orderId,
      alreadyDeducted: true,
    };
  }

  const item = db.prepare('SELECT * FROM inventory WHERE product_id = ?').get(productId);
  if (!item) {
    const err = new Error(ERROR_CODES.PRODUCT_NOT_FOUND);
    err.code = ERROR_CODES.PRODUCT_NOT_FOUND;
    throw err;
  }

  if (item.quantity < quantity) {
    const err = new Error(ERROR_CODES.INSUFFICIENT_STOCK);
    err.code = ERROR_CODES.INSUFFICIENT_STOCK;
    err.available = item.quantity;
    err.requested = quantity;
    throw err;
  }

  const deductTx = db.transaction(() => {
    db.prepare(
      "UPDATE inventory SET quantity = quantity - ?, updated_at = datetime('now') WHERE product_id = ?"
    ).run(quantity, productId);

    db.prepare(
      'INSERT INTO inventory_transactions (product_id, order_id, type, quantity) VALUES (?, ?, ?, ?)'
    ).run(productId, orderId, 'deduct', quantity);
  });
  deductTx();

  const updated = db.prepare('SELECT * FROM inventory WHERE product_id = ?').get(productId);
  return {
    productId,
    deducted: quantity,
    remaining: updated.quantity,
    orderId,
  };
}

function rollback(productId, quantity, orderId, _reason) {
  const db = getDb();

  // Idempotency check
  const existing = db
    .prepare('SELECT * FROM inventory_transactions WHERE order_id = ? AND type = ?')
    .get(orderId, 'rollback');
  if (existing) {
    const current = db.prepare('SELECT * FROM inventory WHERE product_id = ?').get(productId);
    return {
      productId,
      rolledBack: 0,
      remaining: current.quantity,
      orderId,
      alreadyRolledBack: true,
    };
  }

  const rollbackTx = db.transaction(() => {
    db.prepare(
      "UPDATE inventory SET quantity = quantity + ?, updated_at = datetime('now') WHERE product_id = ?"
    ).run(quantity, productId);

    db.prepare(
      'INSERT INTO inventory_transactions (product_id, order_id, type, quantity) VALUES (?, ?, ?, ?)'
    ).run(productId, orderId, 'rollback', quantity);
  });
  rollbackTx();

  const updated = db.prepare('SELECT * FROM inventory WHERE product_id = ?').get(productId);
  return {
    productId,
    rolledBack: quantity,
    remaining: updated.quantity,
    orderId,
  };
}

module.exports = { getByProductId, deduct, rollback };
