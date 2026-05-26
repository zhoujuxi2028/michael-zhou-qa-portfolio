# PDEF-005: DEF-023 RCA 文件相对路径错误导致 Repository Meta CI 断链 — RCA

**缺陷 ID**: PDEF-005  
**严重度**: P2 / Medium  
**发现日期**: 2026-05-26  
**修复日期**: 2026-05-26  
**影响范围**: 仓库级 `Repository Meta CI / lint`（PR #276 `docs/phase7-close-135` 分支）

---

## 1. 问题描述

PR #276 `Repository Meta CI / lint` 失败（run [#26445816667](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/actions/runs/26445816667) / job [#77851746079](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/actions/runs/26445816667/job/77851746079)），错误信息：

```
Broken Markdown links detected:
 - performance-testing-platform/docs/project-management/postmortems/RCA-2026-05-26-DEF-023-bats-branch-whitelist.md:
     ../../../../../docs/project-management/defect-tracking/defect-register.md (outside repository)
 - performance-testing-platform/docs/project-management/postmortems/RCA-2026-05-26-DEF-023-bats-branch-whitelist.md:
     ../../../../../.husky/pre-push (outside repository)
 - performance-testing-platform/docs/qa/defects/register.md:
     ../project-management/postmortems/RCA-2026-05-26-DEF-023-bats-branch-whitelist.md
Error: Process completed with exit code 1.
```

---

## 2. 根因分析

### 2.1 直接原因：相对路径层数算错

**错误 A / B（RCA 文件，同一根因）**

文件位置：`performance-testing-platform/docs/project-management/postmortems/`

| 层级 | 路径 |
|------|------|
| 0（文件自身） | `postmortems/` |
| `..` × 1 | `project-management/` |
| `..` × 2 | `docs/` |
| `..` × 3 | `performance-testing-platform/` |
| `..` × 4 | repo root ✅ |
| `..` × 5 | **repo 外** ❌ |

实际写入的是 5 层（`../../../../../`），比正确值多 1 层，导致路径解析到 repo 外部，被 `repo-meta-ci.yml` 的 `resolved.relative_to(repo_root)` 判定为 `outside repository`。

**错误 C（`defects/register.md`）**

文件位置：`performance-testing-platform/docs/qa/defects/`

| 目标 | 正确相对路径 | 错误写入 |
|------|-------------|---------|
| `performance-testing-platform/docs/project-management/postmortems/RCA-...md` | `../../project-management/postmortems/RCA-...md`（2 层） | `../project-management/postmortems/RCA-...md`（1 层） |

1 层 `..` 只到达 `qa/`，然后尝试进入 `qa/project-management/`（不存在），解析失败。

### 2.2 深层原因 A：无本地 Markdown 链接检查工具

`repo-meta-ci.yml` 的断链检查是一段**仅在 CI 中运行**的 Python 脚本：

```python
resolved = (markdown_file.parent / target).resolve()
try:
    resolved.relative_to(repo_root)
except ValueError:
    failures.append(f"{markdown_file}: {raw_target} (outside repository)")
```

本地开发环境中：

| 检查项 | 本地是否可用 | 说明 |
|--------|-------------|------|
| `npm run lint`（ESLint） | ✅ | 仅校验 `.js` 文件 |
| `npm run format:check`（Prettier） | ✅ | 仅校验格式，不检查链接 |
| `npm run test:unit`（Jest） | ✅ | 仅执行单元测试 |
| `bats ...`（BATS fast，PR #277 新增） | ✅ | 仅校验 shell 契约 |
| **Markdown 断链检查** | ❌ | **无等效本地命令，仅 CI 执行** |

pre-push hook 覆盖的 4 个门控（lint / format / Jest / BATS）均**不检查 Markdown 相对路径**。无论路径写得多错，本地 push 都会通过，CI 是唯一防线。

### 2.3 深层原因 B：路径心算在深层目录结构中容易出错

RCA 文件在 `performance-testing-platform/docs/project-management/postmortems/`（repo root 以下 4 层），该深度超过人（和 Agent）常用的 1–2 层，心算层数时极易差 1。

参照历史：
- PDEF-001（2026-05-23）：`defect-register.md` 路径层数算错
- PDEF-004（2026-05-26）：`label-strategy.md` 路径层数算错  
- PDEF-005（本次）：RCA 文件路径层数算错

**同类问题在 Q2 内已发生 3 次，触发跨季度模式追踪阈值（≥ 3 次）。**

### 2.4 深层原因 C：新文件创建后无本地验证步骤

创建 `RCA-2026-05-26-DEF-023-bats-branch-whitelist.md` 后，流程是：

```
Write 文件 → git add → git commit → git push → CI 发现错误
```

在"push"与"CI 发现"之间，没有任何本地验证步骤来检查新文件内的链接是否有效。若能在 commit 前执行等效检查，可在毫秒内发现错误，而不必等待 CI（数分钟）。

---

## 3. 为什么本地没有暴露这个问题？

