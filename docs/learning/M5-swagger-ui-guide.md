# Swagger UI 完整使用指南

**访问地址**: http://localhost:3000/api-docs/

---

## 📋 API 端点概览

| 路由 | 方法 | 认证 | 用途 |
|------|------|------|------|
| `/api/auth/register` | POST | ❌ 否 | 注册新用户 |
| `/api/auth/login` | POST | ❌ 否 | 登录获取 Token |
| `/api/auth/refresh` | POST | ❌ 否 | 刷新访问令牌 |
| `/api/auth/logout` | POST | ✅ 是 | 登出（需要 Bearer Token） |
| `/api/products` | GET | ❌ 否 | 获取产品列表（分页） |
| `/api/products` | POST | ❌ 否 | 创建新产品 |
| `/api/products/{id}` | GET | ❌ 否 | 获取单个产品 |

---

## 🔐 认证工作流

### 第 1 步：注册用户
1. 打开 Swagger UI → 找到 `/api/auth/register` (POST)
2. 点击 **"Try it out"** 按钮
3. 在请求体中输入：
```json
{
  "username": "testuser",
  "password": "password123"
}
```
4. 点击 **"Execute"**
5. 响应应显示 `201 Created` 和 `{id: 1, username: "testuser"}`

### 第 2 步：登录获取 Token
1. 找到 `/api/auth/login` (POST)
2. 点击 **"Try it out"**
3. 输入：
```json
{
  "username": "testuser",
  "password": "password123"
}
```
4. 点击 **"Execute"**
5. **重要**：复制响应中的 `accessToken` 值（完整的 JWT 字符串）

**响应示例**：
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 第 3 步：在 Swagger UI 中配置认证
1. 点击 Swagger UI 右上角的 **"Authorize"** 按钮
2. 在弹出的对话框中，选择 **"bearerAuth"**
3. 在 "value" 字段中粘贴从登录响应中复制的 `accessToken`（**不需要添加 "Bearer " 前缀**）
4. 点击 **"Authorize"** 按钮
5. 关闭对话框

### 第 4 步：测试受保护的端点
1. 找到 `/api/auth/logout` (POST)
2. 点击 **"Try it out"**
3. 可选：在请求体中添加 `refreshToken`：
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```
4. 点击 **"Execute"** → 应返回 `200 OK` 和 `{message: "Logged out"}`

---

## 🧪 测试场景

### 场景 1：测试产品列表 API（无需认证）
```
GET /api/products?page=1&limit=5
```
✅ 返回 `200 OK` 和产品数组

### 场景 2：创建产品（无需认证）
```
POST /api/products
{
  "name": "Gaming Laptop",
  "price": 1299.99,
  "stock": 50
}
```
✅ 返回 `201 Created` 和新产品对象

### 场景 3：获取单个产品（无需认证）
```
GET /api/products/1
```
✅ 返回 `200 OK` 和产品对象
❌ 返回 `404 Not Found`（如果 ID 不存在）

### 场景 4：刷新 Token（无需认证）
```
POST /api/auth/refresh
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```
✅ 返回 `200 OK` 和新的 `accessToken`

### 场景 5：登出后尝试使用旧 Token（应失败）
1. 登出后（上面第 4 步）
2. 尝试再次调用 `/api/auth/logout`
3. ❌ 应返回 `401 Unauthorized`（Token 已被撤销）

---

## 🔍 常见问题

### Q: "Available authorizations" 显示为空？
**A**: 这是正常的。大多数 endpoints 不需要认证。只有 `/api/auth/logout` 需要。
- 点击 "Authorize" 按钮配置认证
- 后续请求会自动使用该 Token

### Q: Token 过期了怎么办？
**A**: 
1. accessToken 有效期：15 分钟
2. 使用 `/api/auth/refresh` 端点和 `refreshToken` 获取新 token
3. refreshToken 有效期：7 天

### Q: 如何清除授权信息？
**A**: 
1. 点击 "Authorize" 按钮
2. 找到 "bearerAuth"
3. 点击 "Logout" 按钮

### Q: 为什么 Bearer Token 要求不加 "Bearer " 前缀？
**A**: Swagger UI 会自动添加。你只需提供 token 本身。

---

## 📝 Token 格式

JWT Token 由三部分组成（用 `.` 分隔）：
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsInVzZXJuYW1lIjoidGVzdHVzZXIiLCJ0eXBlIjoiYWNjZXNzIiwiaWF0IjoxNjc2NjIzODI5LCJleHAiOjE2NzY2MjQ1Mjl9.xxxxx
↑ Header (Base64)                         ↑ Payload (Base64)                                ↑ Signature
```

你可以在 https://jwt.io 上解码查看 Token 内容。

---

## 🚀 进阶用法

### 使用 curl 测试认证
```bash
# 注册
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"user1","password":"pass123"}'

# 登录
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"user1","password":"pass123"}' | jq -r .accessToken)

# 使用 Token 调用受保护的端点
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN"
```

### 在 Postman 中使用
1. 在 Authorization 标签中选择 "Bearer Token"
2. 粘贴 accessToken 值
3. 所有请求都会自动添加 "Authorization: Bearer {token}" 头

---

**更新日期**: 2026-04-14
**项目**: performance-testing-platform
**状态**: ✅ 完整功能演示
