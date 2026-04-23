# Postmortem — Issue #68: Workaround 到期追踪机制缺失

> **事件类型：** 流程改进 / 防御措施建立  
> **严重程度：** P1（已在 Q1 Postmortem 中评定）  
> **分析日期：** 2026-04-21  
> **修复状态：** ✅ 已修复

---

## 1. 事件时间线

| 时间 | 事件 |
|------|------|
| 2026-03-22 | Issue #25 用 `continue-on-error: true` 作为临时 workaround 上线 |
| 2026-03-22 | Issue #25 被关闭（closed as completed），**未创建 follow-up issue** |
| 2026-03-22 ~ 2026-03-31 | CI 假绿灯持续 9 天，22 个 Newman 断言失败被掩盖 |
| 2026-03-29 | Issue #34 被创建，揭露 22 个断言失败的全貌 |
| 2026-03-31 | Issue #34 修复完成，`continue-on-error` 移除 |
| 2026-04-03 | Issue #68 被创建（Q1 Postmortem P1-#1 改进项） |
| 2026-04-21 | Issue #68 修复实施：创建 workaround 追踪机制 |

---

## 2. 根因分析 (RCA)

### 2.1 直接根因

Issue #25 的 `continue-on-error: true` workaround 被引入时：
1. **无 follow-up issue 创建** — workaround 上线即"消失"，无任何追踪
2. **Issue #25 直接关闭** — `closed as completed`，造成"已解决"的错觉
3. **无 deadline 约束** — 即便有 follow-up issue，无到期日则无紧迫感

### 2.2 根本根因

```
CLAUDE.md 规则不完整
    ↓
只有"禁止 continue-on-error 作为最终方案"
    ↓
没有"必须创建 follow-up issue"的强制要求（在 #34 修复之前）
    ↓
没有 workaround label 机制 → 无法查询/过滤活跃 workaround
    ↓
没有 deadline 规则 → workaround 无时限压力
    ↓
9 天假绿灯
```

### 2.3 为何在 #34 修复后仍需 #68？

Issue #34 修复了代码层面的 workaround，并更新了 CLAUDE.md 中的禁止规则。  
但 **流程机制仍然缺失**：
- 没有 `workaround` label → 无法用 `gh issue list --label workaround` 查询活跃 workaround
- 没有 deadline 规则（"5 天到期"）→ 新 workaround 如果被引入，仍无到期压力
- 没有 P1 升级规则 → 超期 workaround 没有处理触发机制

Issue #68 的目标是**建立完整的流程闭环**，填补 #34 修复后留下的机制空白。

---

## 3. 影响分析

| 维度 | 影响 |
|------|------|
| **直接损失** | 22 个 Newman 断言失败被掩盖 9 天，CI 质量信号失效 |
| **信任成本** | CI 绿灯信号不可信，每次 merge 前需人工验证 |
| **修复成本** | Issue #34 需要系统性修复（db.json + 断言 + CI 移除 workaround） |
| **流程缺口** | 即便 #34 已修复，流程机制缺失仍是潜在风险 |

---

## 4. 修复措施

### 4.1 已实施的修复

| 修复项 | 文件 | 描述 |
|--------|------|------|
| Workaround 追踪规范 | `docs/guides/workaround-tracking.md` | 完整规范：Issue 模板、生命周期、追踪表、检查命令 |
| CLAUDE.md 规则更新 | `CLAUDE.md` | 补充 deadline（今天+5天）和 P1 升级规则 |
| Label 策略更新 | `docs/guides/label-strategy.md` | 收录 `workaround` label（颜色 #FF8C00） |

### 4.2 待人工操作（需 GitHub 写入权限）

- [ ] 在 GitHub repo 创建 `workaround` label（颜色 #FF8C00，描述：临时绕过方案，必须附 deadline 并在期限内修复）

```bash
gh label create "workaround" --description "临时绕过方案，必须附 deadline 并在期限内修复" --color "FF8C00"
```

---

## 5. 验证方法

### 5.1 文档完整性验证

```bash
# 确认规范文档存在且内容完整
cat docs/guides/workaround-tracking.md | grep -E "deadline|P1|workaround"

# 确认 CLAUDE.md 包含新规则
grep -A3 "临时 workaround 必须" CLAUDE.md

# 确认 label-strategy.md 包含 workaround label
grep "workaround" docs/guides/label-strategy.md
```

### 5.2 流程验证（场景测试）

假设今天引入一个新 workaround：

1. **触发条件：** 某测试失败，临时加 `continue-on-error: true`
2. **正确流程：**
   - 创建 Issue，标签：`workaround`，标题含 `[expires: <今天+5天>]`
   - PR review 时检查是否有对应 Issue（Code Review Checklist）
   - 5 天后检查 Issue 是否关闭；未关闭则升级 P1
3. **验证结果：**`gh issue list --label workaround --state open` 可查到该 Issue

### 5.3 历史数据验证

当前活跃 workaround 数量：**0 个**（已通过 Issue #34 修复）

---

## 6. 防御措施更新

以下规则已更新到 CLAUDE.md：

| 规则 | 来源 | 载体 |
|------|------|------|
| 临时 workaround 必须创建 `workaround` label Issue | #25 #34 #68 | CLAUDE.md CI 防假绿灯规则 |
| Deadline = 今天 + 5 天（默认） | #68 | CLAUDE.md + workaround-tracking.md |
| 超期未关闭 → 升级 P1 | #68 | CLAUDE.md + workaround-tracking.md |
| PR review 需检查 workaround Issue | #68 | workaround-tracking.md Code Review Checklist |

---

## 7. 遗留风险

| 风险 | 描述 | 缓解措施 |
|------|------|---------|
| Label 未创建 | 需要 GitHub repo 写入权限，当前 CI token 无权限 | 人工执行 `gh label create "workaround" ...` |
| 规则执行依赖人工检查 | 无自动化 PR 门控检查 workaround Issue | 未来可通过 PR template checklist 强化（已有 #74 pre-commit hook 改进计划） |

---

## 8. 经验教训 (Lessons Learned)

### 教训 1：Workaround 引入即必须有追踪

> **历史教训**：#25 的 `continue-on-error` 被引入后立即关闭 Issue，导致 workaround "消失"。

**规则**：Workaround 引入时，**先创建 follow-up Issue，再合并 PR**。

### 教训 2：Deadline 是必要的

> 无期限的 TODO 永远不会被执行。

**规则**：所有 workaround Issue 必须标注 `[expires: YYYY-MM-DD]`，默认 5 天。

### 教训 3：Label 机制使追踪可查询

> 无 label 的 workaround Issue 混在普通 Issue 中，无法批量识别。

**规则**：`gh issue list --label workaround --state open` 应该是零结果（无活跃 workaround）。

### 教训 4：改进计划不能只 Open，要设优先级和 deadline

> Q1 Postmortem 列出 #68 为 P1 改进项，但没有人明确设定完成 deadline，导致延迟到 Q2。

**规则**：改进计划 issue open 超 2 周未处理，下次 sprint 优先级提升（已在 postmortem-2026-Q2.md 中记录）。

---

## 9. 关联文档

- [Issue #25](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/25) — 触发 workaround 的原始问题
- [Issue #34](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/34) — 22 个 Newman 断言失败修复
- [Issue #68](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/68) — 本文档对应的改进 issue
- [postmortem-2026-Q1.md](postmortem-2026-Q1.md) — Q1 全量 defect 分析
- [workaround-tracking.md](../../guides/workaround-tracking.md) — Workaround 追踪规范（本次新建）