| 防线 | 是否存在 | 是否覆盖 Markdown 断链 | 说明 |
|------|---------|----------------------|------|
| pre-push lint（ESLint） | ✅ | ❌ | 只检查 `.js` |
| pre-push format（Prettier） | ✅ | ❌ | 只检查格式 |
| pre-push Jest 单测 | ✅ | ❌ | 不解析 Markdown |
| pre-push BATS fast | ✅ | ❌ | 检查 shell 契约，不检查文档链接 |
| `markdownlint` | ❌ 未安装 | — | 本地无此工具 |
| `markdown-link-check` | ❌ 未安装 | — | 本地无此工具 |
| `repo-meta-ci.yml` 等效脚本 | ❌ 无本地入口 | — | CI 专属，无 `npm run` / `make` 等价命令 |

**结论**：本地的所有质量门控都不检查 Markdown 相对路径。`repo-meta-ci.yml` 的 Python 断链检查**无本地等价命令**，发现时机被迫推迟到 CI 阶段。

---

## 4. 修复方案

### 4.1 直接修复（PR #276，已完成）

| 文件 | 错误路径 | 修正路径 |
|------|---------|---------|
| RCA 文件（2 处） | `../../../../../docs/…` / `../../../../../.husky/…` | `../../../../docs/…` / `../../../../.husky/…` |
| `defects/register.md` | `../project-management/…` | `../../project-management/…` |

修复前用 Python 脚本本地验证（`os.path.normpath` + `os.path.exists`）全部解析正确后提交。

### 4.2 改进措施（Action Items）

| ID | 描述 | 优先级 | 状态 |
|----|------|--------|------|
| AI-1 | 在 `scripts/` 下提供 `check-markdown-links.sh`，封装 `repo-meta-ci.yml` 同款 Python 断链检查逻辑，使本地可一键执行 | P1 | 🟡 待实施 |
| AI-2 | 将 `check-markdown-links.sh` 加入 pre-push hook（仅检查 `git diff --name-only` 中变更的 `.md` 文件，控制在 <3s） | P2 | 🟡 待实施（依赖 AI-1） |
| AI-3 | 在新建 Markdown 文件后（特别是深层目录），强制执行 `bash scripts/check-markdown-links.sh` 作为提交前检查；写入 CLAUDE.md "提交前检查" 一节 | P2 | 🟡 待实施 |
| AI-4 | 模式归档：PDEF-001 / PDEF-004 / PDEF-005 同属"Markdown 断链"模式，在 `docs/project-management/defect-tracking/defect-register.md` §5 跨项目模式追踪表中登记，季度末专项 Postmortem | P3 | 🟡 待实施 |

---

## 5. 时间线

| 时间（北京） | 事件 |
|-------------|------|
| 2026-05-26 16:xx | 撰写 DEF-023 RCA 文件，路径层数算错（5 层）；同步更新 `defects/register.md` 反链（1 层） |
| 2026-05-26 16:xx | 提交推送至 PR #276，pre-push hook 全部通过（无 Markdown 断链检查） |
| 2026-05-26 ~16:3x | CI `Repository Meta CI / lint` 报 3 处断链（run #26445816667） |
| 2026-05-26 ~16:4x | 根因确认；登记 PDEF-005；用 Python 脚本验证正确路径后修复 3 处 |
| 2026-05-26 ~16:5x | 推送修复，CI 重跑 |

---

## 6. 经验教训（Lessons Learned）

1. **深层目录的相对路径必须工具验证，不能心算**：`../../` 和 `../../../` 在 3–4 层深的目录结构中相差 1 层就会导致越界，人脑在快速写文档时很容易算错。正确做法是写完后立即执行路径解析验证（如本次修复时补的 Python 脚本），而不是等 CI 发现。

2. **"文档已有说明但未自动化"的检查项等同于不存在**：`repo-meta-ci.yml` 的断链检查逻辑已成熟，却没有对应的本地命令入口，导致贡献者（和 Agent）在推送时无法获得即时反馈。这与 DEF-023 中"BATS fast 未加入 pre-push"是同一结构性问题。

3. **同类缺陷第 3 次发生是架构信号**：PDEF-001 / PDEF-004 / PDEF-005 均为 Markdown 断链，均仅由 CI 发现，均因本地无等效检查。三次复发说明问题不在于"粗心"，而在于**本地防线存在结构性盲区**——即使流程文档完备，没有工具强制，同类错误会持续出现。

---

## 7. 关联资料

- 失败 Run：[#26445816667 / job #77851746079](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/actions/runs/26445816667/job/77851746079?pr=276)
- 触发 PR：[#276](https://github.com/zhoujuxi2028/michael-zhou-qa-portfolio/pull/276)
- Portfolio 缺陷登记：[defect-register.md PDEF-005](../defect-tracking/defect-register.md)
- 关联 Workflow：[`.github/workflows/repo-meta-ci.yml`](../../../.github/workflows/repo-meta-ci.yml)
- 同模式前案：[PDEF-001 RCA](RCA-2026-05-23-PDEF-001-broken-markdown-link.md) / [PDEF-004 RCA](RCA-2026-05-26-PDEF-004-label-strategy-broken-link.md)

---

**作者**: QA  
**创建日期**: 2026-05-26  
**最后更新**: 2026-05-26
