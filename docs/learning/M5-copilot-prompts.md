# M5: Copilot Prompt 模板库

用于生成 Docstring 的精准 Copilot Prompts（直接可用）

---

## 📌 Prompt 1: GET /api/products (获取产品列表，分页)

**文件**: `src/routes/products.js` (第 6-14 行)

**用途**: 为分页获取产品列表的 API 端点生成 JSDoc

**执行方式**:
```bash
cd /Users/michaelzhou/Documents/github/michael-zhou-qa-portfolio/performance-testing-platform

gh copilot suggest "为这个 Express API 端点补充完整的 JSDoc Docstring。

代码：
router.get('/api/products', (req, res) => {
  const db = getDatabase();
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  const products = db.prepare('SELECT * FROM products LIMIT ? OFFSET ?').all(limit, offset);
  const total = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
  res.json({ data: products, page, limit, total });
});

要求：
- 使用 JSDoc 格式（/** ... */）
- 包含：一句话简明描述、详细描述、@route、@query (page和limit)、@returns
- @returns 要详细列出返回对象的每个字段：data (Product[]), page, limit, total
- data 数组中的 Product 对象需说明字段：id, name, price, stock
- 加上 @example，展示完整的 HTTP 请求和响应例子
- 使用中文注释"
```

**预期输出**（参考）:
```javascript
/**
 * 获取产品列表（分页）
 *
 * 分页获取数据库中的所有产品。支持通过 page 和 limit 参数控制分页。
 *
 * @route GET /api/products
 * @query {number} [page=1] - 页码（从 1 开始）
 * @query {number} [limit=10] - 每页返回的数据条数
 *
 * @returns {object} 返回产品列表和分页信息
 * @returns {array} data - 产品对象数组
 * @returns {number} data[].id - 产品 ID
 * @returns {string} data[].name - 产品名称
 * @returns {number} data[].price - 产品价格
 * @returns {number} data[].stock - 产品库存
 * @returns {number} page - 当前页码
 * @returns {number} limit - 本页返回的数据条数
 * @returns {number} total - 总数据条数
 *
 * @example
 * GET /api/products?page=1&limit=5
 * {
 *   "data": [
 *     {"id": 1, "name": "Laptop", "price": 999, "stock": 10},
 *     {"id": 2, "name": "Mouse", "price": 29, "stock": 50}
 *   ],
 *   "page": 1,
 *   "limit": 5,
 *   "total": 50
 * }
 */
```

---

## 📌 Prompt 2: GET /api/products/:id (获取单个产品)

**文件**: `src/routes/products.js` (第 16-21 行)

**用途**: 为获取单个产品详情的 API 端点生成 JSDoc

**执行方式**:
```bash
cd /Users/michaelzhou/Documents/github/michael-zhou-qa-portfolio/performance-testing-platform

gh copilot suggest "为这个 Express API 端点补充完整的 JSDoc Docstring。

代码：
router.get('/api/products/:id', (req, res) => {
  const db = getDatabase();
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

要求：
- 使用 JSDoc 格式（/** ... */）
- 包含：一句话简明描述、@route、@param (id)、@returns、@throws/@errors
- @param {number} id - 产品的数字 ID
- @returns 说明成功时返回单个 Product 对象（含 id, name, price, stock）
- @throws/@errors 说明失败情况：404 Not Found（当 id 不存在时）
- 加上 @example，展示两个例子：成功和失败
- 使用中文注释"
```

**预期输出**（参考）:
```javascript
/**
 * 获取单个产品详情
 *
 * 通过产品 ID 获取单个产品的完整信息。
 *
 * @route GET /api/products/:id
 * @param {number} id - 产品的唯一标识符
 *
 * @returns {object} 产品对象
 * @returns {number} id - 产品 ID
 * @returns {string} name - 产品名称
 * @returns {number} price - 产品价格
 * @returns {number} stock - 产品库存
 *
 * @throws {Error} 404 Not Found - 当指定的产品 ID 不存在时
 *
 * @example
 * // 成功示例
 * GET /api/products/1
 * {
 *   "id": 1,
 *   "name": "Laptop",
 *   "price": 999,
 *   "stock": 10
 * }
 *
 * // 失败示例（404）
 * GET /api/products/999
 * {
 *   "error": "Product not found"
 * }
 */
```

---

## 📌 Prompt 3: POST /api/products (创建产品)

