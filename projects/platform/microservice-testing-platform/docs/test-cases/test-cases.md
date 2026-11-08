# 测试用例清单

## 1. 单元测试（Jest，~30 tests）

### 1.1 Order Service（10 tests）

| ID | 用例 | 输入 | 预期结果 |
|----|------|------|----------|
| UT-O-01 | 创建订单 - 参数合法 | valid payload | 返回 pending 订单 |
| UT-O-02 | 创建订单 - 缺少 productId | missing field | 400 错误 |
| UT-O-03 | 创建订单 - quantity <= 0 | quantity: 0 | 400 错误 |
| UT-O-04 | 创建订单 - unitPrice <= 0 | unitPrice: -1 | 400 错误 |
| UT-O-05 | 计算 totalAmount | qty:3, price:10.5 | 31.50 |
| UT-O-06 | 生成订单 ID 格式 | - | ORD-YYYYMMDD-NNN |
| UT-O-07 | 查询订单 - 存在 | valid id | 返回订单 |
| UT-O-08 | 查询订单 - 不存在 | invalid id | 404 错误 |
| UT-O-09 | 更新订单状态 - 合法转换 | pending→confirmed | 状态更新 |
| UT-O-10 | 更新订单状态 - 非法转换 | paid→pending | 400 错误 |

### 1.2 Inventory Service（10 tests）

| ID | 用例 | 输入 | 预期结果 |
|----|------|------|----------|
| UT-I-01 | 查询库存 - 商品存在 | PROD-001 | 返回库存信息 |
| UT-I-02 | 查询库存 - 商品不存在 | PROD-999 | 404 错误 |
| UT-I-03 | 扣减库存 - 库存充足 | qty:2, avail:100 | 扣减成功 |
| UT-I-04 | 扣减库存 - 库存不足 | qty:200, avail:100 | 409 错误 |
| UT-I-05 | 扣减库存 - 刚好用完 | qty:100, avail:100 | 扣减成功, remaining:0 |
| UT-I-06 | 扣减库存 - quantity <= 0 | qty:0 | 400 错误 |
| UT-I-07 | 回滚库存 - 正常回滚 | qty:2 | 库存恢复 |
| UT-I-08 | 回滚库存 - 重复回滚 | same orderId twice | 幂等处理 |
| UT-I-09 | 并发扣减 - 乐观锁 | concurrent deduct | 只有一个成功 |
| UT-I-10 | available 计算 | qty:100, reserved:5 | available:95 |

### 1.3 Payment Service（10 tests）

| ID | 用例 | 输入 | 预期结果 |
|----|------|------|----------|
| UT-P-01 | 处理支付 - 金额合法 | amount:59.98 | 支付成功 |
| UT-P-02 | 处理支付 - 金额为 0 | amount:0 | 拒绝处理 |
| UT-P-03 | 处理支付 - 模拟失败 | amount:999.99 | 支付失败 |
| UT-P-04 | 生成支付 ID 格式 | - | PAY-NNN |
| UT-P-05 | 重复支付 - 幂等 | same orderId twice | 返回已有记录 |
| UT-P-06 | 查询支付 - 存在 | valid orderId | 返回支付记录 |
| UT-P-07 | 查询支付 - 不存在 | invalid orderId | 404 错误 |
| UT-P-08 | 事件解析 - 合法 payload | valid event | 正确解析 |
| UT-P-09 | 事件解析 - 缺少字段 | missing orderId | 忽略并记录日志 |
| UT-P-10 | 回调构建 - 正确格式 | payment result | 构建 PATCH 请求 |

---

## 2. 契约测试（Pact，~15 tests）

### 2.1 Consumer: Order → Inventory（5 tests）

| ID | 用例 | Consumer 期望 | Provider 验证 |
|----|------|--------------|--------------|
| CT-OI-01 | 查询库存 - 成功 | GET 返回库存对象 | Inventory 提供匹配响应 |
| CT-OI-02 | 查询库存 - 不存在 | GET 返回 404 | Inventory 返回 404 |
| CT-OI-03 | 扣减库存 - 成功 | POST 返回扣减结果 | Inventory 处理扣减 |
| CT-OI-04 | 扣减库存 - 不足 | POST 返回 409 | Inventory 返回不足 |
| CT-OI-05 | 回滚库存 - 成功 | POST 返回回滚结果 | Inventory 处理回滚 |

### 2.2 Consumer: Payment → Order（5 tests）

| ID | 用例 | Consumer 期望 | Provider 验证 |
|----|------|--------------|--------------|
| CT-PO-01 | 更新状态为 paid | PATCH 返回 200 | Order 接受状态更新 |
| CT-PO-02 | 更新状态为 failed | PATCH 返回 200 | Order 接受失败状态 |
| CT-PO-03 | 订单不存在 | PATCH 返回 404 | Order 返回 404 |
| CT-PO-04 | 无效状态值 | PATCH 返回 400 | Order 拒绝无效状态 |
| CT-PO-05 | 查询订单 | GET 返回订单对象 | Order 提供匹配响应 |

### 2.3 事件契约（5 tests）

| ID | 用例 | 验证内容 |
|----|------|----------|
| CT-E-01 | order.created 事件格式 | 包含 orderId, productId, quantity, totalAmount |
| CT-E-02 | order.created 字段类型 | orderId:string, quantity:number |
| CT-E-03 | payment.completed 事件格式 | 包含 paymentId, orderId, status |
| CT-E-04 | 事件包含 correlationId | correlationId 为 UUID 格式 |
| CT-E-05 | 事件包含 timestamp | ISO 8601 格式 |

