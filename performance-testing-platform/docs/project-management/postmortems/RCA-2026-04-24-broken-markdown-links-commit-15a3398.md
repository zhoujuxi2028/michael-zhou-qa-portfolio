# RCA: Broken Markdown Links — commit 15a3398 (PR #197)

**日期**: 2026-04-24  
**发现方式**: CI `repo-meta-ci / lint` 报错  
**影响范围**: 仅文档链接；无代码功能受损  
**严重级别**: 低（阻塞 CI 但不影响运行时）

---

## 1. 故障现象

CI job `repo-meta-ci / lint` 在 PR #197 中报告 4 个断链：

```
Broken Markdown links detected:
 - performance-testing-platform/docs/qa/reports/archive/README.md: ../stage4-validation.md
 - performance-testing-platform/docs/qa/reports/archive/stage4-planning/STAGE4-TDD-ROADMAP.md: ../specs/stage4-verify-functional-spec.md
 - performance-testing-platform/docs/qa/reports/archive/stage4-planning/STAGE4-TDD-ROADMAP.md: ../specs/stage4-verify-architecture.md
 - performance-testing-platform/docs/qa/reports/capacity-report.md: ../architecture/architecture.md
```

---

## 2. 根因分析

所有 4 个断链均由 commit `15a3398` 引入（`refactor(scripts): reorganize scripts/ to enterprise-level structure and integrate BATS into CI`）。

### 断链明细

| 文件 | 错误链接 | 根因 |
|------|----------|------|
| `docs/qa/reports/archive/README.md` | `../stage4-validation.md` | 目标文件从未创建，文档提前引用了规划中的产物 |
| `docs/qa/reports/archive/stage4-planning/STAGE4-TDD-ROADMAP.md` | `../specs/stage4-verify-functional-spec.md` | 路径层级算错：实际文件在 `docs/qa/specs/`，需 `../../../specs/`，写成了 `../specs/` |
| `docs/qa/reports/archive/stage4-planning/STAGE4-TDD-ROADMAP.md` | `../specs/stage4-verify-architecture.md` | 同上 |
| `docs/qa/reports/capacity-report.md` | `../architecture/architecture.md` | 路径层级差一级：`docs/qa/reports/` 向上 1 级是 `docs/qa/`，实际需要 `../../architecture/` |

---

## 3. 为什么自检没有发现？

### CI 检查机制

`repo-meta-ci` 检查的是 **PR 中所有变更文件**（`git diff --name-only base..HEAD`），而不是单个 commit 的变更文件。

### 自检盲区

- 本次 PR 包含两个 commit：`15a3398`（引入断链）和 `4983c8c`（修复文档旧路径）
- commit `4983c8c` 的 agent 自检时只验证了自己修改的那批文件（`architecture.md`、`integration-test-design.md` 等 6 个）
- **`15a3398` 修改的 3 个文件（`archive/README.md`、`STAGE4-TDD-ROADMAP.md`、`capacity-report.md`）不在 `4983c8c` 的变更集里**，自检脚本未覆盖
- 换言之：自检是 **commit 级** 的，而 CI 是 **PR 级** 的，两者作用域不同

### 路径计算错误的直接原因

在嵌套较深的目录（`archive/stage4-planning/`）里写相对路径时，手工计数层级出错，未通过本地 `python3` / `resolve()` 验证即提交。

---

## 4. 修复措施（本次）

| 文件 | 修复方式 |
|------|---------|
| `archive/README.md` | 删除指向不存在文件 `stage4-validation.md` 的链接行 |
| `STAGE4-TDD-ROADMAP.md` | `../specs/` → `../../../specs/` |
| `capacity-report.md` | `../architecture/architecture.md` → `../../architecture/architecture.md` |

修复后本地验证：7 个链接全部 ✅（使用与 CI 相同的 Python 脚本）

---

## 5. 改进措施（预防）

| 措施 | 负责方 | 优先级 |
|------|--------|--------|
| Agent 自检时扫描范围改为 **整个 PR diff**（`git diff origin/main..HEAD`），而非单 commit | Agent 工作流 | 高 |
| 在嵌套深度 ≥ 3 的目录写相对路径时，必须用 `python3 -c "..."` / `resolve()` 实际验证 | 编码规范 | 中 |
| 在 PR description 中增加 "链接检查" checklist 项 | 流程规范 | 低 |

---

## 6. 时间线

| 时间 | 事件 |
|------|------|
| 2026-04-24 ~04:37 | commit `15a3398` 引入 3 个含断链文件 |
| 2026-04-24 ~04:37 | commit `4983c8c` 修复文档旧路径（未覆盖断链文件） |
| 2026-04-24 ~05:03 | CI `repo-meta-ci` 报告 4 个断链 |
| 2026-04-24 ~05:10 | RCA 分析完成，确认根因 |
| 2026-04-24 ~05:15 | 修复 3 个文件，本地验证通过，提交 |
