# Phase 3 测试用例 — JWT 认证场景性能测试 (#56)

## 单元测试用例

### 认证路由 (`tests/unit/routes/auth.test.js`)

| 用例 ID    | 测试                   | 预期                                 | 标签             |
| ---------- | ---------------------- | ------------------------------------ | ---------------- |
| UT-AUTH-01 | register 成功          | 201, 返回 id + username              | UT P1 regression |
| UT-AUTH-02 | register 缺少字段      | 400                                  | UT P1 regression |
| UT-AUTH-03 | register 重复 username | 409                                  | UT P1 regression |
| UT-AUTH-04 | login 成功             | 200, 返回 accessToken + refreshToken | UT P1 regression |
| UT-AUTH-05 | login 错误密码         | 401                                  | UT P1 regression |
| UT-AUTH-06 | login 不存在用户       | 401                                  | UT P1 regression |
| UT-AUTH-07 | refresh 成功           | 200, 返回新 accessToken              | UT P1 regression |
| UT-AUTH-08 | refresh 无效 token     | 401                                  | UT P1 regression |
| UT-AUTH-09 | logout 成功            | 200                                  | UT P1 regression |
| UT-AUTH-10 | logout 后 refresh 失败 | 401 (jti 在黑名单)                   | UT P1 regression |

### 认证中间件 (`tests/unit/middleware/authenticate.test.js`)

| 用例 ID  | 测试                                  | 预期                           | 标签             |
| -------- | ------------------------------------- | ------------------------------ | ---------------- |
| UT-MW-01 | 有效 token 放行                       | next(), req.user 已注入        | UT P1 regression |
| UT-MW-02 | 缺少 Authorization header             | 401                            | UT P1 regression |
| UT-MW-03 | 无效 token                            | 401                            | UT P1 regression |
| UT-MW-04 | 过期 token                            | 401                            | UT P1 regression |
| UT-MW-05 | 黑名单 token                          | 401                            | UT P1 regression |
| UT-MW-06 | AUTH_ENABLED=false 时 orders 不需认证 | 201                            | UT P1 regression |
| UT-MW-07 | AUTH_ENABLED=true 时 orders 需认证    | 401 (无 token), 201 (有 token) | UT P1 regression |

## 认证性能测试用例

| 用例 ID      | 场景         | 脚本                      | VUs       | 阈值                     | 关注点                                                 | 标签             |
| ------------ | ------------ | ------------------------- | --------- | ------------------------ | ------------------------------------------------------ | ---------------- |
| AUTH-PERF-01 | 高并发登录   | auth-login.k6.js          | 100       | p95 < 2000ms, error < 1% | bcrypt ~100ms 同步阻塞, 8 Workers 理论上限 ~80 login/s | PT P2 regression |
| AUTH-PERF-02 | Token 刷新   | auth-refresh.k6.js        | 200       | p95 < 200ms              | JWT verify + sign, 无 bcrypt                           | PT P2 regression |
| AUTH-PERF-03 | 完整用户旅程 | auth-journey.k6.js        | 500       | p95 < 500ms, error < 1%  | login 仅首次, 后续 token-only                          | PT P2 regression |
| AUTH-PERF-04 | 无效 Token   | auth-journey.k6.js (辅助) | ~10% 流量 | 100% 返回 401, 无 5xx    | 错误处理不降级                                         | PT P2 regression |

> AUTH-PERF-01 VUs 从 500 调整为 100: bcrypt 10 rounds 理论上限 ~80 login/s (8 Workers),
> 500 VUs 全部重复 login 排队 > 5s, 无法产出有意义数据。

## 集成测试用例

| 用例 ID     | 验证项                        | 预期结果                                          | 验证方式                    | 标签        |
| ----------- | ----------------------------- | ------------------------------------------------- | --------------------------- | ----------- |
| AUTH-INT-01 | register → login → 获取 token | 注册成功 201，登录返回 accessToken + refreshToken | k6 1 VU (AUTH_ENABLED=true) | IT P1 smoke |
| AUTH-INT-02 | 带 token 访问受保护 API       | Bearer token 访问 POST /api/orders 返回 201       | k6 1 VU                     | IT P1 smoke |
| AUTH-INT-03 | 无 token 访问受保护 API 被拒  | 返回 401 Unauthorized，不是 5xx                   | k6 1 VU                     | IT P1 smoke |
