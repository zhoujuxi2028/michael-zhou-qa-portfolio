# Phase 1 — 双引擎性能测试 (#17) ✅ Done

## 1.1 目标

构建一个专项性能测试平台，展示 **k6 + JMeter** 双引擎负载测试能力，并通过系统指标采集 + 容量测试定位性能瓶颈。

| 维度                 | 说明                                                                                                                 |
| -------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **定位**             | Portfolio 第 10 个项目，填补「性能测试」类别空白                                                                     |
| **Phase 1 核心价值** | smoke/load/stress/spike 4 种测试模式 × 2 引擎 (k6 + JMeter) + CI 门禁 + Grafana 可视化                               |
| **Phase 2 核心价值** | Express Cluster (多核) + 系统指标采集 (CPU/mem/disk/net) + 容量测试 (二分法逼近最大并发) + 瓶颈定位                  |
| **Phase 3 核心价值** | JWT 认证场景 (register/login/refresh/logout) + 高并发登录压测 + 认证前后性能对比                                     |
| **差异化**           | microservice 项目的 k6 只有 3 个辅助脚本；本项目是专项平台，含阈值、场景、CI gate、HTML 报告、系统指标采集、容量规划 |

---

## 1.2 用户故事

### Phase 1 (#17)

| ID    | 角色        | 故事                                          | 验收标准                                      |
| ----- | ----------- | --------------------------------------------- | --------------------------------------------- |
| US-01 | QA Engineer | 我想运行 smoke test 快速验证 API 是否可用     | 5 VUs, 60s, p95 < 500ms, error rate < 1%      |
| US-02 | QA Engineer | 我想运行 load test 验证正常流量下的性能       | 50 VUs ramp, 5min, p95 < 2000ms               |
| US-03 | QA Engineer | 我想运行 stress test 找到系统极限             | 200 VUs ramp, p95 < 3000ms                    |
| US-04 | QA Engineer | 我想运行 spike test 验证突发流量恢复能力      | 100 VUs 突增, 验证恢复到基线                  |
| US-05 | DevOps      | 我想在 CI 中自动运行 smoke test 作为性能门禁  | CI pipeline 中 k6/JMeter smoke 失败则阻断     |
| US-06 | DevOps      | 我想在 Grafana 中查看测试结果                 | Docker Compose 一键启动, 自动加载 dashboard   |
| US-07 | QA Engineer | 我想用 JMeter 运行与 k6 相同的 4 种测试模式   | JMeter smoke/load/stress/spike 与 k6 参数一致 |
| US-08 | QA Engineer | 我想查看 JMeter HTML 测试报告                 | `jmeter -g results.jtl -o reports/` 生成报告  |
| US-09 | QA Engineer | 我想在 Grafana 中查看 JMeter 测试结果         | Backend Listener → InfluxDB → Grafana         |

### Phase 2 (#54)

| ID    | 角色        | 故事                                                            | 验收标准                               |
| ----- | ----------- | --------------------------------------------------------------- | -------------------------------------- |
| US-10 | QA Engineer | 我想在性能测试时同步采集服务端 CPU / 内存 / 磁盘 I/O / 网络 I/O | 采集器每秒记录指标到 CSV               |
| US-11 | QA Engineer | 我想通过 `/metrics` 端点查看进程级指标                          | 返回 CPU usage, memory, event loop lag |
| US-12 | QA Engineer | 我想找到本机环境下 API 的最大并发承载量                         | 二分法逼近，输出最大 VUs + 瓶颈层      |
| US-13 | QA Engineer | 我想一条命令完成"采集 + 测试 + 归档"                            | `npm run capacity:test` 自动启停采集器 |

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

## 1.3 需求列表

> 编号规范见 [requirements-management-plan.md](../requirements-management-plan.md)
> 格式：`PERF-[子系统]-[子模块]-FR-[序号]`

### PERF-API — 被测系统

#### PERF-API-ROUTE（路由层）

