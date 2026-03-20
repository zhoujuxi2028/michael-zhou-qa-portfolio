const { ORDER_STATUS, VALID_TRANSITIONS, ERROR_CODES } = require('../../../../shared/constants');

let _db;
function getDb() {
  if (!_db) _db = require('../db/init');
  return _db;
}

let orderCounter = 0;

function generateId() {
  orderCounter++;
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `ORD-${date}-${String(orderCounter).padStart(3, '0')}`;
}

function create({ productId, quantity, unitPrice }) {
  const db = getDb();

  if (!productId) {
    const err = new Error(ERROR_CODES.VALIDATION_ERROR);
    err.code = ERROR_CODES.VALIDATION_ERROR;
    throw err;
  }
  if (!quantity || quantity <= 0) {
    const err = new Error(ERROR_CODES.VALIDATION_ERROR);
    err.code = ERROR_CODES.VALIDATION_ERROR;
    throw err;
  }
  if (!unitPrice || unitPrice <= 0) {
    const err = new Error(ERROR_CODES.VALIDATION_ERROR);
    err.code = ERROR_CODES.VALIDATION_ERROR;
    throw err;
  }

  const id = generateId();
  const totalAmount = Math.round(quantity * unitPrice * 100) / 100;

  db.prepare(
    'INSERT INTO orders (id, product_id, quantity, unit_price, total_amount, status) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, productId, quantity, unitPrice, totalAmount, ORDER_STATUS.PENDING);

  return db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
}

function getById(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM orders WHERE id = ?').get(id) || null;
}

function list({ status, page = 1, limit = 10 } = {}) {
  const db = getDb();
  const offset = (page - 1) * limit;

  let query = 'SELECT * FROM orders';
  let countQuery = 'SELECT COUNT(*) as total FROM orders';
  const params = [];
  const countParams = [];

  if (status) {
    query += ' WHERE status = ?';
    countQuery += ' WHERE status = ?';
    params.push(status);
    countParams.push(status);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const data = db.prepare(query).all(...params);
  const { total } = db.prepare(countQuery).get(...countParams);

  return { data, pagination: { page, limit, total } };
}

function updateStatus(id, newStatus, paymentId) {
  const db = getDb();
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);

  if (!order) {
    const err = new Error(ERROR_CODES.ORDER_NOT_FOUND);
    err.code = ERROR_CODES.ORDER_NOT_FOUND;
    throw err;
  }

  const allowed = VALID_TRANSITIONS[order.status] || [];
  if (!allowed.includes(newStatus)) {
    const err = new Error(ERROR_CODES.INVALID_STATUS_TRANSITION);
    err.code = ERROR_CODES.INVALID_STATUS_TRANSITION;
    throw err;
  }

  const updates = paymentId
    ? "status = ?, payment_id = ?, updated_at = datetime('now')"
    : "status = ?, updated_at = datetime('now')";
  const params = paymentId ? [newStatus, paymentId, id] : [newStatus, id];

  db.prepare(`UPDATE orders SET ${updates} WHERE id = ?`).run(...params);
  return db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
}

module.exports = { create, getById, list, updateStatus };
