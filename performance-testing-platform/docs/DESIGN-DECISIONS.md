# Performance Testing Platform - 设计决策

## 1. 最小化 API 数据验证

### 决策
API endpoints 采用 **最小化验证**（minimal validation），只检查必需字段是否存在，不进行范围/类型验证。

### 原因
性能基准测试（benchmark）需要准确测量系统在高负载下的真实表现：
- **目标**: 测量数据库和网络延迟
- **干扰因素**: 输入验证逻辑会增加 CPU 开销，掩盖真实瓶颈
- **解决方案**: 接受任意值，关闭验证逻辑

### 示例

❌ **这些都被接受**（故意）：
```bash
# 负数价格
POST /api/products
{"name":"Product","price":-999,"stock":100}
→ 201 Created ✓

# 超大库存
{"name":"Product","price":99.99,"stock":999999999999}
→ 201 Created ✓

# 价格为零
{"name":"FreeProduct","price":0,"stock":50}
→ 201 Created ✓
```

### 当前验证规则

| 检查项 | 当前 | 生产环境应该 |
|-------|------|------------|
| 字段是否存在 | ✅ 检查 | ✅ 检查 |
| name 非空 | ✅ 检查 | ✅ 检查 |
| price 非空 | ✅ 检查 | ✅ 检查 |
| price > 0 | ❌ 不检查 | ✅ 应检查 |
| stock >= 0 | ❌ 不检查 | ✅ 应检查 |
| name 长度 <= 255 | ❌ 不检查 | ✅ 应检查 |
| price 数据类型 | ❌ 不检查 | ✅ 应检查 |

### 代码位置

```javascript
// src/routes/products.js - POST /api/products
router.post('/api/products', (req, res) => {
  // NOTE: Minimal validation by design for performance testing
  // Do NOT add price > 0 or stock >= 0 checks - this is intentional
  const db = getDatabase();
  const { name, price, stock } = req.body;
  if (!name || price == null) return res.status(400).json({ error: 'name and price required' });
  // ... 直接插入，不进行范围验证
});
```

### 何时修改此设计

如果项目目标改变，应该：

1. **启用完整验证**（生产部署）
   ```javascript
   if (!name || typeof name !== 'string' || name.trim() === '') {
     return res.status(400).json({ error: 'Invalid name' });
   }
   if (typeof price !== 'number' || price <= 0) {
     return res.status(400).json({ error: 'Price must be > 0' });
   }
   if (typeof stock !== 'number' || stock < 0) {
     return res.status(400).json({ error: 'Stock must be >= 0' });
   }
   ```

2. **分离测试路由**
   ```javascript
   // /api/products - 完整验证（生产环境）
   // /api/perf/products - 最小验证（性能测试）
   ```

3. **使用验证中间件**
   ```javascript
   const validateProduct = (req, res, next) => {
     // 完整验证逻辑
   };
   router.post('/api/products', validateProduct, createProduct);
   ```

---

## 2. JWT Token 有效期设置

### 决策
- **accessToken**: 15 分钟
- **refreshToken**: 7 天

### 原因
- accessToken 短期有效，降低泄漏风险
- refreshToken 长期有效，避免频繁登录
- 适合性能测试场景（测试期间不需要重新登录）

### 代码位置
`src/routes/auth.js` 第 9-11 行

---

## 3. Swagger 文档生成方式

### 决策
使用 swagger-jsdoc + swagger-ui-express，自动扫描 JSDoc @swagger 标签

### 优点
- 文档与代码同步
- 修改 JSDoc 自动更新 API 文档
- 开发效率高

### 代码位置
- `docs/swagger.js` - 配置文件
- `src/routes/*.js` - @swagger JSDoc 标签
- `src/app.js` - Swagger UI 中间件

---

## 参考

- Issue #103: M5-002 - 故意关闭，因为是性能测试的设计需求
- 相关文档: ../../michael-zhou-portfolio/docs/copilot-cli-journey/M5-TECH-STACK-COMPARISON.md (已迁移到个人 Portfolio)
