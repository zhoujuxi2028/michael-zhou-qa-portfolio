# Portfolio 缺陷登记主表（Defect & Waiver Register）

> **范围:** Portfolio 跨项目缺陷 + 仓库级（CI/CD、文档、流程）问题  
> **维护规则:** 每次 Issue 状态变化 24h 内同步；Closed 行保留历史，永不删除  
> **制度文档:** [README.md](README.md) | [waiver-policy.md](waiver-policy.md)  
> **项目级登记表:** 见末尾"项目级登记入口"

---

## 1. 严重度速查

| 级别 | Gate 影响 | 必须 RCA? | 可 Waiver? |
|------|-----------|-----------|------------|
| P0 / Critical | 立即 BLOCKED | ✅ | ❌ |
| P1 / High | Blocking 时 BLOCKED | ✅ | 仅非核心场景 |
| P2 / Medium | 不阻塞 | 可选 | ✅ |
| P3 / Low | 不阻塞 | 否 | ✅ |

定义详情见 [README.md §3](README.md#3-严重度定义portfolio-统一)。

---

## 2. 活跃缺陷登记表（Active Defects）

> 跨项目或仓库级问题。项目内缺陷优先登记在项目级表，重大或跨项目影响的同步登记本表。

| Defect ID | GitHub Issue | 标题摘要 | 项目 / 范围 | 严重度 | Blocking? | 发现日期 | 状态 | 关联 Waiver | 关联 RCA / Postmortem |
|-----------|--------------|----------|-------------|--------|-----------|----------|------|-------------|------------------------|
| _(暂无 Portfolio 级活跃缺陷)_ | | | | | | | | | |

> 已存在的项目级活跃缺陷请见对应项目登记表（见第 6 节"项目级登记入口"）。

---

## 3. Waiver 登记表（Active Waivers）

> 仅 P1 非核心 / P2 / P3 可申请 Waiver；P0 不得 Waiver。审批流程见 [waiver-policy.md](waiver-policy.md)。

| Waiver ID | 关联 Defect | 关联 Issue | 项目 / 范围 | 豁免理由 | 风险评估 | 审批人 | 审批日期 | 有效期 | 状态 |
|-----------|-------------|------------|-------------|----------|----------|--------|----------|--------|------|
| _(暂无 Portfolio 级 Waiver)_ | | | | | | | | | |

---

## 4. 已关闭缺陷历史（Closed Defects）

> Closed 行**永不删除**，供审计追溯。

| Defect ID | GitHub Issue | 标题摘要 | 项目 / 范围 | 严重度 | 关闭日期 | 关闭方式 | 关联 Commit / PR |
|-----------|--------------|----------|-------------|--------|----------|----------|-------------------|
| _(初始建表，暂无 Portfolio 级 Closed 历史)_ | | | | | | | |

---

## 5. 跨项目模式追踪（Pattern Tracking）

> 同类缺陷季度内 ≥ 3 次时，触发专项 Postmortem（见 [README.md §7](README.md#7-与-rca--postmortem-的联动)）。

| 模式 | 触发次数（本季度） | 季度 | 关联 Defect IDs | 关联 Postmortem | 状态 |
|------|--------------------|------|-----------------|-----------------|------|
| _(无活跃模式)_ | | | | | |

---

## 6. 项目级登记入口

| 项目 | 登记表位置 | 当前活跃数 | 最近更新 |
|------|------------|-----------|---------|
| performance-testing-platform | [stage4-defect-waiver-register.md](../../../performance-testing-platform/docs/qa/stage4-defect-waiver-register.md) | 2（DEF-001、DEF-002） | 2026-04-24 |
| api-testing-demo | _(按需初始化，复制 [模板](defect-register-template.md))_ | — | — |
| playwright-demo | _(按需初始化)_ | — | — |
| selenium-demo | _(按需初始化)_ | — | — |
| iwsva-cypress-e2e | _(按需初始化)_ | — | — |
| security-testing-demo | _(按需初始化)_ | — | — |
| k8s-auto-testing-platform | _(按需初始化)_ | — | — |
| sid-iam-testing-platform | _(按需初始化)_ | — | — |
| microservice-testing-platform | _(按需初始化)_ | — | — |
| cicd-demo | _(按需初始化)_ | — | — |
| ai-testing-platform | _(按需初始化)_ | — | — |

> 初始化步骤详见 [README.md §11](README.md#11-当前在用的项目级登记表)。

---

## 7. 变更日志

| 日期 | 变更内容 | 操作人 |
|------|----------|--------|
| 2026-04-25 | 初始建表；Portfolio 级跟踪系统 v1.0 落地；登记 11 个项目级入口 | QA |
