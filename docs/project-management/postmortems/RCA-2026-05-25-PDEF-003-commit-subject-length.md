# PDEF-003: Cloud Agent commit subject 长度 76 > 72 触发 Commit Guard 红灯 — RCA

**缺陷 ID**: PDEF-003
**严重度**: P2 Medium
**发现日期**: 2026-05-25
**修复日期**: 2026-05-25（流程/文档层）
**影响范围**: 仓库级 `Commit Guard` workflow（所有分支 PR）；Cloud Agent (Copilot) 提交路径

---

## 1. 问题描述

PR #262（`copilot/feat-add-pr-pipeline`，闭环 issue #242）由 Cloud Agent 通过 `report_progress` 推送的 head commit：

```
8d3d124 docs(readme): align workflow table with cicd-demo PR/Deploy pipelines (#242)
```

subject 长度 76 字符，超出 `commit-guard.yml` 配置的 **≤ 72** 上限。CI run #26380345263 / job #77648244381（`Commit Guard / Conventional Commits (subject rules)`）报红：

```
##[error]Commit 8d3d124... subject 长度 76 > 72: docs(readme): align workflow table with cicd-demo PR/Deploy pipelines (#242)
```

**影响**：

- 阻塞 PR #262 通过 Required Check（Commit Guard 已纳入 branch protection）
- 与 DEF-022 同模式（perf-platform PR #257 多个 subject 超长，曾导致 1 周阻塞）；说明既有防线对 Cloud Agent 提交路径无效
- 触发模式追踪阈值（同模式季度内 ≥ 2 次）

---

## 2. 根本原因（Root Cause）

### 2.1 直接原因

Agent 在 `report_progress` 调用时拟稿的 commit message 字符数未做心算/工具校验。两次出现同类问题（DEF-022、PDEF-003）的 subject 模式高度一致：`type(scope): <较长描述> (#issue)`，类型 + scope + 引用 issue 编号已占约 20 字符，留给描述的预算仅 ≈ 50 字符，极易超限。

### 2.2 深层原因 — 防线绕过

仓库已经为同类问题部署了多道防线（DEF-022 后落地）：

| 防线 | 实施位置 | 对 Cloud Agent 是否生效 |
|------|----------|--------------------------|
| `commit-guard.yml` PR 校验 | CI / GitHub Actions | ✅ 生效（事后报红） |
| `scripts/check-commit-guard.sh` 本地脚本 | 仓库脚本 | ❌ Agent 默认不主动调用 |
| `.husky/pre-push` 钩子调用上述脚本 | Husky | ❌ Agent 经 `report_progress` 推送，**不经本地 git push，不触发 Husky** |
| `commitlint.config.js` + `commit-msg` 钩子 | Husky | ❌ 同上 |
| 文档：`docs/GIT-COMMIT-CONVENTION.md` "每行 72 字符左右" | 文档 | ⚠️ Agent 未在 commit 前显式核对 |

**关键发现**：现有"提交前防线"全部依赖**本地 git/husky 路径**。Cloud Agent 通过 `report_progress` 内部的 `git add/commit/push` 走 GitHub 后台凭据通道，不执行 `.husky/*` 脚本，所有客户端防线静默失效，唯一守门员是事后 CI。

### 2.3 与 DEF-022 的关系

DEF-022 复盘后增补了"Stage 4 测试阶段**必须**本地运行 `scripts/check-commit-guard.sh`"的流程要求（见 `docs/project-management/defect-tracking/README.md` 第 8 节），但该要求面向**人类贡献者** Stage Gate，未显式覆盖 Cloud Agent 提交路径。

---

## 3. 时间线

| 时间（UTC） | 事件 |
|-------------|------|
| 2026-05-25 02:11 | Agent 完成 issue #242 收尾任务，调用 `report_progress` 提交 commit `8d3d124`（subject 76 字符） |
| 2026-05-25 02:39 | `Commit Guard` 在 PR #262 第二次 attempt 触发，run #26380345263 报红 |
| 2026-05-25 02:43 | 用户要求按缺陷管理流程处置 + 更新 `CLAUDE.md` |
| 2026-05-25 02:50+ | 登记 PDEF-003、撰写本 RCA、更新 `CLAUDE.md` Git Workflow 章节 |

---

## 4. 修复方案

