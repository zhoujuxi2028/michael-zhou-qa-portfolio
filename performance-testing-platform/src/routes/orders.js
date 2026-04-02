const { Router } = require('express');
const { getDatabase } = require('../db/database');
const { simulateDelay } = require('../utils/delay');
const { authenticate } = require('../middleware/authenticate');

const router = Router();
const ORDER_DELAY_MS = parseInt(process.env.ORDER_DELAY_MS) || 50;

router.get('/api/orders', (req, res) => {
  const db = getDatabase();
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const orders = db
    .prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT ? OFFSET ?')
    .all(limit, offset);
  const total = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
  res.json({ data: orders, page, limit, total });
});

router.post(
  '/api/orders',
  (req, res, next) => {
    if (process.env.AUTH_ENABLED === 'true') {
      return authenticate(req, res, next);
    }
    next();
  },
  async (req, res) => {
    const db = getDatabase();
    const { product_id, quantity } = req.body;
    if (!product_id || !quantity)
      return res.status(400).json({ error: 'product_id and quantity required' });

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(product_id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (product.stock < quantity) return res.status(409).json({ error: 'Insufficient stock' });

    await simulateDelay(ORDER_DELAY_MS);

    const total = product.price * quantity;
    const tx = db.transaction(() => {
      db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(quantity, product_id);
      return db
        .prepare('INSERT INTO orders (product_id, quantity, total, status) VALUES (?, ?, ?, ?)')
        .run(product_id, quantity, total, 'confirmed');
    });
    const result = tx();
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(order);
  }
);

module.exports = router;
