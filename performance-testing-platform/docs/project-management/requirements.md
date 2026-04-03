# Performance Testing Platform — Requirements（需求文档）

**Branch:** `feature/performance-testing`

| Issue | 描述 | 日期 |
|-------|------|------|
| [#17](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/17) | 性能测试平台 (k6 + JMeter 双引擎) | 2026-03-24 |
| [#54](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/54) | 系统指标采集 + 容量测试 (瓶颈定位) | 2026-03-31 |
| [#56](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/56) | JWT 认证场景性能测试 | 2026-04-02 |
| [#65](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/65) | Soak Test + 可观测性增强 | 2026-04-02 |

---

## 目录

- [1. 目标](#1-目标)
- [2. 用户故事 & Use Cases](#2-用户故事--use-cases)
- [3. Scope 确认](#3-scope-确认)
- [4. 可行性评估](#4-可行性评估)
- [5. 依赖识别](#5-依赖识别)
- [6. 需求 Checklist (#17)](#6-需求-checklist-17)
- [7. 目标 (#54)](#7-目标-54)
- [8. 用户故事 (#54)](#8-用户故事-54)
- [9. 测试对象 (#54)](#9-测试对象-54)
- [10. 本机环境基线 (#54)](#10-本机环境基线-54)
- [11. SLA 定义 (#54)](#11-sla-定义-54)
- [12. 测试参数 (#54)](#12-测试参数-54)
- [13. 系统指标采集需求 (#54)](#13-系统指标采集需求-54)
- [14. 期望输出 (#54)](#14-期望输出-54)
- [15. 瓶颈定位决策树 (#54)](#15-瓶颈定位决策树-54)
- [16. Scope 确认 (#54)](#16-scope-确认-54)
- [17. 需求 Checklist (#54)](#17-需求-checklist-54)
- [18. 目标 (#56)](#18-目标-56)
- [19. 用户故事 (#56)](#19-用户故事-56)
- [20. Use Cases (#56)](#20-use-cases-56)
- [21. 需求列表 (#56)](#21-需求列表-56)
- [22. Scope 确认 (#56)](#22-scope-确认-56)
- [23. 可行性评估 (#56)](#23-可行性评估-56)
- [24. 依赖识别 (#56)](#24-依赖识别-56)
- [25. 设计决策 (#56)](#25-设计决策-56)
- [26. 需求 Checklist (#56)](#26-需求-checklist-56)
- [27. 目标 (#65)](#27-目标-65)
- [28. 用户故事 (#65)](#28-用户故事-65)
- [29. 需求列表 (#65)](#29-需求列表-65)
- [30. Scope 确认 (#65)](#30-scope-确认-65)
- [31. 可行性评估 (#65)](#31-可行性评估-65)
- [32. 依赖识别 (#65)](#32-依赖识别-65)
- [33. 需求 Checklist (#65)](#33-需求-checklist-65)

---

## 1. 目标

构建一个专项性能测试平台，展示 **k6 + JMeter** 双引擎负载测试能力，并通过系统指标采集 + 容量测试定位性能瓶颈。

| 维度 | 说明 |
|------|------|
| **定位** | Portfolio 第 10 个项目，填补「性能测试」类别空白 |
| **Phase 1 核心价值** | smoke/load/stress/spike 4 种测试模式 × 2 引擎 (k6 + JMeter) + CI 门禁 + Grafana 可视化 |
| **Phase 2 核心价值** | Express Cluster (多核) + 系统指标采集 (CPU/mem/disk/net) + 容量测试 (二分法逼近最大并发) + 瓶颈定位 |
| **Phase 3 核心价值** | JWT 认证场景 (register/login/refresh/logout) + 高并发登录压测 + 认证前后性能对比 |
| **差异化** | microservice 项目的 k6 只有 3 个辅助脚本；本项目是专项平台，含阈值、场景、CI gate、HTML 报告、系统指标采集、容量规划 |

---

## 2. 用户故事 & Use Cases

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

## 3. Scope 确认

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

| 模块 | 内容 | 需求 ID |
|------|------|---------|
| Express Cluster 模式 | Master + N Worker (N = CPU 核数) | SM-10 |
| SQLite 文件模式 + WAL | 多 Worker 共享 DB，真实磁盘 I/O | SM-11 |
| `/metrics` 扩展 | 进程级 CPU / 内存 / 事件循环延迟 | SM-01~03 |
| 系统采集器 | CPU% / 内存% / 磁盘 I/O / 网络 I/O → CSV | SM-04~08 |
| npm scripts 集成 | 一条命令采集 + 测试 + 归档 | SM-09 |
| 容量测试 | 漏斗模型 (60/30/10) + 二分法逼近最大并发 | US-12 |
| 测试质量保障 | 数据膨胀控制 / 预热 / 隔离 / 可重复性 | TQ-01~04 |

### Phase 3 (#56 — JWT 认证场景性能测试) 📋 Planned

| 模块 | 内容 | 需求 ID |
|------|------|---------|
| 认证 API | register, login, refresh, logout + JWT 中间件 | AUTH-01~05 |
| 现有接口改造 | POST /api/orders 添加认证保护 (AUTH_ENABLED 开关) | AUTH-06 |
| k6 认证压测 | 高并发登录 + Token 刷新 + 完整用户旅程 | AUTH-07~09 |
| JMeter 认证压测 | 高并发登录测试计划 | AUTH-10 |
| 性能对比 | 带认证 vs 不带认证的性能差异报告 | AUTH-11 |

### Phase 4（未来规划，不在本次 scope）

| 模块 | 内容 |
|------|------|
| Soak Test | 长时间低负载测试 (1~4h, memory leak 检测) |
| Custom Metrics | 业务指标 (订单成功率, 认证延迟 p99) → InfluxDB |
| AlertManager | Grafana 告警规则 (p95 > 500ms, error > 1%, heap 持续增长) |

### 功能边界

| 包含 | 不包含 |
|------|--------|
| k6 脚本 (4 种模式) + HTML 报告 | 真实外部 API |
| JMeter 测试计划 (4 种模式) + HTML Report | 持久化数据库 (PostgreSQL) |
| Express Cluster 模式 (多核) | 云端部署 |
| SQLite 文件模式 + WAL (真实磁盘 I/O) | 其他 CI 平台 |
| 系统指标采集 (CPU/mem/disk/net → CSV) | Prometheus 集成 |
| 容量测试 (二分法逼近) | 分布式采集 |
| 测试质量保障 (预热/隔离/重复性) | Grafana 实时面板 (Phase 2) |
| Grafana + InfluxDB (k6 + JMeter 双引擎) | |
| GitHub Actions CI (k6 + JMeter smoke gate) | |

---

## 4. 可行性评估

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
| 硬件 | MacBook Pro (Intel) |
| CPU | Intel Core i5-1038NG7 @ 2.00GHz, 4 核 8 线程 |
| 内存 | 16 GB |
| 磁盘 | SSD |
| OS | macOS 26.3.1 (x86_64) |

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

## 5. 依赖识别

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

## 6. 需求 Checklist (#17)

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

### 7. 目标 (#54)

在本机环境下，通过 Express Cluster (多核) + 阶梯递增 + 系统指标采集，找到电商 API 的**最大并发承载量**及**瓶颈层** (CPU / Memory / I/O / Network)。

### 8. 用户故事 (#54)

见 [§2 用户故事 Phase 2](#phase-2-54)

### 9. 测试对象 (#54)

电商 API 漏斗模型：

| 操作 | API | 流量权重 | 业务含义 | 数据库操作 |
|------|-----|---------|---------|-----------|
| 浏览商品列表 | `GET /api/products` | 60% | 读操作，高频 | SQLite 读 (SELECT + COUNT) |
| 查看商品详情 | `GET /api/products/:id` | 30% | 读操作，高频 | SQLite 读 (SELECT by id) |
| 下单购买 | `POST /api/orders` | 10% | 写操作，库存扣减 + 订单创建 | SQLite 写 (UPDATE + INSERT 事务) + 50ms delay |

> `/health` 是运维心跳，不在性能测试范围。

### 10. 本机环境基线 (#54)

见 [§4 本机硬件基线](#本机硬件基线)

### 11. SLA 定义 (#54)

| 指标 | 阈值 | 含义 |
|------|------|------|
| p95 | < 500ms | 95% 请求延迟在可接受范围 |
| error rate | < 1% | 几乎无错误 |
| throughput | 持续增长 | 系统未饱和 |

**违反任一条件 → 该并发级别为系统上限**

### 12. 测试参数 (#54)

| 参数 | 值 |
|------|-----|
| 流量模型 | 浏览列表 60% + 查看详情 30% + 下单 10% |
| Think Time | 0.5s ~ 1s |
| 测试数据 | 5 个商品 (id 1~5), 库存 100,000 each |
| 阶梯策略 | **二分法逼近** — 初始范围 10~200 VUs，每级持稳 60s，PASS→提高下限，FAIL→降低上限，逐步收敛。具体阶梯值待首轮测试后根据实际数据确定 |
| 终止条件 | error rate > 5% 或 p95 > 2000ms → 停止递增 |

### 13. 系统指标采集需求 (#54)

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

#### 13.1 服务端多核支持 (#54)

| ID | 需求 | 说明 |
|---|------|------|
| SM-10 | Express Cluster 模式 | Master + N Worker (N = CPU 核数)，充分利用多核 |
| SM-11 | SQLite 文件模式 + WAL | Cluster 多 Worker 共享 DB 文件，WAL 支持并发读，写锁竞争为真实 I/O 瓶颈 |

#### 13.2 测试质量保障需求 (#54)

| ID | 需求 | 说明 | 为什么重要 |
|---|------|------|-----------|
| TQ-01 | 数据膨胀控制 | 每轮容量测试前重建 DB (重启服务) | POST /api/orders 不断插入，orders 表持续增长 → SQLite 文件变大 → 后期 I/O 劣化，干扰瓶颈定位 |
| TQ-02 | 预热 (Warm-up) | 容量测试前跑 30s 预热，预热期数据不纳入 SLA 判定 | 冷启动首次请求慢 (DB 连接建立、JIT 编译)，影响 p95 统计准确性 |
| TQ-03 | 测试隔离 | 每轮二分法测试之间重启服务 (重建 DB + 清空状态) | 上一轮残留的 orders 数据和内存状态影响下一轮结果 |
| TQ-04 | 结果可重复性 | 关键轮次 (拐点附近) 跑 2~3 次取中值 | 单次结果可能有波动，多次验证确保结论可靠 |

### 14. 期望输出 (#54)

1. **最大并发数** — 满足 SLA 的最高 VUs (Cluster 模式, 4 核)
2. **瓶颈层** — CPU / Memory / I/O / Network
3. **容量报告** — 阶梯结果表 + 系统指标趋势 → `reports/` 归档

### 15. 瓶颈定位决策树 (#54)

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

### 16. Scope 确认 (#54)

见 [§3 功能边界](#功能边界) — Phase 2 部分已合并到统一的功能边界表。

### 17. 需求 Checklist (#54)

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

### 18. 目标 (#56)

为电商 API 添加 JWT 认证层，测试高并发下登录/Token 刷新/鉴权链路的性能表现，并与无认证场景进行对比。

| 维度 | 说明 |
|------|------|
| 业务场景 | 企业门户高并发认证 — 登录 / Token 刷新 / 鉴权 |
| 技术价值 | bcrypt CPU 密集型操作对 event loop 瓶颈的放大效应 (延续 Phase 2 CPU-bound 结论) |
| Portfolio 价值 | 补全"身份认证类业务性能测试"场景覆盖 |

### 19. 用户故事 (#56)

| ID | 角色 | 故事 | 验收标准 |
|-----|------|------|---------|
| US-14 | QA Engineer | 我需要一套认证 API，以便在性能测试中覆盖登录/鉴权场景 | 4 个认证接口可用 (register/login/refresh/logout) |
| US-15 | QA Engineer | 我需要测试高并发登录的性能表现 | login 在 500 VUs 下 p95 < 500ms, error < 1% |
| US-16 | QA Engineer | 我需要测试 Token 刷新的性能表现 | refresh 在 200 VUs 下 p95 < 200ms |
| US-17 | QA Engineer | 我需要测试完整用户旅程 (登录→浏览→下单) 的端到端性能 | login → browse → order 完整链路 load test 通过阈值 |
| US-18 | QA Engineer | 我需要对比认证前后的性能差异 | 输出对比报告：带认证 vs 不带认证 |

### 20. Use Cases (#56)

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

### 21. 需求列表 (#56)

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

### 22. Scope 确认 (#56)

| 范围 | 包含 | 不包含 |
|------|------|--------|
| 认证方式 | JWT (HS256) + bcryptjs | OAuth2, SSO, 第三方登录 |
| 数据存储 | SQLite users 表 + token 黑名单表 | Redis session store |
| 密码哈希 | bcryptjs (纯 JS, 10 rounds) | argon2 (需编译) |
| 接口保护 | POST /api/orders (可选开关) | GET /api/products 保持公开 |
| k6 | 认证专项脚本 + 现有脚本改造 | 分布式 k6 |
| JMeter | 高并发登录测试计划 | 分布式 JMeter |

### 23. 可行性评估 (#56)

| 维度 | 评估 | 风险等级 |
|------|------|---------|
| 本机环境 | Node.js 25 + SQLite — 完全支持 | 无 |
| bcryptjs CPU 开销 | 10 rounds ≈ 100ms/次, CPU 密集型, 会加剧 event loop 瓶颈 | **中** — 这正是测试要发现的性能差异 |
| SQLite token 黑名单 | logout 写入黑名单表, 高并发下可能遇到 WAL 写锁 | **低** — Phase 2 已验证 WAL 在 6000 VUs 下 error=0% |
| JWT 签名/验证 | HS256 对称加密, CPU 开销极低 (~0.1ms) | 无 |
| 现有测试兼容 | `AUTH_ENABLED` 环境变量开关, 默认关闭 | **低** — 现有脚本无需改动即可运行 |

### 24. 依赖识别 (#56)

| 依赖 | 类型 | 版本 | 用途 |
|------|------|------|------|
| `jsonwebtoken` | npm 新增 | ^9.0.0 | JWT 签发/验证 |
| `bcryptjs` | npm 新增 | ^2.4.3 | 密码哈希 (纯 JS, 无需编译) |

### 25. 设计决策 (#56)

| 决策项 | 决定 | 理由 |
|--------|------|------|
| 兼容性方案 | `AUTH_ENABLED` 环境变量, 默认关闭 | 保持向后兼容, 现有 Phase 1/2 脚本和 CI 不受影响 |
| bcrypt rounds | 10 (业界默认) | 真实系统不会为性能降低安全标准, 测试应反映真实情况 |
| Token 过期时间 | Access 15min / Refresh 7d | 业界标准; 压测单次 < 15min 不会真正过期, 但需测试 refresh 场景 |
| Token 黑名单存储 | SQLite 表 | 复用现有 DB, 无需引入 Redis |

### 26. 需求 Checklist (#56)

| # | 检查项 | 状态 |
|---|--------|------|
| 1 | Issue 已读取，目标明确 | ✅ Issue #56 |
| 2 | 完整用户故事 | ✅ US-14~18, UC-06~09 |
| 3 | Scope 已确认 | ✅ JWT 认证, 不含 OAuth2/SSO |
| 4 | 可行性评估 | ✅ 5 项评估, bcrypt CPU 开销为中风险 |
| 5 | 依赖已识别 | ✅ jsonwebtoken + bcryptjs |
| 6 | 需求已编号 | ✅ AUTH-01~11 |
| 7 | 需求描述已写入 requirements.md | ✅ 本文档 §18~25 |
| 8 | 设计决策已记录 | ✅ 兼容性方案 A + bcrypt 10 + Token 15min/7d |

---

## Phase 4: Soak Test + 可观测性增强 (#65)

### 27. 目标 (#65)

长时间低负载运行 (1~4h)，检测**内存泄漏、连接泄漏、DB 膨胀**等稳定性问题，并通过 Custom Metrics + Grafana AlertManager 增强可观测性。

| 维度 | 说明 |
|------|------|
| **定位** | Phase 4 — 稳定性验证 + 可观测性增强 |
| **核心能力** | Soak Test (长时间低负载) + 内存泄漏检测 + 业务指标可视化 + 告警 |
| **验收标准** | soak 4h 运行完成，heapUsed 无持续增长；Grafana 可视化趋势；告警规则在阈值突破时触发 |

### 28. 用户故事 (#65)

| ID | 用户故事 |
|----|----------|
| US-19 | 作为性能工程师，我想执行 1~4 小时 soak test，以便发现长时间运行才暴露的内存泄漏 |
| US-20 | 作为性能工程师，我想在 k6 中采集 heapUsed 趋势，以便判断是否存在内存持续增长 |
| US-21 | 作为性能工程师，我想将业务指标 (订单成功率、认证延迟 p99) 导入 InfluxDB，以便在 Grafana 统一查看 |
| US-22 | 作为性能工程师，我想设置 Grafana 告警规则，以便 p95 > 500ms / error > 1% / heap 持续增长时自动告警 |

### 29. 需求列表 (#65)

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

### 30. Scope 确认 (#65)

| 模块 | In Scope | Out of Scope |
|------|----------|--------------|
| **Soak Test** | k6 脚本 (100~500 VUs, 1~4h), heapUsed 采集, 泄漏检测 | 分布式 k6 (多节点) |
| **Custom Metrics** | 业务指标 (订单成功率, auth latency p99) → InfluxDB | Prometheus 集成 |
| **AlertManager** | Grafana 告警规则 (p95, error rate, heap) | PagerDuty/Slack 告警集成 |
| **单元测试** | 新模块的单元测试 | CI 中跑 soak (太耗时) |

### 31. 可行性评估 (#65)

| 维度 | 评估 | 结论 |
|------|------|------|
| 本机环境 | 8 CPU, 16 GB RAM, 59 GB 磁盘 | ✅ 满足 soak test 需求 |
| 工具链 | Node.js v25.8.1, k6 v1.7.0, JMeter | ✅ 全部就绪 |
| InfluxDB | Phase 1 已配置 (port 8086) | ✅ 可复用 |
| Grafana | Phase 1 已配置 (port 3010) | ✅ 可复用 |
| heapUsed 采集 | 需新增 `/api/metrics` 端点暴露 `process.memoryUsage()` | ✅ 简单实现 |
| 时间风险 | soak test 本身耗时 1~4h, CI 中不可行 | ⚠️ CI 仅跑 smoke, soak 本地手动 |
| DB 膨胀风险 | 长时间 orders 写入会膨胀 perf.db | ⚠️ 需内置清理或限速策略 |

### 32. 依赖识别 (#65)

| 依赖 | 说明 | 状态 |
|------|------|------|
| Express API (src/app.js) | 需新增 `/api/metrics` 端点 | 需开发 |
| InfluxDB | 写入 custom metrics | ✅ 已有 |
| Grafana | Dashboard + Alert rules | ✅ 已有, 需扩展 |
| k6 | soak test 脚本 | 需开发 |
| scripts/server.sh | 可能需要 soak 模式支持 | 需评估 |

### 33. 需求 Checklist (#65)

| # | 检查项 | 状态 |
|---|--------|------|
| 1 | Issue 已读取，目标明确 | ✅ Issue #65 |
| 2 | 完整用户故事 | ✅ US-19~22 |
| 3 | Scope 已确认 | ✅ Soak + Custom Metrics + AlertManager |
| 4 | 可行性评估 | ✅ 7 项评估, DB 膨胀 + CI 时间为中风险 |
| 5 | 依赖已识别 | ✅ 5 项依赖 |
| 6 | 需求已编号 | ✅ SOAK-01~10 |
| 7 | 需求描述已写入 requirements.md | ✅ 本文档 §27~32 |
