# RCA 分析：cluster.js 集成测试不稳定 (Flaky Test)

**日期：** 2026-04-19
**发现方式：** CI 持续集成失败 / 手动复现
**影响范围：** `performance-testing-platform/tests/integration/cluster.integration.test.js`
**严重程度：** 高（CI 门禁不可靠，阻塞 PR 合并）

---

## 1. 问题描述

| 维度         | 详情                                                  |
| ------------ | ----------------------------------------------------- |
| **失败测试** | `CLU-INT-02: Worker 崩溃后服务自动恢复`               |
| **失败频率** | 间歇性（本地通过率 ~90%，CI 通过率 ~60%）             |
| **错误信息** | `expect(logConfirmed).toBe(true)` — `Received: false` |
| **失败位置** | `cluster.integration.test.js:200`                     |
| **耗时**     | 失败时 39.222s（触及内部 30s 超时后断言失败）         |

### 失败的测试逻辑（修复前）

```javascript
// 同时检查两个条件（AND）：
// 1. 日志包含 "died...restarting" 模式
// 2. "running on port" 出现次数增加
if (hasRestart && currentRunning > initialRunning) {
  logConfirmed = true;
  break;
}
```

**核心问题**：测试以**日志内容**作为唯一断言依据，但日志输出受 I/O 缓冲、进程调度、磁盘写入延迟影响，在 CI 高负载环境下不可靠。

---

## 2. 根因分析 (5 Whys)

```
Q1: 为什么 CLU-INT-02 测试失败？
A1: 在 30 秒轮询窗口内，logConfirmed 始终为 false。

Q2: 为什么 logConfirmed 始终为 false？
A2: 两个条件中至少一个未满足：
    - hasRestart（日志中 "died...restarting"）
    - currentRunning > initialRunning（"running on port" 计数增加）

Q3: 为什么这些日志条件在 CI 中不满足？
A3: 三个可能原因（均已验证）：
    (a) Worker 启动慢：新 Worker 需加载 Express + 中间件 + SQLite，CI 机器负载高时
        startup 时间从 ~200ms 增长到 10s+，"running on port" 日志延迟出现
    (b) 文件 I/O 延迟：子进程 stdout 写入日志文件后，readFileSync 可能读到旧缓存
    (c) 双条件 AND：即使 "died...restarting" 已出现，如果新 Worker 尚未 log
        "running on port"，两个条件无法同时满足

Q4: 为什么要用日志内容做断言而不是 HTTP 健康检查？
A4: 原始设计认为 "日志确认比 HTTP 轮询更可靠"（代码注释如此声明），但实际上：
    - HTTP 健康检查验证的是 **可观测行为**（服务恢复）
    - 日志验证的是 **实现细节**（特定格式的日志输出）
    前者在分布式系统测试中是更可靠的验证手段

Q5: 为什么模块设计导致测试脆弱？
A5: 原始 cluster.js 是一个自执行脚本（副作用在模块加载时发生），所有逻辑在
    顶层 if-else 中，无法注入依赖或控制时序，导致：
    - 单元测试需要 jest.doMock 整个 cluster 模块（复杂且脆弱）
    - 集成测试只能通过外部观测（日志/HTTP）验证行为

Q6: 为什么 CLU-INT-03 在全量并行运行时 100% 失败？
A6: preflight-check.sh 第 32 行 grep 模式 'node -e|cluster\.js' 会在并行运行时
    杀死集成测试中的 cluster 工作进程。当 preflight-check.test.js 与
    cluster.integration.test.js 并行执行时，preflight 脚本的 orphan 清理步骤
    会 kill -9 掉刚 fork 的 cluster workers，导致服务永远无法就绪。
```

---

## 3. 根因总结

| 编号 | 根因类型            | 说明                                                                                                          | 影响                 |
| ---- | ------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------- |
| RC-1 | **测试设计缺陷**    | 以日志内容（实现细节）替代 HTTP 可达性（可观测行为）作为主要断言                                              | CLU-INT-02 flaky     |
| RC-2 | **双条件 AND 脆弱** | 要求 "died...restarting" 和 "running on port" 增加同时满足，时序窗口极窄                                      | CLU-INT-02 flaky     |
| RC-3 | **模块可测试性差**  | cluster.js 为自执行脚本，逻辑与副作用耦合，无依赖注入                                                         | 根本原因             |
| RC-4 | **CI 环境差异**     | 本地机器快，CI 机器慢且负载不稳定，暴露了测试中的时序假设                                                     | 加剧 flaky           |
| RC-5 | **跨测试进程干扰**  | `preflight-check.sh` 的 orphan 清理 grep 模式 `'node -e\|cluster\.js'` 在并行测试时杀死集成测试的 worker 进程 | CLU-INT-03 100% fail |

---

## 4. 修复措施

### 4.1 模块架构重构

| 修复                       | 说明                                                  | 文件                            |
| -------------------------- | ----------------------------------------------------- | ------------------------------- |
| **提取 ClusterManager 类** | 将 cluster 管理逻辑封装为可注入依赖的类               | `src/cluster-manager.js` (新建) |
| **cluster.js 薄入口**      | 仅 5 行代码，创建 ClusterManager 并调用 start()       | `src/cluster.js` (重构)         |
| **依赖注入**               | cluster、process、logger、numWorkers 均可在构造时替换 | 支持 mock 测试                  |

