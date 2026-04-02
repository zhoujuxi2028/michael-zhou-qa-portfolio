# Implementation Plan — Phase 3: JWT 认证场景性能测试

**Issue:** [#56](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/56)
**Branch:** `feature/auth-perf-testing`
**Date:** 2026-04-02

---

## 1. 架构设计

### 1.1 认证流程

```
                       ┌─────────────────────────────────────────────┐
                       │              认证层 (新增)                     │
                       │                                              │
  POST /api/auth/register ──→ bcrypt hash (10 rounds, ~100ms) ──→ SQLite users 表
                       │                                              │
  POST /api/auth/login ──→ bcrypt compare (~100ms) ──→ 签发 JWT      │
                       │     Access Token (15min) + Refresh Token (7d)│
                       │                                              │
  POST /api/auth/refresh ──→ 验证 Refresh Token ──→ 签发新 Access    │
                       │                                              │
  POST /api/auth/logout ──→ Token 加入黑名单表                        │
                       └──────────────────┬──────────────────────────┘
                                          │
                       ┌──────────────────▼──────────────────────────┐
                       │         JWT 中间件 (条件启用)                  │
                       │                                              │
                       │  AUTH_ENABLED=true?                          │
                       │    ├─ YES → 验证 Bearer token + 检查黑名单   │
                       │    └─ NO  → 直接放行 (向后兼容)              │
                       └──────────────────┬──────────────────────────┘
                                          │
                       ┌──────────────────▼──────────────────────────┐
                       │          现有业务层 (改造)                     │
                       │                                              │
                       │  POST /api/orders ← 受保护 (AUTH_ENABLED时)  │
                       │  GET /api/products ← 保持公开                │
                       │  GET /api/products/:id ← 保持公开            │
                       └─────────────────────────────────────────────┘
```

### 1.2 数据库 Schema 扩展

```sql
-- 新增: users 表
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- 新增: token_blacklist 表 (logout 用)
CREATE TABLE IF NOT EXISTS token_blacklist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_jti TEXT UNIQUE NOT NULL,
  expired_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
```

### 1.3 接口定义

| 接口 | 方法 | 请求体 | 响应 | 认证 |
|------|------|--------|------|------|
| `/api/auth/register` | POST | `{ username, password }` | `201 { id, username }` | 无 |
| `/api/auth/login` | POST | `{ username, password }` | `200 { accessToken, refreshToken }` | 无 |
| `/api/auth/refresh` | POST | `{ refreshToken }` | `200 { accessToken }` | 无 |
| `/api/auth/logout` | POST | `{ token }` | `200 { message }` | Bearer |
| `/api/orders` | POST | `{ product_id, quantity }` | `201 { order }` | Bearer (AUTH_ENABLED=true 时) |

### 1.4 JWT 结构

```json
// Access Token payload
{
  "sub": 1,           // user id
  "username": "user1",
  "type": "access",
  "jti": "uuid",      // unique token id (黑名单用)
  "iat": 1712000000,
  "exp": 1712000900   // +15min
}

// Refresh Token payload
{
  "sub": 1,
  "type": "refresh",
  "jti": "uuid",
  "iat": 1712000000,
  "exp": 1712604800   // +7d
}
```

### 1.5 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `AUTH_ENABLED` | `false` | 是否启用认证保护 |
| `JWT_SECRET` | `perf-test-secret-key` | JWT 签名密钥 (仅测试用) |
| `JWT_ACCESS_EXPIRES` | `15m` | Access Token 过期时间 |
| `JWT_REFRESH_EXPIRES` | `7d` | Refresh Token 过期时间 |

---

## 2. 文件结构

### 2.1 新增文件

```
src/
├── routes/auth.js              # AUTH-01~04: 认证接口
├── middleware/authenticate.js   # AUTH-05: JWT 验证中间件
tests/
├── unit/
│   ├── routes/auth.test.js     # 认证接口单元测试
│   └── middleware/authenticate.test.js  # 中间件单元测试
├── performance/
│   └── auth-load.k6.js         # AUTH-07~09: k6 认证压测
└── jmeter/
    ├── auth-load.jmx           # AUTH-10: JMeter 高并发登录
    └── config/auth-load.properties
```

### 2.2 修改文件

| 文件 | 改动 |
|------|------|
| `src/app.js` | 注册 auth 路由 + 条件启用 authenticate 中间件 |
| `src/db/database.js` | 新增 users + token_blacklist 表 |
| `src/routes/orders.js` | POST /api/orders 条件认证保护 |
| `package.json` | 新增 jsonwebtoken + bcryptjs 依赖, npm scripts |

---

## 3. 任务拆分与执行顺序

| # | Task | 依赖 | 产出文件 | 需求 ID |
|---|------|------|---------|---------|
| T0 | DB Schema 扩展 (users + token_blacklist) | 无 | `src/db/database.js` | AUTH-01 |
| T1 | 认证路由 (register/login/refresh/logout) | T0 | `src/routes/auth.js` | AUTH-01~04 |
| T2 | JWT 中间件 + AUTH_ENABLED 开关 | T1 | `src/middleware/authenticate.js`, `src/routes/orders.js`, `src/app.js` | AUTH-05~06 |
| T3 | 单元测试 (auth routes + middleware) | T1, T2 | `tests/unit/routes/auth.test.js`, `tests/unit/middleware/authenticate.test.js` | — |
| T4 | k6 认证压测脚本 | T2 | `tests/performance/auth-load.k6.js` | AUTH-07~09 |
| T5 | JMeter 认证压测 | T2 | `tests/jmeter/auth-load.jmx`, `config/auth-load.properties` | AUTH-10 |
| T6 | 性能对比 + 文档更新 | T4, T5 | RTM + README | AUTH-11 |

**执行顺序:** T0 → T1 → T2 → T3 → T4 → T5 → T6

> TDD 流程: 每个 Task 先写失败测试 (T3 中对应部分)，再写实现。
> 实际操作: T1 和 T3 交替进行 — 写一个路由的测试，实现该路由，再写下一个。

---

## 4. 详细设计

### Task 0: DB Schema 扩展

**修改文件:** `src/db/database.js`

在 `initSchema()` 中新增:

```javascript
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS token_blacklist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_jti TEXT UNIQUE NOT NULL,
  expired_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
```

### Task 1: 认证路由

**新增文件:** `src/routes/auth.js`

```javascript
// POST /api/auth/register
// 1. 验证 username + password 非空
// 2. bcrypt.hashSync(password, 10) — 同步哈希 (~100ms)
// 3. INSERT INTO users — 如 username 重复返回 409
// 4. 返回 201 { id, username }

// POST /api/auth/login
// 1. SELECT user by username — 不存在返回 401
// 2. bcrypt.compareSync(password, hash) — 不匹配返回 401
// 3. 签发 accessToken (15min) + refreshToken (7d)，payload 含 jti (crypto.randomUUID)
// 4. 返回 200 { accessToken, refreshToken }

// POST /api/auth/refresh
// 1. 验证 refreshToken — 无效/过期返回 401
// 2. 检查 jti 是否在黑名单 — 是则返回 401
// 3. 签发新 accessToken
// 4. 返回 200 { accessToken }

// POST /api/auth/logout
// 1. 从 Bearer token 解析 jti
// 2. INSERT INTO token_blacklist (token_jti, expired_at)
// 3. 返回 200 { message: 'Logged out' }
```

**设计决策 — bcrypt 同步 vs 异步:**
- 使用 `bcrypt.hashSync` / `bcrypt.compareSync` (同步)
- 原因: 同步操作会阻塞 event loop，这正是我们要测试的 CPU 密集型场景
- 如果用异步版本 (bcrypt.hash)，会委托给 libuv 线程池，无法体现 event loop 瓶颈

### Task 2: JWT 中间件 + AUTH_ENABLED 开关

**新增文件:** `src/middleware/authenticate.js`

```javascript
// authenticate 中间件:
// 1. 检查 Authorization header → 缺失返回 401
// 2. jwt.verify(token, secret) → 无效返回 401
// 3. 检查 token_blacklist 是否含 jti → 是则返回 401
// 4. req.user = decoded → next()
```

**修改文件:** `src/app.js`

```javascript
const authRoutes = require('./routes/auth');
const { authenticate } = require('./middleware/authenticate');

app.use(authRoutes);  // 认证路由始终可用

// 条件保护 orders
if (process.env.AUTH_ENABLED === 'true') {
  app.post('/api/orders', authenticate);  // 在 orderRoutes 之前
}
app.use(orderRoutes);
```

### Task 3: 单元测试

**新增文件:** `tests/unit/routes/auth.test.js`

| 用例 ID | 测试 | 预期 |
|---------|------|------|
| UT-AUTH-01 | register 成功 | 201, 返回 id + username |
| UT-AUTH-02 | register 缺少字段 | 400 |
| UT-AUTH-03 | register 重复 username | 409 |
| UT-AUTH-04 | login 成功 | 200, 返回 accessToken + refreshToken |
| UT-AUTH-05 | login 错误密码 | 401 |
| UT-AUTH-06 | login 不存在用户 | 401 |
| UT-AUTH-07 | refresh 成功 | 200, 返回新 accessToken |
| UT-AUTH-08 | refresh 无效 token | 401 |
| UT-AUTH-09 | logout 成功 | 200 |
| UT-AUTH-10 | logout 后 refresh 失败 | 401 (jti 在黑名单) |

**新增文件:** `tests/unit/middleware/authenticate.test.js`

| 用例 ID | 测试 | 预期 |
|---------|------|------|
| UT-MW-01 | 有效 token 放行 | next() 被调用, req.user 已注入 |
| UT-MW-02 | 缺少 Authorization header | 401 |
| UT-MW-03 | 无效 token | 401 |
| UT-MW-04 | 过期 token | 401 |
| UT-MW-05 | 黑名单 token | 401 |
| UT-MW-06 | AUTH_ENABLED=false 时 orders 不需认证 | 201 (无 token 也可下单) |
| UT-MW-07 | AUTH_ENABLED=true 时 orders 需认证 | 401 (无 token), 201 (有 token) |

### Task 4: k6 认证压测脚本

**新增文件:** `tests/performance/auth-load.k6.js`

```javascript
// setup():
//   1. 批量注册 N 个用户 (POST /api/auth/register)
//   2. 返回 userPool = [{ username, password }, ...]

// default(data):
//   1. 从 userPool 随机选一个用户
//   2. POST /api/auth/login → 获取 accessToken
//   3. GET /api/products (公开)
//   4. GET /api/products/:id (公开)
//   5. POST /api/orders (带 Bearer token, AUTH_ENABLED=true)
//   6. sleep(0.5~1s)

export const options = {
  scenarios: {
    auth_load: {
      executor: 'ramping-vus',
      stages: [
        { duration: '30s', target: 50 },   // Warm-up
        { duration: '60s', target: 500 },  // Ramp to target
        { duration: '120s', target: 500 }, // Hold steady
        { duration: '30s', target: 0 },    // Cool-down
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};
```

### Task 5: JMeter 认证压测

**新增文件:** `tests/jmeter/auth-load.jmx`

```
Thread Group (auth-load.properties 参数化)
├── HTTP Request: POST /api/auth/login
│   └── JSON Extractor: $.accessToken → ${accessToken}
├── HTTP Header Manager: Authorization: Bearer ${accessToken}
├── HTTP Request: GET /api/products
├── HTTP Request: GET /api/products/${productId}
├── HTTP Request: POST /api/orders (带 Bearer token)
├── Constant Timer: 500~1000ms think time
└── View Results Tree (调试用, 正式测试关闭)
```

**新增文件:** `tests/jmeter/config/auth-load.properties`

```properties
threads=50
rampup=30
duration=180
base_url=localhost
port=3000
```

### Task 6: 性能对比 + 文档更新

输出:
- RTM 新增 AUTH-01~11 追溯行
- README 更新认证场景使用方法
- 性能对比表: 带认证 vs 不带认证 (相同 VUs 下的 p95 / throughput / error rate)

---

## 5. 测试用例设计

### 5.1 认证性能测试用例

| 用例 ID | 场景 | VUs | 阈值 | 关注点 |
|---------|------|-----|------|--------|
| AUTH-PERF-01 | 高并发登录 | 500 | p95 < 500ms, error < 1% | bcrypt CPU 开销 |
| AUTH-PERF-02 | Token 刷新 | 200 | p95 < 200ms | JWT 签发速度 |
| AUTH-PERF-03 | 完整用户旅程 (认证版) | 500 | p95 < 500ms, error < 1% | 端到端认证链路 |
| AUTH-PERF-04 | 无效 Token 请求 | 100 | 100% 返回 401, 无 5xx | 错误处理性能 |

### 5.2 性能对比测试

| 对比项 | 无认证 (Phase 1/2 基准) | 有认证 (Phase 3) |
|--------|------------------------|------------------|
| 500 VUs p95 | 待测 | 待测 |
| 500 VUs throughput | 待测 | 待测 |
| 主要差异来源 | — | bcrypt ~100ms/login |

---

## 6. 风险与缓解

| 风险 | 影响 | 缓解 |
|------|------|------|
| bcrypt 同步阻塞 event loop | 登录 p95 可能远高于无认证场景 | 这是预期行为, 正是要测量的 |
| 用户注册数据累积 | DB 膨胀影响后续测试 | 每轮测试前 `npm run restart:clean` |
| 现有 CI smoke test 被 AUTH_ENABLED 影响 | CI 失败 | 默认 AUTH_ENABLED=false, CI 不受影响 |
| token_blacklist 表膨胀 | 长时间测试可能积累大量记录 | Soak Test (Phase 4) 观察, 本阶段测试时间短无影响 |

---

## 7. Prerequisites

| 工具/依赖 | 验证命令 | 状态 |
|-----------|---------|------|
| Node.js 18+ | `node -v` | ✅ 已安装 (v25.8.1) |
| k6 | `k6 version` | ✅ 已安装 |
| JMeter | `jmeter --version` | ✅ 已安装 |
| jsonwebtoken | `npm ls jsonwebtoken` | ⏳ 待安装 |
| bcryptjs | `npm ls bcryptjs` | ⏳ 待安装 |