### 4.1 流程/文档层（本次落地）

| 动作 | 位置 |
|------|------|
| 登记 PDEF-003 到 Closed Defects 表 | `docs/project-management/defect-tracking/defect-register.md` 第 4 节 |
| 撰写本 RCA | 本文件 |
| 在根 `CLAUDE.md` Git Workflow 章节明确"Cloud Agent commit subject 必须 ≤ 72 字符"，并给出常用安全模板与字符预算 | `CLAUDE.md` |

### 4.2 代码层（不在本次范围）

- **失败 commit `8d3d124` 自身的修复**：Cloud Agent 受 `report_progress` patch-id 去重限制无法 force-push 重写（见 repo memory "PR history rewriting"）。可选路径：
  1. 仓库维护者本地 `git rebase -i` + `git push --force-with-lease`
  2. 合并 PR 时选择 **Squash and merge**（GitHub UI 重写为单条新 subject）
  3. 维护者关闭 PR #262，由 Agent 从新分支重提 PR
- **客户端钩子向 Agent 路径延伸**：当前 `report_progress` 不暴露给用户/Agent 拦截入口，需 Copilot 平台层支持，本次仅在文档层提示 Agent 自检。

### 4.3 与 DEF-022 改进项的差异

DEF-022 改进项目标群体是人类贡献者（Stage 4 Gate 强制本地校验），本次增补针对 Cloud Agent —— **在拟稿 commit subject 时即心算/截断到 72 字符**，作为 `report_progress` 调用前的预检查。

---

## 5. 改进措施（Action Items）

| 编号 | 描述 | 责任人 | 截止 | 状态 |
|------|------|--------|------|------|
| AI-1 | 在根 `CLAUDE.md` Git Workflow 章节固化 Agent commit subject ≤ 72 字符规则（含字符预算表 + 常见超长模式 + 心算口诀） | Agent | 本 PR | ✅ |
| AI-2 | 模式追踪：commit subject 长度违规季度内 2 次（DEF-022、PDEF-003），如再发一次升级专项 Postmortem | QA Lead | 季度末 | 🟡 监控中 |
| AI-3 | 评估 `report_progress` 提交路径接入服务端 commit-msg 校验（如 GitHub push ruleset 中的 commit-metadata rule），消除"Agent 绕过 Husky"的结构性漏洞 | 仓库维护者 | 下季度 | 🟡 待评估 |
| AI-4 | 在 `docs/GIT-COMMIT-CONVENTION.md` 标题处增加加粗醒示"Agent / 自动化提交注意：subject 硬上限 72，无任何 hook 拦截" | 维护者 | 下次文档更新 | 🟡 跟进 |

---

## 6. 经验教训（Lessons Learned）

1. **"已部署的防线"不等于"对所有路径生效"**：客户端 hook 在自动化/Cloud Agent 路径默认失效；任何强制规则必须有**服务端（CI / push ruleset）**兜底，且需要文档明确告知所有提交主体（含 Agent）。
2. **commit subject 模式有"陷阱长度"**：`type(scope): ... (#issue)` 框架占用约 20 字符，描述空间 ≈ 50 字符，比直觉的"半行"更紧。模板化的字符预算比"差不多"更可靠。
3. **同类缺陷复发是流程信号，不是个人失误**：DEF-022 + PDEF-003 = 同一根因（客户端防线对 Agent 失效）的两次表现，应在流程/平台层闭环，而非反复"提醒下次注意"。

---

## 7. 关联资料

- 失败 Run：[#26380345263 / job #77648244381](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/actions/runs/26380345263/job/77648244381)
- 失败 Commit：`8d3d124101b94bf91269f12a6e946b98b66e19af`
- 关联 PR：[#262](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/pull/262)
- 关联 Issue：[#242](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/issues/242)
- 同模式前案：DEF-022（perf-platform 项目级登记表）
- 防线脚本：[`scripts/check-commit-guard.sh`](../../../scripts/check-commit-guard.sh)
- Workflow：[`.github/workflows/commit-guard.yml`](../../../.github/workflows/commit-guard.yml)
- 规范：[`docs/GIT-COMMIT-CONVENTION.md`](../../GIT-COMMIT-CONVENTION.md)

---

**作者**: Copilot Cloud Agent
**复审**: QA Lead（待人工 sign-off）
**版本**: v1.0
