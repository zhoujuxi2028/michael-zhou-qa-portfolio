# Waiver 政策（Waiver Policy）

> **目的:** 规范缺陷豁免（Waiver）的适用范围、审批流程、有效期管理与到期升级机制  
> **范围:** Portfolio 全部子项目  
> **关联制度:** [Defect Tracking README](README.md) | [Workaround 追踪](../../process/workaround-tracking.md)

---

## 1. 适用范围

| 严重度 | 是否可 Waiver | 备注 |
|--------|---------------|------|
| P0 / Critical | ❌ **绝对禁止** | 必须修复后重新验证，不接受任何形式豁免 |
| P1 / High | ⚠️ **仅非核心场景** | 必须由 QA Lead + Project Owner 双签 |
| P2 / Medium | ✅ 可 Waiver | QA Lead 单签即可 |
| P3 / Low | ✅ 可 Waiver | 登记即可，可由 Project Owner 自行批准 |

> 安全相关缺陷（`bug/security`）一律按 P0 / P1 上限处理，**禁止** P3 降级 Waiver。

## 2. Waiver 必填字段

| 字段 | 说明 | 必填 |
|------|------|------|
| Waiver ID | `WAV-NNN`（项目）/ `PWAV-NNN`（Portfolio） | ✅ |
| 关联 Defect | Defect ID | ✅ |
| 关联 Issue | GitHub Issue # | ✅ |
| 豁免理由 | 为什么不立刻修复（业务、技术、成本权衡） | ✅ |
| 风险评估 | 用户影响、数据影响、合规影响、回退方案 | ✅ |
| 审批人 | 名字 + 角色（QA Lead / Project Owner / Reviewer） | ✅ |
| 审批日期 | YYYY-MM-DD | ✅ |
| 有效期 | 截止日期或事件（如"下个 Phase 合并前"） | ✅ |
| 状态 | 🟡 待审批 / ✅ 已审批 / ⏰ 到期 / 🔵 已关闭 | ✅ |

## 3. 审批流程

```text
Reporter 申请 Waiver
       │
       ▼
[QA Lead 评审严重度] ──── 误判 ───► 重新分级，回到登记流程
       │
       ▼
   严重度合规?
       │
   ┌───┴───┐
   ▼       ▼
  P2/P3   P1（非核心）
   │       │
   │       ▼
   │   [Project Owner 评审]
   │       │
   │       ▼
   │   [Reviewer / Tech Lead 复核]
   ▼       │
[QA Lead 批准] ◄──┘
   │
   ▼
[登记到 Waiver 表] → [Issue 加 `workaround` label] → [设置 deadline]
```

| 严重度 | 必需签核人数 | 复核要求 |
|--------|--------------|----------|
| P3 | 1（Project Owner / QA Lead 任一） | 无 |
| P2 | 1（QA Lead） | 无 |
| P1（非核心） | 2（QA Lead + Project Owner） | Reviewer 复核记录 |
| P0 | — | **不接受** |

## 4. 有效期与到期管理

| 类型 | 默认有效期 | 到期动作 |
|------|------------|----------|
| 短期 workaround | 5 天 | 升级为 P1，进入修复 backlog（详见 [workaround-tracking.md](../../process/workaround-tracking.md)） |
| 阶段性 Waiver | 至下一个 Phase / Sprint 合并前 | 重新评审：续期、修复、或升级 |
| 长期 Waiver | 至下一个季度复盘 | 季度复盘强制重新评审 |

到期未关闭的 Waiver：
1. QA Lead 在 24h 内通知 Project Owner
2. 关联 Issue 升级为 P1，加 `P1` label
3. 在 Waiver 表中状态置为 ⏰ 到期，记录升级日期
4. 进入下个 Sprint 修复优先级

## 5. Waiver 关闭条件

Waiver 进入 `🔵 已关闭` 状态需满足下列任一：

- 关联 Defect 已修复并 verified
- 上下文消失（如功能下线、依赖升级自动解决）
- 重新评审决定撤回 Waiver、纳入修复

关闭时需更新：
- 项目级 / Portfolio 登记表 Waiver 行：状态 `🔵 已关闭`，备注关闭原因 + 关联 Commit
- GitHub Issue：移除 `workaround` label
- 若涉及流程改进，追加 RCA / Postmortem 链接

## 6. 审计追溯

- Waiver 行**永不删除**：状态变化只追加，不覆盖
- 季度复盘时统计：新增 / 关闭 / 到期升级 / 续期 数量，纳入 [`postmortem-<YYYY-QN>.md`](../postmortems/)
- 同一缺陷连续 2 次续期 → 自动触发架构评审

## 7. 反模式（禁止做法）

| ❌ 做法 | 后果 | ✅ 正确做法 |
|--------|------|-------------|
| P0 缺陷 Waiver | 违反政策，立刻拒绝 | 修复后重测，必要时回退 |
| Waiver 不写有效期 | 永久豁免，失去管控 | 必须显式有效期 |
| `|| true` / `continue-on-error` 隐藏失败 | 静默 Waiver，无审计 | 显式登记 Waiver |
| 测试中跳过用例（`skip`）不登记 | 失去测试覆盖追溯 | `skip` 必须关联 Issue + Waiver |

## 8. 模板

新增 Waiver 时复制以下行到登记表：

```markdown
| WAV-NNN | DEF-XXX | #YYY | <豁免理由：业务/技术原因> | <风险评估：影响范围 + 回退方案> | <审批人姓名/角色> | YYYY-MM-DD | <有效期> | 🟡 待审批 |
```

---

**最后更新:** 2026-04-25  
**版本:** v1.0  
**审批人:** QA Lead