| 需求 ID               | 需求                                                                                                      | 关联 US  | 优先级 |
| --------------------- | --------------------------------------------------------------------------------------------------------- | -------- | ------ |
| PERF-API-ROUTE-FR-001 | `GET /health`：返回服务状态 `{ status: "ok" }`，供 smoke test 验证 API 可用性                        | US-01~04 | P0     |
| PERF-API-ROUTE-FR-002 | `GET /api/products`：返回商品列表，支持分页参数 `?page=&limit=`，默认 limit=10                            | US-01~04 | P0     |
| PERF-API-ROUTE-FR-003 | `GET /api/products/:id`：按 ID 查询单个商品详情，不存在返回 404                                           | US-01~04 | P0     |
| PERF-API-ROUTE-FR-004 | `POST /api/products`：创建商品（name + price + stock），写入 SQLite                                       | US-01~04 | P0     |
| PERF-API-ROUTE-FR-005 | `GET /api/orders`：返回订单列表（按 created_at DESC），支持分页                                           | US-01~04 | P0     |
| PERF-API-ROUTE-FR-006 | `POST /api/orders`：下单接口；校验库存（不足返回 409），事务扣减库存，调用 `simulateDelay` | US-01~04 | P0     |

#### PERF-API-MW（中间件层）

| 需求 ID            | 需求                                                                                                            | 关联 US  | 优先级 |
| ------------------ | --------------------------------------------------------------------------------------------------------------- | -------- | ------ |
| PERF-API-MW-FR-001 | metrics 中间件：Phase 1 首次引入 `GET /metrics` 端点，采集 requestCount、avgDuration(ms)、CPU(user/system/loadavg)、Memory(rss/heapUsed/heapTotal/external)、eventLoopLag(ms) | US-01~04 | P0     |

#### PERF-API-DB（数据层）

| 需求 ID            | 需求                                                                                                 | 关联 US  | 优先级 |
| ------------------ | ---------------------------------------------------------------------------------------------------- | -------- | ------ |
| PERF-API-DB-FR-001 | SQLite 数据库（`test` 环境 `:memory:`，正常运行文件模式 `data/perf.db` + WAL），启动时写入 5 种商品种子数据，每种库存 100,000，支持负载测试全程不耗尽库存 | US-01~04 | P0     |

#### PERF-API-UTIL（工具层）

| 需求 ID              | 需求                                                                                           | 关联 US  | 优先级 |
| -------------------- | ---------------------------------------------------------------------------------------------- | -------- | ------ |
| PERF-API-UTIL-FR-001 | `simulateDelay(ms)`：`POST /api/orders` 专用延迟注入，延迟时长由 `ORDER_DELAY_MS` 环境变量控制（默认 50ms） | US-01~04 | P0     |

---

### PERF-ENGINE — 负载测试引擎

#### PERF-ENGINE-K6（k6 脚本）

| 需求 ID               | 需求                                                                                                       | 关联 US | 优先级 |
| --------------------- | ---------------------------------------------------------------------------------------------------------- | ------- | ------ |
| PERF-ENGINE-K6-FR-001 | smoke test：vus=5，duration=60s；阈值 p95 < 500ms，error rate < 1%                                        | US-01   | P0     |
| PERF-ENGINE-K6-FR-002 | load test：stages 20 VUs→50 VUs ramp，duration=300s；阈值 p95 < 2000ms，p99 < 3000ms，error < 1%，throughput > 8 req/s | US-02   | P0     |
| PERF-ENGINE-K6-FR-003 | stress test：stages 50→100→150→200 VUs ramp；阈值 p95 < 3000ms，error < 5%                                | US-03   | P0     |
| PERF-ENGINE-K6-FR-004 | spike test：stages 5→100→5 VUs（快速突增/回落）；阈值 p95 < 2000ms，error < 10%                           | US-04   | P0     |
| PERF-ENGINE-K6-FR-005 | HTML 报告输出：通过 `--out web-dashboard` 生成 `reports/k6-*.html`                                        | US-01~04 | P0    |

