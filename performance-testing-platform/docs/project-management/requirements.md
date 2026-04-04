# Performance Testing Platform — Requirements（需求文档）

**Branch:** `feature/performance-testing`

| Issue                                                                      | 描述                                | 日期         |
| -------------------------------------------------------------------------- | --------------------------------- | ---------- |
| [#17](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/17) | 性能测试平台 (k6 + JMeter 双引擎)          | 2026-03-24 |
| [#54](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/54) | 系统指标采集 + 容量测试 (瓶颈定位)              | 2026-03-31 |
| [#56](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/56) | JWT 认证场景性能测试                      | 2026-04-02 |
| [#65](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/65) | Soak Test + 可观测性增强                | 2026-04-02 |
| Phase 5                                                                    | 企业级性能测试模板增强 (多环境/数据驱动/基线回归/报告/告警) | 2026-04-04 |

---

## 目录

| Phase | Issue | 状态 | 章节 |
|-------|-------|------|------|
| **1 — 双引擎性能测试** | [#17](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/17) | ✅ Done | §1.1–1.6 |
| **2 — 系统指标采集 + 容量测试** | [#54](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/54) | ✅ Done | §2.1–2.11 |
| **3 — JWT 认证场景性能测试** | [#56](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/56) | ✅ Done | §3.1–3.9 |
| **4 — Soak Test + 可观测性增强** | [#65](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/65) | ✅ Done | §4.1–4.7 |
| **5 — 企业级性能测试模板增强** | — | 📋 Planned | §5.1–5.7 |

**Phase 1 (#17)**
- [1.1 目标](#11-目标)
- [1.2 用户故事 & Use Cases](#12-用户故事--use-cases)
- [1.3 Scope 确认](#13-scope-确认)
- [1.4 可行性评估](#14-可行性评估)
- [1.5 依赖识别](#15-依赖识别)
- [1.6 需求 Checklist](#16-需求-checklist)

**Phase 2 (#54)**
- [2.1 目标](#21-目标)
- [2.2 用户故事](#22-用户故事)
- [2.3 测试对象](#23-测试对象)
- [2.4 本机环境基线](#24-本机环境基线)
- [2.5 SLA 定义](#25-sla-定义)
- [2.6 测试参数](#26-测试参数)
- [2.7 系统指标采集需求](#27-系统指标采集需求)
- [2.8 期望输出](#28-期望输出)
- [2.9 瓶颈定位决策树](#29-瓶颈定位决策树)
- [2.10 Scope 确认](#210-scope-确认)
- [2.11 需求 Checklist](#211-需求-checklist)

**Phase 3 (#56)**
- [3.1 目标](#31-目标)
- [3.2 用户故事](#32-用户故事)
- [3.3 Use Cases](#33-use-cases)
- [3.4 需求列表](#34-需求列表)
- [3.5 Scope 确认](#35-scope-确认)
- [3.6 可行性评估](#36-可行性评估)
- [3.7 依赖识别](#37-依赖识别)
- [3.8 设计决策](#38-设计决策)
- [3.9 需求 Checklist](#39-需求-checklist)

**Phase 4 (#65)**
- [4.1 目标](#41-目标)
- [4.2 用户故事](#42-用户故事)
- [4.3 需求列表](#43-需求列表)
- [4.4 Scope 确认](#44-scope-确认)
- [4.5 可行性评估](#45-可行性评估)
- [4.6 依赖识别](#46-依赖识别)
- [4.7 需求 Checklist](#47-需求-checklist)

**Phase 5**
- [5.1 目标](#51-目标)
- [5.2 用户故事](#52-用户故事)
- [5.3 需求列表](#53-需求列表)
- [5.4 Scope 确认](#54-scope-确认)
- [5.5 可行性评估](#55-可行性评估)
- [5.6 依赖识别](#56-依赖识别)
- [5.7 需求 Checklist](#57-需求-checklist)

---

## 1.1 目标

构建一个专项性能测试平台，展示 **k6 + JMeter** 双引擎负载测试能力，并通过系统指标采集 + 容量测试定位性能瓶颈。

| 维度 | 说明 |
|------|------|
| **定位** | Portfolio 第 10 个项目，填补「性能测试」类别空白 |
| **Phase 1 核心价值** | smoke/load/stress/spike 4 种测试模式 × 2 引擎 (k6 + JMeter) + CI 门禁 + Grafana 可视化 |
| **Phase 2 核心价值** | Express Cluster (多核) + 系统指标采集 (CPU/mem/disk/net) + 容量测试 (二分法逼近最大并发) + 瓶颈定位 |
| **Phase 3 核心价值** | JWT 认证场景 (register/login/refresh/logout) + 高并发登录压测 + 认证前后性能对比 |
| **差异化** | microservice 项目的 k6 只有 3 个辅助脚本；本项目是专项平台，含阈值、场景、CI gate、HTML 报告、系统指标采集、容量规划 |

---

## 1.2 用户故事 & Use Cases

### 用户故事

#### Phase 1 (#17)

| ID | 角色 | 故事 | 验收标准 |
|---|------|------|---------|
| US-01 | QA Engineer | 我想运行 smoke test 快速验证 API 是否可用 | 5 VUs, 60s, p95 < 500ms, error rate < 1% |
| US-02 | QA Engineer | 我想运行 load test 验证正常流量下的性能 | 50 VUs ramp, 5min, p95 < 2000ms |
| US-03 | QA Engineer | 我想运行 stress test 找到系统极限 | 200 VUs ramp, p95 < 3000ms |
| US-04 | QA Engineer | 我想运行 spike test 验证突发流量恢复能力 | 100 VUs 突增, 验证恢复到基线 |
| US-05 | DevOps | 我想在 CI 中自动运行 smoke test 作为性能门禁 | CI pipeline 中 k6/JMeter smoke 失败则阻断 |
| US-06 | DevOps | 我想在 Grafana 中查看测试结果 | Docker Compose 一键启动, 自动加载 dashboard |
| US-07 | QA Engineer | 我想用 JMeter 运行与 k6 相同的 4 种测试模式 | JMeter smoke/load/stress/spike 与 k6 参数一致 |
| US-08 | QA Engineer | 我想查看 JMeter HTML 测试报告 | `jmeter -g results.jtl -o reports/` 生成报告 |
| US-09 | QA Engineer | 我想在 Grafana 中查看 JMeter 测试结果 | Backend Listener → InfluxDB → Grafana |

#### Phase 2 (#54)

| ID | 角色 | 故事 | 验收标准 |
|---|------|------|---------|
| US-10 | QA Engineer | 我想在性能测试时同步采集服务端 CPU / 内存 / 磁盘 I/O / 网络 I/O | 采集器每秒记录指标到 CSV |
| US-11 | QA Engineer | 我想通过 `/metrics` 端点查看进程级指标 | 返回 CPU usage, memory, event loop lag |
| US-12 | QA Engineer | 我想找到本机环境下 API 的最大并发承载量 | 二分法逼近，输出最大 VUs + 瓶颈层 |
| US-13 | QA Engineer | 我想一条命令完成"采集 + 测试 + 归档" | `npm run capacity:test` 自动启停采集器 |

### Use Cases

```
UC-01: 本地快速验证
  Actor: QA Engineer
  前置: npm install, npm start
  步骤: npm run k6:smoke
  结果: 终端输出 k6 摘要 + reports/k6-smoke.html, 所有 thresholds PASS

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
  前置: brew install jmeter, npm start
  步骤: npm run jmeter:smoke
  结果: JMeter CLI 输出摘要 + HTML 报告生成

UC-05: 容量测试 + 瓶颈定位 (Phase 2)
  Actor: QA Engineer
  前置: npm start (Cluster 模式, 4 Worker)
  步骤: npm run capacity:test
  结果: k6 HTML 报告 + 系统指标 CSV, 确定最大并发数 + 瓶颈层
```

---

## 1.3 Scope 确认

### Phase 1 (#17 — 双引擎性能测试) ✅ Done

| 模块 | 内容 | 优先级 |
|------|------|--------|
| Target API | Express CRUD API (products + orders) + SQLite | P0 |
| k6 Scripts | 4 种模式: smoke, load, stress, spike → HTML 报告 | P0 |
| JMeter Test Plans | 4 种模式: smoke, load, stress, spike（企业级标准）→ HTML 报告 | P0 |
| JMeter Reporting | Backend Listener → InfluxDB + HTML Dashboard Report | P0 |
| Unit Tests | Jest 测试覆盖 API routes + middleware + utils (20 tests) | P0 |
| Docker Compose | API + Grafana + InfluxDB 一键启动 | P0 |
| CI Pipeline | lint → unit test → k6 smoke gate + JMeter smoke gate | P0 |
| Documentation | README, CLAUDE.md, docs/ 标准结构 | P0 |

### Phase 2 (#54 — 系统指标采集 + 容量测试) ✅ Done

| 模块                 | 内容                                 | 需求 ID    |
| ------------------ | ---------------------------------- | -------- |
| Express Cluster 模式 | Master + N Worker (N = CPU 核数)     | SM-10    |
| SQLite 文件模式 + WAL  | 多 Worker 共享 DB，真实磁盘 I/O            | SM-11    |
| `/metrics` 扩展      | 进程级 CPU / 内存 / 事件循环延迟              | SM-01~03 |
| 系统采集器              | CPU% / 内存% / 磁盘 I/O / 网络 I/O → CSV | SM-04~08 |
| npm scripts 集成     | 一条命令采集 + 测试 + 归档                   | SM-09    |
| 容量测试               | 漏斗模型 (60/30/10) + 二分法逼近最大并发        | US-12    |
| 测试质量保障             | 数据膨胀控制 / 预热 / 隔离 / 可重复性            | TQ-01~04 |

### Phase 3 (#56 — JWT 认证场景性能测试) ✅ Done

| 模块 | 内容 | 需求 ID |
|------|------|---------|
| 认证 API | register, login, refresh, logout + JWT 中间件 | AUTH-01~05 |
| 现有接口改造 | POST /api/orders 添加认证保护 (AUTH_ENABLED 开关) | AUTH-06 |
| k6 认证压测 | 高并发登录 + Token 刷新 + 完整用户旅程 | AUTH-07~09 |
| JMeter 认证压测 | 高并发登录测试计划 | AUTH-10 |
| 性能对比 | 带认证 vs 不带认证的性能差异报告 | AUTH-11 |

### Phase 4 (#65 — Soak Test + 可观测性增强) ✅ Done

| 模块 | 内容 | 需求 ID |
|------|------|---------|
| Soak Test | k6 低负载长时间运行 (100~500 VUs, 1~4h), heapUsed 采集 | SOAK-01~03 |
| Custom Metrics | 业务指标 (订单成功率, 认证延迟 p99) → InfluxDB | SOAK-04~05 |
| Grafana Dashboard | heapUsed 趋势面板 + 业务指标面板 | SOAK-06 |
| Grafana AlertManager | 告警规则 (p95 > 500ms, error > 1%, heap 持续增长) | SOAK-07 |
| npm scripts | `k6:soak` / `k6:soak:full` / `k6:soak:influx` | SOAK-08 |
| 单元测试 | metrics 端点 + 泄漏检测逻辑 | SOAK-09 |

### 功能边界

| 包含 | 不包含 |
|------|--------|
| k6 脚本 (4 种模式) + HTML 报告 | 真实外部 API |
| JMeter 测试计划 (4 种模式) + HTML Report | 持久化数据库 (PostgreSQL) |
| Express Cluster 模式 (多核) | 云端部署 |
| SQLite 文件模式 + WAL (真实磁盘 I/O) | 其他 CI 平台 |
| 系统指标采集 (CPU/mem/disk/net → CSV) | Prometheus 集成 |
| 容量测试 (二分法逼近) | 分布式采集 |
| 测试质量保障 (预热/隔离/重复性) | 分布式 k6 / JMeter |
| Grafana + InfluxDB (k6 + JMeter 双引擎) | OAuth2 / SSO / 第三方登录 |
| GitHub Actions CI (k6 + JMeter smoke gate) | Redis session store |
| JWT 认证 API + 认证压测 (k6 + JMeter) | PagerDuty / Slack 告警集成 |
| Soak Test (1~4h 内存泄漏检测) | CI 中跑 soak (太耗时) |
| Custom Metrics → InfluxDB + Grafana 可视化 | |
| Grafana AlertManager 告警规则 | |

---

## 1.4 可行性评估

### 本机环境

| 工具 | 状态 | 版本 | 解决方案 |
|------|------|------|---------|
| Node.js | ✅ 已安装 | v25.8.1 | — |
| npm | ✅ 已安装 | 11.11.0 | — |
| Docker | ✅ 已安装 | 29.3.0 | — |
| Docker Compose | ✅ 已安装 | v5.0.2 | — |
| k6 | ✅ 已安装 | v1.7.0 | `brew install k6` |
| JMeter | ✅ 已安装 | 5.6.3 | `brew install jmeter` |
| Grafana | ✅ Docker | 10.2.0 | `docker compose up` |
| InfluxDB | ✅ Docker | 1.8 | `docker compose up` |

### 本机硬件基线

| 项目 | 规格 |
|------|------|
| 硬件 | MacBook Pro 13″ 2020 (MacBookPro16,2) |
| CPU | Intel Core i5-1038NG7 @ 2.00GHz, 4 核 8 线程 (HT) |
| L2 Cache | 512 KB / core |
| L3 Cache | 6 MB |
| 内存 | 16 GB DDR4 |
| 磁盘 | 466 GB SSD (约 58 GB 可用) |
| OS | macOS 26.3.1 (Build 25D2128) |

### 技术风险

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| k6 使用 ES Module 语法 | ESLint 不兼容 | `.eslintignore` 排除 `tests/performance/` |
| 库存耗尽导致 load/stress 测试大量 409 | 测试结果不准确 | 种子数据库存 100,000 + 每轮重建 DB (TQ-01) |
| SQLite 并发写入限制 | Cluster 模式下写锁竞争 | WAL 模式 + 这正是要观测的 I/O 瓶颈 |
| CI 环境无 k6 | smoke gate 无法运行 | 使用 `grafana/setup-k6-action@v1` |
| JMeter .jmx 文件体积大 | 不易 review | 参数化外置到 properties 文件 |
| Cluster 模式下 `:memory:` DB 不共享 | 多 Worker 数据隔离 | 改为 SQLite 文件模式 (SM-11) |
| 冷启动影响 p95 统计 | 容量测试结果不准确 | 预热 30s (TQ-02) |

---

## 1.5 依赖识别

### 需安装的工具

| 工具 | 安装命令 | 用途 |
|------|---------|------|
| k6 | `brew install k6` | 性能测试执行引擎（轻量级） |
| JMeter | `brew install jmeter` | 性能测试执行引擎（企业级） |

### 需引入的库

| 库 | 版本 | 用途 | 类型 |
|----|------|------|------|
| express | ^4.18.2 | 目标 API 框架 | dependencies |
| better-sqlite3 | ^11.0.0 | SQLite 数据库 (Phase 1 内存模式, Phase 2 文件模式) | dependencies |
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
| `actions/upload-artifact@v4` | 覆盖率/测试报告上传 |

---

## 1.6 需求 Checklist

| # | 检查项 | 状态 |
|---|--------|------|
| 1 | Issue 已读取，目标明确 | ✅ Issue #17 |
| 2 | 完整用户故事，use cases | ✅ US-01~09, UC-01~04 |
| 3 | Scope 已确认（Phase 划分、功能边界） | ✅ Phase 1/2/3 + 边界定义 |
| 4 | 可行性评估（本机环境、依赖工具、技术风险） | ✅ 7 项风险已识别 |
| 5 | 依赖已识别（需安装的工具、需引入的库） | ✅ k6 + JMeter + 7 npm 包 + 4 CI Actions |
| 6 | 需求描述已产出 | ✅ 本文档 |
| 7 | 基础文档骨架已创建 | ✅ 骨架已创建，Phase 1 收尾阶段已完善 |

---

## Issue #54 — 系统指标采集 + 容量测试

### 2.1 目标

在本机环境下，通过 Express Cluster (多核) + 阶梯递增 + 系统指标采集，找到电商 API 的**最大并发承载量**及**瓶颈层** (CPU / Memory / I/O / Network)。

### 2.2 用户故事

见 [§1.2 用户故事 Phase 2](#12-用户故事--use-cases)

### 2.3 测试对象

电商 API 漏斗模型：

| 操作 | API | 流量权重 | 业务含义 | 数据库操作 |
|------|-----|---------|---------|-----------|
| 浏览商品列表 | `GET /api/products` | 60% | 读操作，高频 | SQLite 读 (SELECT + COUNT) |
| 查看商品详情 | `GET /api/products/:id` | 30% | 读操作，高频 | SQLite 读 (SELECT by id) |
| 下单购买 | `POST /api/orders` | 10% | 写操作，库存扣减 + 订单创建 | SQLite 写 (UPDATE + INSERT 事务) + 50ms delay |

> `/health` 是运维心跳，不在性能测试范围。

### 2.4 本机环境基线

见 [§1.4 本机硬件基线](#本机硬件基线)

### 2.5 SLA 定义

| 指标 | 阈值 | 含义 |
|------|------|------|
| p95 | < 500ms | 95% 请求延迟在可接受范围 |
| error rate | < 1% | 几乎无错误 |
| throughput | 持续增长 | 系统未饱和 |

**违反任一条件 → 该并发级别为系统上限**

### 2.6 测试参数

| 参数 | 值 |
|------|-----|
| 流量模型 | 浏览列表 60% + 查看详情 30% + 下单 10% |
| Think Time | 0.5s ~ 1s |
| 测试数据 | 5 个商品 (id 1~5), 库存 100,000 each |
| 阶梯策略 | **二分法逼近** — 初始范围 10~200 VUs，每级持稳 60s，PASS→提高下限，FAIL→降低上限，逐步收敛。具体阶梯值待首轮测试后根据实际数据确定 |
| 终止条件 | error rate > 5% 或 p95 > 2000ms → 停止递增 |

### 2.7 系统指标采集需求

| ID | 需求 | 采集数据 | 用途 |
|---|------|---------|------|
| SM-01 | 进程级 CPU | `process.cpuUsage()`, `os.loadavg()` | 判断 CPU-bound |
| SM-02 | 进程级内存 | `process.memoryUsage()`, `os.totalmem()/freemem()` | 判断 memory-bound |
| SM-03 | 事件循环延迟 | event loop lag (ms) | Node.js 阻塞信号 |
| SM-04 | 系统 CPU% | user/system/idle | 整机 vs 进程饱和 |
| SM-05 | 系统内存% | used/free/available | 整机内存压力 |
| SM-06 | 磁盘 I/O | read/write bytes/s | SQLite 写入瓶颈 |
| SM-07 | 网络 I/O | rx/tx bytes/s | 带宽饱和 |
| SM-08 | 数据输出 | CSV → `reports/system-metrics-*.csv` | 事后分析归档 |
| SM-09 | 测试集成 | npm scripts 自动启停采集器 | 一条命令完成采集+测试+归档 |

#### 2.7.1 服务端多核支持

| ID | 需求 | 说明 |
|---|------|------|
| SM-10 | Express Cluster 模式 | Master + N Worker (N = CPU 核数)，充分利用多核 |
| SM-11 | SQLite 文件模式 + WAL | Cluster 多 Worker 共享 DB 文件，WAL 支持并发读，写锁竞争为真实 I/O 瓶颈 |

#### 2.7.2 测试质量保障需求

| ID | 需求 | 说明 | 为什么重要 |
|---|------|------|-----------|
| TQ-01 | 数据膨胀控制 | 每轮容量测试前重建 DB (重启服务) | POST /api/orders 不断插入，orders 表持续增长 → SQLite 文件变大 → 后期 I/O 劣化，干扰瓶颈定位 |
| TQ-02 | 预热 (Warm-up) | 容量测试前跑 30s 预热，预热期数据不纳入 SLA 判定 | 冷启动首次请求慢 (DB 连接建立、JIT 编译)，影响 p95 统计准确性 |
| TQ-03 | 测试隔离 | 每轮二分法测试之间重启服务 (重建 DB + 清空状态) | 上一轮残留的 orders 数据和内存状态影响下一轮结果 |
| TQ-04 | 结果可重复性 | 关键轮次 (拐点附近) 跑 2~3 次取中值 | 单次结果可能有波动，多次验证确保结论可靠 |

### 2.8 期望输出

1. **最大并发数** — 满足 SLA 的最高 VUs (Cluster 模式, 4 核)
2. **瓶颈层** — CPU / Memory / I/O / Network
3. **容量报告** — 阶梯结果表 + 系统指标趋势 → `reports/` 归档

### 2.9 瓶颈定位决策树

```
p95 升高或吞吐下降
    │
    ├─ event loop lag > 10ms? ──→ CPU-bound (Node.js 阻塞)
    │     └─ 验证: CPU user% 高, loadavg > cores
    │
    ├─ heapUsed 持续增长? ──→ Memory-bound (GC/泄漏)
    │     └─ 验证: os.freemem 下降, rss 增长
    │
    ├─ disk write bytes/s 高? ──→ I/O-bound (SQLite 写入)
    │     └─ 验证: 与 POST /api/orders 并发量正相关
    │
    └─ network rx/tx 接近带宽上限? ──→ Network-bound
          └─ 验证: 响应体大时更明显
```

### 2.10 Scope 确认

见 [§1.3 功能边界](#功能边界) — Phase 2 部分已合并到统一的功能边界表。

### 2.11 需求 Checklist

| # | 检查项 | 状态 |
|---|--------|------|
| 1 | Issue 已读取，目标明确 | ✅ Issue #54 |
| 2 | 完整用户故事 | ✅ US-10~13, UC-05 |
| 3 | 测试对象已明确 (3 个 API, 漏斗模型) | ✅ |
| 4 | 本机环境基线已采集 | ✅ i5-1038NG7, 4C8T, 16GB, SSD |
| 5 | SLA 定义已明确 | ✅ p95<500ms, error<1%, throughput↑ |
| 6 | 测试参数已明确 (二分法 + think time) | ✅ |
| 7 | 系统指标需求已编号 (SM-01~09) | ✅ |
| 8 | 服务端多核支持 (SM-10~11) | ✅ Cluster + SQLite 文件模式 |
| 9 | 测试质量保障需求 (TQ-01~04) | ✅ 数据膨胀/预热/隔离/可重复性 |
| 10 | 磁盘 I/O 可观测 (SQLite 文件模式) | ✅ `:memory:` → 文件模式，SM-06 有实际数据 |
| 11 | 需求描述已产出 | ✅ 本文档 + Issue #54 |

---

## Issue #56 — JWT 认证场景性能测试

### 3.1 目标

为电商 API 添加 JWT 认证层，测试高并发下登录/Token 刷新/鉴权链路的性能表现，并与无认证场景进行对比。

| 维度 | 说明 |
|------|------|
| 业务场景 | 企业门户高并发认证 — 登录 / Token 刷新 / 鉴权 |
| 技术价值 | bcrypt CPU 密集型操作对 event loop 瓶颈的放大效应 (延续 Phase 2 CPU-bound 结论) |
| Portfolio 价值 | 补全"身份认证类业务性能测试"场景覆盖 |

### 3.2 用户故事

| ID | 角色 | 故事 | 验收标准 |
|-----|------|------|---------|
| US-14 | QA Engineer | 我需要一套认证 API，以便在性能测试中覆盖登录/鉴权场景 | 4 个认证接口可用 (register/login/refresh/logout) |
| US-15 | QA Engineer | 我需要测试高并发登录的性能表现 | login 在 500 VUs 下 p95 < 500ms, error < 1% |
| US-16 | QA Engineer | 我需要测试 Token 刷新的性能表现 | refresh 在 200 VUs 下 p95 < 200ms |
| US-17 | QA Engineer | 我需要测试完整用户旅程 (登录→浏览→下单) 的端到端性能 | login → browse → order 完整链路 load test 通过阈值 |
| US-18 | QA Engineer | 我需要对比认证前后的性能差异 | 输出对比报告：带认证 vs 不带认证 |

### 3.3 Use Cases

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

### 3.4 需求列表

#### 后端需求

| ID | 需求 | 说明 |
|-----|------|------|
| AUTH-01 | 用户注册接口 | `POST /api/auth/register` — bcryptjs 哈希密码 (10 rounds), 存入 SQLite users 表 |
| AUTH-02 | 用户登录接口 | `POST /api/auth/login` — 验证密码, 返回 Access Token (15min) + Refresh Token (7d) |
| AUTH-03 | Token 刷新接口 | `POST /api/auth/refresh` — 验证 Refresh Token, 签发新 Access Token |
| AUTH-04 | 用户登出接口 | `POST /api/auth/logout` — 将 Token 加入黑名单表 |
| AUTH-05 | JWT 验证中间件 | `src/middleware/authenticate.js` — 验证 Bearer token, 检查黑名单, 注入 `req.user` |
| AUTH-06 | 现有接口认证保护 | `POST /api/orders` 添加认证保护; 环境变量 `AUTH_ENABLED` 开关 (默认关闭), 保持向后兼容 |

#### 性能测试需求

| ID | 需求 | 说明 |
|-----|------|------|
| AUTH-07 | k6 高并发登录压测 | `tests/performance/auth-load.k6.js` — setup() 批量注册, default() 并发 login + 带 token 请求 |
| AUTH-08 | k6 Token 刷新压测 | 200 VUs 并发 refresh, 验证 p95 < 200ms |
| AUTH-09 | k6 完整用户旅程 | login → browse → detail → order 完整认证链路 load test |
| AUTH-10 | JMeter 高并发登录 | `tests/jmeter/auth-load.jmx` — Login Sampler + JSON Extractor + HTTP Header Manager |
| AUTH-11 | 性能对比报告 | 带认证 vs 不带认证的 p95 / 吞吐量 / error rate 对比 |

### 3.5 Scope 确认

| 范围 | 包含 | 不包含 |
|------|------|--------|
| 认证方式 | JWT (HS256) + bcryptjs | OAuth2, SSO, 第三方登录 |
| 数据存储 | SQLite users 表 + token 黑名单表 | Redis session store |
| 密码哈希 | bcryptjs (纯 JS, 10 rounds) | argon2 (需编译) |
| 接口保护 | POST /api/orders (可选开关) | GET /api/products 保持公开 |
| k6 | 认证专项脚本 + 现有脚本改造 | 分布式 k6 |
| JMeter | 高并发登录测试计划 | 分布式 JMeter |

### 3.6 可行性评估

| 维度 | 评估 | 风险等级 |
|------|------|---------|
| 本机环境 | Node.js 25 + SQLite — 完全支持 | 无 |
| bcryptjs CPU 开销 | 10 rounds ≈ 100ms/次, CPU 密集型, 会加剧 event loop 瓶颈 | **中** — 这正是测试要发现的性能差异 |
| SQLite token 黑名单 | logout 写入黑名单表, 高并发下可能遇到 WAL 写锁 | **低** — Phase 2 已验证 WAL 在 6000 VUs 下 error=0% |
| JWT 签名/验证 | HS256 对称加密, CPU 开销极低 (~0.1ms) | 无 |
| 现有测试兼容 | `AUTH_ENABLED` 环境变量开关, 默认关闭 | **低** — 现有脚本无需改动即可运行 |

### 3.7 依赖识别

| 依赖 | 类型 | 版本 | 用途 |
|------|------|------|------|
| `jsonwebtoken` | npm 新增 | ^9.0.0 | JWT 签发/验证 |
| `bcryptjs` | npm 新增 | ^2.4.3 | 密码哈希 (纯 JS, 无需编译) |

### 3.8 设计决策

| 决策项 | 决定 | 理由 |
|--------|------|------|
| 兼容性方案 | `AUTH_ENABLED` 环境变量, 默认关闭 | 保持向后兼容, 现有 Phase 1/2 脚本和 CI 不受影响 |
| bcrypt rounds | 10 (业界默认) | 真实系统不会为性能降低安全标准, 测试应反映真实情况 |
| Token 过期时间 | Access 15min / Refresh 7d | 业界标准; 压测单次 < 15min 不会真正过期, 但需测试 refresh 场景 |
| Token 黑名单存储 | SQLite 表 | 复用现有 DB, 无需引入 Redis |

### 3.9 需求 Checklist

| # | 检查项 | 状态 |
|---|--------|------|
| 1 | Issue 已读取，目标明确 | ✅ Issue #56 |
| 2 | 完整用户故事 | ✅ US-14~18, UC-06~09 |
| 3 | Scope 已确认 | ✅ JWT 认证, 不含 OAuth2/SSO |
| 4 | 可行性评估 | ✅ 5 项评估, bcrypt CPU 开销为中风险 |
| 5 | 依赖已识别 | ✅ jsonwebtoken + bcryptjs |
| 6 | 需求已编号 | ✅ AUTH-01~11 |
| 7 | 需求描述已写入 requirements.md | ✅ 本文档 §3.1~3.8 |
| 8 | 设计决策已记录 | ✅ 兼容性方案 A + bcrypt 10 + Token 15min/7d |

---

## Phase 4: Soak Test + 可观测性增强 (#65)

### 4.1 目标

长时间低负载运行 (1~4h)，检测**内存泄漏、连接泄漏、DB 膨胀**等稳定性问题，并通过 Custom Metrics + Grafana AlertManager 增强可观测性。

| 维度 | 说明 |
|------|------|
| **定位** | Phase 4 — 稳定性验证 + 可观测性增强 |
| **核心能力** | Soak Test (长时间低负载) + 内存泄漏检测 + 业务指标可视化 + 告警 |
| **验收标准** | soak 4h 运行完成，heapUsed 无持续增长；Grafana 可视化趋势；告警规则在阈值突破时触发 |

### 4.2 用户故事

| ID | 用户故事 |
|----|----------|
| US-19 | 作为性能工程师，我想执行 1~4 小时 soak test，以便发现长时间运行才暴露的内存泄漏 |
| US-20 | 作为性能工程师，我想在 k6 中采集 heapUsed 趋势，以便判断是否存在内存持续增长 |
| US-21 | 作为性能工程师，我想将业务指标 (订单成功率、认证延迟 p99) 导入 InfluxDB，以便在 Grafana 统一查看 |
| US-22 | 作为性能工程师，我想设置 Grafana 告警规则，以便 p95 > 500ms / error > 1% / heap 持续增长时自动告警 |

### 4.3 需求列表

| ID | 需求 | 优先级 |
|----|------|--------|
| SOAK-01 | 新增 `/api/metrics` 端点，返回 `process.memoryUsage()` (heapUsed, heapTotal, rss, external) | P0 |
| SOAK-02 | k6 soak test 脚本: 100~500 VUs, ramp-up → steady (1~4h) → ramp-down, 定期采集 `/api/metrics` | P0 |
| SOAK-03 | 内存泄漏检测逻辑: 对比 soak 开始/结束 heapUsed，增长超阈值 (>50%) 则标记 FAIL | P0 |
| SOAK-04 | Custom k6 metrics: 订单成功率 (Counter)、认证延迟 p99 (Trend) | P1 |
| SOAK-05 | InfluxDB 输出: k6 `--out influxdb` 将 custom metrics 写入 InfluxDB | P1 |
| SOAK-06 | Grafana Dashboard 扩展: heapUsed 趋势面板、业务指标面板 | P1 |
| SOAK-07 | Grafana 告警规则: p95 > 500ms, error rate > 1%, heapUsed 持续增长 | P2 |
| SOAK-08 | npm script: `npm run k6:soak` (短时 soak) + `npm run k6:soak:full` (完整 4h) | P0 |
| SOAK-09 | 单元测试: metrics 端点、泄漏检测逻辑的单元测试 | P0 |
| SOAK-10 | soak test 报告: 生成 HTML/JSON 报告到 `reports/` 目录 | P2 |

### 4.4 Scope 确认

| 模块 | In Scope | Out of Scope |
|------|----------|--------------|
| **Soak Test** | k6 脚本 (100~500 VUs, 1~4h), heapUsed 采集, 泄漏检测 | 分布式 k6 (多节点) |
| **Custom Metrics** | 业务指标 (订单成功率, auth latency p99) → InfluxDB | Prometheus 集成 |
| **AlertManager** | Grafana 告警规则 (p95, error rate, heap) | PagerDuty/Slack 告警集成 |
| **单元测试** | 新模块的单元测试 | CI 中跑 soak (太耗时) |

### 4.5 可行性评估

| 维度 | 评估 | 结论 |
|------|------|------|
| 本机环境 | 8 CPU, 16 GB RAM, 59 GB 磁盘 | ✅ 满足 soak test 需求 |
| 工具链 | Node.js v25.8.1, k6 v1.7.0, JMeter | ✅ 全部就绪 |
| InfluxDB | Phase 1 已配置 (port 8086) | ✅ 可复用 |
| Grafana | Phase 1 已配置 (port 3010) | ✅ 可复用 |
| heapUsed 采集 | 需新增 `/api/metrics` 端点暴露 `process.memoryUsage()` | ✅ 简单实现 |
| 时间风险 | soak test 本身耗时 1~4h, CI 中不可行 | ⚠️ CI 仅跑 smoke, soak 本地手动 |
| DB 膨胀风险 | 长时间 orders 写入会膨胀 perf.db | ⚠️ 需内置清理或限速策略 |

### 4.6 依赖识别

| 依赖 | 说明 | 状态 |
|------|------|------|
| Express API (src/app.js) | `/api/metrics` 端点 | ✅ 已完成 |
| InfluxDB | 写入 custom metrics | ✅ 已有 |
| Grafana | Dashboard + Alert rules | ✅ 已扩展 |
| k6 | soak test 脚本 | ✅ 已完成 |
| scripts/server.sh | soak 模式复用现有 start/stop | ✅ 无需改动 |

### 4.7 需求 Checklist

| # | 检查项 | 状态 |
|---|--------|------|
| 1 | Issue 已读取，目标明确 | ✅ Issue #65 |
| 2 | 完整用户故事 | ✅ US-19~22 |
| 3 | Scope 已确认 | ✅ Soak + Custom Metrics + AlertManager |
| 4 | 可行性评估 | ✅ 7 项评估, DB 膨胀 + CI 时间为中风险 |
| 5 | 依赖已识别 | ✅ 5 项依赖 |
| 6 | 需求已编号 | ✅ SOAK-01~10 |
| 7 | 需求描述已写入 requirements.md | ✅ 本文档 §4.1~4.6 |

---

## Phase 5 — 企业级性能测试模板增强

> 来源: Postmortem 后对标企业性能测试平台最佳实践，识别差距并持续补全

### 5.1 目标

将性能测试平台从「Portfolio 演示项目」提升为「企业级性能测试模板」，补全 14 个维度的企业能力。

| 维度 | 当前状态 | 目标状态 |
|------|---------|---------|
| 环境管理 | 锁定 localhost | dev/staging/prod 配置切换 |
| 测试数据 | 5 条硬编码商品 | CSV 参数化 + SharedArray 动态加载 |
| 负载配置 | 每个脚本重复定义 stages | 集中管理可复用 profiles |
| 基线回归 | CI 仅 pass/fail | 对比历史基线，检测性能退化 |
| 报告 | HTML + Grafana | 新增执行摘要报告（Markdown） |
| 告警 | Grafana 面板无通知渠道 | webhook 通知 |
| k6 一致性 | 脚本间 assertions/sleep/funnel 逻辑重复 | 统一 helpers，消除重复代码 |
| 崩溃测试 | 只有安全上限 (capacity) | 新增 breakpoint test 找绝对崩溃点 |
| 开发者体验 | 无 .env.example，缺 setup/clean 脚本 | 一条命令初始化 + 清理 |
| CI 覆盖率 | 覆盖率仅本地查看 | CI 强制门禁 + artifact 归档 |
| Grafana 面板 | 基础 k6/JMeter/soak 面板 | 补充错误分布 + 延迟热力图 + 自定义指标 |
| 定时调度 | 仅手动触发测试 | CI cron nightly soak + weekly capacity，自动归档 |
| 历史趋势 | 单次 baseline 对比 | 多次运行趋势可视化，渐进退化预警 |
| 限流/熔断 | 无弹性工程测试 | rate limiter + 熔断恢复行为验证 |

### 5.2 用户故事

| ID    | 用户故事                                                                    | 关联需求            |
| ----- | ----------------------------------------------------------------------- | --------------- |
| US-23 | 作为性能工程师，我想通过 `--env staging` 切换目标环境，以便在不同环境执行相同测试                       | ENT-ENV         |
| US-24 | 作为性能工程师，我想从 CSV 文件加载测试数据（用户/商品），以便模拟真实业务数据分布                            | ENT-DATA        |
| US-25 | 作为性能工程师，我想复用统一的负载配置（如 "standard-load", "peak-traffic"），以便跨脚本保持一致        | ENT-PROFILE     |
| US-26 | 作为性能工程师，我想在 CI 中自动对比当前 p95 与历史基线，以便在性能退化时阻断合并                           | ENT-BASELINE    |
| US-27 | 作为性能工程师，我想在测试结束后自动生成执行摘要（SLA 达标率、关键指标、对比），以便给管理层汇报                      | ENT-REPORT      |
| US-28 | 作为性能工程师，我想在 Grafana 告警触发时收到 webhook 通知，以便及时响应性能问题                       | ENT-ALERT       |
| US-29 | 作为性能工程师，我想所有 k6 脚本使用一致的 assertions 和 sleep 模式，以便降低维护成本和减少 copy-paste 错误 | ENT-CONSISTENCY |
| US-30 | 作为性能工程师，我想找到系统的绝对崩溃点（而非安全上限），以便了解系统的极限行为                                | ENT-BREAKPOINT  |
| US-31 | 作为新加入的开发者，我想通过 `npm run setup` 一条命令完成环境初始化，以便快速上手项目                     | ENT-DX          |
| US-32 | 作为性能工程师，我想在 CI 中强制覆盖率门禁，以便防止测试覆盖率退化                                     | ENT-COVERAGE    |
| US-33 | 作为性能工程师，我想在 Grafana 中查看错误分布和延迟热力图，以便快速定位性能瓶颈                            | ENT-DASHBOARD   |
| US-34 | 作为性能工程师，我想设置定时调度自动运行 nightly soak 和 weekly capacity test，以便持续监控系统稳定性 | ENT-SCHEDULE |
| US-35 | 作为性能工程师，我想查看最近 N 次运行的性能趋势，以便发现渐进退化 | ENT-TREND |
| US-36 | 作为性能工程师，我想测试 API 限流和熔断行为，以便验证系统的弹性工程能力 | ENT-RESILIENCE |

### 5.3 需求列表

#### 5.3.1 多环境配置（ENT-ENV）

| ID | 需求 | 优先级 | 工作量 |
|----|------|--------|--------|
| ENT-ENV-01 | 创建 `env/` 目录，含 `local.env` / `staging.env` / `production.env`，定义 BASE_URL / AUTH_ENABLED / DB 等变量 | P0 | 小 |
| ENT-ENV-02 | k6 环境加载器: `helpers/env.js` 解析环境文件，导出配置对象；k6 通过 `--env ENV=staging` 切换 | P0 | 小 |
| ENT-ENV-03 | JMeter 环境适配: 对应 `config/staging.properties` / `config/production.properties`，通过 `-q` 加载 | P1 | 小 |

#### 5.3.2 测试数据参数化（ENT-DATA）

| ID | 需求 | 优先级 | 工作量 |
|----|------|--------|--------|
| ENT-DATA-01 | 创建 `data/users.csv` + `data/products.csv`，k6 用 SharedArray + papaparse 加载 | P0 | 小 |
| ENT-DATA-02 | k6 数据驱动改造: smoke/load/stress 脚本从 CSV 读取商品 ID 和用户凭证，替代硬编码 | P1 | 中 |

#### 5.3.3 负载配置集中管理（ENT-PROFILE）

| ID | 需求 | 优先级 | 工作量 |
|----|------|--------|--------|
| ENT-PROFILE-01 | 创建 `profiles/` 目录，含 `smoke.json` / `load.json` / `stress.json` / `spike.json` / `peak.json`，定义 stages + thresholds | P1 | 小 |
| ENT-PROFILE-02 | k6 脚本改造: import profile 替代内联 stages 定义，实现跨脚本配置复用 | P1 | 小 |

#### 5.3.4 性能基线回归（ENT-BASELINE）

| ID | 需求 | 优先级 | 工作量 |
|----|------|--------|--------|
| ENT-BASELINE-01 | CI 性能基线存储: smoke gate 运行后将 p95 / error rate / throughput 存为 JSON artifact | P1 | 中 |
| ENT-BASELINE-02 | 基线回归检测: CI 下载上次 baseline artifact，对比当前 p95，退化 >20% 则 warning，>50% 则 fail | P1 | 中 |

#### 5.3.5 执行摘要报告（ENT-REPORT）

| ID | 需求 | 优先级 | 工作量 |
|----|------|--------|--------|
| ENT-REPORT-01 | `scripts/generate-summary.sh` 解析 k6 JSON output，生成 Markdown 摘要（SLA 达标率、Top 5 慢接口、对比基线） | P2 | 中 |

#### 5.3.6 Grafana 告警通知（ENT-ALERT）

| ID | 需求 | 优先级 | 工作量 |
|----|------|--------|--------|
| ENT-ALERT-01 | `docker-compose.yml` 增加 Grafana webhook notifier 配置，告警触发时 POST 到指定 URL | P2 | 小 |

#### 5.3.7 单元测试（ENT-TEST）

| ID | 需求 | 优先级 | 工作量 |
|----|------|--------|--------|
| ENT-TEST-01 | env loader 单元测试: 解析 env 文件、缺失文件兜底、变量覆盖 | P0 | 小 |
| ENT-TEST-02 | CSV 加载单元测试: SharedArray 加载、空文件处理、字段校验 | P0 | 小 |
| ENT-TEST-03 | profile 解析单元测试: JSON 加载、缺失 profile 报错、stages 格式校验 | P0 | 小 |
| ENT-TEST-04 | 基线对比单元测试: 回归检测阈值判定、首次运行无 baseline 兜底 | P1 | 小 |

#### 5.3.8 k6 脚本一致性重构（ENT-CONSISTENCY）

| ID | 需求 | 优先级 | 工作量 |
|----|------|--------|--------|
| ENT-CONSISTENCY-01 | 统一所有 k6 脚本的 HTTP 断言方式：全部使用 `checkStatus()` helper，替代直接 `check()` 调用 | P1 | 小 |
| ENT-CONSISTENCY-02 | 统一 sleep/think time 模式：提取 `helpers/thinkTime.js`，标准化 `sleep(randomIntBetween(0.5, 1))` | P1 | 小 |
| ENT-CONSISTENCY-03 | 提取漏斗逻辑到 `helpers/funnel.js`：60% browse → 30% detail → 10% order，消除 load/stress/capacity/soak 中的重复代码 | P1 | 中 |
| ENT-CONSISTENCY-04 | 所有标准测试脚本 (smoke/load/stress/spike) 添加 health check 前置验证 | P2 | 小 |

#### 5.3.9 Breakpoint Test（ENT-BREAKPOINT）

| ID | 需求 | 优先级 | 工作量 |
|----|------|--------|--------|
| ENT-BREAKPOINT-01 | 新增 `breakpoint.k6.js`：持续递增 VUs 直到系统崩溃（error rate > 50% 或完全不响应），记录崩溃点 VUs 和崩溃行为 | P2 | 中 |
| ENT-BREAKPOINT-02 | 崩溃行为分类：区分 graceful degradation（渐进退化）vs catastrophic failure（级联崩溃） | P2 | 小 |

> 注: Breakpoint Test 与 Capacity Test 的区别 — Capacity 找安全上限 (SLA 不违反)，Breakpoint 找绝对崩溃点 (系统不可用)。

#### 5.3.10 开发者体验改进（ENT-DX）

| ID | 需求 | 优先级 | 工作量 |
|----|------|--------|--------|
| ENT-DX-01 | 创建 `.env.example` 文件，列出所有环境变量及默认值 | P1 | 小 |
| ENT-DX-02 | 新增 npm scripts: `setup` (install + lint + test)、`clean` (清理 reports/data/coverage)、`health` (preflight + test) | P1 | 小 |
| ENT-DX-03 | 新增 npm script: `dev` (NODE_ENV=development 启动，watch mode) | P2 | 小 |

#### 5.3.11 CI 覆盖率门禁（ENT-COVERAGE）

| ID | 需求 | 优先级 | 工作量 |
|----|------|--------|--------|
| ENT-COVERAGE-01 | `performance-ci.yml` unit-test job 添加 `--coverage` 参数，生成覆盖率报告 | P1 | 小 |
| ENT-COVERAGE-02 | 上传 coverage 报告为 CI artifact (`actions/upload-artifact`) | P1 | 小 |
| ENT-COVERAGE-03 | Jest 覆盖率阈值 (statements ≥80%, branches ≥70%, functions ≥80%, lines ≥80%) 在 CI 中强制执行，低于阈值则 fail | P1 | 小 |

#### 5.3.12 Grafana 面板补充（ENT-DASHBOARD）

| ID | 需求 | 优先级 | 工作量 |
|----|------|--------|--------|
| ENT-DASHBOARD-01 | 新增「错误分布」面板：按 endpoint 分组的 error rate 时序图 | P2 | 小 |
| ENT-DASHBOARD-02 | 新增「延迟热力图」面板：请求延迟分布的 heatmap 可视化 | P2 | 小 |
| ENT-DASHBOARD-03 | 新增「自定义指标聚合」面板：soak_heap_used_mb、soak_event_loop_lag、soak_order_success 趋势 | P2 | 小 |

#### 5.3.13 定时调度测试（ENT-SCHEDULE）

| ID | 需求 | 优先级 | 工作量 |
|----|------|--------|--------|
| ENT-SCHEDULE-01 | GitHub Actions cron workflow: nightly soak-short (10m) + weekly capacity test，自动归档结果 | P2 | 中 |
| ENT-SCHEDULE-02 | 测试结果自动归档: 每次调度运行的 k6 JSON output 存为 CI artifact，保留 30 天 | P2 | 小 |

#### 5.3.14 测试结果历史趋势（ENT-TREND）

| ID | 需求 | 优先级 | 工作量 |
|----|------|--------|--------|
| ENT-TREND-01 | 趋势数据收集: 每次 CI 运行提取 p95/throughput/error rate 追加到 `reports/trend.json` | P2 | 中 |
| ENT-TREND-02 | 趋势可视化: `scripts/generate-trend.sh` 从 trend.json 生成 Markdown 趋势表（最近 N 次运行的指标对比） | P2 | 中 |
| ENT-TREND-03 | Grafana 趋势面板: 历史 p95 / throughput 折线图（从 InfluxDB 聚合） | P3 | 小 |

> 注: ENT-BASELINE 是单次对比（当前 vs 上次），ENT-TREND 是多次趋势（最近 N 次运行的走势）。

#### 5.3.15 API 限流/熔断测试（ENT-RESILIENCE）

| ID | 需求 | 优先级 | 工作量 |
|----|------|--------|--------|
| ENT-RESILIENCE-01 | Rate limiter 中间件: Express 添加 `express-rate-limit`，可配置 windowMs + max requests | P1 | 小 |
| ENT-RESILIENCE-02 | k6 限流测试脚本: `rate-limit.k6.js` 验证超限返回 429、窗口过后恢复正常 | P1 | 中 |
| ENT-RESILIENCE-03 | 熔断行为测试: 验证系统在持续超载后的恢复时间（graceful degradation vs cascading failure） | P2 | 中 |

### 5.4 Scope 确认

| 模块 | In Scope | Out of Scope |
|------|----------|--------------|
| **ENT-ENV 多环境** | env/ 配置文件 + k6 env loader + JMeter properties | 真实 staging/prod 环境部署 |
| **ENT-DATA 测试数据** | CSV 参数化 + SharedArray | 数据库 seeding、动态数据生成 API |
| **ENT-PROFILE 负载配置** | profiles/ JSON 集中管理 | GUI 配置界面 |
| **ENT-BASELINE 基线回归** | CI artifact 存储 + JSON 对比 + 阈值判定 | 数据库存储历史趋势、Web UI |
| **ENT-REPORT 执行摘要** | Markdown 报告 | PDF 生成、邮件自动发送 |
| **ENT-ALERT 告警通知** | Grafana webhook | Slack/PagerDuty/邮件集成 |
| **ENT-CONSISTENCY k6 一致性** | checkStatus 统一、funnel 提取、sleep 标准化 | 全量脚本重写 |
| **ENT-BREAKPOINT 崩溃测试** | breakpoint.k6.js 找绝对崩溃点 | 分布式多节点压测 |
| **ENT-DX 开发者体验** | .env.example + npm run setup/clean/health | GUI 开发工具 |
| **ENT-COVERAGE CI 覆盖率** | coverage gate + artifact upload | Codecov/Coveralls 集成 |
| **ENT-DASHBOARD Grafana 面板** | 错误分布 + 延迟热力图 + 自定义指标聚合 | 自定义 Grafana 插件 |
| **ENT-SCHEDULE 定时调度** | CI cron nightly soak + weekly capacity + artifact 归档 | 外部调度平台 (Jenkins/Airflow) |
| **ENT-TREND 历史趋势** | trend.json 收集 + Markdown 趋势表 + Grafana 面板 | 数据库存储、Web UI 仪表板 |
| **ENT-RESILIENCE 限流/熔断** | express-rate-limit + k6 限流脚本 + 熔断恢复测试 | 服务网格 (Istio) 级别限流 |

### 5.5 可行性评估

| 维度 | 评估 | 结论 |
|------|------|------|
| k6 SharedArray + papaparse | k6 内置 SharedArray，papaparse 为 npm 包可 bundle | ✅ 可行 |
| k6 env 文件加载 | k6 支持 `open()` 读文件 + `__ENV` 变量 | ✅ 可行 |
| CI baseline 对比 | GitHub Actions artifact 可跨 run 下载 (`actions/download-artifact`) | ✅ 可行 |
| Grafana webhook | Grafana alerting 原生支持 webhook contact point | ✅ 可行 |
| k6 helpers 提取 | checkStatus/funnel/thinkTime 均为纯 JS 函数，提取无风险 | ✅ 可行 |
| Breakpoint Test | k6 ramping-arrival-rate executor 支持持续递增，无需额外工具 | ✅ 可行 |
| CI coverage gate | Jest --coverage 内置阈值检查，CI 中直接 fail on threshold breach | ✅ 可行 |
| Grafana heatmap | InfluxDB + Grafana 原生 heatmap panel，无需插件 | ✅ 可行 |
| 工作量 | 15 个需求方向均为轻中量级，无重大技术风险 | ✅ 预计 2-3 个 Phase |

### 5.6 依赖识别

| 依赖 | 说明 | 关联需求 | 状态 |
|------|------|---------|------|
| k6 SharedArray | 内置模块，无需额外安装 | ENT-DATA | ✅ 已有 |
| papaparse | CSV 解析，需 k6 bundle (webpack/esbuild) 或 k6 内置 CSV | ENT-DATA | 需评估 |
| actions/download-artifact | CI baseline 对比需跨 run 下载 artifact | ENT-BASELINE | ✅ 已有 @v7 |
| Grafana webhook | Docker Compose 中配置 contact point | ENT-ALERT | ✅ 已有 Grafana |
| jq | CI 中解析 JSON baseline | ENT-BASELINE | ✅ GitHub runner 预装 |
| express-rate-limit | Express 限流中间件，npm 安装 | ENT-RESILIENCE | 需安装 |
| GitHub Actions schedule | cron trigger，无需额外工具 | ENT-SCHEDULE | ✅ 已有 |

### 5.7 需求 Checklist

| #   | 检查项                     | 状态                                                                                                                   |
| --- | ----------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 1   | 目标明确                    | ✅ 企业级模板增强，6 个维度                                                                                                      |
| 2   | 完整用户故事                  | ✅ US-23~36，每条关联需求组                                                                                                   |
| 3   | Scope 已确认               | ✅ 6 个模块，明确 In/Out                                                                                                    |
| 4   | 可行性评估                   | ✅ 5 项评估，全部可行                                                                                                         |
| 5   | 依赖已识别                   | ✅ 5 项依赖，关联需求组                                                                                                        |
| 6   | 需求已编号                   | ✅ 15 组 37 条: ENT-ENV(3) + ENT-DATA(2) + ENT-PROFILE(2) + ENT-BASELINE(2) + ENT-REPORT(1) + ENT-ALERT(1) + ENT-TEST(4) + ENT-CONSISTENCY(4) + ENT-BREAKPOINT(2) + ENT-DX(3) + ENT-COVERAGE(3) + ENT-DASHBOARD(3) + ENT-SCHEDULE(2) + ENT-TREND(3) + ENT-RESILIENCE(3) |
| 7   | 需求描述已写入 requirements.md | ✅ 本文档 §5.1~5.6                                                                                                          |
