# 需求分析文档

## 1. 项目目标

构建电商订单微服务测试平台，用于：
- 展示微服务测试能力（契约测试、集成测试、可观测性测试）
- 展示开发 + 测试全流程能力（Dev + QA）
- 面试准备与技能展示

## 2. 项目范围

### 2.1 In Scope

| 项目 | 说明 |
|------|------|
| 3 个微服务 | Order、Inventory、Payment |
| 同步通信 | REST API（Order → Inventory） |
| 异步通信 | Redis Pub/Sub（Order → Payment） |
| 6 层测试 | 单元、契约、集成、E2E、性能、可观测性 |
| 容器化 | Docker Compose 一键启动 |
| CI/CD | GitHub Actions |
| 可观测性 | 结构化日志、链路追踪、Prometheus 指标 |

### 2.2 Out of Scope

| 项目 | 原因 |
|------|------|
| API Gateway | 增加复杂度，非核心测试目标 |
| 用户认证 | sid-iam 项目已覆盖 |
| 前端 UI | 聚焦后端微服务测试 |
| 生产部署 | K8S 部署在 k8s-auto-testing-platform 已覆盖 |

## 3. 技术选型

| 类别 | 选型 | 理由 |
|------|------|------|
| 语言 | Node.js | 展示多语言能力（portfolio 中 Python 已充分） |
| 框架 | Express.js | 轻量、面试常见、学习成本低 |
| 数据库 | SQLite | 零配置、本地即跑、每服务独立 |
| 消息队列 | Redis Pub/Sub | 一个组件解决消息+缓存，依赖少 |
| 单元测试 | Jest | Node.js 标准测试框架 |
| 契约测试 | Pact | 行业标准 Consumer-Driven Contract Testing |
| 集成测试 | Supertest + Testcontainers | 真实依赖启动测试 |
| E2E 测试 | Supertest | 全链路流程验证 |
| 性能测试 | k6 | 轻量、脚本化、CI 友好 |
| 可观测性 | Winston + prom-client | Node.js 生态标准选择 |
| 容器 | Docker Compose | 本地一键启动全部服务 |
| CI/CD | GitHub Actions | 与 portfolio 统一 |

## 4. 非功能性需求

| 需求 | 标准 |
|------|------|
| 启动时间 | Docker Compose up < 30s |
| 测试执行 | 全部测试 < 3min |
| 代码质量 | ESLint + Prettier，零 warning |
| 文档 | 每阶段有交付文档 |

## 5. 约束与假设

### 约束
- 所有服务本地运行，不依赖外部云服务
- 数据库使用 SQLite，无需安装额外数据库
- Redis 通过 Docker 运行

### 假设
- 开发环境已安装 Node.js 18+、Docker
- 面试展示时可通过 Docker Compose 一键演示