#### PERF-ENGINE-JM（JMeter 脚本）

| 需求 ID               | 需求                                                                                              | 关联 US | 优先级 |
| --------------------- | ------------------------------------------------------------------------------------------------- | ------- | ------ |
| PERF-ENGINE-JM-FR-001 | smoke test：threads=5，duration=60s，rampup=10s                                                   | US-07   | P0     |
| PERF-ENGINE-JM-FR-002 | load test：phase1=20 threads，phase2=30 threads，duration=300s，rampup=60s                        | US-07   | P0     |
| PERF-ENGINE-JM-FR-003 | stress test：threads_per_stage=50，stages=4，duration=210s，rampup=30s                            | US-07   | P0     |
| PERF-ENGINE-JM-FR-004 | spike test：base=5 threads，spike=95 threads，spike_rampup=5s，duration=90s                       | US-07   | P0     |
| PERF-ENGINE-JM-FR-005 | HTML 报告：`jmeter -g results.jtl -o reports/`，需 duration ≥ 60s 且 threads ≥ 5                 | US-08   | P0     |

---

### 测试基础设施（非需求编号，见过程文档）

| 内容                                         | 关联 US | 归属         |
| -------------------------------------------- | ------- | ------------ |
| Grafana + InfluxDB 可视化（Docker Compose）  | US-06   | OBS 基础设施 |
| JMeter Backend Listener → InfluxDB → Grafana | US-09   | OBS 基础设施 |
| CI smoke gate（k6 + JMeter）                 | US-05   | CI/CD 过程   |

---

## 1.4 Scope 确认

### Phase 1 (#17 — 双引擎性能测试) ✅ Done

| 模块              | 内容                                                          | 优先级 |
| ----------------- | ------------------------------------------------------------- | ------ |
| Target API        | Express CRUD API (products + orders) + SQLite                 | P0     |
| k6 Scripts        | 4 种模式: smoke, load, stress, spike → HTML 报告              | P0     |
| JMeter Test Plans | 4 种模式: smoke, load, stress, spike（企业级标准）→ HTML 报告 | P0     |
| JMeter Reporting  | Backend Listener → InfluxDB + HTML Dashboard Report           | P0     |
| Unit Tests        | Jest 测试覆盖 API routes + middleware + utils (20 tests)      | P0     |
| Docker Compose    | API + Grafana + InfluxDB 一键启动                             | P0     |
| CI Pipeline       | lint → unit test → k6 smoke gate + JMeter smoke gate          | P0     |
| Documentation     | README, CLAUDE.md, docs/ 标准结构                             | P0     |

### Phase 2 (#54 — 系统指标采集 + 容量测试) ✅ Done

| 模块                  | 内容                                     | 需求 ID  |
| --------------------- | ---------------------------------------- | -------- |
| Express Cluster 模式  | Master + N Worker (N = CPU 核数)         | SM-10    |
| SQLite 文件模式 + WAL | 多 Worker 共享 DB，真实磁盘 I/O          | SM-11    |
| `/metrics` 扩展       | 进程级 CPU / 内存 / 事件循环延迟         | SM-01~03 |
| 系统采集器            | CPU% / 内存% / 磁盘 I/O / 网络 I/O → CSV | SM-04~08 |
| npm scripts 集成      | 一条命令采集 + 测试 + 归档               | SM-09    |
| 容量测试              | 漏斗模型 (60/30/10) + 二分法逼近最大并发 | US-12    |
| 测试质量保障          | 数据膨胀控制 / 预热 / 隔离 / 可重复性    | TQ-01~04 |

### Phase 3 (#56 — JWT 认证场景性能测试) ✅ Done

