# Phase 2 — 系统指标采集 + 容量测试 (#54) ✅ Done

## 2.1 目标

在本机环境下，通过 Express Cluster (多核) + 阶梯递增 + 系统指标采集，找到电商 API 的**最大并发承载量**及**瓶颈层** (CPU / Memory / I/O / Network)。

## 2.2 用户故事

见 [Phase 1 用户故事](phase1-dual-engine.md#用户故事) — Phase 2 部分 (US-10~13)

## 2.3 需求列表

> 编号规范见 [requirements-management-plan.md](../requirements-management-plan.md)
> 格式：`PERF-[子系统]-[子模块]-FR-[序号]`
> Legacy IDs (SM-xx / TQ-xx) 见 §2.8（遗留命名，不做回改）

### PERF-API — 被测系统

#### PERF-API-UTIL（工具层）

| 需求 ID               | 需求                                                                                    | 关联 Legacy | 优先级 |
| --------------------- | --------------------------------------------------------------------------------------- | ----------- | ------ |
| PERF-API-UTIL-FR-002  | 系统 CPU% 采集：每秒采集 user/system/idle CPU 百分比                                   | SM-04       | P1     |
| PERF-API-UTIL-FR-003  | 系统内存采集：每秒采集 used/free/available 内存                                         | SM-05       | P1     |
| PERF-API-UTIL-FR-004  | 磁盘 I/O 采集：每秒采集 read/write bytes/s                                              | SM-06       | P1     |
| PERF-API-UTIL-FR-005  | 网络 I/O 采集：每秒采集 rx/tx bytes/s                                                   | SM-07       | P1     |
| PERF-API-UTIL-FR-006  | CSV 输出：采集数据持久化到 `reports/system-metrics-*.csv`                               | SM-08       | P1     |
| PERF-API-UTIL-FR-007  | npm scripts 集成：自动启停采集器，一条命令完成采集 + 测试 + 归档                        | SM-09       | P1     |

> 注：SM-01~03（进程级 CPU / 内存 / 事件循环延迟）已被 Phase 1 的 PERF-API-MW-FR-001 覆盖，不重复编号。

#### PERF-API-DB（数据层）

| 需求 ID              | 需求                                                                                            | 关联 Legacy | 优先级 |
| -------------------- | ----------------------------------------------------------------------------------------------- | ----------- | ------ |
| PERF-API-DB-FR-002   | Express Cluster 模式：Master + N Worker (N = CPU 核数)，充分利用多核                           | SM-10       | P0     |
| PERF-API-DB-FR-003   | SQLite 文件模式 + WAL：Cluster 多 Worker 共享 DB 文件，WAL 支持并发读，写锁竞争为真实 I/O 瓶颈 | SM-11       | P0     |

---

### PERF-ENGINE — 负载测试引擎

#### PERF-ENGINE-K6（k6 脚本）

| 需求 ID                | 需求                                                                                                           | 关联 Legacy    | 优先级 |
| ---------------------- | -------------------------------------------------------------------------------------------------------------- | -------------- | ------ |
| PERF-ENGINE-K6-FR-006  | 容量测试脚本：漏斗模型 (`GET /products` 60% + `GET /products/:id` 30% + `POST /orders` 10%)，二分法逼近最大 VUs | US-12, UC-05   | P0     |
| PERF-ENGINE-K6-FR-007  | 数据膨胀控制：每轮容量测试前重建 DB（重启服务），防止 orders 表增长干扰 I/O 瓶颈定位                          | TQ-01          | P1     |
| PERF-ENGINE-K6-FR-008  | 预热支持：容量测试前运行 30s 预热，预热期数据不纳入 SLA 判定                                                  | TQ-02          | P1     |
| PERF-ENGINE-K6-FR-009  | 测试隔离：每轮二分法测试之间重启服务（重建 DB + 清空状态）                                                    | TQ-03          | P1     |
| PERF-ENGINE-K6-FR-010  | 结果可重复性：拐点附近轮次跑 2~3 次取中值，确保结论可靠                                                       | TQ-04          | P2     |

---

## 2.4 测试对象

电商 API 漏斗模型：

| 操作         | API                     | 流量权重 | 业务含义                    | 数据库操作                                    |
| ------------ | ----------------------- | -------- | --------------------------- | --------------------------------------------- |
| 浏览商品列表 | `GET /api/products`     | 60%      | 读操作，高频                | SQLite 读 (SELECT + COUNT)                    |
| 查看商品详情 | `GET /api/products/:id` | 30%      | 读操作，高频                | SQLite 读 (SELECT by id)                      |
| 下单购买     | `POST /api/orders`      | 10%      | 写操作，库存扣减 + 订单创建 | SQLite 写 (UPDATE + INSERT 事务) + 50ms delay |

> `/health` 是运维心跳，不在性能测试范围。

## 2.5 本机环境基线

见 [Phase 1 本机硬件基线](phase1-dual-engine.md#本机硬件基线)

## 2.6 SLA 定义

| 指标       | 阈值     | 含义                     |
| ---------- | -------- | ------------------------ |
| p95        | < 500ms  | 95% 请求延迟在可接受范围 |
| error rate | < 1%     | 几乎无错误               |
| throughput | 持续增长 | 系统未饱和               |

**违反任一条件 → 该并发级别为系统上限**

## 2.7 测试参数

| 参数       | 值                                                                                                                                 |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 流量模型   | 浏览列表 60% + 查看详情 30% + 下单 10%                                                                                             |
| Think Time | 0.5s ~ 1s                                                                                                                          |
| 测试数据   | 5 个商品 (id 1~5), 库存 100,000 each                                                                                               |
| 阶梯策略   | **二分法逼近** — 初始范围 10~200 VUs，每级持稳 60s，PASS→提高下限，FAIL→降低上限，逐步收敛。具体阶梯值待首轮测试后根据实际数据确定 |
| 终止条件   | error rate > 5% 或 p95 > 2000ms → 停止递增                                                                                         |

## 2.8 系统指标采集需求（Legacy SM-xx）

| ID    | 需求         | 采集数据                                           | 用途                       |
| ----- | ------------ | -------------------------------------------------- | -------------------------- |
| SM-01 | 进程级 CPU   | `process.cpuUsage()`, `os.loadavg()`               | 判断 CPU-bound             |
| SM-02 | 进程级内存   | `process.memoryUsage()`, `os.totalmem()/freemem()` | 判断 memory-bound          |
| SM-03 | 事件循环延迟 | event loop lag (ms)                                | Node.js 阻塞信号           |
| SM-04 | 系统 CPU%    | user/system/idle                                   | 整机 vs 进程饱和           |
| SM-05 | 系统内存%    | used/free/available                                | 整机内存压力               |
| SM-06 | 磁盘 I/O     | read/write bytes/s                                 | SQLite 写入瓶颈            |
| SM-07 | 网络 I/O     | rx/tx bytes/s                                      | 带宽饱和                   |
| SM-08 | 数据输出     | CSV → `reports/system-metrics-*.csv`               | 事后分析归档               |
| SM-09 | 测试集成     | npm scripts 自动启停采集器                         | 一条命令完成采集+测试+归档 |

### 2.8.1 服务端多核支持

| ID    | 需求                  | 说明                                                                    |
| ----- | --------------------- | ----------------------------------------------------------------------- |
| SM-10 | Express Cluster 模式  | Master + N Worker (N = CPU 核数)，充分利用多核                          |
| SM-11 | SQLite 文件模式 + WAL | Cluster 多 Worker 共享 DB 文件，WAL 支持并发读，写锁竞争为真实 I/O 瓶颈 |

### 2.8.2 测试质量保障需求

| ID    | 需求           | 说明                                             | 为什么重要                                                                                   |
| ----- | -------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| TQ-01 | 数据膨胀控制   | 每轮容量测试前重建 DB (重启服务)                 | POST /api/orders 不断插入，orders 表持续增长 → SQLite 文件变大 → 后期 I/O 劣化，干扰瓶颈定位 |
| TQ-02 | 预热 (Warm-up) | 容量测试前跑 30s 预热，预热期数据不纳入 SLA 判定 | 冷启动首次请求慢 (DB 连接建立、JIT 编译)，影响 p95 统计准确性                                |
| TQ-03 | 测试隔离       | 每轮二分法测试之间重启服务 (重建 DB + 清空状态)  | 上一轮残留的 orders 数据和内存状态影响下一轮结果                                             |
| TQ-04 | 结果可重复性   | 关键轮次 (拐点附近) 跑 2~3 次取中值              | 单次结果可能有波动，多次验证确保结论可靠                                                     |

## 2.9 期望输出

1. **最大并发数** — 满足 SLA 的最高 VUs (Cluster 模式, 4 核)
2. **瓶颈层** — CPU / Memory / I/O / Network
3. **容量报告** — 阶梯结果表 + 系统指标趋势 → `reports/` 归档

## 2.10 瓶颈定位决策树

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

## 2.11 Scope 确认

见 [Phase 1 功能边界](phase1-dual-engine.md#功能边界) — Phase 2 部分已合并到统一的功能边界表。

## 2.12 需求 Checklist

| #   | 检查项                               | 状态                                       |
| --- | ------------------------------------ | ------------------------------------------ |
| 1   | Issue 已读取，目标明确               | ✅ Issue #54                               |
| 2   | 完整用户故事                         | ✅ US-10~13, UC-05                         |
| 3   | 需求已按 PERF ID 编号                | ✅ PERF-API-UTIL(002~007) + PERF-API-DB(002~003) + PERF-ENGINE-K6(006~010) = 13 条 |
| 4   | 测试对象已明确 (3 个 API, 漏斗模型)  | ✅                                         |
| 5   | 本机环境基线已采集                   | ✅ i5-1038NG7, 4C8T, 16GB, SSD             |
| 6   | SLA 定义已明确                       | ✅ p95<500ms, error<1%, throughput↑        |
| 7   | 测试参数已明确 (二分法 + think time) | ✅                                         |
| 8   | 系统指标需求已编号 (SM-01~09)        | ✅                                         |
| 9   | 服务端多核支持 (SM-10~11)            | ✅ Cluster + SQLite 文件模式               |
| 10  | 测试质量保障需求 (TQ-01~04)          | ✅ 数据膨胀/预热/隔离/可重复性             |
| 11  | 磁盘 I/O 可观测 (SQLite 文件模式)    | ✅ `:memory:` → 文件模式，SM-06 有实际数据 |
| 12  | 需求描述已产出                       | ✅ 本文档 + Issue #54                      |
