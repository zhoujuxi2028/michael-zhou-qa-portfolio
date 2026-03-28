# Performance Testing Platform — Requirements（需求文档）

**Issue:** [#17 — New project: Performance Testing Platform (k6/JMeter)](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/17)
**Branch:** `feature/performance-testing`
**Date:** 2026-03-24
**Phase:** 1 of 2

---

## 目录 / Table of Contents

- [1. 目标](#1-目标)
- [2. 用户故事 & Use Cases](#2-用户故事--use-cases)
- [3. Scope 确认](#3-scope-确认)
- [4. 可行性评估](#4-可行性评估)
- [5. 依赖识别](#5-依赖识别)
- [6. 需求 Checklist](#6-需求-checklist)

---

## 1. 目标

构建一个专项性能测试平台，展示 **k6 + JMeter** 双引擎负载测试能力，区别于 microservice-testing-platform 中已有的简单 k6 脚本。

| 维度 | 说明 |
|------|------|
| **定位** | Portfolio 第 10 个项目，填补「性能测试」类别空白 |
| **核心价值** | 展示 load/stress/spike/smoke 4 种测试模式 × 2 引擎（k6 + JMeter）+ 可观测性 |
| **差异化** | microservice 项目的 k6 只有 3 个辅助脚本；本项目是专项平台，含阈值、场景、CI gate、Grafana 可视化、JMeter 企业级测试计划 |

---

## 2. 用户故事 & Use Cases

### 用户故事

| ID    | 角色          | 故事                             | 验收标准                                     |
| ----- | ----------- | ------------------------------ | ---------------------------------------- |
| US-01 | QA Engineer | 我想运行 smoke test 快速验证 API 是否可用  | 2 VUs, 30s, p95 < 500ms, error rate < 1% |
| US-02 | QA Engineer | 我想运行 load test 验证正常流量下的性能      | 50 VUs ramp, 5min, p95 < 500ms           |
| US-03 | QA Engineer | 我想运行 stress test 找到系统极限        | 200 VUs ramp, 观察降级点                      |
| US-04 | QA Engineer | 我想运行 spike test 验证突发流量恢复能力     | 100 VUs 突增, 验证恢复到基线                      |
| US-05 | DevOps      | 我想在 CI 中自动运行 smoke test 作为性能门禁 | CI pipeline 中 k6/JMeter smoke 失败则阻断       |
| US-06 | DevOps      | 我想在 Grafana 中查看测试结果            | Docker Compose 一键启动, 自动加载 dashboard      |
| US-07 | QA Engineer | 我想用 JMeter 运行与 k6 相同的 4 种测试模式 | JMeter smoke/load/stress/spike 与 k6 参数一致 |
| US-08 | QA Engineer | 我想查看 JMeter HTML 测试报告           | `jmeter -g results.jtl -o reports/` 生成报告 |
| US-09 | QA Engineer | 我想在 Grafana 中查看 JMeter 测试结果    | Backend Listener → InfluxDB → Grafana     |

### Use Cases

```
UC-01: 本地快速验证
  Actor: QA Engineer
  前置: npm install, node src/server.js
  步骤: npm run k6:smoke
  结果: 终端输出 k6 摘要, 所有 thresholds PASS

UC-02: 可视化测试分析
  Actor: QA Engineer
  前置: docker compose up -d
  步骤: npm run k6:load:influx
  结果: Grafana dashboard 实时显示 VUs, latency, error rate

UC-03: CI 性能门禁
  Actor: CI Pipeline (GitHub Actions)
  前置: push to feature/performance-testing
  步骤: lint → unit test → k6 smoke test → JMeter smoke test
  结果: smoke 通过则 CI 绿灯, 失败则阻断

UC-04: JMeter 企业级性能测试
  Actor: QA Engineer
  前置: brew install jmeter, node src/server.js
  步骤: npm run jmeter:smoke
  结果: JMeter CLI 输出摘要 + HTML 报告生成

UC-05: JMeter 可视化测试分析
  Actor: QA Engineer
  前置: docker compose up -d
  步骤: npm run jmeter:load:influx
  结果: Grafana JMeter dashboard 实时显示结果
```

---

## 3. Scope 确认

### Phase 1（本次实施）

| 模块 | 内容 | 优先级 |
|------|------|--------|
| Target API | Express CRUD API (products + orders) + SQLite | P0 |
| k6 Scripts | 4 种模式: smoke, load, stress, spike | P0 |
| JMeter Test Plans | 4 种模式: smoke, load, stress, spike（企业级标准） | P0 |
| JMeter Reporting | Backend Listener → InfluxDB + HTML Dashboard Report | P0 |
| Unit Tests | Jest 测试覆盖 API routes + middleware + utils | P0 |
| Docker Compose | API + Grafana + InfluxDB 一键启动 | P0 |
| CI Pipeline | lint → unit test → k6 smoke gate → JMeter smoke gate | P0 |
| Documentation | README, CLAUDE.md, docs/ 标准结构 | P0 |

### Phase 2（未来规划，不在本次 scope）

| 模块 | 内容 |
|------|------|
| Soak Test | 长时间低负载测试 (memory leak 检测) |
| Custom Metrics | 业务指标 (订单成功率, 库存周转) |
| AlertManager | 性能劣化告警 |
| 多服务场景 | 跨服务链路性能测试 |

### 功能边界

| 包含 | 不包含 |
|------|--------|
| k6 脚本 (4 种模式) | 真实外部 API |
| JMeter 测试计划 (4 种模式) + HTML Report | 持久化数据库 (PostgreSQL) |
| Express 目标 API + SQLite 内存数据库 | 云端部署 |
| Grafana + InfluxDB (k6 + JMeter 双引擎) | 其他 CI 平台 |
| GitHub Actions CI (k6 + JMeter smoke gate) | |

---

## 4. 可行性评估

### 本机环境

| 工具 | 状态 | 版本 | 解决方案 |
|------|------|------|----------|
| Node.js | ✅ 已安装 | v25.8.1 | — |
| npm | ✅ 已安装 | 11.11.0 | — |
| Docker | ✅ 已安装 | 29.3.0 | — |
| Docker Compose | ✅ 已安装 | v5.0.2 | — |
| k6 | ❌ 未安装 | — | `brew install k6` |
| JMeter | ❌ 未安装 | — | `brew install jmeter` |
| Grafana | ❌ 未安装 | — | Docker 容器运行 |
| InfluxDB | ❌ 未安装 | — | Docker 容器运行 |

### 技术风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| k6 使用 ES Module 语法 | ESLint 不兼容 | `.eslintignore` 排除 `tests/performance/` |
| 库存耗尽导致 load/stress 测试大量 409 | 测试结果不准确 | 增大种子数据库存 (10,000+) 或添加 reset 端点 |
| SQLite 并发写入限制 | stress test 高并发下可能锁表 | WAL 模式 + 可接受的错误率阈值 |
| CI 环境无 k6 | smoke gate 无法运行 | 使用 `grafana/setup-k6-action@v1` |
| JMeter .jmx 文件体积大 | 不易 review | 参数化外置到 properties 文件，jmx 保持最小化 |
| CI 环境安装 JMeter 慢 | CI 耗时增加 | 使用 `rbhadti94/apache-jmeter-action` 或 Docker 镜像 |

---

## 5. 依赖识别

### 需安装的工具

| 工具 | 安装命令 | 用途 |
|------|----------|------|
| k6 | `brew install k6` | 性能测试执行引擎（轻量级） |
| JMeter | `brew install jmeter` | 性能测试执行引擎（企业级） |

### 需引入的库

| 库 | 版本 | 用途 | 类型 |
|----|------|------|------|
| express | ^4.18.2 | 目标 API 框架 | dependencies |
| better-sqlite3 | ^11.0.0 | 内存数据库 | dependencies |
| jest | ^29.7.0 | 单元测试 | devDependencies |
| supertest | ^6.3.3 | API 测试请求 | devDependencies |
| eslint | ^8.56.0 | 代码检查 | devDependencies |
| eslint-config-prettier | ^9.1.0 | ESLint + Prettier 兼容 | devDependencies |
| prettier | ^3.2.0 | 代码格式化 | devDependencies |

### CI 依赖

| Action | 用途 |
|--------|------|
| `actions/checkout@v4` | 代码检出 |
| `actions/setup-node@v4` | Node.js 环境 |
| `grafana/setup-k6-action@v1` | k6 安装 |
| `actions/upload-artifact@v4` | 覆盖率报告上传 |

---

## 6. 需求 Checklist

| # | 检查项 | 状态 |
|---|--------|------|
| 1 | Issue 已读取，目标明确 | ✅ Issue #17 |
| 2 | 完整用户故事，use cases | ✅ US-01~09, UC-01~05 |
| 3 | Scope 已确认（Phase 划分、功能边界） | ✅ Phase 1/2 + 边界定义 |
| 4 | 可行性评估（本机环境、依赖工具、技术风险） | ✅ 6 项风险已识别 |
| 5 | 依赖已识别（需安装的工具、需引入的库） | ✅ k6 + JMeter + 7 npm 包 + 4 CI Actions |
| 6 | 需求描述已产出 | ✅ 本文档 |
| 7 | 基础文档骨架已创建（CLAUDE.md、README.md、docs/） | ✅ 骨架已创建，收尾阶段完善 |