**文件**: `src/routes/products.js` (第 23-32 行)

**用途**: 为创建新产品的 API 端点生成 JSDoc

**执行方式**:
```bash
cd /Users/michaelzhou/Documents/github/michael-zhou-qa-portfolio/performance-testing-platform

gh copilot suggest "为这个 Express API 端点补充完整的 JSDoc Docstring。

代码：
router.post('/api/products', (req, res) => {
  const db = getDatabase();
  const { name, price, stock } = req.body;
  if (!name || price == null) return res.status(400).json({ error: 'name and price required' });
  const result = db.prepare('INSERT INTO products (name, price, stock) VALUES (?, ?, ?)').run(name, price, stock || 0);
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(product);
});

要求：
- 使用 JSDoc 格式（/** ... */）
- 包含：一句话简明描述、@route、@body/@param (name, price, stock)
- @body 或 @param 说明请求体中的必需字段和可选字段
- name (string, required), price (number, required), stock (number, optional)
- @returns 说明成功时返回新创建的 Product 对象和 201 状态码
- @throws/@errors 说明验证错误：400 当缺少 name 或 price 时
- 加上 @example，展示成功和失败的请求/响应
- 使用中文注释"
```

**预期输出**（参考）:
```javascript
/**
 * 创建新产品
 *
 * 在数据库中创建一个新的产品记录。返回创建的产品对象。
 *
 * @route POST /api/products
 * @body {string} name - 产品名称（必需）
 * @body {number} price - 产品价格（必需）
 * @body {number} [stock=0] - 产品库存（可选，默认 0）
 *
 * @returns {object} 201 Created - 新创建的产品对象
 * @returns {number} id - 新产品的 ID（由数据库自动生成）
 * @returns {string} name - 产品名称
 * @returns {number} price - 产品价格
 * @returns {number} stock - 产品库存
 *
 * @throws {Error} 400 Bad Request - 缺少必需字段 (name 或 price)
 *
 * @example
 * // 成功示例
 * POST /api/products
 * Content-Type: application/json
 * {
 *   "name": "Keyboard",
 *   "price": 79,
 *   "stock": 100
 * }
 * 返回（201）:
 * {
 *   "id": 5,
 *   "name": "Keyboard",
 *   "price": 79,
 *   "stock": 100
 * }
 *
 * // 失败示例（400）
 * POST /api/products
 * {
 *   "name": "Monitor"
 *   // 缺少 price 字段
 * }
 * 返回（400）:
 * {
 *   "error": "name and price required"
 * }
 */
```

---

## 🚀 使用指南

### 执行顺序
1. **第一个** (GET /api/products) - 最简单，只有查询参数
2. **第二个** (GET /api/products/:id) - 中等，有路径参数和错误处理
3. **第三个** (POST /api/products) - 最复杂，有请求体和验证

### 执行步骤
1. 复制上面任意一个 Prompt 代码块（从 `gh copilot suggest` 开始到最后）
2. 在终端中粘贴并执行
3. Copilot 会返回完整的 JSDoc Docstring
4. 复制返回的 Docstring
5. 粘贴到 `src/routes/products.js` 中，放在对应函数上方

### 验证检查清单
- [ ] 格式正确（`/** ... */`）
- [ ] 包含 @route, @query/@body/@param, @returns, @throws/@errors
- [ ] 包含 @example 部分
- [ ] 中文注释清晰
- [ ] 示例值真实可用

---

## 📊 Prompt 的关键要素对照表

| 要素 | Prompt 1 | Prompt 2 | Prompt 3 |
|------|----------|----------|----------|
| 任务明确 | ✅ "Express API 端点" | ✅ "Express API 端点" | ✅ "Express API 端点" |
| 完整代码 | ✅ 整个 router.get() | ✅ 整个 router.get() | ✅ 整个 router.post() |
| 格式指定 | ✅ JSDoc 格式 | ✅ JSDoc 格式 | ✅ JSDoc 格式 |
| 内容列表 | ✅ 列出所有标签 | ✅ 列出所有标签 | ✅ 列出所有标签 |
| 具体要求 | ✅ 说明返回字段 | ✅ 说明 404 错误 | ✅ 说明 400 错误 |

---

**保存位置**: `/Users/michaelzhou/Documents/github/michael-zhou-qa-portfolio/docs/learning/M5-copilot-prompts.md`

**更新日期**: 2026-04-14

**状态**: ✅ 可直接使用