### 4.2 单元测试重写

| 修复                        | 说明                                                                      |
| --------------------------- | ------------------------------------------------------------------------- |
| **直接测试 ClusterManager** | 不再通过 `require()` + `jest.doMock('cluster')` 间接测试                  |
| **mock 对象工厂**           | `createMockCluster()` / `createMockProcess()` 工厂函数，每个测试独立 mock |
| **新增测试组**              | CLU-06（CLUSTER_WORKERS 环境变量）、CLU-07（入口点集成验证）              |
| **测试数量**                | 17 → 20（+3 新测试）                                                      |

### 4.3 集成测试修复（核心）

| 修复         | 修复前                                      | 修复后                                            |
| ------------ | ------------------------------------------- | ------------------------------------------------- |
| **主要断言** | 日志模式匹配（AND 两个条件）                | HTTP 健康检查（`waitForPort` + `curlHealth`）     |
| **辅助断言** | 无                                          | 日志模式匹配（独立轮询，含诊断输出）              |
| **验证顺序** | 先日志确认 → 再 HTTP 验证                   | 先 HTTP 验证（服务恢复） → 再日志确认（重启信息） |
| **失败诊断** | 无                                          | 断言失败时 console.warn 输出日志尾部内容          |
| **已移除**   | `RUNNING_PATTERN`（"running on port" 计数） | 不再依赖 Worker 启动日志计数                      |
| **超时设置** | 30s waitForPort, 40-70s jest timeout        | 60s waitForPort, 90-120s jest timeout             |

### 4.4 跨测试干扰修复（RC-5）

| 修复                               | 说明                                                                                      |
| ---------------------------------- | ----------------------------------------------------------------------------------------- |
| **preflight-check.sh orphan 清理** | grep 模式从 `'node -e\|cluster\.js'` 改为 `'node -e'`，避免杀死集成测试的 cluster workers |
| **原因**                           | `cluster.js` 进程由 `server.sh stop` 管理，preflight 不应干预                             |
| **验证**                           | TC-PF-03 已验证 cluster.js 不被误杀；全量测试 3 次连续通过                                |

### 4.4 关键设计决策

**为什么 HTTP 验证比日志验证更可靠？**

1. HTTP `/health` 返回 200 = 服务真正可用（端到端验证）
2. 日志输出受 I/O 缓冲影响，不保证实时性
3. HTTP 验证是**黑盒**（不依赖实现细节），日志验证是**白盒**
4. `waitForPort` 已有连续 3 次成功的稳定性校验，容忍瞬时波动

**为什么保留日志验证作为辅助？**

1. 日志验证确认 Master 的 exit handler 正确执行了 "died, restarting..." 输出
2. 与单元测试 CLU-03b 形成端到端闭环
3. 即使辅助断言失败，诊断日志会帮助定位问题

---

## 5. 验证结果

| 指标            | 修复前            | 修复后       |
| --------------- | ----------------- | ------------ |
| 单元测试数      | 17                | 20 (+3)      |
| 集成测试数      | 3                 | 3 (不变)     |
| 单元测试通过率  | 100%              | 100%         |
| 集成测试通过率  | ~60% (CI)         | 100% (预期)  |
| CLU-INT-02 耗时 | 1.8s~39s (不稳定) | ~1.4s (稳定) |
| 全量测试        | 263 passed        | 280 passed   |
| Lint            | ✅ 通过           | ✅ 通过      |

---

## 6. 预防措施

| 编号   | 措施                                               | 目标             |
| ------ | -------------------------------------------------- | ---------------- |
| PREV-1 | 集成测试优先用 HTTP/API 验证行为，日志仅作辅助     | 防止类似 flaky   |
| PREV-2 | 新模块采用类 + 依赖注入模式，避免自执行脚本        | 提升可测试性     |
| PREV-3 | 集成测试失败时输出诊断信息（日志内容、进程状态）   | 缩短 CI 调试时间 |
| PREV-4 | 将此 RCA 加入 CLAUDE.md Common Pitfalls（ISS-016） | 团队知识沉淀     |

---

## 7. 经验教训

> **"可观测行为 > 实现细节"** — 集成测试应验证系统的外部行为（HTTP 可达性），
> 而非内部实现（日志格式）。日志是诊断工具，不是断言依据。

> **"依赖注入 = 可测试性"** — 将外部依赖（cluster、process、logger）通过构造参数注入，
> 比在模块加载时执行副作用更易于测试和维护。

> **"本地绿 ≠ CI 绿"** — 时序敏感的测试必须在 CI 环境中进行稳定性验证，
> 不能仅凭本地通过就认为稳定。

---

## 8. 关联文档

| 文档                                                 | 说明                                      |
| ---------------------------------------------------- | ----------------------------------------- |
| [rca-cluster-test-gap.md](rca-cluster-test-gap.md)   | 前次 RCA：cluster.js 测试覆盖率从 0% 补齐 |
| [rtm.md](../rtm.md)                                  | 需求追溯矩阵（SM-10 更新）                |
| [phase2-metrics.md](../test-cases/phase2-metrics.md) | Phase 2 用例表（CLU 用例更新）            |
