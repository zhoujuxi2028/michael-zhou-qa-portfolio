# Implementation Plan — Phase 3: JWT 认证场景性能测试

**Issue:** [#56](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/56)
**Branch:** `feature/performance-testing`
**Date:** 2026-04-02

> **Plan Reviewer 已执行:** 10 项 findings 已全部修复 (3 Critical + 4 Important + 3 Minor)。
> 修复记录见 [§8 Plan Reviewer 修复记录](#8-plan-reviewer-修复记录)。

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
  POST /api/auth/logout ──→ authenticate 中间件验证 → Token 加入黑名单│
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

| 接口                 | 方法 | 请求体                     | 响应                                | 认证                          |
| -------------------- | ---- | -------------------------- | ----------------------------------- | ----------------------------- |
| `/api/auth/register` | POST | `{ username, password }`   | `201 { id, username }`              | 无                            |
| `/api/auth/login`    | POST | `{ username, password }`   | `200 { accessToken, refreshToken }` | 无                            |
| `/api/auth/refresh`  | POST | `{ refreshToken }`         | `200 { accessToken }`               | 无                            |
| `/api/auth/logout`   | POST | —                          | `200 { message }`                   | Bearer (authenticate 中间件)  |
| `/api/orders`        | POST | `{ product_id, quantity }` | `201 { order }`                     | Bearer (AUTH_ENABLED=true 时) |

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

> **Refresh Token 不轮换:** 同一 Refresh Token 在 7 天内可多次使用换取新 Access Token。这简化了测试设计 — k6 VU 可在整个测试期间复用同一 Refresh Token。

### 1.5 环境变量

| 变量                  | 默认值                 | 说明                    |
| --------------------- | ---------------------- | ----------------------- |
| `AUTH_ENABLED`        | `false`                | 是否启用认证保护        |
| `JWT_SECRET`          | `perf-test-secret-key` | JWT 签名密钥 (仅测试用) |
| `JWT_ACCESS_EXPIRES`  | `15m`                  | Access Token 过期时间   |
| `JWT_REFRESH_EXPIRES` | `7d`                   | Refresh Token 过期时间  |

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
│   ├── auth-login.k6.js        # AUTH-07: 高并发登录压测
│   ├── auth-refresh.k6.js      # AUTH-08: Token 刷新压测
│   └── auth-journey.k6.js      # AUTH-09: 完整认证用户旅程
└── jmeter/
    ├── auth-load.jmx           # AUTH-10: JMeter 认证压测
    └── config/auth-load.properties
```

### 2.2 修改文件

| 文件                                     | 改动                                                                                                                            |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `src/app.js`                             | 注册 auth 路由                                                                                                                  |
| `src/db/database.js`                     | 新增 users + token_blacklist 表                                                                                                 |
| `src/routes/orders.js`                   | POST /api/orders 条件认证保护 (在路由内部判断 AUTH_ENABLED)                                                                     |
| `package.json`                           | 新增 jsonwebtoken + bcryptjs 依赖, 新增 npm scripts (`k6:auth-login`, `k6:auth-refresh`, `k6:auth-journey`, `jmeter:auth-load`) |
| `performance-testing-platform/CLAUDE.md` | Phase 3 状态 Planned → In Progress / Done, 新增 auth 相关命令                                                                   |

---

## 3. 任务拆分与执行顺序

| #   | Task                                     | 依赖   | 产出文件                                                                       | 需求 ID    |
| --- | ---------------------------------------- | ------ | ------------------------------------------------------------------------------ | ---------- |
| T0  | DB Schema 扩展 (users + token_blacklist) | 无     | `src/db/database.js`                                                           | AUTH-01    |
| T1  | 认证路由 (register/login/refresh/logout) | T0     | `src/routes/auth.js`                                                           | AUTH-01~04 |
| T2  | JWT 中间件 + AUTH_ENABLED 开关           | T1     | `src/middleware/authenticate.js`, `src/routes/orders.js`, `src/app.js`         | AUTH-05~06 |
| T3  | 单元测试 (auth routes + middleware)      | T1, T2 | `tests/unit/routes/auth.test.js`, `tests/unit/middleware/authenticate.test.js` | —          |
| T4  | k6 认证压测脚本 (3 个场景)               | T2     | `auth-login.k6.js`, `auth-refresh.k6.js`, `auth-journey.k6.js`                 | AUTH-07~09 |
| T5  | JMeter 认证压测                          | T2     | `tests/jmeter/auth-load.jmx`, `tests/jmeter/config/auth-load.properties`       | AUTH-10    |
| T6  | 性能对比 + 文档更新 + CI 验证            | T4, T5 | RTM + README + CLAUDE.md                                                       | AUTH-11    |

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

使用 `const router = Router()` 并 `module.exports = router`，与现有路由一致。

```javascript
// POST /api/auth/register
// 1. 验证 username + password 非空 (无密码强度要求 — 性能测试可用短密码加速注册)
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

// POST /api/auth/logout — 使用 authenticate 中间件
// router.post('/api/auth/logout', authenticate, (req, res) => { ... })
// 1. req.user.jti 已由 authenticate 中间件解析
// 2. INSERT INTO token_blacklist (token_jti, expired_at)
// 3. 返回 200 { message: 'Logged out' }
```

**设计决策 — bcrypt 同步 vs 异步:**

- 使用 `bcrypt.hashSync` / `bcrypt.compareSync` (同步)
- 原因: 同步操作会阻塞 event loop，这正是我们要测试的 CPU 密集型场景
- 如果用异步版本 (bcrypt.hash)，会委托给 libuv 线程池，无法体现 event loop 瓶颈
- 注意: better-sqlite3 也是同步的，bcrypt + SQLite 双重同步阻塞会叠加在 event loop 上

### Task 2: JWT 中间件 + AUTH_ENABLED 开关

**新增文件:** `src/middleware/authenticate.js`

```javascript
// authenticate 中间件:
// 1. 检查 Authorization header → 缺失返回 401
// 2. jwt.verify(token, secret) → 无效返回 401
// 3. 检查 token_blacklist 是否含 jti → 是则返回 401
// 4. req.user = decoded → next()
```

**修改文件:** `src/routes/orders.js` — 在路由内部条件应用中间件

```javascript
const { authenticate } = require('../middleware/authenticate');

// 在 POST /api/orders 路由内部判断 AUTH_ENABLED
router.post(
  '/api/orders',
  (req, res, next) => {
    if (process.env.AUTH_ENABLED === 'true') {
      return authenticate(req, res, next);
    }
    next();
  },
  async (req, res) => {
    // 现有订单逻辑不变
  }
);
```

> **为什么在 orders.js 内部判断，而不在 app.js 中 `app.post`？**
> 与现有 Router 模式一致，避免 app.js 路由注册顺序依赖。

**修改文件:** `src/app.js`

```javascript
const authRoutes = require('./routes/auth');
app.use(authRoutes); // 认证路由始终可用 (不受 AUTH_ENABLED 影响)
```

**T2 验收标准:** 现有 k6/JMeter smoke 脚本在 AUTH_ENABLED=false (默认) 下仍全部 PASS。

### Task 3: 单元测试

**新增文件:** `tests/unit/routes/auth.test.js`

| 用例 ID    | 测试                          | 预期                                 |
| ---------- | ----------------------------- | ------------------------------------ |
| UT-AUTH-01 | register 成功                 | 201, 返回 id + username              |
| UT-AUTH-02 | register 缺少字段             | 400                                  |
| UT-AUTH-03 | register 重复 username        | 409                                  |
| UT-AUTH-04 | login 成功                    | 200, 返回 accessToken + refreshToken |
| UT-AUTH-05 | login 错误密码                | 401                                  |
| UT-AUTH-06 | login 不存在用户              | 401                                  |
| UT-AUTH-07 | refresh 成功                  | 200, 返回新 accessToken              |
| UT-AUTH-08 | refresh 无效 token            | 401                                  |
| UT-AUTH-09 | logout 成功 (需 Bearer token) | 200                                  |
| UT-AUTH-10 | logout 后 refresh 失败        | 401 (jti 在黑名单)                   |

**新增文件:** `tests/unit/middleware/authenticate.test.js`

| 用例 ID  | 测试                                  | 预期                           |
| -------- | ------------------------------------- | ------------------------------ |
| UT-MW-01 | 有效 token 放行                       | next() 被调用, req.user 已注入 |
| UT-MW-02 | 缺少 Authorization header             | 401                            |
| UT-MW-03 | 无效 token                            | 401                            |
| UT-MW-04 | 过期 token                            | 401                            |
| UT-MW-05 | 黑名单 token                          | 401                            |
| UT-MW-06 | AUTH_ENABLED=false 时 orders 不需认证 | 201 (无 token 也可下单)        |
| UT-MW-07 | AUTH_ENABLED=true 时 orders 需认证    | 401 (无 token), 201 (有 token) |

### Task 4: k6 认证压测脚本 (3 个独立脚本)

> **为什么拆分为 3 个文件？** 每个场景有不同的 VU 数量和阈值，独立文件更清晰，与现有 smoke/load/stress/spike 拆分模式一致。

**文件 1:** `tests/performance/auth-login.k6.js` (AUTH-07: 高并发登录)

```javascript
// setup(): 批量注册 N 个用户 (N = max VUs，每个 VU 使用唯一用户)
// default(): 随机选用户 → login → sleep

export const options = {
  stages: [
    { duration: '30s', target: 10 }, // Warm-up
    { duration: '60s', target: 100 }, // Ramp (bcrypt ~100ms/login, 8 Workers → ~80 login/s max)
    { duration: '60s', target: 100 }, // Hold steady
    { duration: '30s', target: 0 }, // Cool-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // bcrypt 阻塞预期 p95 > 500ms
    http_req_failed: ['rate<0.01'],
  },
};
```

> **VUs 调整为 100 (非 500):** bcrypt 10 rounds ~100ms/login，8 Workers 理论上限 ~80 login/s。
> 500 VUs 会严重过载 (排队 > 5s)，无法产出有意义的 p95 数据。
> 100 VUs 足以展示 bcrypt CPU 密集型瓶颈，同时 p95 落在可测量区间。
> 阈值放宽到 p95 < 2000ms — 这不是 SLA 目标，而是"系统仍在响应"的底线。

**文件 2:** `tests/performance/auth-refresh.k6.js` (AUTH-08: Token 刷新)

```javascript
// setup(): 注册 + 登录 N 个用户，获取 refreshToken 池
// default(): 随机选 refreshToken → POST /api/auth/refresh → sleep

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '60s', target: 200 },
    { duration: '60s', target: 200 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'], // JWT verify + sign, 无 bcrypt，应极快
    http_req_failed: ['rate<0.01'],
  },
};
```

**文件 3:** `tests/performance/auth-journey.k6.js` (AUTH-09: 完整用户旅程)

```javascript
// setup(): 注册 N 个用户
// default():
//   1. login (每个 VU 只在首次迭代登录，缓存 token)
//   2. GET /api/products
//   3. GET /api/products/:id
//   4. POST /api/orders (带 Bearer token, AUTH_ENABLED=true)
//   5. sleep(0.5~1s)

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '60s', target: 500 },
    { duration: '120s', target: 500 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};
