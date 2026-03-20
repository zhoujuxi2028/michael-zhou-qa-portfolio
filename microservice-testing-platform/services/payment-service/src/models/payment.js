const { PAYMENT_FAILURE_THRESHOLD, ERROR_CODES } = require('../../../../shared/constants');

let _db;
function getDb() {
  if (!_db) _db = require('../db/init');
  return _db;
}

let paymentCounter = 0;

function generateId() {
  paymentCounter++;
  return `PAY-${String(paymentCounter).padStart(3, '0')}`;
}

function processPayment({ orderId, amount, correlationId }) {
  const db = getDb();

  if (!amount || amount <= 0) {
    const err = new Error(ERROR_CODES.VALIDATION_ERROR);
    err.code = ERROR_CODES.VALIDATION_ERROR;
    throw err;
  }

  // Idempotency check
  const existing = db.prepare('SELECT * FROM payments WHERE order_id = ?').get(orderId);
  if (existing) {
    return { ...existing, alreadyProcessed: true };
  }

  const id = generateId();
  const status = amount >= PAYMENT_FAILURE_THRESHOLD ? 'failed' : 'completed';
  const processedAt = new Date().toISOString();

  db.prepare(
    'INSERT INTO payments (id, order_id, amount, status, correlation_id, processed_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, orderId, amount, status, correlationId || null, processedAt);

  return db.prepare('SELECT * FROM payments WHERE id = ?').get(id);
}

function getByOrderId(orderId) {
  const db = getDb();
  return db.prepare('SELECT * FROM payments WHERE order_id = ?').get(orderId) || null;
}

function parseOrderEvent(payload) {
  try {
    const data = JSON.parse(payload);
    if (!data.orderId || !data.totalAmount) return null;
    return data;
  } catch (_e) {
    return null;
  }
}

function buildCallbackPayload(payment) {
  return {
    status: payment.status === 'completed' ? 'paid' : 'failed',
    paymentId: payment.id,
  };
}

module.exports = { processPayment, getByOrderId, parseOrderEvent, buildCallbackPayload };
