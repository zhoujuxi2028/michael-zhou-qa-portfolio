# 集成测试设计文档 (Integration Test Design)

**项目:** Performance Testing Platform  
**版本:** Phase 1~7  
**更新日期:** 2026-04-21  
**文档状态:** 发布

---

## 目录

- [1. 文档概述](#1-文档概述)
- [2. 测试脚本架构](#2-测试脚本架构)
- [3. 测试脚本概要设计](#3-测试脚本概要设计)
- [4. 测试脚本详细设计](#4-测试脚本详细设计)
- [5. 测试数据管理](#5-测试数据管理)
- [6. 环境管理与隔离策略](#6-环境管理与隔离策略)
- [7. 质量保证措施](#7-质量保证措施)
- [8. 文档关联](#8-文档关联)

---

## 1. 文档概述

### 1.1 目的

本文档定义 Performance Testing Platform 集成测试的脚本架构、概要设计和详细设计。覆盖从 API 层到可观测层的端到端集成验证，确保各模块协同工作符合预期。

### 1.2 适用范围

| 维度 | 覆盖内容 |
|------|---------|
| **API 集成** | 商品/订单/认证/健康检查端点的跨模块交互 |
| **中间件集成** | 限流器、安全头、认证中间件的端到端行为 |
| **横切关注点** | 并发访问、错误处理、认证保护路由 |
| **工具链集成** | 基线回归、趋势采集、内存泄漏检测 |
| **基础设施集成** | Shell 脚本编排（Grafana/InfluxDB/k6/JMeter） |

### 1.3 与其他文档关系

| 文档 | 关系 |
|------|------|
| [测试计划 (test-plan.md)](../qa/test-plan.md) | 上游：定义集成测试优先级和进入/退出标准 |
| [集成测试用例 (integration-test-cases.md)](../qa/test-cases/integration-test-cases.md) | 下游：详细用例规格说明 |
| [集成测试架构设计 (integration-test-architecture.md)](integration-test-architecture.md) | 详细架构重设计：重试、等待、日志、报告 |
| [RTM (rtm.md)](../qa/rtm.md) | 平行：需求到集成测试的追溯 |
| [架构设计 (architecture.md)](../architecture/architecture.md) | 上游：系统架构约束 |

---

## 2. 测试脚本架构

### 2.1 整体架构

```
┌───────────────────────────────────────────────────────────────────────┐
│                      集成测试编排层 (Orchestration)                      │
│  ┌──────────────────────────┐   ┌──────────────────────────────────┐  │
│  │ Jest Runner (13 test files) │   │ Shell Runner (integration-test.sh)│  │
│  │ API/Middleware/Utils        │   │ Grafana/InfluxDB/k6/JMeter       │  │
│  └────────────┬───────────────┘   └─────────────┬────────────────────┘  │
└───────────────┼──────────────────────────────────┼─────────────────────┘
                │                                  │
┌───────────────┼──────────────────────────────────┼─────────────────────┐
│               ▼          测试基础设施层             ▼                     │
│  ┌──────────────────────┐        ┌─────────────────────────────────┐   │
│  │ test-server.js        │        │ lock.sh (互斥锁)                 │   │
│  │ · createTestClient()  │        │ server.sh (服务管理)             │   │
│  │ · resetTestEnvironment│        │ preflight-check.sh (环境检测)    │   │
│  │ · registerAndLogin()  │        └─────────────────────────────────┘   │
│  │ · createTestProduct() │                                              │
│  └──────────┬───────────┘                                               │
└─────────────┼───────────────────────────────────────────────────────────┘
              │ supertest / HTTP
              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         被测系统 (SUT)                                    │
│  Express App (src/app.js)                                                │
│  ┌───────────┐ ┌────────────┐ ┌───────────┐ ┌──────────────────────┐   │
│  │ helmet     │ │ rateLimiter│ │ metrics   │ │ authenticate (JWT)   │   │
│  └───────────┘ └────────────┘ └───────────┘ └──────────────────────┘   │
│  ┌───────────┐ ┌────────────┐ ┌───────────┐ ┌──────────────────────┐   │
│  │ /products │ │ /orders    │ │ /auth     │ │ /health /ready /metrics│  │
│  └───────────┘ └────────────┘ └───────────┘ └──────────────────────┘   │
│  ┌──────────────────┐ ┌───────────────────────────────────────────┐    │
│  │ SQLite (:memory:) │ │ Utils (baseline/leak-detection/trend)     │    │
│  └──────────────────┘ └───────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 双执行引擎

集成测试分为两个执行引擎，各有明确职责：

| 引擎 | 框架 | 测试文件数 | 用例数 | 适用场景 |
|------|------|-----------|--------|---------|
| **Jest Runner** | Jest + Supertest | 13 | 61 | API 模块交互、中间件行为、工具函数端到端 |
| **Shell Runner** | Bash + curl + Docker | 3 | ~40 | 基础设施集成（Grafana/InfluxDB/k6/JMeter） |

**选型理由：**

- **Jest Runner**：进程内测试，无需启动真实 HTTP 服务器，通过 Supertest 直接调用 Express app；启动快（< 2s）、隔离性好（内存数据库）、断言丰富
- **Shell Runner**：需要外部进程协调（Docker 容器、k6 runtime、JMeter 进程），Bash 天然适合编排多进程工作流

### 2.3 目录结构

```
tests/integration/
├── api/                          # API 层集成测试（4 文件，27 用例）
│   ├── products-api.integration.test.js
│   ├── orders-workflow.integration.test.js
│   ├── auth-flow.integration.test.js
│   └── health-metrics.integration.test.js
├── cross-cutting/                # 横切关注点（3 文件，13 用例）
│   ├── auth-protected-routes.integration.test.js
│   ├── error-handling.integration.test.js
│   └── concurrent-access.integration.test.js
├── middleware/                    # 中间件集成测试（2 文件，9 用例）
│   ├── rate-limiter.integration.test.js
│   └── security-headers.integration.test.js
├── utils/                        # 工具函数集成测试（3 文件，12 用例）
│   ├── baseline-compare.integration.test.js
│   ├── leak-detection.integration.test.js
│   └── trend-collect.integration.test.js
└── setup/                        # 共享基础设施
    └── test-server.js            # 测试客户端工厂 + 环境重置
```

### 2.4 分层设计原则

| 原则 | 说明 |
|------|------|
| **按业务域分组** | api/ cross-cutting/ middleware/ utils/ 四个子目录按关注点隔离 |
| **共享基础设施** | test-server.js 提供统一的客户端创建、环境重置、注册登录工具 |
| **命名规范** | `<module>.integration.test.js`，与 Jest glob 匹配 `**/tests/integration/**/*.test.js` |
| **独立可执行** | 每个测试文件可独立运行 `npx jest tests/integration/api/products-api.integration.test.js` |
| **无外部依赖** | Jest Runner 测试不依赖 Docker / 外部进程，使用内存 SQLite |

---

## 3. 测试脚本概要设计

### 3.1 API 层集成测试

#### 3.1.1 Products API (`products-api.integration.test.js`)

| 项目 | 说明 |
|------|------|
| **测试目标** | 验证商品 CRUD 操作的跨模块交互（路由 → 数据库 → 响应格式） |
| **被测模块** | `src/routes/products.js` + `src/db/database.js` |
| **用例数** | 6 (PROD-INT-01 ~ PROD-INT-06) |
| **关键交互** | POST 创建 → GET 查询一致性、分页参数传递、404 错误传播 |
| **前置条件** | 数据库含 5 条种子商品数据 |
| **隔离策略** | beforeEach 重置数据库 + metrics |

#### 3.1.2 Orders Workflow (`orders-workflow.integration.test.js`)

| 项目 | 说明 |
|------|------|
| **测试目标** | 验证订单创建的完整业务流程（库存校验 → 事务扣减 → 金额计算） |
| **被测模块** | `src/routes/orders.js` + `src/routes/products.js` + `src/db/database.js` |
| **用例数** | 7 (ORD-INT-01 ~ ORD-INT-07) |
| **关键交互** | 库存扣减原子性、409 冲突处理、累积扣减、金额精度 |
| **前置条件** | 数据库含种子商品 + 已知库存量 |
| **隔离策略** | beforeEach 重置数据库 + metrics |

#### 3.1.3 Auth Flow (`auth-flow.integration.test.js`)

| 项目 | 说明 |
|------|------|
| **测试目标** | 验证 JWT 认证完整生命周期（注册 → 登录 → 刷新 → 登出 → 黑名单） |
| **被测模块** | `src/routes/auth.js` + `src/middleware/authenticate.js` + `src/db/database.js` |
| **用例数** | 8 (AUTH-INT-01 ~ AUTH-INT-08) |
| **关键交互** | bcrypt 哈希 → JWT 签发 → Token 刷新 → 黑名单机制 |
| **前置条件** | 空用户表 |
| **隔离策略** | beforeEach 重置数据库 + metrics |

#### 3.1.4 Health & Metrics (`health-metrics.integration.test.js`)

| 项目 | 说明 |
|------|------|
| **测试目标** | 验证健康检查端点和指标采集中间件的端到端行为 |
| **被测模块** | `src/routes/health.js` + `src/middleware/metrics.js` |
| **用例数** | 6 (METRICS-INT-01 ~ METRICS-INT-06) |
| **关键交互** | 请求计数累积、业务指标（orderSuccess/orderConflict）联动 |
| **前置条件** | metrics 已重置 |
| **隔离策略** | beforeEach 重置数据库 + metrics |

### 3.2 横切关注点集成测试

#### 3.2.1 Auth Protected Routes (`auth-protected-routes.integration.test.js`)

| 项目 | 说明 |
|------|------|
| **测试目标** | 验证 AUTH_ENABLED 开关对路由保护的影响 + 端到端用户旅程 |
| **被测模块** | `src/routes/orders.js` + `src/middleware/authenticate.js` + `src/routes/auth.js` |
| **用例数** | 5 (CROSS-INT-01 ~ CROSS-INT-05) |
| **特殊机制** | 动态 `require('../../../src/app')` 实现环境变量切换后的模块重载 |
| **隔离策略** | beforeEach 保存/恢复 AUTH_ENABLED + jest.resetModules() |

#### 3.2.2 Error Handling (`error-handling.integration.test.js`)

| 项目 | 说明 |
|------|------|
| **测试目标** | 验证错误处理中间件的统一行为（400/404/409 响应格式一致性） |
| **被测模块** | Express 错误处理中间件 + 各路由模块 |
| **用例数** | 5 (ERR-INT-01 ~ ERR-INT-05) |
| **关键交互** | JSON 解析错误、参数验证、业务冲突的统一错误格式 |
| **隔离策略** | beforeEach 重置数据库 + metrics |

#### 3.2.3 Concurrent Access (`concurrent-access.integration.test.js`)

| 项目 | 说明 |
|------|------|
| **测试目标** | 验证 SQLite WAL 模式下的并发安全性 |
| **被测模块** | `src/db/database.js` (WAL) + `src/routes/orders.js` + `src/routes/auth.js` |
| **用例数** | 3 (CONC-INT-01 ~ CONC-INT-03) |
| **关键交互** | 库存竞争消耗、用户名唯一约束、批量写入 |
| **限制说明** | Supertest 在同一进程中串行执行请求；SQLite 事务保证原子性 |
| **隔离策略** | beforeEach 重置数据库 + metrics |

### 3.3 中间件集成测试

#### 3.3.1 Rate Limiter (`rate-limiter.integration.test.js`)

| 项目 | 说明 |
|------|------|
| **测试目标** | 验证限流中间件在多端点场景下的行为 |
| **被测模块** | `src/middleware/rateLimiter.js` + Express 路由层 |
| **用例数** | 5 (RL-INT-01 ~ RL-INT-05) |
| **特殊机制** | jest.resetModules() 实现环境变量切换；限额共享验证 |
| **环境变量** | `RATE_LIMIT_ENABLED`, `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS` |
| **隔离策略** | beforeEach/afterEach 完整清理环境变量 + 模块重载 |

#### 3.3.2 Security Headers (`security-headers.integration.test.js`)

| 项目 | 说明 |
|------|------|
| **测试目标** | 验证 Helmet + 自定义安全中间件的 HTTP 响应头 |
| **被测模块** | `src/app.js` (helmet 配置) + XSS 中间件 |
| **用例数** | 4 (SEC-INT-01 ~ SEC-INT-04) |
| **关键交互** | CSP / HSTS / X-Frame-Options / X-XSS-Protection / Referrer-Policy |
| **隔离策略** | beforeEach 重置数据库 + metrics |

### 3.4 工具函数集成测试

#### 3.4.1 Baseline Compare (`baseline-compare.integration.test.js`)

| 项目 | 说明 |
|------|------|
| **测试目标** | 验证性能基线存储、对比、趋势追加的完整工作流 |
| **被测模块** | `src/utils/baseline.js` (compareWithBaseline/appendTrend/loadBaseline/saveBaseline) |
| **用例数** | 5 (BASE-INT-01 ~ BASE-INT-05) |
| **I/O 依赖** | 临时目录文件读写 (`os.tmpdir()/baseline-int-test`) |
| **隔离策略** | beforeEach 创建临时目录；afterEach 递归删除 |

#### 3.4.2 Leak Detection (`leak-detection.integration.test.js`)

| 项目 | 说明 |
|------|------|
| **测试目标** | 验证内存泄漏检测器在不同内存增长率下的判定逻辑 |
| **被测模块** | `src/utils/leak-detection.js` (checkMemoryLeak) |
| **用例数** | 3 (LEAK-INT-01 ~ LEAK-INT-03) |
| **关键交互** | 增长 10% → ok / 35% → warning / 60% → critical |
| **隔离策略** | 无状态函数，无需额外隔离 |

#### 3.4.3 Trend Collect (`trend-collect.integration.test.js`)

| 项目 | 说明 |
|------|------|
| **测试目标** | 验证趋势数据累积、过期清理和 Markdown 报告生成 |
| **被测模块** | `src/utils/baseline.js` (appendTrend) + `src/utils/trend.js` (generateTrendMarkdown) |
| **用例数** | 4 (TREND-INT-01 ~ TREND-INT-04) |
| **I/O 依赖** | 临时目录文件读写 (`os.tmpdir()/trend-int-test`) |
| **关键交互** | 91 天过期自动清理、空数据报告兜底 |
| **隔离策略** | beforeEach 创建临时目录；afterEach 递归删除 |

### 3.5 Shell 集成测试

#### 3.5.1 主集成脚本 (`scripts/integration-test.sh`)

| 项目 | 说明 |
|------|------|
| **测试目标** | 编排外部进程间的集成验证（Docker + k6 + JMeter + API 服务） |
| **执行方式** | `bash scripts/integration-test.sh` |
| **互斥机制** | `scripts/lock.sh` 基于 `mkdir` 原子性的进程锁 |
| **用例数** | ~40（分 7 个 Phase 执行） |

**编排流程：**

```
Phase 1: Grafana + InfluxDB + k6 集成
  ├─ docker compose up -d (InfluxDB + Grafana)
  ├─ k6 smoke → InfluxDB 写入验证
  ├─ Grafana dashboard API 查询
  └─ docker compose down

Phase 2: 系统指标 + Cluster
  ├─ scripts/server.sh start (Cluster 模式)
  ├─ CSV 采集验证
  └─ scripts/server.sh stop

Phase 3: 认证流程
  ├─ AUTH_ENABLED=true npm start
  ├─ curl: register → login → token → protected endpoint
  └─ stop server

Phase 4: Soak + 可观测性
  ├─ docker compose up + k6 soak:short
  └─ Grafana 面板 + 告警验证

Phase 5: k6 Helpers
  ├─ 环境加载器 / CSV 加载 / Profile 解析
  └─ k6 runtime 内验证

Phase 6: Rate Limiter + 摘要报告
  ├─ RATE_LIMIT_ENABLED=true 限流验证
  ├─ generate-summary.sh 验证
  └─ k6 helpers 验证 (SKIP - 模块系统限制)

Phase 7: CI/CD 集成
  └─ PR 评论格式验证
```

---

## 4. 测试脚本详细设计

### 4.1 共享基础设施详细设计

#### 4.1.1 test-server.js

**职责：** 提供测试生命周期管理的核心基础设施。

```
模块依赖关系:
  test-server.js
    ├── require('supertest')          → HTTP 客户端
    ├── require('../../src/app')      → Express 应用实例
    ├── require('../../src/db/database')
    │   └── .resetDatabase()          → 重建表 + 种子数据
    └── require('../../src/middleware/metrics')
        └── .resetMetrics()           → 计数器归零
```

**导出函数：**

| 函数 | 签名 | 用途 |
|------|------|------|
| `createTestClient()` | `() → supertest.Agent` | 创建绑定到 Express app 的 HTTP 测试客户端 |
| `resetTestEnvironment()` | `() → void` | 重置数据库（DDL + 种子数据）+ 重置 metrics 计数器 |
| `registerAndLogin(agent, opts)` | `(Agent, {username?, password?}) → {accessToken, refreshToken, userId}` | 一键完成注册+登录，返回 Token 对 |
| `createTestProduct(agent, data)` | `(Agent, {name, price, stock?}) → Product` | 通过 API 创建测试商品 |
| `createTestOrder(agent, data, token?)` | `(Agent, {product_id, quantity}, string?) → Order` | 通过 API 创建测试订单（可选认证） |

**生命周期钩子模式：**

```
beforeEach(() => {
  resetTestEnvironment()    // 1. 重置 SQLite 内存数据库
                            //    → DROP + CREATE TABLE
                            //    → INSERT 5 条种子商品 (stock=100000)
                            // 2. 重置 metrics
                            //    → requestCount = 0
                            //    → orderSuccess = 0
  agent = createTestClient() // 3. 创建新的 supertest agent
})

afterEach(() => {
  resetTestEnvironment()    // 确保测试间完全隔离
})
```

#### 4.1.2 互斥锁机制 (lock.sh)

**问题场景：** 多个 `integration-test.sh` 实例并行执行会导致：
- 端口冲突（:3000 被占用）
- Docker 容器名冲突
- 数据库文件损坏

**解决方案：** 基于 `mkdir` 原子性的文件锁：

```
锁获取流程:
  mkdir /tmp/integration-test.lock  (原子操作)
    ├── 成功 → 获取锁，写入 PID
    └── 失败 → 等待 + 重试（超时 5min 后强制获取）

锁释放流程:
  rm -rf /tmp/integration-test.lock

异常保护:
  trap cleanup EXIT  → 脚本异常退出时自动释放锁
```

### 4.2 API 层详细设计

#### 4.2.1 Products API 测试流

```
PROD-INT-01: 创建→查询一致性
  Arrange: resetTestEnvironment()
  Act:     POST /api/products {name:"Test", price:99.99}
           GET  /api/products/:id (使用返回的 id)
  Assert:  name/price/stock 字段完全匹配
  
PROD-INT-02: 分页验证
  Arrange: resetTestEnvironment() → 5 条种子数据
  Act:     GET /api/products?page=1&limit=3
  Assert:  data.length=3, metadata: {page:1, limit:3, total:5}

PROD-INT-03: 404 错误传播
  Arrange: resetTestEnvironment()
  Act:     GET /api/products/99999
  Assert:  status=404, body.error 存在

PROD-INT-04: 创建校验
  Arrange: resetTestEnvironment()
  Act:     POST /api/products {price:99.99} (缺少 name)
  Assert:  status=400, body.error 包含字段提示

PROD-INT-05: 批量创建
  Arrange: resetTestEnvironment()
  Act:     循环 POST 5 个商品
           GET /api/products (全量)
  Assert:  total = 5(种子) + 5(新建) = 10

PROD-INT-06: 默认分页参数
  Arrange: resetTestEnvironment()
  Act:     GET /api/products (无分页参数)
  Assert:  metadata: {page:1, limit:10}
```

#### 4.2.2 Orders Workflow 测试流

```
ORD-INT-01: 库存扣减
  Arrange: resetTestEnvironment(), 种子商品 stock=100000
  Act:     POST /api/orders {product_id:1, quantity:30}
           GET  /api/products/1
  Assert:  order.status="confirmed", product.stock=99970

ORD-INT-02: 库存不足冲突
  Arrange: resetTestEnvironment()
  Act:     POST /api/orders {product_id:1, quantity:999999}
           GET  /api/products/1
  Assert:  status=409, stock 不变

ORD-INT-03: 商品不存在
  Arrange: resetTestEnvironment()
  Act:     POST /api/orders {product_id:99999, quantity:1}
  Assert:  status=404

ORD-INT-04: 订单分页
  Arrange: 创建多个订单
  Act:     GET /api/orders?page=1&limit=3
  Assert:  data.length=3, metadata 正确

ORD-INT-05: 累积扣减
  Arrange: resetTestEnvironment()
  Act:     POST 3 次订单 {quantity:10}
           GET  /api/products/1
  Assert:  stock 减少 30

ORD-INT-06: 缺少必填字段
  Arrange: resetTestEnvironment()
  Act:     POST /api/orders {} (空 body)
  Assert:  status=400

ORD-INT-07: 金额精度
  Arrange: 创建 price=33.33 的商品
  Act:     POST /api/orders {quantity:3}
  Assert:  total = 99.99 (33.33 × 3)
```

#### 4.2.3 Auth Flow 测试流

```
AUTH-INT-01: 注册→登录→Token
  Arrange: resetTestEnvironment()
  Act:     POST /api/auth/register {username, password}
           POST /api/auth/login {username, password}
  Assert:  register=201, login.accessToken + refreshToken 存在

AUTH-INT-02: Token 刷新
  Arrange: 注册并登录
  Act:     POST /api/auth/refresh {refreshToken}
  Assert:  200, 新的 accessToken 返回

AUTH-INT-03: 登出→黑名单
  Arrange: 注册并登录
  Act:     POST /api/auth/logout {refreshToken}
           POST /api/auth/refresh {同一 refreshToken}
  Assert:  logout=200, refresh=401

AUTH-INT-04: 无效 Token 格式
  Arrange: 无
  Act:     GET /api/orders (Authorization: Bearer invalid_token)
  Assert:  status=401

AUTH-INT-05: 登出后刷新拒绝
  Arrange: 注册登录获取 Token
  Act:     logout → refresh (已吊销 Token)
  Assert:  refresh 返回 401

AUTH-INT-06: 重复用户名注册
  Arrange: resetTestEnvironment()
  Act:     POST /api/auth/register {username:"dup"}
           POST /api/auth/register {username:"dup"}
  Assert:  第一次 201, 第二次 409

AUTH-INT-07: 缺少用户名注册
  Arrange: resetTestEnvironment()
  Act:     POST /api/auth/register {password:"pw"} (无 username)
  Assert:  status=400

AUTH-INT-08: 密码错误登录
  Arrange: 注册用户
  Act:     POST /api/auth/login {username, password:"wrong"}
  Assert:  status=401
```

#### 4.2.4 Health & Metrics 测试流

```
METRICS-INT-01: 健康检查
  Act:     GET /health
  Assert:  200, {status:"ok", timestamp: ISO 格式}

METRICS-INT-02: 就绪探针
  Act:     GET /ready
  Assert:  200, {ready:true}

METRICS-INT-03: 指标结构完整性
  Act:     GET /metrics
  Assert:  包含 cpu, memory, eventLoop, requestCount, business 字段

METRICS-INT-04: 请求计数累积
  Arrange: resetTestEnvironment()
  Act:     发送 5 次 GET /health
           GET /metrics
  Assert:  requestCount ≥ 5

METRICS-INT-05: 订单成功指标
  Arrange: resetTestEnvironment()
  Act:     POST /api/orders (正常订单)
           GET /metrics
  Assert:  business.orderSuccess ≥ 1

METRICS-INT-06: 订单冲突指标
  Arrange: 创建低库存商品
  Act:     POST /api/orders (超过库存)
           GET /metrics
  Assert:  business.orderConflict ≥ 1
```

### 4.3 横切关注点详细设计

#### 4.3.1 Auth Protected Routes 测试流

```
CROSS-INT-01: 认证开启无 Token
  Arrange: AUTH_ENABLED=true, 重新加载 app
  Act:     POST /api/orders {product_id:1, quantity:1}
  Assert:  status=401

CROSS-INT-02: 认证开启有效 Token
  Arrange: AUTH_ENABLED=true, 重新加载 app, 注册登录
  Act:     POST /api/orders (带 Bearer Token)
  Assert:  status=201

CROSS-INT-03: 登出后 Token 失效
  Arrange: AUTH_ENABLED=true, 注册登录
  Act:     logout → POST /api/orders (用已吊销 Token)
  Assert:  status=401

CROSS-INT-04: 认证关闭默认行为
  Arrange: 删除 AUTH_ENABLED, 重新加载 app
  Act:     POST /api/orders {product_id:1, quantity:1} (无 Token)
  Assert:  status=201 (认证关闭时不检查 Token)

CROSS-INT-05: 端到端用户旅程
  Arrange: AUTH_ENABLED=true
  Act:     register → login → create order → view orders → logout
  Assert:  每步返回预期状态码
```

#### 4.3.2 Error Handling 测试流

```
ERR-INT-01: 无效 JSON Body
  Act:     POST /api/products (Content-Type: application/json, body: "invalid")
  Assert:  status=400

ERR-INT-02: 空 Body 创建商品
  Act:     POST /api/products {}
  Assert:  status=400, body.error 存在

ERR-INT-03: 无效分页参数降级
  Act:     GET /api/products?page=abc
  Assert:  status=200, 降级为 page=1, limit=10

ERR-INT-04: 超大数量订单
  Act:     POST /api/orders {product_id:1, quantity:999999999}
  Assert:  status=409 (库存不足)

ERR-INT-05: 错误格式一致性
  Act:     触发 400, 404, 409 三种错误
  Assert:  所有错误响应都包含 error 字段
```

#### 4.3.3 Concurrent Access 测试流

```
CONC-INT-01: 库存竞争消耗
  Arrange: 创建 stock=30 的商品
  Act:     循环发送 5 个 quantity=10 的订单
  Assert:  前 3 个成功 (201), 后 2 个失败 (409)

CONC-INT-02: 用户名唯一约束
  Act:     循环注册 2 个同名用户
  Assert:  第 1 个 201, 第 2 个 409

CONC-INT-03: 批量商品创建
  Act:     循环创建 10 个商品
           GET /api/products 全量
  Assert:  total = 5(种子) + 10(新建) = 15
```

### 4.4 中间件详细设计

#### 4.4.1 Rate Limiter 测试流

```
RL-INT-01: 超限返回 429
  Arrange: RATE_LIMIT_ENABLED=true, MAX=3
  Act:     连续发送 4 次请求
  Assert:  前 3 次 200, 第 4 次 429

RL-INT-02: RateLimit Headers
  Arrange: RATE_LIMIT_ENABLED=true, MAX=3
  Act:     发送 3 次请求
  Assert:  Remaining 从 2 → 1 → 0 递减

RL-INT-03: 限流关闭
  Arrange: RATE_LIMIT_ENABLED=false
  Act:     发送 100 次请求
  Assert:  无 429 响应

RL-INT-04: 限额跨端点共享
  Arrange: RATE_LIMIT_ENABLED=true, MAX=3
  Act:     GET /health (1次) + GET /api/products (1次) + GET /health (1次) + GET /health (1次)
  Assert:  第 4 次请求 429

RL-INT-05: 429 响应体
  Arrange: 触发 429
  Assert:  body.error 包含限流提示
```

#### 4.4.2 Security Headers 测试流

```
SEC-INT-01: 核心安全头
  Act:     GET /health
  Assert:  Content-Security-Policy 含 default-src 'self'
           Strict-Transport-Security 含 max-age=31536000
           X-Frame-Options: DENY

SEC-INT-02: 隐藏技术栈
  Act:     GET /health
  Assert:  X-Powered-By 头不存在

SEC-INT-03: XSS 防护
  Act:     GET /health
  Assert:  X-XSS-Protection: 1; mode=block

SEC-INT-04: 高级安全策略
  Act:     GET /health
  Assert:  Referrer-Policy: no-referrer
           Cross-Origin-Embedder-Policy 存在
           Cross-Origin-Opener-Policy 存在
           X-Content-Type-Options: nosniff
```

### 4.5 工具函数详细设计

#### 4.5.1 Baseline Compare 测试流

```
BASE-INT-01: 首次基线建立
  Arrange: 空临时目录
  Act:     compareWithBaseline({p95:100, error_rate:0.5})
  Assert:  status=BASELINE_SET, delta=0

BASE-INT-02: 严重退化检测
  Arrange: 基线 p95=100
  Act:     compareWithBaseline({p95:160}) → 60% 退化
  Assert:  status=FAIL

BASE-INT-03: 轻度退化警告
  Arrange: 基线 p95=100
  Act:     compareWithBaseline({p95:130}) → 30% 退化
  Assert:  status=WARNING

BASE-INT-04: 存储→加载一致性
  Act:     saveBaseline(data) → loadBaseline()
  Assert:  loaded === saved

BASE-INT-05: 完整工作流
  Act:     set baseline → append 3 trends → compare latest
  Assert:  15% 退化 → PASS
```

#### 4.5.2 Leak Detection 测试流

```
LEAK-INT-01: 正常增长
  Act:     checkMemoryLeak({growth:10%})
  Assert:  level=ok, leaked=false

LEAK-INT-02: 严重泄漏
  Act:     checkMemoryLeak({growth:60%})
  Assert:  level=critical, leaked=true

LEAK-INT-03: 警告级别
  Act:     checkMemoryLeak({growth:35%})
  Assert:  level=warning, leaked=false
```

#### 4.5.3 Trend Collect 测试流

```
TREND-INT-01: 趋势累积
  Act:     appendTrend() 5 次
  Assert:  JSON 数组长度 = 5

TREND-INT-02: 过期自动清理
  Arrange: 插入 91 天前的条目
  Act:     appendTrend() 新条目
  Assert:  旧条目被移除

TREND-INT-03: Markdown 报告生成
  Act:     generateTrendMarkdown(data)
  Assert:  包含表头 run/date/p95_ms/error_rate/throughput_rps

TREND-INT-04: 空数据兜底
  Act:     generateTrendMarkdown([])
  Assert:  输出 "No trend data available"
```

#### 3.5.2 Phase 7 Soak 集成脚本 (`scripts/integration-test-phase7-soak.sh`)

| 项目 | 说明 |
|------|------|
| **测试目标** | 验证 k6 soak → InfluxDB 数据流 + Grafana 告警规则配置的端到端链路 |
| **执行阶段** | **Stage 4（验收阶段）**，不计入 Stage 3 集成测试范围 |
| **执行方式** | `bash scripts/integration-test-phase7-soak.sh` |
| **依赖环境** | Docker daemon、k6 CLI、InfluxDB 1.8 (:8086)、Grafana 10.2 (:3010)、API (:3000) |
| **用例数** | 2 (K6-SOAK-INT-01, K6-SOAK-INT-02) |
| **执行时长** | ~10 分钟（3 分钟 soak + 基础设施等待） |

**架构：**

```
scripts/integration-test-phase7-soak.sh
         │
         ├── 基础设施准备
         │     ├── 检查 Docker daemon 状态
         │     ├── docker compose up -d --build  (API + InfluxDB + Grafana)
         │     └── 等待三服务就绪 (最长 180s, 轮询 /health /ping /api/health)
         │
         ├── K6-SOAK-INT-01: k6 → InfluxDB 数据流
         │     ├── 查询 InfluxDB 基线计数 (http_req_duration COUNT)
         │     ├── k6 run soak-short.k6.js --out influxdb (3min, 20VUs)
         │     ├── 等待 InfluxDB 写入刷新 (2s)
         │     └── 验证: final_count > baseline_count
         │           + soak_heap_used_mb 自定义指标存在
         │
         ├── K6-SOAK-INT-02: Grafana 告警规则验证
         │     ├── 验证 Grafana /api/health 可达 (database=ok)
         │     ├── 检查告警资产 (rules.yml provisioning 或 dashboard 内嵌告警)
         │     ├── 注入流量并查询 InfluxDB p95 数据
         │     └── 验证 soak-results dashboard UID 可查询
         │
         └── 清理 (trap EXIT)
               ├── docker compose down
               └── scripts/server.sh stop
```

**告警资产检测策略（双路径）：**

| 路径 | 文件 | 检测内容 |
|------|------|---------|
| **路径 A：Provisioning** | `grafana/provisioning/alerting/rules.yml` | 含 HighP95Latency / HighErrorRate / HeapMemoryGrowth 规则 |
| **路径 B：Dashboard 内嵌** | `grafana/dashboards/soak-results.json` | 含 `uid: "soak-results"` + p95/error-rate 告警定义 |

两种路径任一满足即 PASS，兼容不同部署方式。

**与 `integration-test.sh` Phase 4 的区别：**

| 维度 | `integration-test.sh` Phase 4 | `integration-test-phase7-soak.sh` |
|------|-------------------------------|-----------------------------------|
| **执行阶段** | Stage 3 开发阶段 | Stage 4 验收阶段 |
| **soak 时长** | 嵌套在多 Phase 主脚本中 | 独立 3 分钟专项 soak |
| **验收重点** | 告警和指标可用性的快速检查 | InfluxDB 数据流量化验证 + 告警规则完整性 |
| **计数方式** | 计入 `integration-test.sh` 统计 | 独立脚本，用例计入 Phase 7 Stage 4 |

---

## 5. 测试数据管理

### 5.1 种子数据

| 数据源 | 内容 | 初始化时机 |
|--------|------|-----------|
| **商品种子** | 5 条商品（Laptop/Phone/Tablet/Watch/Headphones），每条 stock=100,000 | `resetDatabase()` 调用时 |
| **用户表** | 空表 | `resetDatabase()` 调用时 |
| **订单表** | 空表 | `resetDatabase()` 调用时 |
| **Token 黑名单** | 空表 | `resetDatabase()` 调用时 |

### 5.2 测试数据策略

| 策略 | 实现方式 | 适用测试 |
|------|---------|---------|
| **种子数据** | `resetDatabase()` 每次重建 | 所有 API 测试 |
| **工厂函数** | `createTestProduct()` / `registerAndLogin()` | 需要自定义数据的测试 |
| **临时文件** | `os.tmpdir()` + beforeEach/afterEach | baseline/trend 工具测试 |
| **环境变量** | `process.env` 直接设置 | 限流器/认证开关测试 |
| **无状态** | 纯函数调用 | 泄漏检测测试 |

### 5.3 数据隔离保证

```
每个测试用例执行流:

  beforeEach()
    ├── resetDatabase()        → DROP + CREATE + INSERT 种子数据
    ├── resetMetrics()         → 计数器归零
    └── createTestClient()     → 新的 supertest agent

  测试体
    ├── Arrange: 创建额外数据
    ├── Act: HTTP 请求
    └── Assert: 验证响应

  afterEach()
    └── resetTestEnvironment() → 确保无残留
```

---

## 6. 环境管理与隔离策略

### 6.1 Jest Runner 环境

| 项目 | 配置 |
|------|------|
| **数据库** | SQLite `:memory:` 模式，进程退出即销毁 |
| **HTTP** | Supertest 进程内调用，无真实网络 I/O |
| **环境变量** | `NODE_ENV=test`，每个测试自行管理特殊变量 |
| **模块隔离** | `jest.resetModules()` 用于需要重载的中间件 |
| **并发控制** | Jest 默认并行执行测试文件，但每个文件内串行 |

### 6.2 Shell Runner 环境

| 项目 | 配置 |
|------|------|
| **API 服务** | `scripts/server.sh start` 启动真实进程（端口 3000） |
| **Docker** | `docker compose up -d` 启动 InfluxDB (:8086) + Grafana (:3010) |
| **互斥锁** | `scripts/lock.sh` 防止并行执行 |
| **环境检测** | `scripts/preflight-check.sh --stage4` 检测 Docker/端口/资源 |
| **清理策略** | `trap cleanup EXIT` + `docker compose down` |

### 6.3 模块重载模式

用于需要在不同环境变量下测试同一模块的场景：

```javascript
// 示例: rate-limiter.integration.test.js
beforeEach(() => {
  jest.resetModules()                    // 清除模块缓存
  process.env.RATE_LIMIT_ENABLED = 'true'
  process.env.RATE_LIMIT_MAX = '3'
  const app = require('../../../src/app') // 重新加载模块
  agent = supertest(app)
})

afterEach(() => {
  delete process.env.RATE_LIMIT_ENABLED
  delete process.env.RATE_LIMIT_MAX
  jest.resetModules()
})
```

---

## 7. 质量保证措施

### 7.1 测试可靠性

| 措施 | 说明 |
|------|------|
| **无外部依赖** | Jest 测试使用内存数据库，不依赖网络/文件系统（baseline/trend 除外） |
| **确定性种子数据** | 固定的 5 条商品数据，每次重置一致 |
| **无时序依赖** | 测试间无执行顺序要求 |
| **超时控制** | Jest 默认 5s 超时，Shell 脚本各阶段有独立超时 |

### 7.2 测试命名规范

| 规范 | 格式 | 示例 |
|------|------|------|
| **文件名** | `<模块>.integration.test.js` | `products-api.integration.test.js` |
| **用例 ID** | `<类别>-INT-<序号>` | `PROD-INT-01`, `AUTH-INT-03` |
| **describe 块** | `<模块> Integration Tests` | `Products API Integration Tests` |
| **it 块** | `<用例ID>: <动作> → <预期>` | `PROD-INT-01: create → query → data consistent` |

### 7.3 执行命令

```bash
# 全量集成测试（Jest）
npm run test:integration

# 按模块执行
npx jest tests/integration/api/
npx jest tests/integration/cross-cutting/
npx jest tests/integration/middleware/
npx jest tests/integration/utils/

# 单文件执行
npx jest tests/integration/api/auth-flow.integration.test.js

# Shell 集成测试（需 Docker）
bash scripts/integration-test.sh

# 覆盖率（含集成测试）
npm test -- --coverage
```

---

## 8. 文档关联

| 文档 | 路径 | 关系 |
|------|------|------|
| 测试计划 | [test-plan.md](../qa/test-plan.md) | 集成测试策略和优先级定义 |
| 集成测试用例 | [integration-test-cases.md](../qa/test-cases/integration-test-cases.md) | 61 条 Jest 用例详细规格 |
| RTM | [rtm.md](../qa/rtm.md) | 需求到集成测试的完整追溯 |
| 架构设计 | [architecture.md](../architecture/architecture.md) | 被测系统架构 |
| 用例索引 | [test-cases/index.md](../qa/test-cases/index.md) | 全部 357 条用例统计 |
