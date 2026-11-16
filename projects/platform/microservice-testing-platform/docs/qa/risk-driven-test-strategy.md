# 风险驱动测试策略映射

> 对应 Issue #879 阶段二：建立「业务风险 → 测试层级 → 用例 → CI 阶段 → 证据」的映射。
> 锚点系统：microservice-testing-platform（Order / Inventory / Payment + Redis）。

## 1. 业务风险清单与等级

| # | 业务风险 | 描述 | 等级 | 影响 |
|---|---------|------|------|------|
| R1 | 库存超卖 | 并发扣减超过实际库存 | 高 | 资金/信誉损失 |
| R2 | 重复扣款 | 重复 order.created 事件导致重复支付 | 高 | 资金损失 |
| R3 | 消息丢失 | Redis Pub/Sub 不保证送达，支付未被触发 | 中 | 订单卡死 |
| R4 | 回调失败不一致 | 支付回调失败，订单状态与支付不一致 | 中 | 状态错乱 |
| R5 | 故障来源混淆 | 业务失败（库存不足）与环境失败（服务不可达）无法区分 | 高 | 排障困难、误判 |
| R6 | 状态机非法转换 | 订单状态非法跳转 | 高 | 数据一致性破坏 |
| R7 | 扣减后未回滚 | 支付失败后库存未恢复 | 中 | 库存泄漏 |
| R8 | 接口/事件契约漂移 | 服务间 REST/事件格式变更导致集成失败 | 中 | 集成故障 |
| R9 | 可观测性缺失 | 跨服务链路无法定位问题 | 中 | 排障成本高 |

## 2. 风险 → 测试层级 → 用例 → CI 阶段 → 证据 映射

| 风险 | 测试层级 | 现有用例 | CI 阶段 | 证据（可复现） | 剩余风险 |
|------|---------|---------|---------|---------------|---------|
| R1 库存超卖 | unit + integration | UT-I-09、IT-I-03 | unit-tests | `tests/integration/inventory-api.test.js`（并发扣减断言 3 成功 2 失败） | 无（SQLite 串行写 + 事务） |
| R2 重复扣款 | unit + integration | UT-P-05、IT-P-04 | unit-tests | `payment.js` 按 `order_id` 去重 + `payment-api.test.js` | 无（幂等已实现） |
| R3 消息丢失 | 设计约束 | —（不测） | — | `architecture.md` §3.3 通信选型 + §6 错误处理 | **接受**：Pub/Sub at-most-once，无持久化/重投，需人工补单 |
| R4 回调失败不一致 | unit | （catch 逻辑） | unit-tests | `redis-subscriber.js` catch 仅记日志 | **接受**：无重试/补偿，订单卡 confirmed 需人工介入 |
| R5 故障来源混淆 | integration | IT-O-06（409）、IT-O-07（503） | unit-tests | `orders.js` 按 `err.code` 区分 + `order-api.test.js` | 无（错误码已区分） |
| R6 状态机非法转换 | unit | UT-O-10 | unit-tests | `VALID_TRANSITIONS` + `order.js updateStatus` | 无 |
| R7 扣减后未回滚 | unit + e2e | UT-I-07/08、E2E-03 | unit-tests | `inventory.js rollback`（按 orderId 幂等） | 无 |
| R8 契约漂移 | contract | CT-OI/CT-PO/CT-E（15） | unit-tests | `tests/contract/schemas/*.schema.js`（ajv） | 无（JSON Schema 校验） |
| R9 可观测性缺失 | observability | OB-01~10 | unit-tests | `correlation-id` 中间件 + `prom-client` 指标 | 无 |

## 3. 分层策略（测什么 / 不测什么）

| 层级 | 测什么 | 不测什么 | 理由 |
|------|--------|---------|------|
| 单元（78） | 业务逻辑、状态机、幂等、数据校验 | 真实网络/DB 交互 | mock 外部依赖，快速且确定 |
| 契约（15） | 服务间 REST/事件格式 | 业务行为 | ajv JSON Schema 校验格式漂移 |
| 集成（22） | 单服务 API + 内存 SQLite | 跨服务真实调用 | jest.mock 外部依赖，隔离单服务 |
| E2E（10） | 跨服务核心流程（进程内起 inventory） | Redis 真实事件流 | Redis Pub/Sub 需真实基础设施，用 mock 模拟 |
| 可观测（10） | 日志格式、链路 ID、指标 | 端到端采集 | 单测断言即可覆盖 |

## 4. 剩余风险声明（明确接受、不堆砌测试）

- **R3 消息丢失**：Redis Pub/Sub 是 at-most-once，无持久化。系统级修复需引入 Stream/Kafka 或 outbox，超出本项目范围，**接受残余风险并明确标注**。
- **R4 回调失败**：`redis-subscriber` 回调失败仅记日志，无重试/补偿。作为已知限制记录在案，不作为「已解决」宣传。
- 以上剩余风险在面试叙事中如实说明，不把「演示效果」等同「生产可靠性」。

## 5. 与 CI 的衔接

所有 jest 测试（135 个）均无需 Docker（jest.mock + 内存 SQLite），故 CI 只分两个 job：`code-quality`（lint + format）+ `unit-tests`（`test:coverage` 跑全部 135 测试并强制覆盖率门禁），再经 `gate` 汇总。详见 `.github/workflows/microservice-ci.yml`。

真实 Redis 异步链路（`order.created` → 支付 → 回调）不由 jest 层覆盖（E2E 用 mock 模拟），改由按需脚本 `scripts/e2e-real-flow.sh`（docker compose 起栈 + 轮询订单到 `paid`）验证，不接入 PR CI 以保持主流程快速稳定。
