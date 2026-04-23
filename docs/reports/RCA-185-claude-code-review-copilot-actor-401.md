# RCA — PR #185 Claude Code Review 因 Copilot actor 触发 401

> **事件类型**: CI 失败  
> **影响范围**: PR #185 的 `Claude Code Review` workflow  
> **关联 run/job**: run #24812160997 / job #72620934904  
> **发生时间**: 2026-04-23 02:07 UTC

---

## 1. 现象

PR #185 (`fix: harden performance shell integration runner`) 的 `Claude Code Review` 在 `Run Claude Code Review` 步骤失败。

核心日志：

```text
App token exchange failed: 401 Unauthorized - User does not have write access on this repository
Attempt 1 failed: User does not have write access on this repository
Attempt 2 failed: User does not have write access on this repository
Attempt 3 failed: User does not have write access on this repository
Operation failed after 3 attempts
##[error]Action failed with error: User does not have write access on this repository
```

---

## 2. 直接原因

本次失败不是 `.github/workflows/claude-code-review.yml` 权限块配置错误。

当前 workflow 已配置：

```yaml
permissions:
  contents: write
  pull-requests: write
  issues: write
  id-token: write
```

run #24812160997 的关键上下文是：

- `pull_request.user.login = Copilot`
- `actor = Copilot`
- `triggering_actor = zhoujuxi2028`

而同一 PR 之前的成功 run #24811486586 中：

- `actor = zhoujuxi2028`
- `triggering_actor = zhoujuxi2028`

说明失败与 **触发者身份** 有关，而不是 workflow 文件内容本身。

---

## 3. 根本原因（Root Cause）

`anthropics/claude-code-action@v1` 在 pull request 场景中会先：

1. 获取 GitHub OIDC token
2. 用该 token 向后端交换 app token
3. 再用 app token 回写 PR review/comment

当 `synchronize` 事件由 `Copilot` app 自己触发时，OIDC app token exchange 返回：

```text
401 Unauthorized - User does not have write access on this repository
```

也就是说：

- **人类用户触发**：可成功完成 token exchange
- **Copilot app 自己触发**：token exchange 被后端拒绝

因此本次问题的根因是：

> `claude-code-review.yml` 缺少对 **Copilot bot 自触发事件** 的保护条件，导致 PR 每次被 Copilot agent 推送更新后，Claude Code Review 会被再次触发，并在 app token exchange 阶段稳定失败。

---

## 4. 根因链路

```text
Copilot agent 向 copilot/* 分支 push 新提交
  → pull_request synchronize 事件触发
    → actor = Copilot
      → Claude Code Review workflow 启动
        → anthropics/claude-code-action 开始 OIDC token exchange
          → 后端拒绝 Copilot actor 的 app token exchange
            → 401 Unauthorized
              → 工作流失败
```

---

## 5. 为什么之前的修复没有覆盖这次问题

Issue #164 修复的是 **workflow permissions 配置不足**：

- 之前是 `pull-requests: read` / `issues: read`
- 修复后改成了 `write`

那次问题的根因是 **scope 不足**。  
而这次问题发生时，scope 已经正确，失败点变成了 **Copilot actor 自触发场景的身份授权限制**。

因此：

- **Issue #164**: 权限配置问题
- **PR #185 / run #24812160997**: 触发者身份问题

两者错误文本相同，但根因不同。

---

## 6. 修复方案

在 `.github/workflows/claude-code-review.yml` 的 job 条件中增加：

```yaml
github.actor != 'Copilot'
```

效果：

- 人类用户创建 / 更新 PR：仍然运行 Claude Code Review
- Dependabot PR：继续跳过
- Copilot bot 自己 push 导致的 `synchronize`：直接跳过，不再触发 401

---

## 7. 验证策略

### 本地静态验证

- workflow YAML 可正常解析
- 新增 RCA / postmortem 文档链接有效

### 预期线上验证

修复推送后：

1. 同一 `copilot/*` PR 再次由 Copilot agent 更新时  
   → `Claude Code Review` 应显示 **skipped**，不再 failure
2. 人类用户手动触发的后续同步 / 新 PR  
   → 仍可正常运行 `Claude Code Review`

---

## 8. 防御措施

- 在 workflow 中显式记录 `github.actor != 'Copilot'` 的设计意图
- 将此类问题归档为 **“bot self-trigger CI”** 模式，避免后续误删条件
- 后续若引入新的 GitHub App 审查/评论型 action，优先检查：
  - 是否依赖 OIDC app token exchange
  - 是否对 bot actor 有额外限制

---

## 9. 结论

本次失败是 **新问题**，不是 Issue #164 的回归。

**最终结论**：

- 失败原因：`Copilot` actor 自触发 `Claude Code Review`
- 技术根因：`anthropics/claude-code-action@v1` 的 app token exchange 不接受该 actor 场景
- 修复策略：对 `github.actor == 'Copilot'` 的事件直接跳过 review job
