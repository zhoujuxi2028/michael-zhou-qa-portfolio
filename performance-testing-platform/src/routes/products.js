const { Router } = require('express');
const { getDatabase } = require('../db/database');

const router = Router();

router.get('/api/products', (req, res) => {
  const db = getDatabase();
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const products = db.prepare('SELECT * FROM products LIMIT ? OFFSET ?').all(limit, offset);
  const total = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
  res.json({ data: products, page, limit, total });
});

router.get('/api/products/:id', (req, res) => {
  const db = getDatabase();
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

router.post('/api/products', (req, res) => {
  const db = getDatabase();
  const { name, price, stock } = req.body;
  if (!name || price == null) return res.status(400).json({ error: 'name and price required' });
  const result = db
    .prepare('INSERT INTO products (name, price, stock) VALUES (?, ?, ?)')
    .run(name, price, stock || 0);
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(product);
});

module.exports = router;
