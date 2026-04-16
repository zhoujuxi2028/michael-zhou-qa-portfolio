# Phase 3 — JWT 认证场景性能测试 (#56) ✅ Done

## 3.1 目标

为电商 API 添加 JWT 认证层，测试高并发下登录/Token 刷新/鉴权链路的性能表现，并与无认证场景进行对比。

| 维度           | 说明                                                                            |
| -------------- | ------------------------------------------------------------------------------- |
| 业务场景       | 企业门户高并发认证 — 登录 / Token 刷新 / 鉴权                                   |
| 技术价值       | bcrypt CPU 密集型操作对 event loop 瓶颈的放大效应 (延续 Phase 2 CPU-bound 结论) |
| Portfolio 价值 | 补全"身份认证类业务性能测试"场景覆盖                                            |

## 3.2 用户故事

| ID    | 角色        | 故事                                                  | 验收标准                                           |
| ----- | ----------- | ----------------------------------------------------- | -------------------------------------------------- |
| US-14 | QA Engineer | 我需要一套认证 API，以便在性能测试中覆盖登录/鉴权场景 | 4 个认证接口可用 (register/login/refresh/logout)   |
| US-15 | QA Engineer | 我需要测试高并发登录的性能表现                        | login 在 500 VUs 下 p95 < 500ms, error < 1%        |
| US-16 | QA Engineer | 我需要测试 Token 刷新的性能表现                       | refresh 在 200 VUs 下 p95 < 200ms                  |
| US-17 | QA Engineer | 我需要测试完整用户旅程 (登录→浏览→下单) 的端到端性能  | login → browse → order 完整链路 load test 通过阈值 |
| US-18 | QA Engineer | 我需要对比认证前后的性能差异                          | 输出对比报告：带认证 vs 不带认证                   |

## 3.3 Use Cases

```
UC-06: 高并发登录
  前置: 用户已注册 (setup 阶段批量注册)
  流程: 500 VUs 并发 POST /api/auth/login → 获取 JWT
  预期: p95 < 500ms, error < 1%
  关注: bcrypt 哈希验证 (~100ms/次) 是 CPU 密集型，可能加剧 event loop 瓶颈

UC-07: Token 刷新
  前置: 用户已登录，持有 refresh token
  流程: 200 VUs 并发 POST /api/auth/refresh
  预期: p95 < 200ms
  关注: 新旧 token 切换的并发安全性

UC-08: 完整用户旅程 (认证版)
  流程: login → GET /api/products → GET /api/products/:id → POST /api/orders (带 Bearer token)
  预期: 整体 p95 < 500ms, error < 1%
  关注: 与 Phase 1/2 无认证旅程的性能对比

UC-09: 无效/过期 Token 请求
  流程: 使用过期/无效 token 请求受保护接口
  预期: 返回 401, 不应导致服务端异常或性能退化
```

## 3.4 需求列表

### 后端需求

| ID      | 需求             | 说明                                                                                   |
| ------- | ---------------- | -------------------------------------------------------------------------------------- |
| AUTH-01 | 用户注册接口     | `POST /api/auth/register` — bcryptjs 哈希密码 (10 rounds), 存入 SQLite users 表        |
| AUTH-02 | 用户登录接口     | `POST /api/auth/login` — 验证密码, 返回 Access Token (15min) + Refresh Token (7d)      |
| AUTH-03 | Token 刷新接口   | `POST /api/auth/refresh` — 验证 Refresh Token, 签发新 Access Token                     |
| AUTH-04 | 用户登出接口     | `POST /api/auth/logout` — 将 Token 加入黑名单表                                        |
| AUTH-05 | JWT 验证中间件   | `src/middleware/authenticate.js` — 验证 Bearer token, 检查黑名单, 注入 `req.user`      |
| AUTH-06 | 现有接口认证保护 | `POST /api/orders` 添加认证保护; 环境变量 `AUTH_ENABLED` 开关 (默认关闭), 保持向后兼容 |

### 性能测试需求

