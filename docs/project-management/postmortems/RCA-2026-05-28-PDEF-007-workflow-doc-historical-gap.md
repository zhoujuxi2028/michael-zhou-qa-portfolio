---
id: PDEF-007
date: 2026-05-28
severity: P2
status: resolved
pr: "#333"
issue: "N/A"
---

# RCA: 历史遗漏 workflow 文件未登记，Dependabot PR 触发 CI 报红

## 事件摘要

`claude-code-review.yml` 和 `copilot-setup-steps.yml` 在加入仓库时未在 README.md / CLAUDE.md 中登记。PDEF-006 已为 pre-push hook 加入 workflow-doc-sync 检查，但该检查仅扫描**当次 push 新修改的** workflow 文件，无法追溯历史遗漏。

Dependabot PR #298（`actions/checkout v4→v6`）修改了这两个文件，触发 CI 全量 diff 扫描，`repo-meta-ci / lint`（run [#26551798570](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/actions/runs/26551798570) / job [#78215228958](https://github.com/zhoujuxi2028/michael-zoo-qa-portfolio/actions/runs/26551798570/job/78215228958)）报红；本地 pre-push hook 无任何报错。

## 时间线

| 时间 | 事件 |
|------|------|
| 2026-05-26 | PDEF-006 修复：pre-push hook 加入 workflow-doc-sync（仅检查当次 push 变更的文件） |
| 2026-05-26 | Dependabot 创建 PR #298（actions/checkout 4→6），触碰 `claude-code-review.yml`（v4→v6）和 `copilot-setup-steps.yml`（v5→v6） |
| 2026-05-28 | CI `repo-meta-ci / lint` 报红：两个 workflow 文件未在 README.md / CLAUDE.md 登记 |
| 2026-05-28 | 诊断：本地 pre-push 无报错，因当次 push 未改动任何 workflow 文件，检测列表为空跳过 |
| 2026-05-28 04:28Z | 修复：README.md / CLAUDE.md 补录两文件，合并至 main via PR #333 |
| 2026-05-28 | 系统性修复：脚本加入 `--all` 全量审计模式；CI 加入全量扫描步骤；补录 5 个遗漏 workflow 文档；合并至 main via PR #334 |
| 2026-05-28 | PR #298 二次 CI 报红（run #26556529998）：第一次 `@dependabot rebase` 早于 PR #334 合并时间（04:28Z），分支未获取 README 修复，同一错误再次出现 |
| 2026-05-28 | 根本原因 C 确认：`@dependabot rebase` 存在时间竞态，修复合并后须再次触发 rebase；已触发第二次 rebase |

## 根因分析（5-Why）

```
为什么 Dependabot PR CI 报红，本地 push 无报错？
  → CI 扫描 PR 全量 diff（含历史遗漏的未登记文件）
    本地 hook 只扫描当次 push 新改动的 workflow 文件

为什么本地 hook 不扫描历史遗漏？
  → PDEF-006 修复的设计目标是"拦截新增 workflow 时遗漏文档"
    使用 git diff GUARD_BASE..GUARD_HEAD 获取变更列表
    预设"每次新增 workflow 都会被 push 到本地触发检测"
    未考虑"workflow 文件在 hook 部署前就已存在且未登记"的历史遗漏场景

为什么这两个文件最初未登记？
  → 文件加入时 workflow-doc-sync 检查尚不存在（PDEF-006 是后来加的）
    没有任何门禁阻止未登记的 workflow 合入

为什么没有全量审计补漏？
  → check-workflow-doc-sync.sh 只支持"变更文件列表"模式
    缺少"全量扫描所有 workflow 文件"的模式
    CI 中也无全量扫描步骤，历史缺口一直处于静默状态
```

## 双重根因

### 根因 A：pre-push hook 检测范围仅限当次 push 变更

```bash
# .husky/pre-push
WF_LIST=$(git diff --name-only "${GUARD_BASE}..${GUARD_HEAD}" | grep '\.github/workflows/')
# → 当次 push 无 workflow 变更时，WF_LIST 为空，检查直接跳过
```

hook 部署前已存在的未登记 workflow 文件永远不会被本地检测到，直到某次 push 恰好修改该文件。

### 根因 B：check-workflow-doc-sync.sh 缺少全量审计模式

脚本设计为"按需检查指定文件列表"，CI 中也只调用一次（传入 PR diff 的 changed-files.txt）。没有"扫描所有 `.github/workflows/*.yml` 是否都已登记"的全量审计路径，历史遗漏的文件处于永久静默状态。

## 修复措施

| # | 措施 | 类型 | 状态 |
|---|------|------|------|
| 1 | `check-workflow-doc-sync.sh` 新增 `--all` 模式：不需要文件列表，直接扫描 `.github/workflows/` 下所有 workflow 文件 | 预防 | ✅ 已实现 |
| 2 | `repo-meta-ci.yml` 新增 **Check workflow docs sync (full audit)** 步骤：每次 CI 运行都执行 `--all` 全量扫描，不依赖 PR diff | 预防 | ✅ 已实现 |
| 3 | 补录历史遗漏的 5 个 workflow 文件（`claude-code-review.yml`、`copilot-setup-steps.yml`、`api-testing-ci.yml`、`codeql-analysis.yml`、`commit-guard.yml`）到 README.md / CLAUDE.md | 修复 | ✅ 已完成 |

## 修复后的检测架构

```
场景 A：开发者新增 workflow 文件并 push
        ↓
  pre-push hook 检测到 workflow 变更（git diff）
        ↓
  check-workflow-doc-sync.sh changed-files.txt
        ↓
  未登记 → 阻断 push（本地即时反馈）

场景 B：历史遗漏 / Dependabot 触碰已有文件
        ↓
  CI repo-meta-ci / Check workflow docs sync (full audit)
        ↓
  bash scripts/check-workflow-doc-sync.sh --all
        ↓
  任何未登记的 workflow → CI 报红（全量覆盖）
```

### 根因 C：`@dependabot rebase` 存在时间竞态

`@dependabot rebase` 是异步操作。若 rebase 完成时间早于文档修复合并时间，分支将基于旧版 main，不包含修复内容。修复合并后需再次触发 rebase 方可生效。

## 经验教训

1. **增量检查 ≠ 全量保障**：基于 diff 的检查只能防止新引入的问题，无法覆盖历史静默缺口。需配合定期或每次 CI 的全量扫描。
2. **门禁部署时需做一次全量回扫**：每次新增质量门禁（如 PDEF-006 的 workflow-doc-sync），应立即对历史存量做一次全量检查，消除部署前遗留的缺口。
3. **Dependabot 是暴露隐患的有效触发器**：批量依赖升级 PR 会触碰大量文件，往往比正常开发 PR 更容易暴露文档/检查缺口。这类 PR 失败不一定是升级本身的问题。
4. **`@dependabot rebase` 后需确认合并点**：rebase 是异步的，完成时间不可控。修复合并后若 Dependabot PR 仍报错，应检查分支父提交是否包含最新 main，必要时再次触发 rebase。
