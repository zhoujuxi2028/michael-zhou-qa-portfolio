# Implementation Plan — Phase 7: CI/CD + 可观测性

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Issue:** [#88](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/88)
**Branch:** `feature/performance-testing`
**Date:** 2026-04-17
**前置依赖:** Phase 6 的测试资产已存在（k6/JMeter smoke gate、coverage、Grafana、报告脚本）；本计划聚焦 Phase 7 设计与实施落地。

**Goal:** 为 Phase 7 建立正式实施计划，覆盖基线回归、覆盖率门禁、Grafana 面板增强、定时调度和 k6 补完能力，并为后续开发阶段提供单一执行依据。

**Tech Stack:** GitHub Actions, Jest coverage, k6, JMeter, Grafana, InfluxDB, Bash, Markdown

---

## 1. 架构设计

### 1.1 CI 门禁流

```text
lint
  → unit-tests (coverage threshold enforced)
  → smoke-test (k6)
  → jmeter-smoke-test
  → baseline-compare / trend-collect (Phase 7 target)
```

**设计决策：**

| 项目 | 决策 |
|------|------|
| 主需求来源 | `docs/project-management/requirements.md` + Issue `#88` |
| CI 失败策略 | 禁止 `|| true` / `continue-on-error`，低于阈值直接 fail |
| 覆盖率工具 | 复用 Jest coverage / Istanbul，不另引入平行门禁 |
| Phase 7 状态表达 | 区分“当前已落地 workflow”与“Phase 7 目标设计” |

### 1.2 文件结构

| 文件 | 类型 | 作用 |
|------|------|------|
| `.github/workflows/performance-ci.yml` | workflow | lint / unit / smoke / jmeter-smoke 主门禁 |
| `docs/project-management/requirements.md` | requirements index | Phase 1~7 主需求总览 |
| `docs/project-management/requirements/phase7-cicd.md` | detailed requirements | Phase 7 详细需求与编号解释 |
| `docs/qa/test-plan.md` | test strategy | 测试类型、门禁、命令、Phase 7 执行口径 |
| `docs/design/phase7/04-ci-flow-design.md` | design doc | CI / baseline / coverage / trend 设计说明 |
| `docs/qa/rtm.md` | RTM | 需求 ↔ 实现 ↔ 测试映射 |
| `docs/qa/test-cases/index.md` | case index | per-phase 用例总表与变更记录 |

---

## 2. 任务拆分

### Task 1: Baseline / Trend 设计落地

**Files:**
- Modify: `docs/design/phase7/04-ci-flow-design.md`
- Reference: `docs/project-management/requirements/phase7-cicd.md`
- Reference: `.github/workflows/performance-ci.yml`

- [ ] 明确当前 workflow 与 Phase 7 目标的边界
- [ ] 保留 baseline compare / trend collect 设计，但不把未落地 job 写成现状
- [ ] 统一 artifact、trend.json、PR comment 的命名与触发点
- [ ] 补充验证口径：不使用 `|| true` 或非阻塞 coverage workaround
- [ ] commit: `docs(perf): add formal phase 7 ci flow design`

### Task 2: Coverage gate 收敛

**Files:**
- Modify: `docs/design/phase7/04-ci-flow-design.md`
- Modify: `docs/qa/test-plan.md`
- Reference: `.github/workflows/performance-ci.yml`

- [ ] 统一 coverage 阈值：statements ≥ 80%、branches ≥ 70%、functions ≥ 80%、lines ≥ 80%
- [ ] 移除 `warning 不阻塞` 设计
- [ ] 将 test-plan 的 P0/P1 门禁说明改成 fail-fast 语义
- [ ] 将命令说明与现有 workflow / npm scripts 对齐
- [ ] commit: `docs(perf): align coverage gate with phase 7 rules`

### Task 3: 正式需求编号与主文档同步

**Files:**
- Modify: `docs/project-management/requirements.md`
- Reference: `docs/project-management/requirements/phase7-cicd.md`

- [ ] 在主需求文档中明确 Phase 7 正式编号体系：`PERF-BL-FR` / `PERF-COV-FR` / `PERF-OBS-FR` / `PERF-SCHED-FR` / `PERF-K6-FR`
- [ ] 修正 Phase 总览中的需求条数（5 组 22 条）
- [ ] 标明 Phase 7 主 issue 为 `#88`
- [ ] 补 Phase 7 需求摘要表，避免只在详细文档中出现编号
- [ ] commit: `docs(perf): register phase 7 requirement ids`

### Task 4: 测试计划与追溯矩阵同步

**Files:**
- Modify: `docs/qa/test-plan.md`
- Modify: `docs/qa/rtm.md`
- Modify: `docs/qa/test-cases/index.md`

- [ ] 将 `test-plan.md` 的总用例与分类统计同步到当前索引
- [ ] 清理 `95/95 PASS`、`26 Pass`、`23 cases`、`161 条用例` 等过时口径
- [ ] 修正 RTM 中 Phase 7 标题与引用为 `#88`
- [ ] 最小修正 `test-cases/index.md` 的 Phase 7 变更记录，使其与当前 33 条用例口径一致
- [ ] commit: `docs(perf): sync phase 7 test plan and rtm`

---

## 3. 验收标准

| 项目 | 验收标准 |
|------|----------|
| 正式计划 | `docs/project-management/implementation-plan-phase7.md` 存在并可独立指导开发 |
| 正式需求编号 | `requirements.md` 中可直接检出所有 `PERF-*` Phase 7 编号 |
| 测试计划 | `test-plan.md` 不再残留 `161` / `95/95` / `26 Pass` / `23 cases` 旧口径 |
| CI 设计 | `04-ci-flow-design.md` 不再出现 `|| true` 或覆盖率“warning 不阻塞” |
| 追溯一致性 | `requirements.md`、`rtm.md`、`test-cases/index.md` 对 Phase 7 主来源统一为 `#88` |

## 4. 验证命令

```bash
rg -n "PERF-BL-FR|PERF-COV-FR|PERF-OBS-FR|PERF-SCHED-FR|PERF-K6-FR" \
  docs/project-management/requirements.md \
  docs/qa/rtm.md

rg -n "161|95/95|26 Pass|23 cases" docs/qa/test-plan.md

rg -n "\\|\\| true|warning 不阻塞" docs/design/phase7/04-ci-flow-design.md

rg -n "#116|#88" \
  docs/project-management/requirements.md \
  docs/qa/rtm.md \
  docs/qa/test-cases/index.md
```

---

## 5. Plan Review 修复记录

| ID | 级别 | 问题 | 修复 |
|----|------|------|------|
| C-01 | CRITICAL | Phase 7 缺少正式 `implementation-plan-phase7.md` | 新增本文件，作为设计阶段正式实施计划 |
| C-02 | CRITICAL | `requirements.md` 未正式承载 Phase 7 `PERF-*` 编号 | 在主需求文档增加 Phase 7 摘要与编号口径 |
| C-03 | CRITICAL | `test-plan.md` 统计与 PASS 标准停留在旧阶段 | 同步到当前 Phase 1~7 索引和现有 workflow 事实 |
| C-04 | CRITICAL | `04-ci-flow-design.md` 存在 `|| true` 与非阻塞 coverage 设计 | 改为 fail-fast 设计，与项目 CI 规则一致 |
| W-01 | WARNING | RTM 对 Phase 7 的标题引用为 `#116`，与主需求冲突 | 统一为 `#88` 主口径；历史 issue 只作补充说明 |
| W-02 | WARNING | `test-cases/index.md` 的 Phase 7 变更记录与当前 33 条用例不一致 | 做最小补正，不扩展为全量历史重算 |

## 6. 备注

- 本计划面向 Phase 7 正式设计评审，不替代开发阶段的逐步验证。
- 如后续发现 `test-cases/index.md` 历史统计存在系统性偏差，应单独开“统计重算”任务，不在本计划内扩张范围。
