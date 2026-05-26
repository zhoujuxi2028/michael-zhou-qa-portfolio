# Portfolio 需求台账（Requirements Register）

> **范围：** Portfolio 跨项目需求 + 仓库级（CI/CD、文档规范、质量体系）需求
> **维护规则：** Issue 状态变化 24h 内同步；Closed 行保留历史，永不删除
> **制度文档：** [README.md](README.md)
> **RTM：** [RTM.md](RTM.md)
> **项目级需求入口：** 见末尾"项目级需求入口"

---

## 1. 优先级速查

| 级别 | Gate 影响 | 可 Defer? |
|------|-----------|-----------|
| P1 / Must Have | 阻断 Stage Gate | 仅紧急情况 |
| P2 / Should Have | Stage 5 前必须闭环 | ✅ |
| P3 / Could Have | 不阻塞 | ✅ |
| P4 / Won't Have | 不阻塞，直接 Dropped | — |

定义详情见 [README.md §4](README.md#4-优先级定义)。

---

## 2. 活跃需求台账（Active Requirements）

| REQ ID | GitHub Issue | 标题摘要 | 项目 / 范围 | 类型 | 优先级 | 提出日期 | 状态 | 关联 CR |
|--------|--------------|----------|-------------|------|--------|----------|------|---------|
| PREQ-001 | — | 所有 CI workflow 必须配置路径过滤（`paths`），避免不相关变更触发 | 仓库级 / CI 规范 | CON | P1 | 2026-05-26 | Verified | — |
| PREQ-002 | — | 所有 CI workflow 必须配置 `concurrency` 并标明 `cancel-in-progress` 策略 | 仓库级 / CI 规范 | CON | P2 | 2026-05-26 | Verified | — |
| PREQ-003 | — | 安全类 workflow（CodeQL、Trivy）必须将结果上传至 GitHub Security SARIF | 仓库级 / 安全 | NFR | P1 | 2026-05-26 | Verified | — |
| PREQ-004 | — | 所有测试产物（JUnit XML、HTML 报告）必须上传至 GitHub Artifacts，保留期 ≥ 14 天 | 仓库级 / 可追溯性 | NFR | P1 | 2026-05-26 | Verified | — |
| PREQ-005 | — | 每个子项目必须有对应的 CI workflow，覆盖代码质量检查和测试执行 | 仓库级 / CI 规范 | FR | P1 | 2026-05-26 | Verified | — |
| PREQ-006 | — | Portfolio 级需求管理系统：README + 台账 + 模板 + RTM | 仓库级 / QA 体系 | DEMO | P1 | 2026-05-26 | In Development | — |
| PREQ-007 | — | CI/CD workflow 设计文档覆盖所有 workflow（`docs/ci-cd/workflow-design.md`） | 仓库级 / 文档 | DEMO | P2 | 2026-05-26 | Verified | — |
| PREQ-008 | — | 缺陷管理系统覆盖：台账 + Waiver 政策 + Flaky 分级 + 依赖风险 SLA | 仓库级 / QA 体系 | DEMO | P1 | 2026-05-26 | Verified | — |

---

## 3. 延期需求（Deferred Requirements）

| REQ ID | 标题摘要 | 优先级 | 延期原因 | 目标阶段 / 日期 | 批准人 |
|--------|----------|--------|----------|----------------|--------|
| _(暂无)_ | | | | | |

---

## 4. 已关闭需求历史（Closed Requirements）

> Closed 行**永不删除**，供审计追溯。

| REQ ID | 标题摘要 | 项目 / 范围 | 优先级 | 关闭日期 | 关闭方式 | 关联 PR / Commit |
|--------|----------|-------------|--------|----------|----------|-----------------|
| _(待归档)_ | | | | | | |

---

## 5. 已废弃需求（Dropped Requirements）

> Dropped 行**永不删除**，记录决策原因。

| REQ ID | 标题摘要 | 类型 | 优先级 | Dropped 日期 | 原因 | 决策人 |
|--------|----------|------|--------|-------------|------|--------|
| _(暂无)_ | | | | | | |

---

## 6. 项目级需求入口

| 项目 | 需求文档位置 | 当前活跃数 | 关联 RTM | 最近更新 |
|------|------------|-----------|---------|---------|
| cicd-demo | [RTM.md](RTM.md)（含 cicd-demo 全量需求）| 24（FR: 16 / NFR: 8） | [RTM.md](RTM.md) | 2026-05-24 |
| performance-testing-platform | _(按需初始化，复制 [模板](req-template.md))_ | — | — | — |
| api-testing-demo | _(按需初始化)_ | — | — | — |
| k8s-auto-testing-platform | _(按需初始化)_ | — | — | — |
| security-testing-demo | _(按需初始化)_ | — | — | — |
| sid-iam-testing-platform | _(按需初始化)_ | — | — | — |
| microservice-testing-platform | _(按需初始化)_ | — | — | — |
| ai-testing-platform | _(按需初始化)_ | — | — | — |

---

## 7. 变更日志（Changelog）

| 日期 | 操作 | 内容 | 操作人 |
|------|------|------|--------|
| 2026-05-26 | 初始化 | 创建 Portfolio 需求台账，录入 PREQ-001 ~ PREQ-008 | Michael Zhou |
