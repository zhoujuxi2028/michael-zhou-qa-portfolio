# Performance Testing Platform — Requirements（需求文档）

**Branch:** `feature/performance-testing`

| Issue | 描述 | 日期 |
|-------|------|------|
| [#17](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/17) | 性能测试平台 (k6 + JMeter 双引擎) | 2026-03-24 |
| [#54](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/54) | 系统指标采集 + 容量测试 (瓶颈定位) | 2026-03-31 |

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

| 维度         | 说明                                                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------------------------------------ |
| **定位**     | Portfolio 第 10 个项目，填补「性能测试」类别空白                                                                         |
| **核心价值** | 展示 load/stress/spike/smoke 4 种测试模式 × 2 引擎（k6 + JMeter）+ 可观测性                                              |
| **差异化**   | microservice 项目的 k6 只有 3 个辅助脚本；本项目是专项平台，含阈值、场景、CI gate、Grafana 可视化、JMeter 企业级测试计划 |

---

## 2. 用户故事 & Use Cases

### 用户故事

| ID    | 角色        | 故事                                         | 验收标准                                      |
| ----- | ----------- | -------------------------------------------- | --------------------------------------------- |
| US-01 | QA Engineer | 我想运行 smoke test 快速验证 API 是否可用    | 2 VUs, 30s, p95 < 500ms, error rate < 1%      |
| US-02 | QA Engineer | 我想运行 load test 验证正常流量下的性能      | 50 VUs ramp, 5min, p95 < 500ms                |
| US-03 | QA Engineer | 我想运行 stress test 找到系统极限            | 200 VUs ramp, 观察降级点                      |
| US-04 | QA Engineer | 我想运行 spike test 验证突发流量恢复能力     | 100 VUs 突增, 验证恢复到基线                  |
| US-05 | DevOps      | 我想在 CI 中自动运行 smoke test 作为性能门禁 | CI pipeline 中 k6/JMeter smoke 失败则阻断     |
| US-06 | DevOps      | 我想在 Grafana 中查看测试结果                | Docker Compose 一键启动, 自动加载 dashboard   |
| US-07 | QA Engineer | 我想用 JMeter 运行与 k6 相同的 4 种测试模式  | JMeter smoke/load/stress/spike 与 k6 参数一致 |
| US-08 | QA Engineer | 我想查看 JMeter HTML 测试报告                | `jmeter -g results.jtl -o reports/` 生成报告  |
| US-09 | QA Engineer | 我想在 Grafana 中查看 JMeter 测试结果        | Backend Listener → InfluxDB → Grafana         |

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

| 模块              | 内容                                                 | 优先级 |
| ----------------- | ---------------------------------------------------- | ------ |
| Target API        | Express CRUD API (products + orders) + SQLite        | P0     |
| k6 Scripts        | 4 种模式: smoke, load, stress, spike                 | P0     |
| JMeter Test Plans | 4 种模式: smoke, load, stress, spike（企业级标准）   | P0     |
| JMeter Reporting  | Backend Listener → InfluxDB + HTML Dashboard Report  | P0     |
| Unit Tests        | Jest 测试覆盖 API routes + middleware + utils        | P0     |
| Docker Compose    | API + Grafana + InfluxDB 一键启动                    | P0     |
| CI Pipeline       | lint → unit test → k6 smoke gate → JMeter smoke gate | P0     |
| Documentation     | README, CLAUDE.md, docs/ 标准结构                    | P0     |

### Phase 2（#54 — 系统指标采集 + 容量测试）

| 模块 | 内容 |
|------|------|
| `/metrics` 扩展 | 进程级 CPU / 内存 / 事件循环延迟 |
| 系统采集器 | CPU% / 内存% / 磁盘 I/O / 网络 I/O → CSV |
| 容量测试 | 二分法逼近最大并发承载量 + 瓶颈定位 |
| 漏斗流量模型 | 浏览 60% + 详情 30% + 下单 10% |

### Phase 3（未来规划，不在本次 scope）

| 模块           | 内容                                |
| -------------- | ----------------------------------- |
| Soak Test      | 长时间低负载测试 (memory leak 检测) |
| Custom Metrics | 业务指标 (订单成功率, 库存周转)     |
| AlertManager   | 性能劣化告警                        |
| 多服务场景     | 跨服务链路性能测试                  |

### 功能边界

| 包含                                       | 不包含                    |
| ------------------------------------------ | ------------------------- |
| k6 脚本 (4 种模式)                         | 真实外部 API              |
| JMeter 测试计划 (4 种模式) + HTML Report   | 持久化数据库 (PostgreSQL) |
| Express 目标 API + SQLite 内存数据库       | 云端部署                  |
| Grafana + InfluxDB (k6 + JMeter 双引擎)    | 其他 CI 平台              |
| GitHub Actions CI (k6 + JMeter smoke gate) |                           |

---

## 4. 可行性评估

### 本机环境

| 工具           | 状态      | 版本    | 解决方案              |
| -------------- | --------- | ------- | --------------------- |
| Node.js        | ✅ 已安装 | v25.8.1 | —                     |
| npm            | ✅ 已安装 | 11.11.0 | —                     |
| Docker         | ✅ 已安装 | 29.3.0  | —                     |
| Docker Compose | ✅ 已安装 | v5.0.2  | —                     |
| k6             | ❌ 未安装 | —       | `brew install k6`     |
| JMeter         | ❌ 未安装 | —       | `brew install jmeter` |
| Grafana        | ❌ 未安装 | —       | Docker 容器运行       |
| InfluxDB       | ❌ 未安装 | —       | Docker 容器运行       |

### 技术风险

| 风险                                  | 影响                         | 缓解措施                                             |
| ------------------------------------- | ---------------------------- | ---------------------------------------------------- |
| k6 使用 ES Module 语法                | ESLint 不兼容                | `.eslintignore` 排除 `tests/performance/`            |
| 库存耗尽导致 load/stress 测试大量 409 | 测试结果不准确               | 增大种子数据库存 (10,000+) 或添加 reset 端点         |
| SQLite 并发写入限制                   | stress test 高并发下可能锁表 | WAL 模式 + 可接受的错误率阈值                        |
| CI 环境无 k6                          | smoke gate 无法运行          | 使用 `grafana/setup-k6-action@v1`                    |
| JMeter .jmx 文件体积大                | 不易 review                  | 参数化外置到 properties 文件，jmx 保持最小化         |
| CI 环境安装 JMeter 慢                 | CI 耗时增加                  | 使用 `rbhadti94/apache-jmeter-action` 或 Docker 镜像 |

---

## 5. 依赖识别

### 需安装的工具

| 工具   | 安装命令              | 用途                       |
| ------ | --------------------- | -------------------------- |
| k6     | `brew install k6`     | 性能测试执行引擎（轻量级） |
| JMeter | `brew install jmeter` | 性能测试执行引擎（企业级） |

### 需引入的库

| 库                     | 版本    | 用途                   | 类型            |
| ---------------------- | ------- | ---------------------- | --------------- |
| express                | ^4.18.2 | 目标 API 框架          | dependencies    |
| better-sqlite3         | ^11.0.0 | 内存数据库             | dependencies    |
| jest                   | ^29.7.0 | 单元测试               | devDependencies |
| supertest              | ^6.3.3  | API 测试请求           | devDependencies |
| eslint                 | ^8.56.0 | 代码检查               | devDependencies |
| eslint-config-prettier | ^9.1.0  | ESLint + Prettier 兼容 | devDependencies |
| prettier               | ^3.2.0  | 代码格式化             | devDependencies |

### CI 依赖

| Action                       | 用途           |
| ---------------------------- | -------------- |
| `actions/checkout@v4`        | 代码检出       |
| `actions/setup-node@v4`      | Node.js 环境   |
| `grafana/setup-k6-action@v1` | k6 安装        |
| `actions/upload-artifact@v4` | 覆盖率报告上传 |

---

## 6. 需求 Checklist (#17)

| #   | 检查项                                            | 状态                                     |
| --- | ------------------------------------------------- | ---------------------------------------- |
| 1   | Issue 已读取，目标明确                            | ✅ Issue #17                             |
| 2   | 完整用户故事，use cases                           | ✅ US-01~09, UC-01~05                    |
| 3   | Scope 已确认（Phase 划分、功能边界）              | ✅ Phase 1/2 + 边界定义                  |
| 4   | 可行性评估（本机环境、依赖工具、技术风险）        | ✅ 6 项风险已识别                        |
| 5   | 依赖已识别（需安装的工具、需引入的库）            | ✅ k6 + JMeter + 7 npm 包 + 4 CI Actions |
| 6   | 需求描述已产出                                    | ✅ 本文档                                |
| 7   | 基础文档骨架已创建（CLAUDE.md、README.md、docs/） | ✅ 骨架已创建，收尾阶段完善              |

---

## Issue #54 — 系统指标采集 + 容量测试

### 7. 目标 (#54)

在本机环境下，通过阶梯递增 + 系统指标采集，找到电商 API 的**最大并发承载量**及**瓶颈层** (CPU / Memory / I/O / Network)。

### 8. 用户故事 (#54)

| ID | 角色 | 故事 | 验收标准 |
|---|------|------|---------|
| US-10 | QA Engineer | 我想在性能测试时同步采集服务端 CPU / 内存 / 磁盘 I/O / 网络 I/O | 采集器每秒记录指标到 CSV |
| US-11 | QA Engineer | 我想通过 `/metrics` 端点查看进程级指标 | 返回 CPU usage, memory, event loop lag |
| US-12 | QA Engineer | 我想找到本机环境下 API 的最大并发承载量 | 二分法逼近，输出最大 VUs + 瓶颈层 |
| US-13 | QA Engineer | 我想一条命令完成"采集 + 测试 + 归档" | `npm run capacity:test` 自动启停采集器 |

### 9. 测试对象 (#54)

| 操作 | API | 流量权重 | 业务含义 |
|------|-----|---------|---------|
| 浏览商品列表 | `GET /api/products` | 60% | 读操作，高频 |
| 查看商品详情 | `GET /api/products/:id` | 30% | 读操作，高频 |
| 下单购买 | `POST /api/orders` | 10% | 写操作，库存扣减 + 订单创建 |

> `/health` 是运维心跳，不在性能测试范围。

### 10. 本机环境基线 (#54)

| 项目 | 规格 |
|------|------|
| 硬件 | MacBook Pro (Intel) |
| CPU | Intel Core i5-1038NG7 @ 2.00GHz, 4 核 8 线程 |
| 内存 | 16 GB |
| 磁盘 | SSD |
| OS | macOS 26.3.1 (x86_64) |
| Runtime | Node.js v25.8.1 |

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
| 测试数据 | 5 个商品 (id 1~5), 库存充足 |
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

### 14. 期望输出 (#54)

1. **最大并发数** — 满足 SLA 的最高 VUs
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

| 包含 | 不包含 |
|------|--------|
| 扩展 `/metrics` 端点 (进程级指标) | Prometheus 集成 |
| 系统级采集器脚本 (CPU/mem/disk/net) | Grafana 实时面板 |
| 容量测试 (二分法逼近) | 分布式采集 |
| CSV 报告归档 | 云端环境测试 |

### 17. 需求 Checklist (#54)

| # | 检查项 | 状态 |
|---|--------|------|
| 1 | Issue 已读取，目标明确 | ✅ Issue #54 |
| 2 | 完整用户故事 | ✅ US-10~13 |
| 3 | 测试对象已明确 (3 个 API, 漏斗模型) | ✅ |
| 4 | 本机环境基线已采集 | ✅ i5-1038NG7, 4C8T, 16GB, SSD |
| 5 | SLA 定义已明确 | ✅ p95<500ms, error<1%, throughput↑ |
| 6 | 测试参数已明确 (二分法 + think time) | ✅ |
| 7 | 系统指标需求已编号 (SM-01~09) | ✅ |
| 8 | 需求描述已产出 | ✅ 本文档 + Issue #54 |