---

## 3. 集成测试（Supertest + Testcontainers，~20 tests）

### 3.1 Order API 集成（6 tests）

| ID | 用例 | 验证内容 |
|----|------|----------|
| IT-O-01 | 创建订单 - 完整流程 | DB 写入 + 事件发布 |
| IT-O-02 | 查询订单 - DB 读取 | 返回 DB 中真实数据 |
| IT-O-03 | 订单列表 - 分页 | 正确分页参数 |
| IT-O-04 | 订单列表 - 状态过滤 | 只返回匹配状态 |
| IT-O-05 | 状态更新 - DB 持久化 | 更新后 DB 状态一致 |
| IT-O-06 | 并发创建订单 | 无数据竞争 |

### 3.2 Inventory API 集成（6 tests）

| ID | 用例 | 验证内容 |
|----|------|----------|
| IT-I-01 | 扣减库存 - DB 更新 | quantity 正确减少 |
| IT-I-02 | 回滚库存 - DB 恢复 | quantity 正确恢复 |
| IT-I-03 | 并发扣减 - 数据一致性 | 不会超卖 |
| IT-I-04 | 初始化种子数据 | 启动时加载正确 |
| IT-I-05 | 扣减+回滚 - 事务完整 | 最终一致 |
| IT-I-06 | 多商品批量操作 | 全部成功或全部回滚 |

### 3.3 Payment + Redis 集成（8 tests）

| ID | 用例 | 验证内容 |
|----|------|----------|
| IT-P-01 | Redis 连接 | 服务启动时连接 Redis |
| IT-P-02 | 订阅 order.created | 收到事件后创建支付记录 |
| IT-P-03 | 发布 payment.completed | 支付完成后发布事件 |
| IT-P-04 | 回调 Order Service | PATCH 请求到达 Order |
| IT-P-05 | Redis 断开重连 | 断开后自动重连 |
| IT-P-06 | 重复事件 - 幂等 | 同一 orderId 不重复处理 |
| IT-P-07 | 事件格式错误 | 记录错误日志，不崩溃 |
| IT-P-08 | Correlation ID 传递 | 事件中 correlationId 一致 |

---

## 4. E2E 流程测试（~10 tests）

| ID | 用例 | 流程 | 预期结果 |
|----|------|------|----------|
| E2E-01 | 正常下单完整流程 | 创建订单→扣库存→支付成功→订单 paid | 订单状态 paid |
| E2E-02 | 库存不足 | 创建订单→库存不足 | 订单 cancelled |
| E2E-03 | 支付失败→库存回滚 | 创建订单→扣库存→支付失败 | 库存恢复, 订单 failed |
| E2E-04 | 多订单顺序处理 | 3 个订单依次创建 | 库存正确递减 |
| E2E-05 | 并发下单同一商品 | 10 个并发订单, 库存仅 5 | 5 成功, 5 失败 |
| E2E-06 | 大金额订单 | amount: 99999.99 | 正常处理 |
| E2E-07 | 查询全流程追踪 | 创建订单后查询 | 所有状态变更可追溯 |
| E2E-08 | 服务重启后恢复 | 重启 Payment Service | 未处理事件重新消费 |
| E2E-09 | 健康检查全服务 | GET /health × 3 | 全部 healthy |
| E2E-10 | 跨服务 Correlation ID | 创建订单→全链路 | 所有日志包含同一 ID |

---

## 5. 性能测试（k6，~5 scenarios）

| ID | 场景 | 配置 | 验证指标 |
|----|------|------|----------|
| PT-01 | 单服务负载 - Order API | 50 VUs, 30s | p95 < 200ms |
| PT-02 | 单服务负载 - Inventory API | 50 VUs, 30s | p95 < 100ms |
| PT-03 | 全链路压力 | 20 VUs, 60s | p95 < 500ms |
| PT-04 | 阶梯式递增 | 10→50→100 VUs | 无错误率飙升 |
| PT-05 | Redis 消息吞吐 | 100 msg/s, 30s | 消息丢失率 0% |

---

## 6. 可观测性测试（~10 tests）

| ID | 用例 | 验证内容 |
|----|------|----------|
| OB-01 | 日志格式 - JSON 结构 | 包含 timestamp, level, message, service |
| OB-02 | 日志级别 - 请求日志 | 正常请求 info 级别 |
| OB-03 | 日志级别 - 错误日志 | 异常 error 级别 + stack trace |
| OB-04 | Correlation ID - 生成 | 无 header 时自动生成 UUID |
| OB-05 | Correlation ID - 传递 | 请求头传入时沿用 |
| OB-06 | Correlation ID - 跨服务 | Order→Inventory 请求携带同一 ID |
| OB-07 | Correlation ID - 跨事件 | Redis 事件携带同一 ID |
| OB-08 | Prometheus - 请求计数 | http_requests_total 递增 |
| OB-09 | Prometheus - 响应时间 | http_request_duration_seconds 有值 |
| OB-10 | Prometheus - 自定义指标 | orders_created_total 递增 |

---

## 汇总

| 层级 | 数量 |
|------|------|
| 单元测试 | 30 |
| 契约测试 | 15 |
| 集成测试 | 20 |
| E2E 测试 | 10 |
| 性能测试 | 5 |
| 可观测性 | 10 |
| **总计** | **90** |
