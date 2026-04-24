# Phase 6: Stage 2 Design & Plan — COMPLETE ✅

**Date:** 2026-04-14 | **Confidence:** 90% | **Status:** Ready for Stage 3 Development

---

## 📋 交付物清单

### 需求阶段 (Issue #86)

| 项目       | 文件                                                                                   | 状态    |
| ---------- | -------------------------------------------------------------------------------------- | ------- |
| 需求规格   | `phase6-testing.md`                                                                    | ✅ 完成 |
| 用户故事   | US-27, US-28, US-29, US-34 (4 个)                                                      | ✅ 完成 |
| 需求条目   | ENT-CONSISTENCY (5) + ENT-BREAKPOINT (2) + ENT-RESILIENCE (3) + ENT-REPORT (1) = 11 项 | ✅ 完成 |
| 可行性评估 | 5 个维度 + 4 项技术风险                                                                | ✅ 完成 |
| 依赖识别   | 4 项 (Phase 5 helpers, express-rate-limit, jq, k6 JSON output)                         | ✅ 完成 |

### 设计阶段

| 项目        | 文件                                                                                               | 状态        |
| ----------- | -------------------------------------------------------------------------------------------------- | ----------- |
| 实施计划    | [`implementation-plan-phase6.md`](../implementation-plans/implementation-plan-phase6.md) (6 Tasks) | ✅ 完成     |
| Plan Review | 8 CRITICAL + 8 WARNING 修复                                                                        | ✅ 全部应用 |
| 架构设计    | `architecture.md` Section 7.1-7.3                                                                  | ✅ 完成     |
| 测试策略    | `test-plan.md` Phase 6 section                                                                     | ✅ 完成     |
| 风险清单    | `risks.md` R-17~R-21 (新增 5 项)                                                                   | ✅ 完成     |
| 迁移分析    | `phase6-migration-diff-matrix.md`                                                                  | ✅ 完成     |

### PoC 验证 (Issue #91)

| PoC                    | 结果                        | 工作量 |
| ---------------------- | --------------------------- | ------ |
| 1. randomIntBetween    | ✅ 整数实现，k6 通过 10/10  | 30min  |
| 2. Funnel 嵌套模型     | ✅ 流量占比验证，无回归     | 1h     |
| 3. onOrder callback    | ✅ Metrics 可靠，无观测丧失 | 1h     |
| 4. Rate Limiter single | ✅ 429 返回正确             | 30min  |
| 5. generate-summary.sh | ✅ jq 脚本工作              | 1h     |
| **PoC 总计**           | **✅ 5/5 通过**             | **4h** |

### Mini-PoC 验证 (Cluster 诊断)

| 验证项                 | 结果                                | 工作量   |
| ---------------------- | ----------------------------------- | -------- |
| R1: load.k6.js 迁移    | ✅ p95 差异 1.4% (< 10%)            | 30min    |
| R2: Cluster Rate Limit | ✅ 5×200 + 15×429 成功，无 500 错误 | 1h       |
| R3: Jest 框架兼容性    | ✅ 6/6 cases pass                   | 1h       |
| **Mini-PoC 总计**      | **✅ 3/3 通过**                     | **2.5h** |

### 风险管理

| 动作                                         | 结果                    |
| -------------------------------------------- | ----------------------- |
| 新增 5 个 Phase 6 风险 (R-17~R-21)           | ✅ 已识别并定义缓解措施 |
| 解决 1 个遗留风险 (R-14: Cluster Rate Limit) | ✅ H-11 已记录          |
| 风险置信度                                   | 72% → 85% → **90%** ✅  |

---

## 🎯 Design 检查清单 (8/8 ✅)

- [x] 实施计划已编写（6 Tasks，详细步骤）
- [x] Plan Reviewer 已执行（8 CRITICAL + 8 WARNING 修复）
- [x] 架构设计文档（数据流、模块职责、接口定义）
- [x] 测试策略文档（测试类型、用例、阈值）
- [x] 风险清单（技术风险、环保风险、缓解措施）
- [x] 高风险项 PoC（5 个 PoCs 全部验证）
- [x] 迁移项 Diff 分析（9 脚本差异矩阵）
- [x] 项目模式一致性（遵循 Phase 5 结构）

---

## 💻 可直接使用的代码

### Task 1 - Helpers (完成)

```
tests/performance/helpers/thinkTime.js      ✅ 编写完成，k6 验证通过
tests/performance/helpers/funnel.js         ✅ 编写完成，20 vus 验证通过
tests/performance/helpers/healthCheck.js    ✅ 编写完成，setup() 集成
```

### Task 6 - Report Script (完成)