```

> **AUTH-PERF-04 (无效 Token):** 在 auth-journey.k6.js 中添加一个辅助函数，
> 每 ~10% 的迭代使用过期/无效 token 发送请求，验证返回 401 且无 5xx。

> **用户池大小:** N = max VUs (500)，确保每个 VU 使用唯一用户。

### Task 5: JMeter 认证压测

**新增文件:** `tests/jmeter/auth-load.jmx`

```
setUp Thread Group (注册测试用户, 1 thread × N iterations)
├── HTTP Request: POST /api/auth/register
│   └── Counter: username = user_${counter}
│
Thread Group (auth-load.properties 参数化)
├── Once Only Controller
│   └── HTTP Request: POST /api/auth/login
│       └── JSON Extractor: $.accessToken → ${accessToken}
├── HTTP Header Manager: Authorization: Bearer ${accessToken}
├── HTTP Request: GET /api/products
├── HTTP Request: GET /api/products/${__Random(1,5)}
├── HTTP Request: POST /api/orders (带 Bearer token)
├── Constant Timer: 500~1000ms think time
└── View Results Tree (调试用, 正式测试关闭)
```

> **setUp Thread Group 解决用户注册问题:** 在主测试前自动注册用户，不依赖 k6。

**新增文件:** `tests/jmeter/config/auth-load.properties`

```properties
threads=50
rampup=30
duration=180
base_url=localhost
port=3000
```

### Task 6: 性能对比 + 文档更新 + CI 验证

输出:

- RTM 新增 AUTH-01~11 追溯行
- README 更新认证场景使用方法
- CLAUDE.md 更新 Phase 3 状态 + 新增 auth 命令
- 性能对比表: 带认证 vs 不带认证 (相同 VUs 下的 p95 / throughput / error rate)
- CI 验证: `performance-ci.yml` 已包含 `feature/performance-testing` 分支触发，新增的 npm 依赖通过 `npm ci` 自动安装，现有 smoke test 在 AUTH_ENABLED=false 下不受影响
- 验证 `npm run restart:clean` 文档说明同时清除 auth 数据 (users + token_blacklist)

---

## 5. 测试用例设计

### 5.1 认证性能测试用例

| 用例 ID      | 场景         | 脚本                      | VUs       | 阈值                     | 关注点                                                 |
| ------------ | ------------ | ------------------------- | --------- | ------------------------ | ------------------------------------------------------ |
| AUTH-PERF-01 | 高并发登录   | auth-login.k6.js          | 100       | p95 < 2000ms, error < 1% | bcrypt ~100ms 同步阻塞, 8 Workers 理论上限 ~80 login/s |
| AUTH-PERF-02 | Token 刷新   | auth-refresh.k6.js        | 200       | p95 < 200ms              | JWT verify + sign, 无 bcrypt, 应极快                   |
| AUTH-PERF-03 | 完整用户旅程 | auth-journey.k6.js        | 500       | p95 < 500ms, error < 1%  | login 仅首次, 后续 token-only (快)                     |
| AUTH-PERF-04 | 无效 Token   | auth-journey.k6.js (辅助) | ~10% 流量 | 100% 返回 401, 无 5xx    | 错误处理不降级                                         |

> **AUTH-PERF-01 VUs 调整说明:** 原 Issue #56 目标 500 VUs login。
> 经计算: bcrypt 10 rounds ~100ms/call, 8 Workers → ~80 login/s max。
> 500 VUs 全部重复 login 会导致排队 > 5s, p95 无意义。
> 调整为 100 VUs, 阈值 p95 < 2000ms — 足以展示 bcrypt CPU 瓶颈。
> 真正的 500 VUs 测试在 AUTH-PERF-03 (完整旅程)，login 仅首次执行。

### 5.2 性能对比测试

| 对比项             | 无认证 (Phase 1/2 基准) | 有认证 (Phase 3)                                          |
| ------------------ | ----------------------- | --------------------------------------------------------- |
| 500 VUs p95        | 待测                    | 待测                                                      |
| 500 VUs throughput | 待测                    | 待测                                                      |
| 主要差异来源       | —                       | bcrypt ~100ms/login (首次) + JWT verify ~0.1ms/req (后续) |

---

## 6. 风险与缓解

| 风险                                    | 影响                       | 缓解                                                                  |
| --------------------------------------- | -------------------------- | --------------------------------------------------------------------- |
| bcrypt 同步阻塞 event loop              | 登录 p95 远高于无认证场景  | 预期行为, 正是测量目标; VUs 和阈值已据此调整                          |
| bcrypt + better-sqlite3 双重同步阻塞    | event loop 延迟叠加        | 在对比报告中分析各自贡献                                              |
| 用户注册数据累积                        | DB 膨胀影响后续测试        | 每轮测试前 `npm run restart:clean` (同时清除 users + token_blacklist) |
| 现有 CI smoke test 被 AUTH_ENABLED 影响 | CI 失败                    | 默认 AUTH_ENABLED=false, CI 不受影响; T2 验收包含现有脚本回归验证     |
| token_blacklist 表膨胀                  | 长时间测试可能积累大量记录 | UNIQUE(token_jti) 自带隐式索引; Soak Test (Phase 4) 观察              |

---

## 7. Prerequisites

| 工具/依赖    | 验证命令              | 状态                |
| ------------ | --------------------- | ------------------- |
| Node.js 18+  | `node -v`             | ✅ 已安装 (v25.8.1) |
| k6           | `k6 version`          | ✅ 已安装           |
| JMeter       | `jmeter --version`    | ✅ 已安装           |
| jsonwebtoken | `npm ls jsonwebtoken` | ⏳ 待安装           |
| bcryptjs     | `npm ls bcryptjs`     | ⏳ 待安装           |

---

## 8. Plan Reviewer 修复记录

### Critical (3)

| #   | 问题                                                                  | 修复                                                                                         |
| --- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| C1  | bcrypt ~100ms × 500 VUs → 理论上限 80 login/s, p95 < 500ms 不可能达成 | AUTH-PERF-01 调整为 100 VUs, 阈值 p95 < 2000ms; 500 VUs 测试移至 AUTH-PERF-03 (login 仅首次) |
| C2  | AUTH-07/08/09 三个场景放在一个 k6 文件, VUs 和阈值不同无法共存        | 拆为 3 个独立文件: auth-login.k6.js, auth-refresh.k6.js, auth-journey.k6.js                  |
| C3  | logout 需要 authenticate 中间件, 但 app.js 中未注册                   | logout 路由内直接应用 authenticate: `router.post('/api/auth/logout', authenticate, ...)`     |

### Important (4)

| #   | 问题                                     | 修复                                                        |
| --- | ---------------------------------------- | ----------------------------------------------------------- |
| I1  | JMeter 缺少用户注册步骤                  | 新增 setUp Thread Group 在主测试前自动注册用户              |
| I2  | AUTH-PERF-04 (无效 Token) 未在脚本中设计 | auth-journey.k6.js 中 ~10% 迭代发送无效 token, 验证 401     |
| I3  | CI workflow 分支触发                     | 使用 `feature/performance-testing` 分支, 已在 CI 触发列表中 |
| I4  | 缺少 npm scripts 和 CLAUDE.md 更新任务   | T6 增加 npm scripts + CLAUDE.md 更新; §2.2 修改文件表已补充 |

### Minor (3)

| #   | 问题                                          | 修复                                              |
| --- | --------------------------------------------- | ------------------------------------------------- |
| M1  | JMeter config 路径不一致                      | 统一为 `tests/jmeter/config/auth-load.properties` |
| M2  | app.js 路由注册模式脆弱 (`app.post` 顺序依赖) | 改为在 orders.js 路由内部条件应用 authenticate    |
| M3  | 用户池大小未指定                              | 明确 N = max VUs, 每个 VU 使用唯一用户            |
