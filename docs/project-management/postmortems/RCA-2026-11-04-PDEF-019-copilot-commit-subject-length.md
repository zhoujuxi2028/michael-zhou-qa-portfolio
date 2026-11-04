# PDEF-019: Copilot commit subject 超 72 字符触发 Commit Guard 红灯（PDEF-003 三次复发）— RCA

**缺陷 ID**: PDEF-019
**严重度**: P2 Medium
**发现日期**: 2026-11-04
**修复日期**: 2026-11-04（cherry-pick rebase + amend + force-push）
**影响范围**: 仓库级 `Commit Guard` workflow；PR #834（feat/python-version-files，Issue #831）

---

## 1. 问题描述

PR #834（`feat/python-version-files`，Issue #831）由 Copilot Cloud Agent 提交的两个 commit subject 超出 72 字符上限：

```
feat(ci): replace hardcoded python-version with python-version-file in direct callers  → 85 字符
feat(ci): setup-python-project action auto-reads .python-version when version not set  → 85 字符
```

`Commit Guard / Conventional Commits (subject rules)` 报红，PR 被阻塞。

---

## 2. 根本原因

### 2.1 直接原因

Copilot 在拟稿 commit subject 时未执行字符数自检。两个 subject 均包含"较长动词短语 + 介词短语 + (#issue)"的典型超长模式，实际可用描述空间仅约 50 字符，却写入了 65+ 字符的描述。

### 2.2 深层原因——同 PDEF-003 结构性漏洞未彻底修复

| 防线 | 状态 |
|------|------|
| `.husky/pre-push` → `check-commit-guard.sh` | ❌ Copilot 经后台路径推送，不触发 Husky |
| `.husky/commit-msg` → 长度检查（`LEN > 72` 立即 fail） | ✅ **本地 git commit 路径有效**（Claude Code 等本地 Agent） |
| `.husky/pre-push` → `check-commit-guard.sh` | ✅ 本地 push 路径有效 |
| `Commit Guard` CI 兜底 | ✅ 事后拦截（所有路径均生效） |
| `CLAUDE.md` 明确 ≤72 规则 + 字符预算 | ✅ 对本地 Agent 有效；对 Copilot 仅文档提示 |

**关键区分**：

| 提交主体 | 路径 | commit-msg hook | 结论 |
|----------|------|-----------------|------|
| Claude Code（本地） | `git commit` → hook | ✅ 立即拦截 | **已有完整防线** |
| Copilot Cloud Agent | `report_progress` API | ❌ 绕过所有 hook | CI 是唯一兜底 |

### 2.3 与历史缺陷的关系

| 缺陷 | 时间 | 场景 |
|------|------|------|
| DEF-022 | 2026-Q2 | performance-testing-platform，同模式 |
| PDEF-003 | 2026-05-25 | PR #262，copilot/feat-add-pr-pipeline，76 字符 |
| **PDEF-019** | **2026-11-04** | **PR #834，feat/python-version-files，85 字符** |

三次同模式复发说明：PDEF-003 的改进措施（文档层规则）对 Copilot 的实际约束力不足。

---

## 3. 时间线

| 时间（UTC） | 事件 |
|-------------|------|
| 2026-11-03 | Copilot 提交 2 个超长 subject 的 commit 到 PR #834 |
| 2026-11-04 ~08:00 | `Commit Guard` 在 PR #834 报红 |
| 2026-11-04 ~09:00 | cherry-pick rebase + amend，重写为合规 subject（60 / 63 字符） |
| 2026-11-04 ~09:30 | force-push，Commit Guard 通过 |

---

## 4. 修复方案

### 4.1 本次修复（已落地）

cherry-pick rebase + amend 重写两个超长 subject：

| 违规 subject（85字符） | 合规 subject |
|----------------------|-------------|
| `feat(ci): replace hardcoded python-version with python-version-file in direct callers` | `feat(ci): use python-version-file in direct workflow callers`（60字符） |
| `feat(ci): setup-python-project action auto-reads .python-version when version not set` | `feat(ci): setup-python-project reads .python-version when unset`（63字符） |

### 4.2 结构性改进（待评估）

GitHub Push Rulesets 的 `commit-metadata` 规则（服务端强制校验 commit subject 长度）是唯一能在 Copilot 推送路径上形成拦截的方案。见 AI-3（PDEF-003 Action Items）。

---

## 5. 改进措施（Action Items）

| 编号 | 描述 | 责任人 | 截止 | 状态 |
|------|------|--------|------|------|
| AI-1 | 确认 `.husky/commit-msg` 已在 commit 时校验 subject ≤72；本地 Agent（Claude Code）路径已有完整防线 | QA Lead | 2026-11-04 | ✅ 已验证 |
| AI-2 | 在 `CLAUDE.md` 明确标注：三次复发均来自 Copilot Cloud Agent（服务端路径），本地路径已受 commit-msg hook 保护；Copilot 路径的唯一兜底是 CI | QA Lead | 2026-11-04 | ✅ 已更新本 RCA |
| AI-3 | Copilot 路径（`report_progress`）的结构性漏洞需 GitHub 平台层支持（Push Ruleset 服务端校验），当前阶段以 CI 兜底为主 | 仓库维护者 | 下季度 | 🟡 待评估 |

---

## 6. 经验教训

1. **文档规则无法约束自动化路径**：三次复发的根因始终相同——Copilot 推送不走本地 hook，文档描述的规则只能提醒，不能拦截。
2. **服务端防线是唯一可靠的 guard**：只有 GitHub Push Ruleset 或类似服务端方案才能在 Copilot 路径上形成强制约束。
3. **复发计数有意义**：三次复发 = 明确的结构性漏洞信号，应升级为平台层改进项，而非继续"提醒下次注意"。

---

## 7. 关联资料

- 失败 PR：[#834](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/pull/834)
- 关联 Issue：[#831](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/831)
- 同模式前案：[PDEF-003 RCA](RCA-2026-05-25-PDEF-003-commit-subject-length.md)
- 修复方式：本地 cherry-pick rebase + amend + force-push

---

**作者**: Claude Sonnet 4.6
**复审**: QA Lead（待人工 sign-off）
**版本**: v1.0
