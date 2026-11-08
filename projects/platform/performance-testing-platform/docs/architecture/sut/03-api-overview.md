# API 端点概览

## 12 个端点速表

| 方法 | 路径               | 认证 | 用途                       | Phase |
| ---- | ------------------ | ---- | -------------------------- | ----- |
| GET  | /health            | ❌   | 服务健康检查               | 1     |
| GET  | /ready             | ❌   | 就绪探针                   | 1     |
| GET  | /metrics           | ❌   | 性能指标导出               | 1     |
| GET  | /api/products      | ❌   | 商品列表（分页）           | 1     |
| GET  | /api/products/:id  | ❌   | 商品详情                   | 1     |
| POST | /api/products      | ❌   | 创建商品                   | 1     |
| GET  | /api/orders        | ❌   | 订单列表（分页）           | 1     |
| POST | /api/orders        | ⚠️   | 下单（AUTH_ENABLED 开关）  | 1, 3  |
| POST | /api/auth/register | ❌   | 用户注册（bcrypt 10）      | 3     |
| POST | /api/auth/login    | ❌   | 用户登录（JWT access 15m） | 3     |
| POST | /api/auth/refresh  | ❌   | 刷新 token                 | 3     |
| POST | /api/auth/logout   | ✅   | 登出（token 加黑名单）     | 3     |

## 关键设计

### POST /api/orders

```
条件：
  - product_id & quantity 必填
  - stock 不足 → 409 Conflict

流程：
  1. 查询商品库存
  2. simulateDelay(ORDER_DELAY_MS, 默认 50ms) // 模拟业务处理
  3. 事务：扣减库存 + 插入订单

认证：
  - AUTH_ENABLED=true 时，检查 Bearer token
  - 默认 false，向后兼容
```

### GET /metrics

```json
{
  "requestCount": 42,
  "avgDuration": 125,
  "cpu": { "userPercent": 12.3, "systemPercent": 4.5, "loadavg": [1.2, 1.0, 0.8] },
  "memory": { "rss": 52428800, "heapUsed": 15728640, "heapTotal": 29360128, "external": 1024 },
  "eventLoop": { "lag": 2.3 }
}
```

### JWT 认证

- **登录**：返回 accessToken (15m) + refreshToken (7d)
- **验证**：Bearer token in Authorization header
- **黑名单**：logout 后 token_jti 加入黑名单，refresh 前检查

详见 Swagger UI: `http://localhost:3000/api-docs`