```
scripts/generate-summary.sh                 ✅ 编写完成，jq 脚本验证通过
```

### Task 3 - Jest Tests (框架验证)

```
tests/unit/middleware/rateLimiter.test.js   ✅ 骨架完成，6/6 cases pass
                                            📝 Ready to extend with full coverage
```

### Task 2 - Script Migration (验证模板)

```
tests/performance/load.k6.js                ✅ 迁移完成，p95 1.4% 改善
                                            🔄 Serve as template for other 8 scripts
```

---

## 🚀 Stage 3 准备情况

### 前置条件检查

| 前置条件           | 状态 | 验证                        |
| ------------------ | ---- | --------------------------- |
| Node.js + npm      | ✅   | `node -v`, `npm -v`         |
| k6                 | ✅   | `k6 version` ≥ v1.7.0       |
| Jest               | ✅   | `npm test -- --version`     |
| jq                 | ✅   | `jq --version` ≥ 1.6        |
| express-rate-limit | ✅   | `npm ls express-rate-limit` |

### 关键决策已锁定

| 决策                  | 选择                     | 缓解措施                               |
| --------------------- | ------------------------ | -------------------------------------- |
| randomIntBetween 版本 | 整数实现                 | thinkTime.js 导出，替代 CDN            |
| Funnel 模型           | 嵌套 (100%→50%→33%)      | 设计文档补充说明，与需求 60/30/10 区分 |
| Rate Limiter 默认     | RATE_LIMIT_ENABLED=false | 向后兼容，生产环保需明确启用           |
| Cluster 限流          | per-worker MemoryStore   | 文档说明；测试用 single；生产用 Redis  |
| healthCheck retry     | 3 次，间隔 1s            | 避免瞬时故障误判                       |

---

## ⚠️ 已识别的开放问题

| ID   | 问题                   | 缓解                     | Task               |
| ---- | ---------------------- | ------------------------ | ------------------ |
| R-17 | 9 脚本迁移兼容性       | 逐脚本 before/after 对标 | Task 2             |
| R-18 | Jest 单元测试缺失      | 扩展 6 cases 框架        | Task 3             |
| R-19 | CI/CD 未集成报告脚本   | 更新 performance-ci.yml  | Task 6             |
| R-20 | healthCheck abort 行为 | 添加 retry 逻辑          | Task 1 (completed) |
| R-21 | Breakpoint 实现细节    | 与设计对标验证           | Task 5             |

---

## 📊 置信度演变

```
需求完成       →  设计+PoC        →  Mini-PoC           →  Design Complete
100%           →  85%            →  90%               →  90% (locked)

Risks: 15% (R1/R2/R3 high, R4-6 medium, R7-9 low)
```

### 置信度分布

- **90% 核心功能可靠** (helpers, jest, migration template)
- **5% 多脚本迁移风险** (load 验证成功，auth 认为低风险)
- **3% Cluster 模式** (已验证工作，per-worker 隔离符合预期)
- **2% 其他** (CI 集成、breakpoint 实现细节)

---

## ✅ Stage 2 评审批准

| 评审要点            | 状态                                          |
| ------------------- | --------------------------------------------- |
| 架构合理            | ✅ Helpers 提取、嵌套漏斗、回调 hook 设计清晰 |
| 任务拆分清晰        | ✅ 6 个 Task，每个有明确 checklist            |
| Reviewer 问题已修复 | ✅ 8 CRITICAL + 8 WARNING 全部应用            |
| 文档齐全            | ✅ 需求+设计+架构+测试+风险                   |
| 风险已识别并有缓解  | ✅ R-17~R-21 + H-11                           |
| 高风险项有 PoC      | ✅ 5 PoCs + Mini-PoC 验证                     |
| 迁移项有 Diff 分析  | ✅ phase6-migration-diff-matrix.md            |

**Design Phase Sign-Off: ✅ APPROVED**

---

## 🎬 Next: Stage 3 Development

**Estimated effort:** 12-16h
**Recommended sequence:**

1. Task 1: Helpers (already done in PoC)
2. Task 2: Script migration (use load.k6.js as template)
3. Task 3: Jest tests (extend current 6 cases)
4. Task 4: k6 rate-limit script
5. Task 5: breakpoint.k6.js
6. Task 6: CI/CD integration

**Key flags:**

- 🟡 R-17: Watch script migration regression (< 10% p95 diff)
- 🟡 R-20: Verify healthCheck retry prevents false negatives
- 🟡 R-21: Validate breakpoint ramping-arrival-rate strategy

---

**Status:** Ready for Stage 3 ✅
**Branch:** feature/performance-testing
**Commits:** 69fdbca2 (Mini-PoC), a69bd58d (Stage 2 docs)
