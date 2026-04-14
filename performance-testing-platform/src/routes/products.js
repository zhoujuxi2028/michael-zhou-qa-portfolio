const { Router } = require('express');
const { getDatabase } = require('../db/database');

const router = Router();

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: 获取产品列表（分页）
 *     description: 分页获取数据库中的所有产品。支持通过 page 和 limit 参数控制分页。
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 页码（从 1 开始）
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: 每页返回的数据条数
 *     responses:
 *       200:
 *         description: 成功返回产品列表和分页信息
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 total:
 *                   type: integer
 */
router.get('/api/products', (req, res) => {
  const db = getDatabase();
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const products = db.prepare('SELECT * FROM products LIMIT ? OFFSET ?').all(limit, offset);
  const total = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
  res.json({ data: products, page, limit, total });
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: 获取单个产品详情
 *     description: 通过产品 ID 获取单个产品的完整信息。
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: number
 *         description: 产品的唯一标识符
 *     responses:
 *       200:
 *         description: 成功返回产品对象
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: 产品不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/api/products/:id', (req, res) => {
  const db = getDatabase();
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: 创建新产品
 *     description: 在数据库中创建一个新的产品记录。返回创建的产品对象。
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *             properties:
 *               name:
 *                 type: string
 *                 description: 产品名称
 *               price:
 *                 type: number
 *                 description: 产品价格
 *               stock:
 *                 type: number
 *                 default: 0
 *                 description: 产品库存（可选，默认 0）
 *     responses:
 *       201:
 *         description: 成功创建产品
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: 缺少必需字段
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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
