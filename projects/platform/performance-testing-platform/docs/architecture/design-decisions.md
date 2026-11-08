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

| 检查项           | 当前      | 生产环境应该 |
| ---------------- | --------- | ------------ |
| 字段是否存在     | ✅ 检查   | ✅ 检查      |
| name 非空        | ✅ 检查   | ✅ 检查      |
| price 非空       | ✅ 检查   | ✅ 检查      |
| price > 0        | ❌ 不检查 | ✅ 应检查    |
| stock >= 0       | ❌ 不检查 | ✅ 应检查    |
| name 长度 <= 255 | ❌ 不检查 | ✅ 应检查    |
| price 数据类型   | ❌ 不检查 | ✅ 应检查    |

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

## 4. CI 输出目录约定（DD-04）

### 决策

CI job 中所有向子目录写入文件的步骤，**必须在同一 job 内显式执行 `mkdir -p <dir>`**，禁止依赖 git checkout 或其他外部机制提供目录结构。

### 原因

RCA（2026-04-21）发现：`reports/` 目录被意外提交 git 后，CI checkout 会自动恢复该目录，掩盖了缺失 `mkdir -p` 的 Bug 约 3 天（runs 197-212）。一旦测试产物从 git 移除（正确做法），Bug 立即暴露（runs 213-215，exit code 255）。

**核心原则**: CI runner 是全新空目录（tabula rasa），job 对执行环境应**零假设**。

### 规范

```yaml
# ❌ 错误（依赖 git checkout 提供 reports/ 目录）
- name: Run k6
  run: k6 run --out json=reports/k6-summary.json smoke.k6.js

# ✅ 正确（显式创建目录）
- name: Run k6
  run: |
    mkdir -p reports
    k6 run --out json=reports/k6-summary.json smoke.k6.js
```

### 覆盖范围

| 写入模式                  | 示例                      | 要求               |
| ------------------------- | ------------------------- | ------------------ |
| `k6 --out json=dir/file`  | `reports/k6-summary.json` | `mkdir -p reports` |
| `jmeter -l dir/file`      | `results/smoke.jtl`       | `mkdir -p results` |
| `gh run download -D dir/` | `reports/`                | `mkdir -p reports` |
| shell 重定向 `> dir/file` | `reports/scan.json`       | `mkdir -p reports` |

### 自动检查工具

`scripts/ci-lint.js` — 检测 workflow 中所有违规的输出目录写入。

```bash
npm run ci:lint                     # 检查 performance-ci.yml
node scripts/ci-lint.js path/to.yml # 检查指定文件
```

### 代码位置

- 检查脚本: `scripts/ci-lint.js`
- 单元测试: `tests/unit/scripts/ci-lint.test.js` (12 tests)
- 相关 CLAUDE.md 条目: ISS-019

---

## 参考

- Issue #103: M5-002 - 故意关闭，因为是性能测试的设计需求
- 相关文档: ../../michael-zhou-portfolio/docs/copilot-cli-journey/M5-TECH-STACK-COMPARISON.md (已迁移到个人 Portfolio)
