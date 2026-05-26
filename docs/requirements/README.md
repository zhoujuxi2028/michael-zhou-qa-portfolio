# 需求管理系统（Requirements Management System）

> **定位：** Portfolio 级需求跟踪 SSOT
> **维护人：** QA Lead
> **更新规则：** 需求状态变更 24h 内同步；Stage Gate 交付物产出时同步更新 RTM
> **范围：** 覆盖全部 11 个子项目 + 仓库级（CI/CD、文档规范、质量体系）需求

---

## 1. 系统总览

本系统由 **三个入口 + 四份文档 + 一套 Stage Gate 联动** 构成：

| 入口 | 位置 | 用途 |
|------|------|------|
| 需求台账（Portfolio） | `req-register.md` | 跨项目 Active / Deferred / Closed 全景 |
| 需求追溯矩阵（RTM） | `RTM.md` | 需求 → 测试用例 → Workflow → 结果双向追溯 |
| 项目级需求文档 | 各项目 `docs/requirements/` | 项目内细节、AC 定义 |
| GitHub Issues | 仓库 Issues | 讨论、变更请求（CR）、PR 关联 |

---

## 2. 角色与职责

| 角色 | 职责 |
|------|------|
| Reporter | 提出需求，填写 Issue，说明业务价值和 Acceptance Criteria |
| QA Lead | 维护台账、分配 REQ-ID、判定优先级、推动闭环、维护 RTM |
| Project Owner | 需求范围决策、Deferred/Dropped 批准、Stage Gate 签核 |
| Reviewer | 需求评审、AC 完整性确认、RTM 覆盖率复查 |

---

## 3. 需求分类

| 类型 | 代码 | 说明 | 示例 |
|------|------|------|------|
| 功能需求 | `FR` | 系统必须具备的功能行为 | PR pipeline 包含 lint + 测试 |
| 非功能需求 | `NFR` | 性能、安全、可观测性、可靠性 | 测试执行时间 < 30 分钟 |
| 约束需求 | `CON` | 技术栈、合规边界、工具选型 | 只使用 GitHub Actions |
| 展示需求 | `DEMO` | Portfolio 特有：体现 QA 能力和技术广度的演示点 | 覆盖 OWASP Top 10 的安全测试 |

---

## 4. 优先级定义

| 级别 | 含义 | Gate 影响 | 可 Defer? |
|------|------|-----------|-----------|
| **P1 / Must Have** | 核心功能或关键质量目标，缺失则项目不可交付 | 阻断 Stage Gate | 仅紧急情况 |
| **P2 / Should Have** | 重要功能，缺失明显影响完整度 | 不阻塞，Stage 5 收尾前必须闭环 | ✅ |
| **P3 / Could Have** | 增值功能，时间允许时实现 | 不阻塞 | ✅ |
| **P4 / Won't Have** | 本期明确不做，记录原因 | 不阻塞，直接 Dropped | — |

---

## 5. 需求生命周期

状态转换路径：

```
[Proposed] → [Refined] → [Approved] → [In Development] → [Verified] → [Closed]
                 │            │
                 │            └──► [Deferred]（延期，需 PO 批准）
                 └──────────────► [Dropped]（范围外，记录原因，永不删行）
```

| 状态 | 触发条件 | 必填字段 |
|------|----------|----------|
| Proposed | 创建 GitHub Issue | 需求描述、提出人 |
| Refined | AC 已补充，子需求已拆分 | AC（Given/When/Then）、分类、优先级 |
| Approved | Project Owner 确认范围 | REQ-ID、Issue 标签 |
| In Development | 关联 feature 分支，PR 已创建 | 关联 PR # |
| Verified | CI 全绿 + AC 手动验收通过，RTM 已更新 | RTM 行、验证日期 |
| Closed | Issue closed，台账搬迁至 Closed 区 | 关闭日期 |
| Deferred | PO 批准延期，说明目标阶段 | 目标阶段、延期原因 |
| Dropped | PO 批准移除 | 原因，永不删行 |

---

## 6. ID 规范

| ID 类型 | 格式 | 范围 | 示例 |
|---------|------|------|------|
| Portfolio 需求 ID | `PREQ-NNN` | 跨项目、仓库级需求 | `PREQ-001` |
| 项目需求 ID | `<PROJ>-REQ-NNN` | 项目内需求 | `CICD-REQ-001`、`PERF-REQ-012` |
| 变更请求 ID | `CR-NNN` | 需求变更记录 | `CR-001` |

---

## 7. GitHub 集成（Issues + Labels）

每个 Approved 以上状态的需求**必须**对应一个 GitHub Issue：

| 维度 | 必填 | 示例标签 |
|------|------|---------|
| 类型 | ✅ | `req/functional`、`req/nfr`、`req/demo` |
| 项目 | ✅ | `proj:cicd`、`proj:performance`（复用现有标签） |
| 状态 | ✅ | `req/approved`、`req/in-dev`、`req/verified` |
| 变更 | CR 时必填 | `change-request` |

---

## 8. Acceptance Criteria 标准格式

所有 FR / NFR 需求必须在 GitHub Issue 中补充 AC，使用 Given/When/Then 格式：

```
Given  [前置条件]
When   [触发动作]
Then   [期望结果]
And    [附加断言（可选）]
```

示例：

```
Given  PR 包含变更文件且已推送到 GitHub
When   cicd-demo-pr.yml 的 security-scan job 执行完毕
Then   npm audit 无 moderate 以上漏洞
And    Trivy 无 CRITICAL/HIGH 漏洞
And    job 状态为 success
```

---

## 9. RTM 维护规则

| 操作 | 触发时机 | 操作人 |
|------|----------|--------|
| 新增需求行 | 需求进入 Approved | QA Lead |
| 填入测试用例 | Stage 3 开发期间编写测试时 | Dev/QA |
| 填入 Workflow | CI Job 覆盖该需求时 | Dev/QA |
| 更新执行结果 | Stage 4 测试通过 | QA Lead |
| 标记 Verified | Stage 4 完成，AC 全部通过 | QA Lead |
| 季度覆盖率统计 | 每季度末 | QA Lead |

---

## 10. Stage Gate 联动

| 阶段 | 需求管理交付物 |
|------|--------------|
| Stage 1 需求 | 新建 Issue，台账状态 → Approved，AC 初稿 |
| Stage 2 设计 | AC 细化完成，设计方案与 AC 对齐确认 |
| Stage 3 开发 | 台账状态 → In Development；RTM 填入测试用例 |
| Stage 4 测试 | RTM 执行结果更新；台账状态 → Verified |
| Stage 5 收尾 | Issue 关闭；台账 → Closed；RTM 覆盖率报告归档 |

---

## 11. 维护节奏

| 频率 | 动作 |
|------|------|
| 实时 | Issue 状态变化 24h 内回写台账 |
| 每次 PR merge | RTM 覆盖率检查 |
| 每月 | 需求优先级复查，Deferred 项评估是否恢复 |
| 每季度 | 覆盖率汇总；Dropped 归档；体系文档审查 |