| 模块            | 内容                                              | 需求 ID    |
| --------------- | ------------------------------------------------- | ---------- |
| 认证 API        | register, login, refresh, logout + JWT 中间件     | AUTH-01~05 |
| 现有接口改造    | POST /api/orders 添加认证保护 (AUTH_ENABLED 开关) | AUTH-06    |
| k6 认证压测     | 高并发登录 + Token 刷新 + 完整用户旅程            | AUTH-07~09 |
| JMeter 认证压测 | 高并发登录测试计划                                | AUTH-10    |
| 性能对比        | 带认证 vs 不带认证的性能差异报告                  | AUTH-11    |

### Phase 4 (#65 — Soak Test + 可观测性增强) ✅ Done

| 模块                 | 内容                                                   | 需求 ID    |
| -------------------- | ------------------------------------------------------ | ---------- |
| Soak Test            | k6 低负载长时间运行 (100~500 VUs, 1~4h), heapUsed 采集 | SOAK-01~03 |
| Custom Metrics       | 业务指标 (订单成功率, 认证延迟 p99) → InfluxDB         | SOAK-04~05 |
| Grafana Dashboard    | heapUsed 趋势面板 + 业务指标面板                       | SOAK-06    |
| Grafana AlertManager | 告警规则 (p95 > 500ms, error > 1%, heap 持续增长)      | SOAK-07    |
| npm scripts          | `k6:soak` / `k6:soak:full` / `k6:soak:influx`          | SOAK-08    |
| 单元测试             | metrics 端点 + 泄漏检测逻辑                            | SOAK-09    |

### 功能边界

| 包含                                       | 不包含                     |
| ------------------------------------------ | -------------------------- |
| k6 脚本 (4 种模式) + HTML 报告             | 真实外部 API               |
| JMeter 测试计划 (4 种模式) + HTML Report   | 持久化数据库 (PostgreSQL)  |
| Express Cluster 模式 (多核)                | 云端部署                   |
| SQLite 文件模式 + WAL (真实磁盘 I/O)       | 其他 CI 平台               |
| 系统指标采集 (CPU/mem/disk/net → CSV)      | Prometheus 集成            |
| 容量测试 (二分法逼近)                      | 分布式采集                 |
| 测试质量保障 (预热/隔离/重复性)            | 分布式 k6 / JMeter         |
| Grafana + InfluxDB (k6 + JMeter 双引擎)    | OAuth2 / SSO / 第三方登录  |
| GitHub Actions CI (k6 + JMeter smoke gate) | Redis session store        |
| JWT 认证 API + 认证压测 (k6 + JMeter)      | PagerDuty / Slack 告警集成 |
| Soak Test (1~4h 内存泄漏检测)              | CI 中跑 soak (太耗时)      |
| Custom Metrics → InfluxDB + Grafana 可视化 |                            |
| Grafana AlertManager 告警规则              |                            |

---

## 1.5 可行性评估

### 本机环境

| 工具           | 状态      | 版本    | 解决方案              |
| -------------- | --------- | ------- | --------------------- |
| Node.js        | ✅ 已安装 | v25.8.1 | —                     |
| npm            | ✅ 已安装 | 11.11.0 | —                     |
| Docker         | ✅ 已安装 | 29.3.0  | 使用 OrbStack 替代 Docker Desktop（Docker Desktop 不稳定）|
| Docker Compose | ✅ 已安装 | v5.0.2  | 由 OrbStack 提供，行为与 Docker Desktop 兼容              |
| k6             | ✅ 已安装 | v1.7.0  | `brew install k6`     |
| JMeter         | ✅ 已安装 | 5.6.3   | `brew install jmeter` |
| Grafana        | ✅ Docker | 10.2.0  | `docker compose up`   |
| InfluxDB       | ✅ Docker | 1.8     | `docker compose up`   |

### 本机硬件基线

| 项目     | 规格                                               |
| -------- | -------------------------------------------------- |
| 硬件     | MacBook Pro 13″ 2020 (MacBookPro16,2)              |
| CPU      | Intel Core i5-1038NG7 @ 2.00GHz, 4 核 8 线程 (HT) |
| L2 Cache | 512 KB / core                                      |
| L3 Cache | 6 MB                                               |
| 内存     | 16 GB DDR4                                         |
| 磁盘     | 466 GB SSD (约 58 GB 可用)                         |
| OS       | macOS 26.3.1 (Build 25D2128)                       |

