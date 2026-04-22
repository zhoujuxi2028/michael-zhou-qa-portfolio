# Workaround 追踪规范 (Workaround Tracking Guide)

> **来源：** Issue #68 — Postmortem 改进项 P1-#1  
> **触发事件：** #25 (`continue-on-error: true`) 遗留 9 天，掩盖 22 个 Newman 断言失败

---

## 1. 规则摘要

| 规则 | 内容 |
|------|------|
| **必须创建 Issue** | 每个临时 workaround 上线前，必须同时创建对应的 follow-up Issue |
| **必须打 label** | Issue 必须包含 `workaround` label |
| **必须标注 deadline** | Issue 标题或正文标注到期日，格式：`[expires: YYYY-MM-DD]`，默认 **5 个自然日** |
| **超期升级** | deadline 超过未关闭 → 自动升级优先级为 `P1` |
| **禁止无 Issue 的 workaround** | 无对应 Issue 的 workaround 不得合并进主分支 |

---

## 2. Workaround Issue 模板

创建 follow-up Issue 时，使用以下格式：

```
标题: fix: remove <workaround描述> [expires: YYYY-MM-DD]

## Workaround 描述
- 位置：<文件路径:行号> 或 <workflow名称:步骤名>
- 内容：<workaround 的具体内容，如 continue-on-error: true>
- 原因：<为什么需要临时绕过>

## 到期时间
- **Deadline**: YYYY-MM-DD（今天 + 5 天）
- **超期策略**: 超期未关闭 → 手动升级为 P1

## 根本修复方案
- [ ] <根本修复步骤 1>
- [ ] <根本修复步骤 2>
- [ ] 验证：移除 workaround 后，CI 无 `continue-on-error` 且测试全部通过

## 来源
- PR/Issue: <关联 PR 或 Issue 编号>
```

---

## 3. Workaround 生命周期

```
引入 workaround
    ↓
创建 follow-up Issue（标签 workaround + P2，deadline = 今天+5天）
    ↓
deadline 前
    → 实施根本修复
    → 移除 workaround
    → CI 复验（参考 Checklist Phase 4）
    → 关闭 Issue
deadline 后（未关闭）
    → 手动升级 Issue 优先级为 P1
    → 当前 Sprint 必须处理
```

---

## 4. 活跃 Workaround 追踪表

> 每次引入新 workaround 后，在此表中添加一行。修复后更新状态。

| Issue | Workaround 描述 | 位置 | 引入日期 | Deadline | 状态 |
|-------|----------------|------|---------|----------|------|
| （无活跃 workaround） | — | — | — | — | — |

**历史 Workaround（已修复）：**

| Issue | Workaround 描述 | 位置 | 引入日期 | 修复日期 | 遗留天数 |
|-------|----------------|------|---------|---------|---------|
| [#25](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/25) | `continue-on-error: true` | `api-testing-ci.yml` Newman step | 2026-03-22 | 2026-03-31 | **9 天**（超期） |

---

## 5. 检查命令

查看所有活跃 workaround issues：

```bash
gh issue list --label workaround --state open
```

查看超期 workaround（需结合日期过滤手动判断）：

```bash
gh issue list --label workaround --state open --json number,title,createdAt,body \
  | python3 -c "
import json, sys
from datetime import datetime, timedelta
issues = json.load(sys.stdin)
today = datetime.utcnow()
for i in issues:
    # 从 title 提取 [expires: YYYY-MM-DD]
    import re
    m = re.search(r'\[expires:\s*(\d{4}-\d{2}-\d{2})\]', i.get('title','') + i.get('body',''))
    if m:
        exp = datetime.strptime(m.group(1), '%Y-%m-%d')
        overdue = (today - exp).days
        if overdue > 0:
            print(f'⚠️ #{i[\"number\"]} overdue {overdue}d: {i[\"title\"]}')
    else:
        # 无 deadline 标注 → 按创建日期 + 5 天判断
        created = datetime.strptime(i['createdAt'][:10], '%Y-%m-%d')
        overdue = (today - created - timedelta(days=5)).days
        if overdue > 0:
            print(f'⚠️ #{i[\"number\"]} overdue {overdue}d (no deadline tag): {i[\"title\"]}')
"
```

> **注意**：deadline 使用 **自然日**（calendar days），不是工作日。

---

## 6. Code Review Checklist

PR review 时，审查以下内容：

- [ ] 如果 PR 引入 `continue-on-error: true` → 是否有对应 `workaround` label Issue？
- [ ] 如果 PR 引入 `|| true` → 是否有对应 `workaround` label Issue？
- [ ] 如果 PR 引入 `--collect-only` → 是否有对应 `workaround` label Issue？
- [ ] Workaround Issue 是否标注了 deadline？

---

## 7. 相关文档

- [CLAUDE.md](../../CLAUDE.md) — CI 防假绿灯规则
- [LABEL_STRATEGY.md](../../LABEL_STRATEGY.md) — `workaround` label 说明
- [dev-process-checklist.md](../dev-process-checklist.md) — Phase 4 workaround 复验规则
- [postmortem-2026-Q1.md](../project-management/postmortems/postmortem-2026-Q1.md) — #25 #34 假绿灯事件 RCA
