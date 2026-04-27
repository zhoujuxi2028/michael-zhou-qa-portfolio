# Portfolio 缺陷跟踪系统（Defect Tracking System）

> **定位:** Portfolio 级"文档化的问题/缺陷跟踪系统" SSOT  
> **维护人:** QA Lead  
> **更新规则:** 新增/修复/Waiver/季度复盘时同步刷新；GitHub Issue 状态变化 24h 内回写
> **范围:** 覆盖全部 11 个子项目 + 仓库级（CI/CD、文档、流程）问题

---

## 1. 系统总览

本系统由 **三个入口 + 四份文档 + 一套工作流** 构成：

```text
┌─────────────────────────────────────────────────────────────┐
│                     单一事实源 (SSOT)                        │
│                                                             │
│   docs/project-management/defect-tracking/                  │
│   ├── README.md                  ← 制度、流程、角色（本文）  │
│   ├── defect-register.md         ← Portfolio 跨项目活跃登记 │
│   ├── defect-register-template.md← 项目级模板（可复制）     │
│   └── waiver-policy.md           ← Waiver 政策与审批流程    │
└──────────┬───────────────────┬──────────────────┬───────────┘
           │                   │                  │
           ▼                   ▼                  ▼
   ┌──────────────┐    ┌──────────────┐   ┌──────────────────┐
   │ GitHub Issue │    │ 项目级登记表 │   │ RCA / Postmortem │
   │ （讨论/修复）│    │ （per-proj） │   │ （事后复盘）     │
   └──────────────┘    └──────────────┘   └──────────────────┘
```

| 入口 | 位置 | 用途 |
|------|------|------|
| 缺陷登记主表（Portfolio） | `defect-register.md` | 跨项目 Active / Closed / Waiver 全景 |
| 缺陷登记表（项目级） | 各项目 `docs/qa/defect-register.md` | 项目内细节、Stage Gate 联动 |
| GitHub Issues | 仓库 Issues | 讨论、修复关联、PR / Commit 追踪 |
| RCA / Postmortem | `docs/project-management/postmortems/` | 根因、时间线、改进项闭环 |

## 2. 角色与职责

| 角色 | 职责 |
|------|------|
| Reporter | 创建 GitHub Issue、提供复现步骤、指认所属项目与阶段 |
| QA Lead | 维护登记表、分配 Defect ID、判定严重度、推动闭环 |
| Project Owner | 项目级登记表准确性、Stage Gate 阻塞决策 |
| Reviewer / Approver | Waiver 审批、季度复盘签核 |
| Postmortem 作者 | P0/P1 缺陷修复后 5 个工作日内提交 RCA / Postmortem |

## 3. 严重度定义（Portfolio 统一）

| 级别 | 含义 | Gate 影响 | 必须 RCA? |
|------|------|-----------|-----------|
| **P0 / Critical** | 核心功能不可用、数据不可信、安全高危 | 立即 BLOCKED，**不得 waiver** | ✅ 必须 |
| **P1 / High** | 重要功能降级，影响验收结论 | 标记 Blocking 时 BLOCKED；否则可 waiver | ✅ 必须 |
| **P2 / Medium** | 非核心功能异常，有合理 workaround | 不阻塞，可 waiver | 可选 |
| **P3 / Low** | 轻微问题，不影响功能或结论 | 不阻塞，记录即可 | 否 |

> 严重度争议 → QA Lead 仲裁；同一缺陷"既 FAIL 又 PASS"默认 BLOCKED 直至根因明确。

## 4. 缺陷生命周期

```text
[Discovered] → [Logged] → [Triaged] → [Fixing] → [Verified] → [Closed]
                              │           │
                              ├──────► [Waived]（仅 P1/P2/P3，且经审批）
                              │
                              └──────► [Wontfix]（仅 P3 + 审批）
```

| 阶段 | 触发条件 | 必填字段 | 输出 |
|------|----------|----------|------|
| Logged | 创建 GitHub Issue | 项目标签、缺陷分类、复现步骤 | Issue # |
| Triaged | QA Lead 24h 内分配 | Defect ID、严重度、Blocking 标记 | 登记表行 |
| Fixing | PR draft / commit 关联 | 修复方案、关联 Commit | PR # |
| Verified | 测试通过 + reviewer 确认 | 验证证据（CI run / 测试报告） | Verified ✅ |
| Closed | Issue closed + 登记表搬迁至 Closed 区 | 关闭日期、关闭方式 | Closed Defects 行 |
| Waived | Waiver 审批通过 | Waiver ID、有效期、风险评估 | Waiver 表行 |

## 5. ID 规范

| ID 类型 | 格式 | 范围 | 示例 |
|---------|------|------|------|
| Portfolio Defect ID | `PDEF-NNN` | 跨项目、仓库级问题 | `PDEF-001` |
| 项目 Defect ID | `<PROJ>-NNN` 或 `DEF-NNN` | 项目内 | `PERF-DEF-003`、`DEF-003` |
| Waiver ID | `WAV-NNN`（项目内） / `PWAV-NNN`（Portfolio） | 同上 | `WAV-001`、`PWAV-002` |
| GitHub Issue | `#NNN` | 仓库统一 | `#192` |

> 已有项目（如 perf-platform）保留历史 `DEF-NNN` 命名；新项目建议使用 `<PROJ>-DEF-NNN`，避免跨项目重号。

## 6. GitHub 集成（Issues + Labels）

