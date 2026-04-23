# RCA 分析：cluster.js 测试覆盖缺失

**日期：** 2026-04-19
**发现方式：** 代码审查 / 覆盖率分析
**影响范围：** `performance-testing-platform/src/cluster.js`
**严重程度：** 中等（文档声明有测试但实际未实现）

---

## 1. 问题描述

| 维度 | 详情 |
|------|------|
| **文件** | `src/cluster.js`（14 行代码） |
| **覆盖率** | 0% (Statements / Branches / Functions / Lines) |
| **文档状态** | `phase2-metrics.md` 定义了 CLU-01~03 共 3 条测试用例 |
| **实际状态** | `tests/unit/cluster.test.js` 不存在，无任何测试文件 |
| **RTM 状态** | `rtm.md` 中 SM-10 标记为 ✅，但实际测试未实现 |
| **ID 注册** | `ID-CONVENTION.md` 已注册 `CLU` 前缀，指向不存在的测试文件 |

### 核心矛盾

**文档说"已测试" ≠ 实际"已测试"**。RTM、用例索引、ID 注册均已完成，但测试代码从未编写。

---

## 2. 根因分析 (5 Whys)

```
Q1: 为什么 cluster.js 没有测试？
A1: 测试文件从未创建。

Q2: 为什么测试文件从未创建？
A2: Phase 2 开发时将 CLU-01~03 标记为"UT P2 regression"，但只停留在用例设计阶段，
    未进入编码阶段。

Q3: 为什么用例设计后未编码？
A3: cluster.js 的测试需要 mock Node.js 内置 cluster 模块，技术难度高于普通 
    Express 路由测试。Phase 2 时优先完成了更紧急的系统指标采集和容量测试。

Q4: 为什么未跟踪到这个遗漏？
A4: RTM 和用例文档在 Phase 2 同步更新时，将"用例已设计"等同于"用例已实现"，
    状态标记为 ✅ 而非 🔲（待实现）。

Q5: 为什么覆盖率门禁没有拦截？
A5: jest.config.js 中 coverageThreshold 设为全局 80%，但 cluster.js 代码量仅 14 行，
    对全局覆盖率影响极小（< 0.5%），被其他模块的高覆盖率稀释。
```

---

## 3. 根因总结

| 编号 | 根因类型 | 说明 |
|------|----------|------|
| RC-1 | **流程缺陷** | RTM 验证流程缺少"测试文件存在性检查"步骤 |
| RC-2 | **文档不一致** | 用例设计状态与实现状态混淆，缺少区分机制 |
| RC-3 | **覆盖率盲区** | 全局覆盖率门禁无法检测单个文件 0% 覆盖的情况 |
| RC-4 | **技术债务** | 需要 mock 内置模块的测试被推迟后遗忘 |

---

## 4. 修复措施

### 4.1 立即修复（本次 PR）

| 措施 | 状态 |
|------|------|
| 创建 `tests/unit/cluster.test.js`（12 个单元测试） | ✅ 已完成 |
| 创建 `tests/integration/cluster.integration.test.js`（3 个集成测试） | ✅ 已完成 |
| 更新 `phase2-metrics.md` 用例表（CLU-01a~04a + CLU-INT-01~03） | ✅ 已完成 |
| 更新 `index.md` 用例计数 | ✅ 已完成 |
| 更新 `ID-CONVENTION.md` 注册 CLU-INT 前缀 | ✅ 已完成 |
| 更新 `rtm.md` 需求追溯映射 | ✅ 已完成 |

### 4.2 流程改进建议

| 编号 | 改进措施 | 目标 | 优先级 |
|------|----------|------|--------|
| FIX-1 | **RTM 验证脚本**：新增自动检查 RTM 中 ✅ 的用例文件是否存在 | 防止文档与代码不一致 | P1 |
| FIX-2 | **用例状态区分**：在用例表增加"实现状态"列（📝 已设计 / ✅ 已实现 / ⏳ 延期） | 明确区分设计 vs 实现 | P1 |
| FIX-3 | **Per-file 覆盖率检查**：在 CI 中增加检查 `src/` 下每个文件至少被 1 个测试文件 import 或 require | 防止覆盖率盲区 | P2 |
| FIX-4 | **Phase 结束 Checklist**：每个 Phase 结束前，检查所有标记为"UT"的用例 ID 对应的测试文件是否存在 | 阶段交付物验证 | P1 |
| FIX-5 | **Common Pitfalls 更新**：将此 RCA 记录为 ISS-015 加入 CLAUDE.md 的 Common Pitfalls 表 | 团队知识沉淀 | P2 |

---

## 5. 新增测试清单

### 单元测试（12 条）

| ID | 测试场景 | 验证点 |
|----|----------|--------|
| CLU-01a | 4 核 CPU fork | `cluster.fork()` 调用 4 次 |
| CLU-01b | 2 核 CPU fork | `cluster.fork()` 调用 2 次 |
| CLU-01c | 8 核 CPU fork | `cluster.fork()` 调用 8 次 |
| CLU-01d | Master 启动日志 | 日志包含 Worker 数量 |
| CLU-01e | exit 监听注册 | `cluster.on('exit')` 被调用 |
| CLU-02a | Worker 加载 server | `require('./server')` 被执行 |
| CLU-02b | Worker 不 fork | Worker 分支不创建子进程 |
| CLU-02c | Worker 不监听 exit | Worker 分支无 exit handler |
| CLU-03a | 崩溃触发 fork | exit 回调中调用 `cluster.fork()` |
| CLU-03b | 重启日志含 PID | 日志匹配 Worker PID |
| CLU-03c | 连续崩溃均重启 | 3 次 exit → 3 次 fork |
| CLU-04a | 单核边界 | 1 核只 fork 1 个 Worker |

### 集成测试（3 条）

| ID | 测试场景 | 验证点 |
|----|----------|--------|
| CLU-INT-01 | 服务可用性 | 启动后 5 次 HTTP 请求均返回 200 |
| CLU-INT-02 | 崩溃恢复 | kill Worker → 服务自动恢复 |
| CLU-INT-03 | 优雅关闭 | SIGTERM → 端口释放 |

---

## 6. 影响评估

| 维度 | 修复前 | 修复后 |
|------|--------|--------|
| cluster.js 覆盖率 | 0% | 100% (所有分支、函数、行) |
| Phase 2 单元测试 | 23 | 32 (+9) |
| Phase 2 集成测试 | 9 | 12 (+3) |
| 总用例数 | 357 | 369 (+12) |
| RTM 准确性 | ❌ 虚标 | ✅ 真实 |

---

## 7. 经验教训

> **"文档完成 ≠ 代码完成"** — RTM 和用例索引的 ✅ 必须基于测试文件的实际存在，
> 不能基于"计划要写"。

> **全局覆盖率 ≥ 80% 不代表每个文件都被测试** — 小文件的 0% 覆盖率会被大文件的高覆盖率稀释，
> 需要 per-file 检查机制作为补充。

> **技术难度高的测试不能推迟后遗忘** — 需要 mock 内置模块的测试应在当 Phase 内完成，
> 或明确标记为"延期"并创建 follow-up issue。
