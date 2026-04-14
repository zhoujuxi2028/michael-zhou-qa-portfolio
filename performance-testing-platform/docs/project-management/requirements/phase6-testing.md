# Phase 6 — 测试能力扩展 📋 Planned ([#86](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/86))

> 依赖 Phase 5 的 helpers/profiles 基础设施，扩展 k6 测试能力

## 6.1 目标

在 Phase 5 基础设施之上，统一 k6 脚本架构、新增 breakpoint 崩溃测试和 API 限流/熔断测试、自动生成执行摘要报告。

| 维度     | 当前状态                             | 目标状态                      |
| ------ | -------------------------------- | ------------------------- |
| k6 一致性 | 脚本间 assertions/sleep/funnel 逻辑重复 | 统一 helpers，消除重复代码         |
| 崩溃测试   | 只有安全上限 (capacity)                | 新增 breakpoint test 找绝对崩溃点 |
| 限流/熔断  | 无弹性工程测试                          | rate limiter + 熔断恢复行为验证   |
| 报告     | HTML + Grafana                   | 新增执行摘要报告（Markdown）        |

## 6.2 用户故事

| ID    | 用户故事                                                                    | 验收标准                                                               | 关联需求            |
| ----- | ----------------------------------------------------------------------- | ------------------------------------------------------------------ | --------------- |
| US-28 | 作为性能工程师，我想所有 k6 脚本使用一致的 assertions 和 sleep 模式，以便降低维护成本和减少 copy-paste 错误 | ≥4 个脚本 import 统一 helpers（funnel/checkStatus/thinkTime），无内联重复代码     | ENT-CONSISTENCY |
| US-29 | 作为性能工程师，我想找到系统的绝对崩溃点（而非安全上限），以便了解系统的极限行为                                | breakpoint.k6.js 输出崩溃点 VUs + 崩溃类型（graceful/catastrophic）           | ENT-BREAKPOINT  |
| US-34 | 作为性能工程师，我想测试 API 限流和熔断行为，以便验证系统的弹性工程能力                                  | 超限请求返回 429；窗口过后恢复 200；熔断恢复时间可度量                                    | ENT-RESILIENCE  |
| US-27 | 作为性能工程师，我想在测试结束后自动生成执行摘要（SLA 达标率、关键指标、对比），以便给管理层汇报                      | `scripts/generate-summary.sh` 生成 Markdown 摘要，含 SLA 达标率 + Top 5 慢接口 | ENT-REPORT      |

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
| Breakpoint Test | k6 `ramping-arrival-rate` executor 支持持续递增，无需额外工具 | ✅ 可行 |
| express-rate-limit | 成熟 npm 包 (周下载 3M+)，零配置集成 Express，支持自定义 windowMs + max | ✅ 可行 |
| generate-summary.sh | 依赖 `jq` 解析 k6 JSON output；GitHub runner 预装 jq，本机 `brew install jq` | ✅ 可行 |
| 现有脚本迁移 | 需逐脚本替换内联代码为 helper import，涉及 load/stress/capacity/soak 4 个文件 | ✅ 可行，但需回归验证 |

### 技术风险

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| helpers 重构导致现有脚本回归 | 重构后 load/stress/capacity/soak 行为可能变化 | 迁移前后对比 smoke 结果（p95/error rate），确保无回归 |
| express-rate-limit 在 Cluster 模式下的 store | 默认 MemoryStore 是 per-worker，多 Worker 各自独立计数 | 文档注明：Cluster 模式下 rate limit 按 Worker 隔离；如需全局限流需 Redis store (Out of Scope) |
| breakpoint test 可能导致系统不可用 | 持续递增到崩溃，可能需手动 kill 进程 | 设置 k6 `maxDuration` 上限 (如 10min)；脚本内置 abort threshold (error > 80%) |
| generate-summary.sh 依赖 k6 JSON output 格式 | k6 版本升级可能改变 JSON 结构 | 脚本内做字段存在性检查，缺失字段输出 warning 而非 crash |

## 6.6 依赖识别

| 依赖 | 说明 | 关联需求 | 状态 |
|------|------|---------|------|
| Phase 5 helpers | env.js / profiles / SharedArray 基础设施 | ENT-CONSISTENCY | Phase 5 交付 |
| express-rate-limit | Express 限流中间件，npm 安装 | ENT-RESILIENCE | 需安装 |
| jq | shell 脚本解析 k6 JSON output | ENT-REPORT | ✅ 本机已有 / GitHub runner 预装 |
| k6 `--out json` | k6 JSON output flag，generate-summary.sh 的数据源 | ENT-REPORT | ✅ k6 内置 |

## 6.7 需求 Checklist

| # | 检查项 | 状态 |
|---|--------|------|
| 1 | 目标明确 | ✅ 测试能力扩展，4 个维度 |
| 2 | 完整用户故事 + 验收标准 | ✅ US-27/28/29/34，每条含验收标准 |
| 3 | Scope 已确认 | ✅ 4 个模块，明确 In/Out |
| 4 | 可行性评估 | ✅ 5 项评估，全部可行；4 项技术风险已识别 |
| 5 | 依赖已识别 | ✅ 4 项依赖（含 Phase 5 前置） |
| 6 | 需求已编号 | ✅ 4 组 11 条: ENT-CONSISTENCY(5) + ENT-BREAKPOINT(2) + ENT-RESILIENCE(3) + ENT-REPORT(1) |
| 7 | 需求描述已写入 | ✅ 本文档 §6.1~6.6 |
