# Phase 6 — 测试能力扩展 📋 Planned

> 依赖 Phase 5 的 helpers/profiles 基础设施，扩展 k6 测试能力

## 6.1 目标

在 Phase 5 基础设施之上，统一 k6 脚本架构、新增 breakpoint 崩溃测试和 API 限流/熔断测试、自动生成执行摘要报告。

| 维度 | 当前状态 | 目标状态 |
|------|---------|---------|
| k6 一致性 | 脚本间 assertions/sleep/funnel 逻辑重复 | 统一 helpers，消除重复代码 |
| 崩溃��试 | 只有安全上限 (capacity) | 新增 breakpoint test 找绝对崩溃点 |
| 限流/熔断 | 无弹性工程测试 | rate limiter + 熔断恢复行为验证 |
| 报告 | HTML + Grafana | 新增执行摘要报告（Markdown） |

## 6.2 用户故事

| ID | 用户故事 | 关联需求 |
|----|---------|---------|
| US-28 | 作为性能工程师，我想所有 k6 脚本使用一致的 assertions 和 sleep 模式，以便降低维护成本和减少 copy-paste 错误 | ENT-CONSISTENCY |
| US-29 | 作为性能工程师，我想找到系统的绝对崩溃点（而非安全上限），以便了解系统的极限行为 | ENT-BREAKPOINT |
| US-34 | 作为性能工程师，我想测试 API 限流和熔断行为，以便验证系统的弹性工程能力 | ENT-RESILIENCE |
| US-27 | 作为性能工程师，我想在测试结束后自动生成执行摘要（SLA 达标率、关键指标、对比），以便给管理层汇报 | ENT-REPORT |

## 6.3 需求列表

### 6.3.1 k6 脚本一致性重构（ENT-CONSISTENCY）

| ID | 需求 | 优先级 | 工作量 |
|----|------|--------|--------|
| ENT-CONSISTENCY-01 | 统一所有 k6 脚本的 HTTP 断言方式：全部使用 `checkStatus()` helper，替代直接 `check()` 调用 | P1 | 小 |
| ENT-CONSISTENCY-02 | 统一 sleep/think time 模式：提取 `helpers/thinkTime.js`，标准化 `sleep(randomIntBetween(0.5, 1))` | P1 | 小 |
| ENT-CONSISTENCY-03 | 提取漏斗逻辑到 `helpers/funnel.js`：60% browse → 30% detail → 10% order，消除 load/stress/capacity/soak 中的重复代码 | P1 | 中 |
| ENT-CONSISTENCY-04 | 所有标准测试脚本 (smoke/load/stress/spike) 添加 health check 前置验证 | P2 | 小 |
| ENT-CONSISTENCY-05 | 现有脚本迁移: load/stress/capacity/soak 统一 import helpers（funnel/checkStatus/thinkTime），移除内联重复代码 | P1 | 中 |

### 6.3.2 Breakpoint Test（ENT-BREAKPOINT）

| ID | 需求 | 优先级 | 工作量 |
|----|------|--------|--------|
| ENT-BREAKPOINT-01 | 新增 `breakpoint.k6.js`：持续递增 VUs 直到系统崩溃（error rate > 50% 或完全不响应），记录崩溃点 VUs 和崩溃行为 | P1 | 中 |
| ENT-BREAKPOINT-02 | 崩溃行为分类：区分 graceful degradation（渐进退化）vs catastrophic failure（级联崩溃） | P1 | 小 |

> 注: Breakpoint Test 与 Capacity Test 的区别 — Capacity 找安全上限 (SLA 不违反)，Breakpoint 找绝对崩溃点 (系统不可用)。

### 6.3.3 API 限流/熔断测试（ENT-RESILIENCE）

| ID | 需求 | 优先级 | 工作量 |
|----|------|--------|--------|
| ENT-RESILIENCE-01 | Rate limiter 中间件: Express 添加 `express-rate-limit`，可配置 windowMs + max requests | P0 | 小 |
| ENT-RESILIENCE-02 | k6 限流测试脚本: `rate-limit.k6.js` 验证超限返回 429、窗口过后恢复正常 | P0 | 中 |
| ENT-RESILIENCE-03 | 熔断行为测试: 验证系统在持续超载后的恢复时间（graceful degradation vs cascading failure） | P2 | 中 |

### 6.3.4 执行摘要报告（ENT-REPORT）

| ID | 需求 | 优先级 | 工作量 |
|----|------|--------|--------|
| ENT-REPORT-01 | `scripts/generate-summary.sh` 解析 k6 JSON output，生成 Markdown 摘要（SLA 达标率、Top 5 慢接口、对比基线） | P1 | 中 |

### 6.3.5 单元测试（ENT-TEST — Phase 6 部分）

| ID | 需求 | 优先级 | 工作量 |
|----|------|--------|--------|
| ENT-TEST-04 | 基线对比单元测试: 回归检测阈值判定、首次运行无 baseline 兜底 | P1 | 小 |

## 6.4 Scope 确认

| 模块 | In Scope | Out of Scope |
|------|----------|--------------|
| **ENT-CONSISTENCY k6 一致性** | checkStatus 统一、funnel 提取、sleep 标准化、现有脚本迁移 | 全量脚本重写 |
| **ENT-BREAKPOINT 崩溃测试** | breakpoint.k6.js 找绝对崩溃点 | 分布式多节点压测 |
| **ENT-RESILIENCE 限流/熔断** | express-rate-limit + k6 限流脚本 + 熔断恢复测试 | 服务网格 (Istio) 级别限流 |
| **ENT-REPORT 执行摘要** | Markdown 报告 | PDF 生成、邮件自动发送 |

## 6.5 可行性评估

| 维度 | 评估 | 结论 |
|------|------|------|
| k6 helpers 提取 | checkStatus/funnel/thinkTime 均为纯 JS 函数，提取无风险 | ✅ 可行 |
| Breakpoint Test | k6 ramping-arrival-rate executor 支持持续递增，无需额外工具 | ✅ 可行 |
| express-rate-limit | 成熟 npm 包，零配置集成 Express，支持自定义 windowMs + max | ✅ 可行 |

## 6.6 依赖识别

| 依赖 | 说明 | 关联需求 | 状态 |
|------|------|---------|------|
| Phase 5 helpers | env.js / profiles / SharedArray 基础设施 | ENT-CONSISTENCY | Phase 5 交付 |
| express-rate-limit | Express 限流中间件，npm 安装 | ENT-RESILIENCE | 需安装 |

## 6.7 需求 Checklist

| # | 检查项 | 状态 |
|---|--------|------|
| 1 | 目标明确 | ✅ 测试能力扩展，4 个维度 |
| 2 | 完整用户故事 | ✅ US-27/28/29/34 |
| 3 | Scope 已确认 | ✅ 4 个模块，明确 In/Out |
| 4 | 可行性评估 | ✅ 3 项评估，全部可行 |
| 5 | 依赖已识别 | ✅ 2 项依赖（含 Phase 5 前置） |
| 6 | 需求已编号 | ✅ 5 组 12 条: ENT-CONSISTENCY(5) + ENT-BREAKPOINT(2) + ENT-RESILIENCE(3) + ENT-REPORT(1) + ENT-TEST(1) |
| 7 | 需求描述已写入 requirements.md | ✅ 本文档 §6.1~6.6 |
