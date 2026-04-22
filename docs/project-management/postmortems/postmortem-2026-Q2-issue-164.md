# Postmortem — Issue #164: claude-code-review 401 权限不足

> **事件时间**: 2026-04-21 06:19 UTC  
> **影响范围**: PR #162 的 `Claude Code Review` workflow（`claude-code-review.yml`）  
> **严重级别**: P3 — CI 辅助工具失败，不阻断主流程  
> **解决时间**: 2026-04-21（同日修复）

---

## 1. 事件摘要

PR #162 合并前，触发了 `Claude Code Review` workflow（run #24707264515）。  
该 workflow 调用 `anthropics/claude-code-action@v1` 对 PR 进行 AI 代码审查，  
但在尝试向 PR 回写审查评论时，连续 3 次收到 `401 Unauthorized` 错误后失败退出。

**核心错误日志**：
```
App token exchange failed: 401 Unauthorized - User does not have write access on this repository
Attempt 1 failed: User does not have write access on this repository
Attempt 2 failed: User does not have write access on this repository
Attempt 3 failed: User does not have write access on this repository
Operation failed after 3 attempts
##[error]Action failed with error: User does not have write access on this repository
##[error]Process completed with exit code 1.
```

---

## 2. 根本原因分析 (RCA)

### 直接原因

`.github/workflows/claude-code-review.yml` 的 `permissions` 块配置错误：

```yaml
# 错误配置（修复前）
permissions:
  contents: read
  pull-requests: read   # ← 只有 read，无法写入 PR 评论
  issues: read          # ← 只有 read，无法创建 issue
  id-token: write
```

`anthropics/claude-code-action@v1` 的内部逻辑需要通过 GitHub App token exchange 获取写权限 token，以便将审查结果作为 PR review comment 回写。  
由于 GITHUB_TOKEN 的 `pull-requests` scope 只有 `read`，token exchange 被 GitHub API 拒绝（401）。

### 根因链

```
workflow 首次引入时从文档示例复制了 read-only 权限
    → 开发者未验证 action 实际需要的最小权限
        → CI 运行但无法写回评论
            → 3 次重试均失败
                → workflow exit code 1
```

### 为什么没有提前发现

| 因素 | 说明 |
|------|------|
| 文档示例不完整 | `anthropics/claude-code-action` README 未在最显眼处标注需要 `write` 权限 |
| 本地无法预验证 | GitHub Actions 权限只能在实际 CI 运行时校验 |
| 未做权限对照检查 | 引入第三方 action 时没有对照其 required permissions 清单 |

---

## 3. 修复方案

**文件**: `.github/workflows/claude-code-review.yml`

```yaml
# 修复后
permissions:
  contents: read
  pull-requests: write   # ← 允许 action 写入 PR review comments
  issues: write          # ← 允许 action 创建/更新 issue 评论
  id-token: write
```

**修复原则**: 遵循最小权限原则，仅将需要写操作的 scope 从 `read` 升级为 `write`，`contents` 仍保持 `read`。

---

## 4. 验证方式

修复合并后，下一次对任意 PR 触发 `Claude Code Review` workflow 时：
- workflow 应能成功获取 token（无 401 错误）
- `anthropics/claude-code-action@v1` 步骤 exit code 为 0
- PR 上出现 Claude 生成的代码审查评论

---

## 5. 改进措施 & 防御机制

| 措施 | 类型 | 负责人 | 状态 |
|------|------|--------|------|
| 更新 `docs/guides/third-party-action-audit.md`，在 action 清单中记录 `claude-code-action` 所需权限 | 文档 | zhoujuxi2028 | ✅ 本次修复同步 |
| 在 `docs/CLAUDE.md` 的 "Common Pitfalls" 表格中增加一行：引入第三方 action 时须对照其 required permissions | 流程 | zhoujuxi2028 | ✅ 本次修复同步 |
| 在下次季度 action 审计（ISS-071 checklist）中将"权限对照"列入必查项 | 流程 | zhoujuxi2028 | 📅 下次审计时 |

---

## 6. 时间线

| 时间 (UTC) | 事件 |
|-----------|------|
| 2026-04-21 06:17:56 | PR #162 由 Copilot agent 创建，触发 `claude-code-review` |
| 2026-04-21 06:18:51 | workflow run #24707264515 开始 |
| 2026-04-21 06:19:02 | 第 1 次 App token exchange 失败 (401) |
| 2026-04-21 06:19:08 | 第 2 次重试失败 |
| 2026-04-21 06:19:18 | 第 3 次重试失败，workflow exit 1 |
| 2026-04-21 06:28 | 用户上报，Copilot Task Agent 开始分析 |
| 2026-04-21 ~06:35 | 根因定位：`pull-requests: read` 权限不足 |
| 2026-04-21 ~06:40 | 修复提交推送，PR 更新 |

---

## 7. 经验教训 (Lessons Learned)

> **ISS-015**: 引入第三方 GitHub Actions 时，必须检查其 required permissions 并在 workflow 中配置 `write` 权限（如有需要）。`read` 默认值不足以支持需要回写 PR/Issue 的 action。

**对应 CLAUDE.md Common Pitfalls 更新条目**：

| Check | Why | Issue |
|-------|-----|-------|
| 引入第三方 action 时对照其 required permissions，写操作需要 `write` scope | `read` 权限导致 token exchange 401，action 无法回写 PR 评论 | ISS-015 |
