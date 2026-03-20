# WBS - 工作分解结构

## 项目生命周期

| Phase | Name | Status |
|-------|------|--------|
| 1 | 需求分析 | **Complete** |
| 2 | 设计阶段 | **Complete** |
| 3 | 开发阶段 | **Complete** |
| 4 | 测试阶段 | **Complete** |
| 5 | 收尾阶段 | Pending |

---

## WBS 分解

```
1. 微服务测试平台 (microservice-testing-platform)
│
├── 1.1 需求分析
│   ├── 1.1.1 定义项目目标与范围              → docs/requirements.md
│   ├── 1.1.2 定义 3 个服务职责与 API 接口      → docs/api-spec.md
│   ├── 1.1.3 定义服务间通信契约（REST + Redis） → docs/api-spec.md §4
│   ├── 1.1.4 编写测试用例清单（90 cases）       → docs/test-cases.md
│   └── 1.1.5 技术选型确认与 WBS 输出           → docs/wbs.md
│
├── 1.2 设计阶段
│   ├── 1.2.1 服务架构设计（3 服务 + Redis）     → docs/architecture.md
│   ├── 1.2.2 数据模型设计（3 表结构）           → docs/data-model.md
│   ├── 1.2.3 消息事件设计（order.created 等）   → docs/architecture.md §3
│   ├── 1.2.4 测试策略设计（6 层金字塔）         → docs/test-strategy.md
│   ├── 1.2.5 可观测性设计（日志/追踪/指标）     → docs/architecture.md §4
│   ├── 1.2.6 目录结构与编码规范               → docs/project-structure.md
│   └── 1.2.7 CI/CD pipeline 设计             → docs/cicd-design.md
│
├── 1.3 开发阶段
│   ├── 1.3.1 项目初始化
│   │   ├── 1.3.1.1 Monorepo 结构 + root package.json
│   │   ├── 1.3.1.2 ESLint + Prettier 配置
│   │   └── 1.3.1.3 Docker Compose 基础编排
│   │
│   ├── 1.3.2 Inventory Service（先开发，无外部依赖）
│   │   ├── 1.3.2.1 Express 骨架 + SQLite 初始化
│   │   ├── 1.3.2.2 库存 CRUD API
│   │   ├── 1.3.2.3 扣减/回滚逻辑 + 幂等处理
│   │   ├── 1.3.2.4 健康检查 + Prometheus 指标
│   │   └── 1.3.2.5 Winston 日志 + Correlation ID
│   │
│   ├── 1.3.3 Order Service
│   │   ├── 1.3.3.1 Express 骨架 + SQLite 初始化
│   │   ├── 1.3.3.2 订单 CRUD API
│   │   ├── 1.3.3.3 调用 Inventory Service（REST）
│   │   ├── 1.3.3.4 Redis Pub（order.created 事件）
│   │   ├── 1.3.3.5 Redis Sub（payment.completed 回调）
│   │   ├── 1.3.3.6 订单状态机
│   │   ├── 1.3.3.7 健康检查 + Prometheus 指标
│   │   └── 1.3.3.8 Winston 日志 + Correlation ID
│   │
│   ├── 1.3.4 Payment Service
│   │   ├── 1.3.4.1 Express 骨架 + SQLite 初始化
│   │   ├── 1.3.4.2 Redis Sub（order.created 监听）
│   │   ├── 1.3.4.3 支付处理逻辑 + 模拟成功/失败
│   │   ├── 1.3.4.4 Redis Pub（payment.completed 事件）
│   │   ├── 1.3.4.5 查询支付记录 API
│   │   ├── 1.3.4.6 健康检查 + Prometheus 指标
│   │   └── 1.3.4.7 Winston 日志 + Correlation ID
│   │
│   └── 1.3.5 Docker Compose 完整编排
│       ├── 1.3.5.1 Redis 服务配置
│       ├── 1.3.5.2 3 个服务 Dockerfile
│       └── 1.3.5.3 docker-compose.yml（一键启动）
│
├── 1.4 测试阶段
│   ├── 1.4.1 单元测试（Jest，30 tests）
│   │   ├── 1.4.1.1 Order Service 业务逻辑（10）
│   │   ├── 1.4.1.2 Inventory Service 业务逻辑（10）
│   │   └── 1.4.1.3 Payment Service 业务逻辑（10）
│   │
│   ├── 1.4.2 契约测试（Pact，15 tests）
│   │   ├── 1.4.2.1 Order→Inventory 消费者契约（5）
│   │   ├── 1.4.2.2 Payment→Order 消费者契约（5）
│   │   └── 1.4.2.3 事件契约验证（5）
│   │
│   ├── 1.4.3 集成测试（Supertest，20 tests）
│   │   ├── 1.4.3.1 Order API 集成（6）
│   │   ├── 1.4.3.2 Inventory API 集成（6）
│   │   └── 1.4.3.3 Payment + Redis 集成（8）
│   │
│   ├── 1.4.4 E2E 流程测试（10 tests）
│   │   ├── 1.4.4.1 正常流程（创建→扣库存→支付）
│   │   ├── 1.4.4.2 异常流程（库存不足/支付失败）
│   │   └── 1.4.4.3 并发与恢复场景
│   │
│   ├── 1.4.5 性能测试（k6，5 scenarios）
│   │   ├── 1.4.5.1 单服务负载测试
│   │   ├── 1.4.5.2 全链路压力测试
│   │   └── 1.4.5.3 Redis 消息吞吐测试
│   │
│   ├── 1.4.6 可观测性测试（10 tests）
│   │   ├── 1.4.6.1 结构化日志验证
│   │   ├── 1.4.6.2 Correlation ID 跨服务传递
│   │   └── 1.4.6.3 Prometheus 指标验证
│   │
│   └── 1.4.7 编写测试报告                    → docs/test-report.md
│
└── 1.5 收尾阶段
    ├── 1.5.1 CI/CD workflow 实现              → .github/workflows/microservice-ci.yml
    ├── 1.5.2 CLAUDE.md 编写                   → CLAUDE.md
    ├── 1.5.3 根目录 README 更新               → ../../README.md
    └── 1.5.4 创建 PR 合并到 main
```

---

## 阶段交付物汇总

| Phase | 交付物 | 格式 |
|-------|--------|------|
| 1 需求分析 | requirements.md, api-spec.md, test-cases.md, wbs.md | Markdown |
| 2 设计阶段 | architecture.md, data-model.md, test-strategy.md, project-structure.md, cicd-design.md | Markdown |
| 3 开发阶段 | 3 services, docker-compose.yml, Dockerfiles | Code |
| 4 测试阶段 | 90 tests, test-report.md | Code + Markdown |
| 5 收尾阶段 | CI workflow, CLAUDE.md, README update, PR | Config + Markdown |
