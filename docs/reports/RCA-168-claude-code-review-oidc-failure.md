# RCA + Postmortem：PR #168 Claude Code Review OIDC 验证失败

> **事件类型**: CI 失败（新问题）  
> **影响范围**: PR #168 代码审查步骤无法运行  
> **发生时间**: 2026-04-21  
> **解决时间**: 2026-04-21  
> **严重等级**: P3（非阻塞，PR 仍可人工合并）

---

## 1. 事件摘要

PR #168 (`feat: optimize Claude Code Review workflow`) 触发 `claude-code-review.yml` 工作流时，OIDC token 交换步骤返回 `401 Unauthorized`，导致 Claude Code Review 无法运行。

**错误信息**:
```
App token exchange failed: 401 Unauthorized - Workflow validation failed.
The workflow file must exist and have identical content to the version
on the repository's default branch.
```

---

## 2. 根本原因（Root Cause）

### 技术根因

`claude-code-action@v1` 使用 **OIDC token 交换**进行身份认证（而非静态 API Key）。OIDC 的安全校验要求：**正在运行的 workflow 文件内容必须与 `main` 分支上的版本完全一致**。

PR #168 **修改了 `claude-code-review.yml` 本身**。当该 PR 触发代码审查时：
1. Workflow 从 PR 分支（`copilot/update-architecture-and-design-docs`）拉取——内容已修改
2. OIDC 将运行时 workflow 内容与 `main` 分支对比 → 发现差异 → 拒绝授权

### 是新问题还是旧问题？

**新问题**。这是首次出现 PR 修改 `claude-code-review.yml` 本身的情况。之前所有 PR 均只修改代码/文档，不触及 workflow 文件，因此 OIDC 校验一直通过。

### 根因链路

```
PR #168 修改 claude-code-review.yml
  → PR 触发该 workflow（旧版本无 paths 过滤，任何 PR 均触发）
    → Workflow 从 PR 分支加载（已修改版本）
      → OIDC 校验：运行版本 ≠ main 版本
        → 401 Unauthorized → CI 失败
```

---

## 3. 修复方案

### 直接修复（本次修复）

在 `claude-code-review.yml` 的 `paths` 触发条件中**故意排除 `*.yml`/`*.yaml`**，只保留代码文件扩展名：

```yaml
paths:
  - "**/*.js"
  - "**/*.ts"
  - "**/*.py"
  - "**/*.json"
  # 不包含 **/*.yml —— 修改 workflow 文件的 PR 不触发 Claude Code Review，
  # 可完全规避 OIDC 校验失败问题
```

**同时应用 PR #168 的其他优化**（并发控制、跳过 Draft/Bot PR），因为这些优化本身是正确的，只是 `*.yml` 路径规则需要去除。

### 为什么不用 `paths-ignore`？

GitHub Actions 的 `paths` 和 `paths-ignore` 不能同时使用。排除 `.yml` 文件是最简洁的方式，且对实际使用影响极小（workflow 配置变更不需要 AI 代码审查）。

### 为什么不换成 ANTHROPIC_API_KEY？

OIDC 比 API Key 更安全（无需存储长效 secret）。应保留 OIDC，通过路径过滤避免触发场景，而非降级认证方式。

---

## 4. 影响评估

| 维度 | 描述 |
|------|------|
| **PR #168 影响** | Code Review 步骤失败，PR 可人工审查后合并，无功能阻塞 |
| **其他 PR 影响** | 无，OIDC 校验只在 workflow 文件被修改时失败 |
| **修复后验证** | 修改 workflow 的 PR 不再触发 Code Review，规避 OIDC 校验 |

---

## 5. 时间线

| 时间 | 事件 |
|------|------|
| 2026-04-21 08:59 | PR #168 创建，触发 claude-code-review.yml |
| 2026-04-21 09:00 | OIDC 校验失败，CI 报错 |
| 2026-04-21 09:16 | 收到问题报告，开始分析 |
| 2026-04-21 09:xx | 根因确认：workflow 文件自修改导致 OIDC 失败 |
| 2026-04-21 09:xx | 修复合并：移除 `*.yml` 路径触发，应用并发控制和 Skip 条件 |

---

## 6. 预防措施

### 已实施

- [x] `paths` 过滤排除 `*.yml`/`*.yaml`，防止同类 OIDC 失败复发
- [x] 在 workflow 注释中明确说明排除原因，避免未来误加回来

### 后续行动

- [ ] 在 CLAUDE.md 常见问题表格中记录此问题（ISS-016）
- [ ] PR #168 可关闭（其 workflow 改动已通过本修复合并，doc 改动可单独 PR 合并）

---

## 7. 经验教训

1. **修改 OIDC workflow 文件的 PR 会自我失败**：这是 GitHub/Anthropic 的安全设计，不是 bug。遇到此类报错，检查 PR 是否修改了使用 OIDC 的 workflow 文件本身。
2. **路径过滤应排除 workflow 目录**：将 `**/*.yml` 加入 paths 触发规则，会意外包含 `.github/workflows/*.yml`，造成 OIDC 问题。
3. **错误信息已足够清晰**：错误消息明确说明了原因，对照 PR 变更文件即可快速定位。

---

**关联 Issues**: PR #168, Job #72284133035  
**修复 PR**: 本文档所在分支  
**参考**: [Claude Code Action OIDC 说明](https://github.com/anthropics/claude-code-action)