### 技术风险

| 风险                                  | 影响                   | 缓解措施                                   |
| ------------------------------------- | ---------------------- | ------------------------------------------ |
| k6 使用 ES Module 语法                | ESLint 不兼容          | `.eslintignore` 排除 `tests/performance/`  |
| 库存耗尽导致 load/stress 测试大量 409 | 测试结果不准确         | 种子数据库存 100,000 + 每轮重建 DB         |
| SQLite 并发写入限制                   | Cluster 模式下写锁竞争 | WAL 模式 + 这正是要观测的 I/O 瓶颈         |
| CI 环境无 k6                          | smoke gate 无法运行    | 使用 `grafana/setup-k6-action@v1`          |
| JMeter .jmx 文件体积大                | 不易 review            | 参数化外置到 properties 文件               |
| Cluster 模式下 `:memory:` DB 不共享   | 多 Worker 数据隔离     | 改为 SQLite 文件模式                       |
| 冷启动影响 p95 统计                   | 容量测试结果不准确     | 预热 30s                                   |

---

## 1.6 依赖识别

### 需安装的工具

| 工具   | 安装命令              | 用途                       |
| ------ | --------------------- | -------------------------- |
| k6     | `brew install k6`     | 性能测试执行引擎（轻量级） |
| JMeter | `brew install jmeter` | 性能测试执行引擎（企业级） |

### 需引入的库

| 库                     | 版本    | 用途                                               | 类型            |
| ---------------------- | ------- | -------------------------------------------------- | --------------- |
| express                | ^4.18.2 | 目标 API 框架                                      | dependencies    |
| better-sqlite3         | ^11.0.0 | SQLite 数据库 (Phase 1 内存模式, Phase 2 文件模式) | dependencies    |
| jest                   | ^29.7.0 | 单元测试                                           | devDependencies |
| supertest              | ^6.3.3  | API 测试请求                                       | devDependencies |
| eslint                 | ^8.56.0 | 代码检查                                           | devDependencies |
| eslint-config-prettier | ^9.1.0  | ESLint + Prettier 兼容                             | devDependencies |
| prettier               | ^3.2.0  | 代码格式化                                         | devDependencies |

### CI 依赖

| Action                       | 用途                |
| ---------------------------- | ------------------- |
| `actions/checkout@v4`        | 代码检出            |
| `actions/setup-node@v4`      | Node.js 环境        |
| `grafana/setup-k6-action@v1` | k6 安装             |
| `actions/upload-artifact@v4` | 覆盖率/测试报告上传 |

---

## 1.7 需求 Checklist

| #   | 检查项                                     | 状态                                                        |
| --- | ------------------------------------------ | ----------------------------------------------------------- |
| 1   | Issue 已读取，目标明确                     | ✅ Issue #17                                                |
| 2   | 完整用户故事，use cases                    | ✅ US-01~09, UC-01~04                                       |
| 3   | 需求已按子系统分组编号                     | ✅ PERF-API-ROUTE(6) + PERF-API-MW(1) + PERF-API-DB(1) + PERF-API-UTIL(1) + PERF-ENGINE-K6(5) + PERF-ENGINE-JM(5) = 19 条 |
| 4   | 测试基础设施已明确归属                     | ✅ OBS(US-06/09) + CI/CD(US-05) 标注为过程文档              |
| 5   | Scope 已确认（Phase 划分、功能边界）       | ✅ Phase 1/2/3/4 + 边界定义                                 |
| 6   | 可行性评估（本机环境、依赖工具、技术风险） | ✅ 7 项风险已识别                                           |
| 7   | 依赖已识别（需安装的工具、需引入的库）     | ✅ k6 + JMeter + 7 npm 包 + 4 CI Actions                    |