| ID      | 需求              | 说明                                                                                         |
| ------- | ----------------- | -------------------------------------------------------------------------------------------- |
| AUTH-07 | k6 高并发登录压测 | `tests/performance/auth-load.k6.js` — setup() 批量注册, default() 并发 login + 带 token 请求 |
| AUTH-08 | k6 Token 刷新压测 | 200 VUs 并发 refresh, 验证 p95 < 200ms                                                       |
| AUTH-09 | k6 完整用户旅程   | login → browse → detail → order 完整认证链路 load test                                       |
| AUTH-10 | JMeter 高并发登录 | `tests/jmeter/auth-load.jmx` — Login Sampler + JSON Extractor + HTTP Header Manager          |
| AUTH-11 | 性能对比报告      | 带认证 vs 不带认证的 p95 / 吞吐量 / error rate 对比                                          |

## 3.5 Scope 确认

| 范围     | 包含                             | 不包含                     |
| -------- | -------------------------------- | -------------------------- |
| 认证方式 | JWT (HS256) + bcryptjs           | OAuth2, SSO, 第三方登录    |
| 数据存储 | SQLite users 表 + token 黑名单表 | Redis session store        |
| 密码哈希 | bcryptjs (纯 JS, 10 rounds)      | argon2 (需编译)            |
| 接口保护 | POST /api/orders (可选开关)      | GET /api/products 保持公开 |
| k6       | 认证专项脚本 + 现有脚本改造      | 分布式 k6                  |
| JMeter   | 高并发登录测试计划               | 分布式 JMeter              |

## 3.6 可行性评估

| 维度                | 评估                                                     | 风险等级                                            |
| ------------------- | -------------------------------------------------------- | --------------------------------------------------- |
| 本机环境            | Node.js 25 + SQLite — 完全支持                           | 无                                                  |
| bcryptjs CPU 开销   | 10 rounds ≈ 100ms/次, CPU 密集型, 会加剧 event loop 瓶颈 | **中** — 这正是测试要发现的性能差异                 |
| SQLite token 黑名单 | logout 写入黑名单表, 高并发下可能遇到 WAL 写锁           | **低** — Phase 2 已验证 WAL 在 6000 VUs 下 error=0% |
| JWT 签名/验证       | HS256 对称加密, CPU 开销极低 (~0.1ms)                    | 无                                                  |
| 现有测试兼容        | `AUTH_ENABLED` 环境变量开关, 默认关闭                    | **低** — 现有脚本无需改动即可运行                   |

## 3.7 依赖识别

| 依赖           | 类型     | 版本   | 用途                       |
| -------------- | -------- | ------ | -------------------------- |
| `jsonwebtoken` | npm 新增 | ^9.0.0 | JWT 签发/验证              |
| `bcryptjs`     | npm 新增 | ^2.4.3 | 密码哈希 (纯 JS, 无需编译) |

## 3.8 设计决策

| 决策项           | 决定                              | 理由                                                           |
| ---------------- | --------------------------------- | -------------------------------------------------------------- |
| 兼容性方案       | `AUTH_ENABLED` 环境变量, 默认关闭 | 保持向后兼容, 现有 Phase 1/2 脚本和 CI 不受影响                |
| bcrypt rounds    | 10 (业界默认)                     | 真实系统不会为性能降低安全标准, 测试应反映真实情况             |
| Token 过期时间   | Access 15min / Refresh 7d         | 业界标准; 压测单次 < 15min 不会真正过期, 但需测试 refresh 场景 |
| Token 黑名单存储 | SQLite 表                         | 复用现有 DB, 无需引入 Redis                                    |

## 3.9 需求 Checklist

| #   | 检查项                         | 状态                                         |
| --- | ------------------------------ | -------------------------------------------- |
| 1   | Issue 已读取，目标明确         | ✅ Issue #56                                 |
| 2   | 完整用户故事                   | ✅ US-14~18, UC-06~09                        |
| 3   | Scope 已确认                   | ✅ JWT 认证, 不含 OAuth2/SSO                 |
| 4   | 可行性评估                     | ✅ 5 项评估, bcrypt CPU 开销为中风险         |
| 5   | 依赖已识别                     | ✅ jsonwebtoken + bcryptjs                   |
| 6   | 需求已编号                     | ✅ AUTH-01~11                                |
| 7   | 需求描述已写入 requirements.md | ✅ 本文档 §3.1~3.8                           |
| 8   | 设计决策已记录                 | ✅ 兼容性方案 A + bcrypt 10 + Token 15min/7d |