每个登记的缺陷 **必须**对应一个 GitHub Issue。Label 组合规范见 [`docs/guides/label-strategy.md`](../../guides/label-strategy.md)：

| 维度 | 必填 | 示例 |
|------|------|------|
| 项目标签 | ✅ | `performance-testing` / `sid-iam` / `microservice` ... |
| 缺陷分类 | ✅ | `bug/security` / `bug/performance` / `bug/test` / `bug/ci` / `bug/code` |
| 优先级 | P0/P1 必填 | `P0` / `P1` / `P2` |
| 阶段 | 关联 Stage Gate 时必填 | `phase-6` / `phase-7` |
| Waiver | Waived 缺陷必填 | `workaround` |

## 7. 与 RCA / Postmortem 的联动

| 触发条件 | 必产出 | 归档位置 | 截止 |
|---------|--------|----------|------|
| P0 / P1 缺陷关闭 | RCA 或 Postmortem | 项目级见 `<project>/docs/project-management/postmortems/`；跨项目/仓库级见 `docs/project-management/postmortems/` | 关闭后 5 个工作日内 |
| 同类缺陷季度内 ≥ 3 次 | 季度专项复盘 | `docs/project-management/postmortems/postmortem-<YYYY-QN>-<topic>.md` | 季度结束前 |
| Waiver 到期未关闭 | 升级评审记录 | 同上，附原 Waiver ID | 到期日 |

命名约定（沿用 perf-platform 规则）：
- `RCA-YYYY-MM-DD-<slug>.md` — 仅根因
- `INC-YYYY-MM-DD-<slug>.md` — 仅事件记录
- `POSTMORTEM-YYYY-MM-DD-<slug>.md` — 综合复盘
- 同一事件**只保留一份**，按深度选择前缀

## 8. Stage Gate 联动

5 阶段开发流程（见 [`dev-process-checklist.md`](../../dev-process-checklist.md)）中：

| 阶段 | 缺陷处理动作 |
|------|--------------|
| 3. 开发 | 发现缺陷立即 Log Issue + 加入登记表（Triaged） |
| 4. 测试 | Stage Gate 前盘点 Active Defects，P0/Blocking-P1 阻塞 Gate 通过 |
| 5. 收尾 | PR 描述列出关联 Defect ID；合并后将 Closed 行搬迁到历史区 |

> 项目可在自身 `docs/qa/` 中维护 Stage 4 Gate Template 及缺陷快照；模板见 [`defect-register-template.md`](defect-register-template.md)。

## 9. 维护节奏

| 周期 | 动作 | 责任人 |
|------|------|--------|
| 实时 | Issue 状态变化 24h 内同步登记表 | QA Lead |
| 每周 | Active Defects 巡检 + 老化缺陷（>14 天）升级评审 | QA Lead |
| Sprint 末 | 关闭 Sprint 内 Defect、Waiver 复核 | QA Lead + Project Owner |
| 季度 | 汇总 Closed/Waived，更新 `postmortem-<YYYY-QN>.md` | QA Lead |

## 10. 与 Workaround 跟踪的关系

短期 workaround 必须同时：
1. 在 GitHub Issue 上加 `workaround` label，附 deadline（默认 5 天）
2. 在登记表 Waiver 区登记对应 `WAV-NNN`，状态 `🟡 待审批` 或 `✅ 已审批`
3. 详细规则见 [`docs/guides/workaround-tracking.md`](../../guides/workaround-tracking.md)；超期未关闭升级 P1。

## 11. 当前在用的项目级登记表

| 项目 | 登记表位置 | 状态 |
|------|------------|------|
| performance-testing-platform | [defects/register.md](../../../performance-testing-platform/docs/qa/defects/register.md) （活跃） · [defects/stage4-waiver-register.md](../../../performance-testing-platform/docs/qa/defects/stage4-waiver-register.md) （Stage 4 历史） | ✅ 在用 |
| 其他子项目 | _(待初始化)_ | 🟡 按需创建：复制 [`defect-register-template.md`](defect-register-template.md) → `<project>/docs/qa/defects/register.md` |

新项目缺陷登记表初始化步骤：
1. `cp docs/project-management/defect-tracking/defect-register-template.md <project>/docs/qa/defect-register.md`
2. 替换模板里的 `<PROJECT>` 占位符
3. 在本目录 [`defect-register.md`](defect-register.md) "项目级登记入口" 一节登记新链接
4. 同步更新项目 `README.md` / `CLAUDE.md` 导航

## 12. 相关文档

| 类型 | 链接 |
|------|------|
| Portfolio 缺陷登记主表 | [defect-register.md](defect-register.md) |
| 项目级登记模板 | [defect-register-template.md](defect-register-template.md) |
| Waiver 政策 | [waiver-policy.md](waiver-policy.md) |
| GitHub Labels 策略 | [../../guides/label-strategy.md](../../guides/label-strategy.md) |
| Workaround 追踪 | [../../guides/workaround-tracking.md](../../guides/workaround-tracking.md) |
| Postmortem 归档 | [../postmortems/README.md](../postmortems/README.md) |
| 5 阶段开发流程 | [../../dev-process-checklist.md](../../dev-process-checklist.md) |
| 文档治理规范 | [../../ARCHITECTURE.md](../../ARCHITECTURE.md) |

---

**最后更新:** 2026-04-25  
**版本:** v1.0  
**变更日志:** 见 [defect-register.md](defect-register.md) 末尾"变更日志"小节。
